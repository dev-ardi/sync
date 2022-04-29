import { ISync } from "../server_definitions";
import { SEND_FREQUENCY, TODO } from "../shared_consts";
import {
	Node,
	uuid,
	milliseconds,
	Signal,
	Timestamp,
} from "../shared_definitions";
import { Client } from "./client";
import { performance } from "perf_hooks";
import { PongResponse, PingMessage } from "../packet_definitions";
import { SyncObject } from "../client/SyncObject";

export class Sync implements ISync {
	private _provider: SyncObject;

	private sync = this;
	clients: Client[] = [];

	constructor(provider: SyncObject) {
		this.clients.push(new Client(provider.discover.me, provider));
		for (const node in provider.discover.nodes) {
			const element: Node = provider.discover.nodes[node];
			this.clients.push(new Client(element, provider));
		}

		{
			// init discover
			this._provider = provider;
			provider.discover.join("pong", this.onPong);
			provider.discover.on("added", (node: Node) => {
				this.onDiscovery(node);
			});
			provider.discover.on("removed", (node: Node) => {
				this.onDrop(node);
			});
		}
		this._loop();
	}

	private _loop(): void {
		this._ping();
		const highestSkew = Math.max(
			...this.clients.map((client) => client.skew)
		);
		setTimeout(() => {
			this._loop();
		}, 15);
	}
	private onPong(pong: PongResponse) {
		const client = this.sync._getClientFromIID(pong.target!);
		client.pong(pong.serverTime, pong.clientTime);
	}
	private onDiscovery(element: Node): void {
		this.sync.clients.push(new Client(element, this._provider))
	}
	private onDrop(Client: any): void {}
	private onSignal(signal: Signal): void {} //TODO implement

	_ping(): void {
		const message: PingMessage = {
			serverTime: performance.now(),
		};
		this._provider.discover.send("ping", message);
		// TODO Grupo de sync
	}
	private _getClientFromIID(id: uuid): Client {
		let client = this.clients.find(client => client.element.iid === id) 
		if (!client) throw new Error();
		return client

	}
}
