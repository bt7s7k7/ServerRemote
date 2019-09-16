import { E, setUpdateCallback } from "./browserUtils"
import * as message from "message"
import { resolve } from "url"

export function sendMessage(msg: message.IRequestMessage): Promise<message.IResponseMessage> {
	return new Promise((resolve, reject) => {
		var request = new XMLHttpRequest()

		request.onload = () => {
			resolve(JSON.parse(request.responseText))
		}

		request.onerror = () => {
			reject(new Error("Failed to send a request, response status: " + request.status))
		}

		request.open("GET", "./query?" + encodeURIComponent(JSON.stringify(msg)));
		request.send();
	})
}

window["sendMessage"] = sendMessage;

window.addEventListener("load", () => {
	setUpdateCallback(() => {
		E.console.style.flexBasis = E.console.style.width;
	})
})