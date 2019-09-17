import { IConfig } from "../../configInterface"

/** Type of the request or response */
type MessageType = "update"
	| "command"
	| "action"
	| "error"
	| "kill"
	| "start"
	| "ping"
	| "getConfig"
	| "setConfig"

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
	/** Is server target process active */
	active?: boolean,
	/** The time the config was last changed */
	lastConfigChange?: number
	/** Current config */
	config?: IConfig
}

/** Reqest sent to the server */
export interface IRequestMessage {
	type: MessageType
	/** Timestamp of the prev request used for providing console, used in console type */
	lastTime?: number
	/** Command to execute */
	command?: string
	/** New config to set */
	config?: IConfig
}