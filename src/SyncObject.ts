import { randomUUID } from "crypto";
import dgram from "dgram";
import { EventMessage, eventMessages } from "./packet_definitions";
import {
	CallbackCollection,
	Discover,
	IP,
	milliseconds,
	queue,
	seconds} from "./definitions";
import { resolve } from "path";
import { Client } from "./Client";
const node_discover = require("node-discover");


export class SyncObject {

	public addEventIn(event: string, timeout: milliseconds, ...args: string[]) {
		if (!this.discover.me.isMaster) {
			console.error(
				"error: El cliente no es maestro, el evento no se emitirá."
			);
			return;
		}
		const message: EventMessage = {
			event: event,
			timeout: timeout,
			args,
		};
		this.send("event", message); // TODO websocket
		const uuid = randomUUID();
		const events = this.eventsIn;
		events[uuid] = message;
		setTimeout(()=> delete events[uuid], timeout);
	}
	public scheduleMedia(
		media: HTMLMediaElement,
		schedule: milliseconds,
		seek: seconds = 0
	) {
		this.addEventIn("Schedule_media", schedule, media.src, seek.toString());
	}
	public onPromotion: (...args: any) => any = () => {};
	public onDemotion: (...args: any) => any = () => {};
	public onNewMaster: (...args: any) => any = () => {};
	// PRIVATE METHODS
	private send(channel: string, message: any): void {
		// discover.send wrapper
		this.discover.send(channel, message);
	}
	_socket: dgram.Socket | null = null;
	private _onPromotion() {
		this._socket = dgram.createSocket("udp4");

		this._socket.bind();
		this._socket.on("listening", ()=> {
			this.discover.me.initPort = this._socket!.address().port;
			this.discover.canHello = true;
			this.discover.hello();
		})

		this._socket.on("message", (msg, rinfo) => {
			const getMedia = ()=> {
				return this._media // Current playing media
				.filter((element) => element.scheduled)
				.map((element) => [
					element.medium.src,
					element.medium.currentTime,
				])
			}
			const message = msg.toString();
			let response;
			switch (message) {
				case "getevents":
					response = JSON.stringify({
						events: this.eventsIn,
						media: getMedia()
				  })
					break;
				  case "getTimes":
					response = JSON.stringify(()=>{ let x = {
						events: this.eventsIn,
						media: getMedia()
				  }})
				default:
					response = new Uint8Array()
					break;
			}
			this._socket!.send(response, rinfo.port, rinfo.address);
		});
	}


	private client: Client
	constructor(
		events: CallbackCollection | null = null,
		paramDiscover: Discover | null = null
	) {
		const discover = paramDiscover || new node_discover({
			ignoreProcess: false,
			ignoreInstance: false
		});
		this.client = new Client(events, discover)
	}

	}
	
