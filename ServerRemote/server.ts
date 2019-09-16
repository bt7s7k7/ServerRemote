import fs = require("fs")
import path = require("path")
import util = require("util")
import http = require("http")
import url = require("url")
import mime = require("mime")
import { IConfig } from "./configInterface"
import * as message from "./client/lib/message"

var staticFileFolder = path.join(__dirname, "client")

if (process.argv.length != 3) {
	throw new Error("Expected 1 argument")
}

console.log(",, Loading config file")
var config: IConfig = JSON.parse(fs.readFileSync(process.argv[2]).toString());

console.log(",, Starting...")

var server = http.createServer(async (request, response) => {

	var parsedUrl = url.parse(request.url)
	if (parsedUrl.pathname == "/") parsedUrl.pathname = "/index.html"
	var requestedPath = path.join(staticFileFolder, parsedUrl.pathname)
	var code = 200
	var errorString = "No error"
	console.log(`   Received request from ${request.socket.address().address}, for ${path.relative(__dirname, requestedPath)}`)

	if (parsedUrl.pathname == "/query") {
		var errorMsg = "Internal server error"
		var msg: message.IRequestMessage;
		var resC: message.IResponseMessage;
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
						active: false,
						lines: ""
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
	} else
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

	response.writeHead(code, errorString, { "Content-Type": mime.getType(requestedPath) })
	response.end(content)
})

server.listen(config.port != 0 ? config.port : (process.env.port || null));

console.log(".. Server listening at " + JSON.stringify(server.address()));