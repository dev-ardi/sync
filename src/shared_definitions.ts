import { isPromise } from "util/types";
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
export type uuid = string;
export type CallbackCollection = Record<string, (...args: string[]) => void>;
export type NodeCollection = Record<uuid, Node>;

type DiscoverEvent = | "promotion" | "demotion" | "added" | "removed" | "master" | "helloReceived" | "helloEmitted";

export interface Node {
	isMaster: boolean;
	isMasterEligible: boolean;
	weight: number,
	address: IP;
	iid: uuid;
}
interface objSend {
	event : string;
	pid : uuid;
	iid : uuid;
	hostName : string;
	data: any;
}
interface rinfo {	
	address: IP;
	family: string;
	port: number;
	size: number;
	  
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
