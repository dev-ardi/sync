import { uuid, milliseconds, Timestamp, seconds } from "./shared_definitions";


export interface PingMessage {
	serverTime: Timestamp;
}

export type eventMessages = Record<string, EventMessage>
export interface EventMessage {
	event: string;
	timeout: Timestamp;
	args: string[];
}

export interface CatchupMessage{
	events?: eventMessages;
	media?: [src: string, seek: seconds][];
}