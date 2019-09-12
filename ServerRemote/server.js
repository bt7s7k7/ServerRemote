"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
const util = require("util");
const http = require("http");
const url = require("url");
const mime = require("mime");
var staticFileFolder = path.join(__dirname, "static");
if (process.argv.length != 3) {
    throw new Error("Expected 1 argument");
}
console.log(",, Loading config file");
var config = JSON.parse(fs.readFileSync(process.argv[2]).toString());
console.log(",, Starting...");
var server = http.createServer((request, response) => __awaiter(void 0, void 0, void 0, function* () {
    var parsedUrl = url.parse(request.url);
    if (parsedUrl.pathname == "/")
        parsedUrl.pathname = "/index.html";
    var requestedPath = path.join(staticFileFolder, parsedUrl.pathname);
    var code = 200;
    var errorString = "No error";
    console.log(`   Received request from ${request.socket.address().address}, for ${path.relative(__dirname, requestedPath)}`);
    try {
        var content = (yield util.promisify(fs.readFile)(requestedPath));
    }
    catch (err) {
        requestedPath = path.join(staticFileFolder, "error.html");
        code = 404;
        errorString = `Request file does not exist`;
        console.log(`   Clinet requested noexistent file`);
        content = (yield util.promisify(fs.readFile)(requestedPath)).toString().replace(/\$\$CODE\$/, code.toString()).replace(/\$\$MESSAGE\$/, errorString);
        response.writeHead(code, errorString, { "Content-Type": mime.getType(".html") });
        response.end(content);
    }
    response.writeHead(code, errorString, { "Content-Type": mime.getType(requestedPath) });
    response.end(content);
}));
server.listen(config.port != 0 ? config.port : (process.env.port || null));
console.log(".. Server listening at " + JSON.stringify(server.address()));
//# sourceMappingURL=server.js.map