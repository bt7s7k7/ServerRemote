import { E, setUpdateCallback } from "./browserUtils"
import * as message from "message"
import { resolve } from "url"

/** Is connected to the server */
var connected = true
export function sendMessage(msg: message.IRequestMessage, push = false): Promise<message.IResponseMessage> {
	// Return early if not connected
	if (!connected && !push) return Promise.reject("Not connected")
	return new Promise((resolve, reject) => {
		var request = new XMLHttpRequest()

		request.onload = () => {
			// Parse message
			var msg = JSON.parse(request.responseText) as message.IResponseMessage
			// If was not connected, now we know we are
			connected = true
			// Message no longer pending
			pendingMessages--
			// Throw error if any
			if (msg.type == "error") throw msg.err
			// Return
			resolve(msg)
		}

		request.onerror = () => {
			reject(new Error("Failed to send a request, response status: " + request.status))
			// Message no longer pending
			pendingMessages--
			// If request failed we can assume the server is down
			connected = false
		}

		request.open("GET", "./query?" + encodeURIComponent(JSON.stringify(msg)));
		request.send()
		// Message now pending
		pendingMessages++
	})
}
// Global for devtools
window["sendMessage"] = sendMessage

function updateActions(actions: message.IAction[]) {
	// TODO: action update code
}
// Global for devtools
window["updateActions"] = updateActions

var pendingMessages = 0
/** Time the last update message was responded to */
var lastUpdate = 0
/** Is server target active */
var active = false
/** If we should send the update message next frame */
var updateNow = false

window.addEventListener("load", () => {
	// State button event handler -----------------------------------------------------------------+
	E.stateButton.addEventListener("click", () => {
		if (connected)
			if (active) {
				sendMessage({ type: "kill" })
			} else {
				sendMessage({ type: "start" })
			}
		else {
			sendMessage({ type: "ping" }, true)
		}
	})
	// Listen for enter at command prompt input below the console and send the commands to the server to be sent to the client
	E.stdin.addEventListener("keypress", (event) => {
		if (event.key == "Enter") {
			var input: HTMLInputElement = event.target as HTMLInputElement
			sendMessage({ type: "command", command: input.value }).then(() => updateNow = true)
			input.value = ""
		}
	})
	setUpdateCallback(() => {
		// Update loop ----------------------------------------------------------------------------+
		// Pending message information, if disconnected show
		E.pendingShow.innerText = connected ? pendingMessages.toString() : "Not connected"
		// Set the color of the status bar to represent the state of the targer and server
		E.statusbar.style.backgroundColor =
			connected ? (
				pendingMessages > 0 ? "lightblue" :
					active ? "white" : "lightcoral"
			) : "red";
		// Set the text of the state button to represent the action that will be executed after press
		E.stateButton.innerText = connected ? (active ? "■" : "▶") : "↺"


		if ((Date.now() - lastUpdate > 1000 && connected) || updateNow) {
			// Reset update now to awoid an infinite loop
			updateNow = false
			// Message interval -------------------------------------------------------------------+
			// Test if no messages pending to avoid sending multiple update messages in one period
			if (pendingMessages == 0) {
				// Sending the update message
				sendMessage({ type: "update", lastTime: lastUpdate }).then((msg) => {
					// Set the time for waiting for next interval
					lastUpdate = Date.now();
					var console = E.console as HTMLTextAreaElement
					/** If the console is scrolled all the way down */
					var bottom = console.scrollHeight - console.scrollTop - console.clientHeight == 0
					// Add lines to console
					console.value += msg.lines
					// If the console was scrolled all the way down we scroll it all the way down
					if (bottom) console.scrollTo(0, console.scrollHeight)
					// Set target activity
					active = msg.active
					// Update the action buttons based on configured actions, it happends every update incase someone else changed the actions
					updateActions(msg.actions)
				})
			}
		}
	})
})