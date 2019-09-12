import fs = require("fs")
import path = require("path")
import util = require("util")
import http = require("http")
import url = require("url")
import mime = require("mime")
import { IConfig } from "./configInterface"

var staticFileFolder = path.join(__dirname, "static")

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

	try {
		var content: Buffer | string = (await util.promisify(fs.readFile)(requestedPath))
	} catch (err) {
		requestedPath = path.join(staticFileFolder, "error.html")
		code = 404
		errorString = `Request file does not exist`
		console.log(`   Clinet requested noexistent file`)
		content = (await util.promisify(fs.readFile)(requestedPath)).toString().replace(/\$\$CODE\$/, code.toString()).replace(/\$\$MESSAGE\$/, errorString)

		response.writeHead(code, errorString, { "Content-Type": mime.getType(".html") })
		response.end(content)
	}

	response.writeHead(code, errorString, { "Content-Type": mime.getType(requestedPath) })
	response.end(content)
})

server.listen(config.port != 0 ? config.port : (process.env.port || null));

console.log(".. Server listening at " + JSON.stringify(server.address()));