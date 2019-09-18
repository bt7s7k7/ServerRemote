import * as message from "message"
import { IConfig } from "../../configInterface"


export function sendMessage(msg: message.IRequestMessage, push = false): Promise<message.IResponseMessage> {
	// Return early if not connected
	if (!state.connected && !push) return Promise.reject("Not connected")
	return new Promise((resolve, reject) => {
		var request = new XMLHttpRequest()

		request.onload = () => {
			// Parse message
			var msg = JSON.parse(request.responseText) as message.IResponseMessage
			// If was not connected, now we know we are
			state.connected = true
			// Message no longer pending
			state.pendingMessages--
			// Throw error if any
			if (msg.type == "error") throw msg.err
			// Return
			resolve(msg)
		}

		request.onerror = () => {
			reject(new Error("Failed to send a request, response status: " + request.status))
			// Message no longer pending
			state.pendingMessages--
			// If request failed we can assume the server is down
			state.connected = false
		}

		request.open("GET", "./query?" + encodeURIComponent(JSON.stringify(msg)));
		request.send()
		// Message now pending
		state.pendingMessages++
	})
}
// Global for devtools
window["sendMessage"] = sendMessage

export function updateConfig() {
	return sendMessage({
		type: "getConfig"
	}).then((msg) => {
		state.clientConfig = msg.config
		lastConfigChange = Date.now()
	})
}

export function uploadConfig() {
	return sendMessage({ type: "setConfig", config: state.clientConfig })
}

// Global for devtools
window["updateConfig"] = updateConfig

export var state = {
	pendingMessages: 0,
	/** Is server target active */
	active: false,
	/** Is connected to the server */
	connected: true,
	/** Our downloaded config*/
	clientConfig: <IConfig>null,
	isClientConfigOccupied: false
}
/** Time the last update message was responded to */
var lastUpdate = 0
/** If we should send the update message next frame */
var _updateNow = false
/** The last time we downloaded the config */
var lastConfigChange = 0

export function controllUpdate(onConfigChange = () => {}): Promise<string> {
	return new Promise((resolve, reject) => {
		if ((Date.now() - lastUpdate > 1000 && state.connected) || _updateNow) {
			// Reset update now to awoid an infinite loop
			_updateNow = false
			// Message interval -------------------------------------------------------------------+
			// Test if no messages pending to avoid sending multiple update messages in one period
			if (state.pendingMessages == 0) {
				// Sending the update message
				sendMessage({ type: "update", lastTime: lastUpdate }).then((msg) => {
					// Set the time for waiting for next interval
					lastUpdate = Date.now();
					// Return the new lines
					resolve(msg.lines)
					state.active = msg.active

					if (msg.lastConfigChange > lastConfigChange && !state.isClientConfigOccupied) {
						updateConfig().then(onConfigChange)
					}
				})
			}
		}
	})
}

export function updateNow() { _updateNow = true; }