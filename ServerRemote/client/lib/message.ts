/** Type of the request or response */
type MessageType = "update"
| "command"
| "action"
| "createAction"
| "error"
| "kill"
| "start"

export interface IAction {
	name: string
	command: string
}

/** Response from server */
export interface IResponseMessage {
	/** Type of message */
	type: MessageType
	/** Error that ocurred */
	err?: string
	/** Console lines that appeared between updates */
	lines?: string
	/** Actions created */
	actions?: Array<IAction>
	/** Is server target process active */
	active?: boolean
}

/** Reqest sent to the server */
export interface IRequestMessage {
	type: MessageType
	/** Timestamp of the prev request used for providing console, used in console type */
	lastTime?: number
	/** Command to execute */
	command?: string
	/** Action to execute */
	action?: string
	/** Action creation data */
	createAction?: IAction
}