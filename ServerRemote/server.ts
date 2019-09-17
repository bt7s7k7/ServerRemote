import fs = require("fs")
import path = require("path")
import util = require("util")
import http = require("http")
import url = require("url")
import mime = require("mime")
import { IConfig } from "./configInterface"
import * as message from "./client/lib/message"
import childProcess = require("child_process")

/** The server we remote */
var target: childProcess.ChildProcess = null;
/** Path to the folder with client code */
var clientCodeFolder = path.join(__dirname, "client")
// Test for arguments
if (process.argv.length != 3) {
	throw new Error("Expected 1 argument")
}
/** Output of the target grouped by time */
var lines: { time: number, data: string }[] = [];


console.log(",, Loading config file")
/** Path of confing file including filename */
var configPath = process.argv[2]
var config: IConfig
{
	var content = fs.readFileSync(configPath).toString()
	if (content.length == 0) content = "{}"
	config = Object.assign({
		target: "cmd.exe",
		port: 0,
		actions: []
	} as IConfig, JSON.parse(content))
	updateConfig()
}
/** The time the config was last changed */
var configChangedTime: number;

/**
 * Changes the configChangeTime and saves the config to the file
 * */
function updateConfig() {
	configChangedTime = Date.now()
	console.log(",, Saving config...")
	
	fs.writeFile(configPath, JSON.stringify(config), (err) => {
		if (err) {
			console.error(err)
		} else {
			console.log(".. Saved config")
		}
	})
}

/**
 * Processes the path by resolving macros
 * @param toProcess The path to preprocess
 */
function preprocessPath(toProcess: string) {
	return toProcess.replace(/__DIR/g, path.resolve(path.dirname(configPath)))
}

console.log(",, Starting...")
/** Server hosting the client code and communication */
var server = http.createServer(async (request, response) => {
	/** Request url */
	var parsedUrl = url.parse(request.url)
	// If url empty redirect to index
	if (parsedUrl.pathname == "/") parsedUrl.pathname = "/index.html"
	/** Path to the requested file */
	var requestedPath = path.join(clientCodeFolder, parsedUrl.pathname)
	/** HTTP status code */
	var code = 200
	/** HTTP status text */
	var errorString = "No error"
	// If we were queried respond to the message in the request url
	if (parsedUrl.pathname == "/query") {
		var errorMsg = "Internal server error"
		/** Request message received from client */
		var msg: message.IRequestMessage;
		/** Response to be sent to the client */
		var resC: message.IResponseMessage = { type: "ping" };
		// Set the requested path to make the mime type json
		requestedPath = ".json"
		// Try block to make sure to end the connection
		try {
			try {
				// Parse the request message
				msg = JSON.parse(decodeURIComponent(parsedUrl.search.substr(1)))
			} catch (err) {
				// If failed write the error message to be reported
				errorMsg = err.name
			}
			// If the request was parsed handle
			if (msg) {
				if (msg.type == "update") {
					// Respond with target information
					resC = {
						type: "update",
						active: target != null,
						// Output lines of the target since the last time provided by request message, joined together
						lines: lines.filter(v => v.time > msg.lastTime).map(v => v.data).join("\n"),
						// Provide the last config change time so the client can request the new config if outdated
						lastConfigChange: configChangedTime
					}
				} else if (msg.type == "start") {
					// If we don't have a target create one
					if (!target) {
						// Spawning the child process
						target = childProcess.spawn(preprocessPath(config.target), [], {
							// We pipe the stdio because we want to handle it ourselves and send to clients
							stdio: "pipe",
							shell: true,
							cwd: preprocessPath("__DIR")
						})
						// Add the output to lines for sending to clients
						target.stdout.on("data", (data) => {
							console.log(data.toString())
							lines.push({ time: Date.now(), data: data.toString() })
						})
						target.stderr.on("data", (data) => {
							console.error(data.toString())
							lines.push({ time: Date.now(), data: data.toString() })
						})
						// On exit we set the target to null to indicate we don't have a target anymore and allow to spawn another one
						target.on("exit", () => {
							target = null
						})
						// On error also clear the target, but also report the error to the console
						target.on("error", (err) => {
							console.error(err)
							target = null
						})
					}
				} else if (msg.type == "kill") {
					// If we have a target we kill it
					if (target) {
						target.kill()
						target = null
					}
				} else if (msg.type == "command") {
					// If we have a target send it the received command
					if (target) {
						target.stdin.write(msg.command + "\n")
					}
				} else if (msg.type == "getConfig") {
					// Respond with the current config
					resC = {
						type: "getConfig",
						config: config
					}
				} else if (msg.type == "setConfig") {
					// Test if the config is contained within the message
					if ("config" in msg) {
						// Use the sent config
						config = msg.config
						// Save
						updateConfig()
					} else {
						// Return the error
						errorMsg = "Config missing in config change message"
					}
				}
				if (errorMsg == "Internal server error") errorMsg = null
			}
		} finally {
			// If there was an error report it to the client
			if (errorMsg) {
				content = JSON.stringify({ type: "error", err: errorMsg } as message.IResponseMessage)
				code = 500
				errorString = errorMsg
			} else { // Else return the response object
				code = 200
				content = JSON.stringify(resC)
			}
		}
	} else { // If we are not queried, respond with the requested file
		console.log(`   Received request from ${request.socket.address().address}, for ${path.relative(__dirname, requestedPath)}`)
		try {
			// If the file is in the lib folder and doesn't have and extension we add an .js extension, this is because the code TypeScript generates doesn't have extensions in import paths
			if (path.basename(path.dirname(requestedPath)) == "lib" && path.extname(requestedPath) == "") {
				requestedPath += ".js"
			}
			// Load the content of the requested file
			var content: Buffer | string = (await util.promisify(fs.readFile)(requestedPath))
		} catch (err) {
			// If we have an error return a error screen
			// Set the path to the error page
			requestedPath = path.join(clientCodeFolder, "error.html")
			code = 404
			errorString = `Requested file does not exist`
			// Log the error
			console.log(`   Client requested noexistent file`)
			// Load the error page and replace the macros with the status code and message
			content = (await util.promisify(fs.readFile)(requestedPath)).toString().replace(/\$\$CODE\$/g, code.toString()).replace(/\$\$MESSAGE\$/g, errorString)
		}
	}
	// Write the head of the response with the status code and string and the mime type of the requested file
	response.writeHead(code, errorString, { "Content-Type": mime.getType(requestedPath) })
	// End the response with the content of the requested file
	response.end(content)
})
// Listen on the configured port, if the port is 0 we use the enviromental variable, if that is zero we use a one provided from the OS 
server.listen(config.port != 0 ? config.port : (process.env.port || null));

console.log(".. Server listening at " + JSON.stringify(server.address()));