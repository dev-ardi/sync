import {
	DiscoverMessage,
	EventMessage,
	OffsetMessage,
	PingMessage,
	PongResponse,
} from "./packet_definitions";

export type Signal = "stop" | "start" | "etc";
export type Timestamp = number;
export type milliseconds = number;
export type seconds = number;
export type minutes = number;

export type frames = number;
export type IP = string;
export type IID = string;
export type CallbackCollection = Record<string, (...args: string[]) => void>;
type DiscoverEvent = | "promotion" | "demotion" | "added" | "removed" | "master" | "helloReceived" | "helloEmitted";
export type NodeCollection = Record<IID, Node>;

export interface Node {
	isMaster: boolean;
	isMasterEligible: boolean;
	address: IP;
	lastSeen: Timestamp;
	hostName: string;
	port: number;
	id: IID;
}

export interface IDiscover {
	on(event: DiscoverEvent, callback: (arg: Node) => void): void;
	join(channel: string, callback: (message: any) => void): void;
	leave(channel: string): void;
	send(channel: string, message: DiscoverMessage): void;

	promote(): void;
	demote(): void;

	me: Node;
	nodes: NodeCollection;
	eachNode(fn: () => any): void;

	channels: string[];
}
