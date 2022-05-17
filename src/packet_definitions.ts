import { uuid, milliseconds, Timestamp } from "./shared_definitions";


export interface PingMessage {
	serverTime: Timestamp;
}


export interface EventMessage {
	event: string;
	timeout: Timestamp;
	args: string[];
}
