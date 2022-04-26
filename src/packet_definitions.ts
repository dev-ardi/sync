import { IID, milliseconds, Timestamp } from "./shared_definitions";

export interface DiscoverMessage {
	target?: IID;
}
export interface PongResponse extends DiscoverMessage {
	clientTime: Timestamp;
	serverTime: Timestamp;
}

export interface PingMessage extends DiscoverMessage {
	serverTime: Timestamp;
}

export interface OffsetMessage extends DiscoverMessage {
	offset: milliseconds;
}
export interface EventMessage extends DiscoverMessage {
	event: string;
	timeout: milliseconds;
	args: string[];
}
