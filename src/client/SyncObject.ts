import { IRemoteProvider } from "../client_definitions";
const node_discover = require("node-discover");
import {
	CallbackCollection,
	IDiscover,
	milliseconds,
	seconds,
	Signal,
	Timestamp,
} from "../shared_definitions";
import { Sync } from "../server/Sync";
import { Node, IID } from "../shared_definitions";
import {
	DiscoverMessage,
	EventMessage,
	OffsetMessage,
	PingMessage,
	PongResponse,
} from "../packet_definitions";
import { MediaController, SyncedEmitter } from "./controllers";
import {
	EVENT_SYNC_THRESHOLD,
	MEDIA_POLL_TIME,
	MEDIA_SYNC_THRESHOLD,
	SYNC_ON_PING_THRESHOLD,
} from "../shared_consts";

export class SyncObject implements IRemoteProvider {
	public discover: IDiscover;
	public sync: Sync | null = null;
	public addEventIn(event: string, timeout: milliseconds, ...args: string[]) {
		if (!this.discover.me.isMaster) {
			throw new Error("ERROR: El cliente no es maestro");
		}
		if (args.length != this._eventList[event].arguments.lenght) {
			throw new Error("ERROR: Número incorrecto de argumentos");
		}
		const message: EventMessage = {
			event: event,
			timeout: timeout,
			args,
		};
		this.send("event", message);
	}
	public scheduleMedia(
		media: HTMLMediaElement,
		schedule: milliseconds,
		seek: seconds = 0
	) {
		if (!this.discover.me.isMaster) {
			throw new Error("ERROR: El cliente no es maestro");
		}
		const msg: EventMessage = {
			event: "Schedule_media",
			timeout: schedule,
			args: [media.src, seek.toString()],
		};
		let x: any;
		this.send("event", msg);
	}
	public addMediaController(media: HTMLMediaElement): void {
		// TODO: remove controller?
		this._media.push(new MediaController(media));
	}
	public sendSignal(signal: Signal): void {
		// requests something to all other clients
		throw new Error("Not Implemented");
	}

	// PRIVATE METHODS
	private send(channel: string, message: DiscoverMessage): void {
		// discover.send wrapper
		this.discover.send(channel, message);
	}
	private _isMessageForMe(id?: IID): boolean {
		return id === this.discover.me.id;
	}

	private _forceUpdates(): void {
		if (this._offsetDelta < MEDIA_SYNC_THRESHOLD) {
			const x =
				(performance.now() + this._offset + MEDIA_POLL_TIME) / 1000; // TODO rename
			this._media.forEach((element) => element.sync(x));
		}
		if (this._offsetDelta < EVENT_SYNC_THRESHOLD)
			this._emitter.sync(this._offsetDelta);
	}
	
	private _media: MediaController[];
	private _emitter: SyncedEmitter;

	private _peers: Node[] = [];
	private _eventList: CallbackCollection;

	private _offset = 0;
	private _averageTimeoutDelay: milliseconds = 0;
	private _skew: milliseconds = 0;
	private _offsetDelta: milliseconds = 0;

	constructor(
		events: CallbackCollection | null = null,
		paramDiscover: IDiscover | null = null
	) {
		this._eventList = events || {};

		{ // Init discover			 
			this.discover = paramDiscover || new node_discover({}, () => {});


			this.discover.on("promotion", () => {
				this.sync = new Sync(this);
			});
			this.discover.on("demotion", () => {
				this.sync = null;
			});
			this.discover.on("master", () => {
				this._offset = 0;
				this._averageTimeoutDelay = 0;
				this._skew = 0;
				this._offsetDelta = 0;
			});
			this.discover.join("ping", (message: PingMessage) => {
				const msg: PongResponse = {
					serverTime: message.serverTime,
					clientTime: performance.now(),
					target: this.discover.me.id,
				};
				this.send("pong", msg);
			});
			this.discover.join("offset", (message: OffsetMessage) => {
				if (!this._isMessageForMe(message.target)) return;

				this._offsetDelta = message.offset - this._offset;
				this._offset = message.offset;
				if (this._offsetDelta > SYNC_ON_PING_THRESHOLD)
					this._forceUpdates();
			});


			this._eventList.Schedule_media = (src, seek) => {
				const medium = this._media.find(
					(mediaController) => mediaController.medium.src === src
				);
				if (!medium) throw new Error("ERROR: Medio no encontrado");

				medium.onScheduled(parseFloat(seek));
			};

			this.discover.join("event", (event: EventMessage) => {
				this._emitter.eventIn(
					event.event,
					event.timeout + this._offset,
					event.args
				);
			});
		}
		this._media = [];
		this._emitter = new SyncedEmitter(this._eventList);

	}
}
