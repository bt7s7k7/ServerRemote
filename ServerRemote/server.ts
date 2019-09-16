import fs = require("fs")
import path = require("path")
import util = require("util")
import http = require("http")
import url = require("url")
import mime = require("mime")
import { IConfig } from "./configInterface"
import * as message from "./client/lib/message"
import childProcess = require("child_process")

var target: childProcess.ChildProcess = null;

var staticFileFolder = path.join(__dirname, "client")

if (process.argv.length != 3) {
	throw new Error("Expected 1 argument")
}

var lines: { time: number, data: string }[] = [];


console.log(",, Loading config file")
var configPath = process.argv[2]
var config: IConfig = JSON.parse(fs.readFileSync(configPath).toString());

function preprocessPath(toProcess: string) {
	return toProcess.replace(/__DIR/g, path.resolve(path.dirname(configPath)))
}

console.log(",, Starting...")

var server = http.createServer(async (request, response) => {

	var parsedUrl = url.parse(request.url)
	if (parsedUrl.pathname == "/") parsedUrl.pathname = "/index.html"
	var requestedPath = path.join(staticFileFolder, parsedUrl.pathname)
	var code = 200
	var errorString = "No error"

	if (parsedUrl.pathname == "/query") {
		var errorMsg = "Internal server error"
		var msg: message.IRequestMessage;
		var resC: message.IResponseMessage = { type: "ping" };
		requestedPath = ".json"

		try {
			try {
				msg = JSON.parse(decodeURIComponent(parsedUrl.search.substr(1)))
			} catch (err) {
				errorMsg = err.name
			}

			if (msg) {
				if (msg.type == "update") {
					resC = {
						type: "update",
						active: target != null,
						lines: lines.filter(v=>v.time >= msg.lastTime).map(v=>v.data).join("\n") + "\n"
					}
				} else if (msg.type == "start") {
					if (!target) {
						target = childProcess.spawn(preprocessPath(config.target), [], {
							stdio: "pipe",
							shell: true,
							cwd: preprocessPath("__DIR")
						})

						target.stdout.on("data", (data) => {
							console.log(data.toString())
							lines.push({ time: Date.now(), data: data.toString() })
						})

						target.stdout.on("error", (data) => {
							console.error(data.toString())
							lines.push({ time: Date.now(), data: data.toString() })
						})

						target.on("exit", () => {
							target = null
						})

						target.on("error", (err) => {
							console.error(err)
							target = null
						})
					}
				} else {
					if (target) {
						target.kill()
						target = null
					}
				}
				errorMsg = null
			}
		} finally {
			if (errorMsg) {
				content = JSON.stringify({ type: "error", err: errorMsg } as message.IResponseMessage)
				code = 500
				errorString = errorMsg
			} else {
				code = 200
				content = JSON.stringify(resC)
			}
		}
	} else {
		console.log(`   Received request from ${request.socket.address().address}, for ${path.relative(__dirname, requestedPath)}`)
		try {
			if (path.basename(path.dirname(requestedPath)) == "lib" && path.extname(requestedPath) == "") {
				requestedPath += ".js"
			}
			var content: Buffer | string = (await util.promisify(fs.readFile)(requestedPath))
		} catch (err) {
			if (err.name == "")
				requestedPath = path.join(staticFileFolder, "error.html")
			code = 404
			errorString = `Requested file does not exist`
			console.log(`   Client requested noexistent file`)
			content = (await util.promisify(fs.readFile)(requestedPath)).toString().replace(/\$\$CODE\$/g, code.toString()).replace(/\$\$MESSAGE\$/g, errorString)

			response.writeHead(code, errorString, { "Content-Type": mime.getType(".html") })
			response.end(content)
		}
	}

	response.writeHead(code, errorString, { "Content-Type": mime.getType(requestedPath) })
	response.end(content)
})

server.listen(config.port != 0 ? config.port : (process.env.port || null));

console.log(".. Server listening at " + JSON.stringify(server.address()));