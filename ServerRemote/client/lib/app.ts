import { E, setUpdateCallback } from "./browserUtils"
import * as message from "message"
import { resolve } from "url"

/** Is connected to the server */
var connected = true
export function sendMessage(msg: message.IRequestMessage, push = false): Promise<message.IResponseMessage> {
	if (!connected && !push) return Promise.reject("Not connected")
	return new Promise((resolve, reject) => {
		var request = new XMLHttpRequest()

		request.onload = () => {
			var msg = JSON.parse(request.responseText) as message.IResponseMessage
			connected = true
			pendingMessages--
			if (msg.type == "error") throw msg.err
			resolve(msg)
		}

		request.onerror = () => {
			reject(new Error("Failed to send a request, response status: " + request.status))
			pendingMessages--
			connected = false
		}

		request.open("GET", "./query?" + encodeURIComponent(JSON.stringify(msg)));
		request.send();
		pendingMessages++
	})
}

window["sendMessage"] = sendMessage

function updateActions(actions: message.IAction[]) {
	// TODO: action update code
}

window["updateActions"] = updateActions

var pendingMessages = 0
var lastUpdate = 0
/** Is server target active */
var active = false

window.addEventListener("load", () => {
	E.stateButton.addEventListener("click", () => {
		if (connected)
			if (active) {
				sendMessage({type: "kill"})
			} else {
				sendMessage({type: "start"})
			}
		else {
			sendMessage({type: "ping"}, true)
		}
	})
	setUpdateCallback(() => {
		E.console.style.flexBasis = E.console.style.width;
		E.pendingShow.innerText = connected ? pendingMessages.toString() : "Not connected"
		E.statusbar.style.backgroundColor =
			connected ? (
				pendingMessages > 0 ? "lightblue" :
					active ? "white" : "lightcoral"
			) : "red";
		E.stateButton.innerText = connected ? (active ? "■" : "▶") : "↺"

		if (Date.now() - lastUpdate > 1000 && connected) {
			if (pendingMessages == 0) {
				sendMessage({ type: "update", lastTime: lastUpdate }).then((msg) => {
					if (msg.type == "error") throw msg.err
					lastUpdate = Date.now();
					(E.console as HTMLTextAreaElement).value += msg.lines
					active = msg.active
					updateActions(msg.actions)
				})
			}
		}
	})
})