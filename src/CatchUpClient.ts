import dgram from "dgram";
import {
	CatchupMessage,
	eventMessages,
	mediaTuple,
} from "./packet_definitions";
import {
	MEDIA_UPDATE_LOOP_TIMEOUT,
	PING_LOOP_TIMEOUT,
	TOTAL_PINGS,
} from "./consts";
import { IP, milliseconds, seconds } from "./definitions";
import { Client } from "./Client";


export class CatchUpClient {
	public async destroy(): Promise<void> {
		return new Promise<void>((resolve) =>
			this.socket.close(() => resolve())
		);
	}
	//Methods
	private send(msg: any) {
		this.socket!.send(msg, this.port, this.address);
	}
	private ping() {
		this.send(new Uint8Array());
	}
	private requestData() {
		this.send("getevents");
	}
	private askVideoTimes() {
		this.send("getTimes");
	}
	private receiver(msg: Uint8Array) {
		this.client.addPing((performance.now() - this.t0) / 2);
		if (msg.length > 0) {
			// Resync
			const message: CatchupMessage = JSON.parse(msg.toString());
			if (!this.locked) {
				window.clearTimeout(this.pingsTimeout);
				this.processEvents(message.events!);
				this.processMedia(
					message.media!,
					(src: string) => {
						console.log(
							"Scheduled via catch-up at " +
								(+new Date() % 1000000)
						);
						this.client.scheduleMedia(src);
					}
				);
				this.locked = true;
			}
			this.processMedia(message.media!, (src: string, seek: seconds) =>
				this.client.updateMediaSeek(src, seek)
			);
		}
	}
	private processEvents(events: eventMessages) {
		this.client.computePings();
		for (const event in events) {
			if (Object.prototype.hasOwnProperty.call(events, event)) {
				const element = events[event];
				this.client.receivedEvent(element);
			}
		}
	}
	private processMedia(
		media: mediaTuple[],
		callback: (src: string, seek: seconds) => void
	) {
		for (const tuple of media) {
			if (this.client.getMedia(tuple[0])) callback(tuple[0], tuple[1]);
			else console.log(`Warning: medium ${tuple[0]} not found!`);
		}
	}
	//Fields
	private socket: dgram.Socket;
	private pingsTimeout: number;
	private address;
	private port;
	private t0: milliseconds;
	private locked = false; // TODO move
	private client;
	constructor(address: IP, port: number, client: Client) {
		this.address = address;
		this.port = port;
		this.client = client;

		this.socket = dgram.createSocket("udp4");
		this.socket.bind();
		this.socket.on("listening", () => {
			// I specify window because typescript gets confused
			this.pingsTimeout = window.setTimeout(() => {
				console.error("data not received");
			}, 5000);
			// Initial pinging
			this.t0 = performance.now();
			for (let index = 0; index < TOTAL_PINGS; index++) this.ping();
			this.requestData();
			this.t0 = (this.t0 + performance.now()) / 2;
			//Setup receiver
			this.socket!.on("message", (msg) => this.receiver(msg));

			//Ping intervals
			setInterval(() => {
				this.ping();
				this.t0 = performance.now();
			}, PING_LOOP_TIMEOUT);
			setInterval(() => {
				this.askVideoTimes();
				this.t0 = performance.now();
			}, MEDIA_UPDATE_LOOP_TIMEOUT);
		});
	}
}
