import { milliseconds, seconds } from "./definitions";


export type eventMessages = Record<string, EventMessage>
export type mediaTuple = [src: string, seek: seconds];
export interface EventMessage {
	event: string;
	timeout: milliseconds;
	args: string[];
}

export interface CatchupMessage{
	events?: eventMessages;
	media?: mediaTuple[]
}