import { E, setUpdateCallback } from "./browserUtils"
import { sendMessage, state, controllUpdate, updateNow } from "./controll"
import * as settings from "./settings"

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

	settings.setup()

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


		controllUpdate(() => {
			// On config change we update the action buttons
			// First we delete the old ones
			while (E.actions.childElementCount > 0) {
				E.actions.removeChild(E.actions.firstElementChild)
			}
			// Then create the new ones
			for (let i of state.clientConfig.actions) {
				// If the actions name begins with an undescore, the it's hidden, so skip it
				if (i.name[0] == "_") continue
				let action = i
				let button = document.createElement("button")
				button.innerText = action.name
				button.addEventListener("click", () => {
					sendMessage({type: "action", command: action.name})
				})

				E.actions.appendChild(button)
				E.actions.appendChild(document.createElement("br"))
			}
		}).then((lines) => {
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