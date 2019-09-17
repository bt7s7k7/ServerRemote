import { IAction } from "./client/lib/message"

/** Inteface of the config json file */
export interface IConfig {
	/** The port to use */
	port: number,
	/** Target file to run */
	target: string,
	actions: IAction[]
}
