import { E } from "./browserUtils";
import { state as controllState, uploadConfig } from "./controll";
import { IAction } from "./message";

/** State of the settings window */
var state = {
	/** Selected action to be edited */
	selectedAction: null as IAction
}

/** Show the top settings, containig the target and port */
function showTop() {
	// Show the top settings
	E.settingsTop.style.removeProperty("display");
	// Load the target value
	(E.settingsTargetField as HTMLInputElement).value = controllState.clientConfig.target;
	// Load the port value
	(E.settingsPortField as HTMLInputElement).value = controllState.clientConfig.port.toString();
}

/** Show the action list */
function showList() {
	// Show
	E.settingsActions.style.removeProperty("display")
	// Reset the selected action because it will be set here
	state.selectedAction = null
	// Remove all chidren of the action list div so we can add new buttons
	while (E.settingsActionList.childElementCount > 0) {
		E.settingsActionList.removeChild(E.settingsActionList.firstElementChild)
	}
	// Add buttons for all the actions to select them
	for (var i of controllState.clientConfig.actions) {
		let action = i
		let button = document.createElement("button")
		button.innerText = action.name
		button.addEventListener("click", () => {
			// Select the acion
			state.selectedAction = action
			// Hide all settings to hide this one, action list
			hideAll()
			// Open editor
			showEditor()
		})

		E.settingsActionList.appendChild(button)
		E.settingsActionList.appendChild(document.createElement("br"))
	}

}

/** Show the action editor */
function showEditor() {
	// Show
	E.settingsActionEditor.style.removeProperty("display");
	// Load the name
	(E.settingsNameField as HTMLInputElement).value = state.selectedAction.name;
	// Load the command
	(E.settingsCommandsField as HTMLInputElement).value = state.selectedAction.command 
}

/** Hides all settings */
function hideAll() {
	E.settingsTop.style.display = "none"
	E.settingsActions.style.display = "none"
	E.settingsActionEditor.style.display = "none"
}

export function setup() {
	// The button to enter the settings
	E.settingsButton.addEventListener("click", () => {
		// Show the settings window contatinig all settings hidden and the save and exit button
		E.settingsWindow.style.removeProperty("display")
		// Show the top settings
		showTop()
		// Set the config to be occupied so it isn't rewritten while we edit it
		controllState.isClientConfigOccupied = true
	})
	// The save and exit button
	E.saveAndExit.addEventListener("click", () => {
		// Hide the settings window
		E.settingsWindow.style.display = "none"
		// Hide all setings
		hideAll()
		// Save the config and release it to be updated, but only after it is updated
		uploadConfig().then(()=>controllState.isClientConfigOccupied = false)
	})
	// Save config.target field in the top settings
	E.settingsTargetField.addEventListener("change", (event) => {
		controllState.clientConfig.target = (event.target as HTMLInputElement).value
	})
	// Save the config.port field in the top settings
	E.settingsPortField.addEventListener("change", (event) => {
		controllState.clientConfig.port = parseInt((event.target as HTMLInputElement).value) | 0
		if (controllState.clientConfig.port < 0) controllState.clientConfig.port = 0
	})
	// Edit actions button in the top settings
	E.settingsEdit.addEventListener("click", () => {
		hideAll()
		showList()
	})
	// Back button in action list
	E.settingsBackA.addEventListener("click", () => {
		hideAll()
		showTop()
	})
	// New action button in action list
	E.settingsNewAction.addEventListener("click", () => {
		// Ask for action name
		var actionName = prompt("Enter new action name", "action")
		// Test that the prompt wasn't cancelled, if the name isn't empty or the name isn't used
		if (actionName != null && actionName.length != 0 && controllState.clientConfig.actions.filter(v => v.name == actionName).length == 0) {
			// Make the new action and select it
			state.selectedAction = {
				name: actionName,
				command: ""
			}
			// Add the new action to the state
			controllState.clientConfig.actions.push(state.selectedAction)

			hideAll()
			showEditor()
		}
	})
	// Save the action.name field in the action editor
	E.settingsNameField.addEventListener("change", (event) => {
		state.selectedAction.name = (event.target as HTMLInputElement).value
	})
	// Save the action.command field in the action editor
	E.settingsCommandsField.addEventListener("change", (event) => {
		state.selectedAction.command = (event.target as HTMLInputElement).value
	})
	// The back button in action editor
	E.settingsBackE.addEventListener("click", () => {
		hideAll()
		showList()
	})
	// The delete button in action editor
	E.settingsDelete.addEventListener("click", () => {
		// Delete the selected action, that's currently edited, from the config
		controllState.clientConfig.actions.splice(controllState.clientConfig.actions.indexOf(state.selectedAction),1)
		hideAll()
		showList()
	})


}