import { E, setUpdateCallback } from "./browserUtils"
import { sendMessage, state, controllUpdate, updateNow } from "./controll"

window.addEventListener("load", () => {
	// State button event handler -----------------------------------------------------------------+
	E.stateButton.addEventListener("click", () => {
		if (state.connected)
			if (state.active) {
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
			sendMessage({ type: "command", command: input.value }).then(() => updateNow())
			input.value = ""
		}
	})
	setUpdateCallback(() => {
		// Update loop ----------------------------------------------------------------------------+
		// Pending message information, if disconnected show
		E.pendingShow.innerText = state.connected ? state.pendingMessages.toString() : "Not connected"
		// Set the color of the status bar to represent the state of the targer and server
		E.statusbar.style.backgroundColor =
			state.connected ? (
				state.pendingMessages > 0 ? "lightblue" :
					state.active ? "white" : "lightcoral"
			) : "red";
		// Set the text of the state button to represent the action that will be executed after press
		E.stateButton.innerText = state.connected ? (state.active ? "■" : "▶") : "↺"


		controllUpdate().then((lines) => {
			var console = E.console as HTMLTextAreaElement
			/** If the console is scrolled all the way down */
			var bottom = console.scrollHeight - console.scrollTop - console.clientHeight == 0
			// Add lines to console
			console.value += lines
			// If the console was scrolled all the way down we scroll it all the way down
			if (bottom) console.scrollTo(0, console.scrollHeight)
			// Set target activity
		})
	})
})