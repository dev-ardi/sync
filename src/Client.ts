import dgram from "dgram";
import { EventMessage, mediaTuple } from "./packet_definitions";
import { MEDIA_SYNC_LOOP, TOTAL_PINGS } from "./consts";
import {
	CallbackCollection,
	dMe,
	Discover, mediaCollection,
	milliseconds, seconds
} from "./definitions";
import { Emitter } from "./SyncedEmitter";
import { avg, enqueue, getMediaFromSrc } from "./utils";
import { CatchUpClient } from "./CatchUpClient";
import { SyncObject } from "./SyncObject";
import { MediaController } from "./MediaController";
import { Master } from "./Master";


export class Client {
	public addPing(ping: milliseconds) {
		enqueue(this.pings, ping, TOTAL_PINGS); // TODO avg?
	}
	public computePings(ping?: milliseconds) {
		if (ping)
			this.addPing(ping);
		this.ping = avg(this.pings);
	}
	public receivedEvent(event: EventMessage) {
		this.emitter.newEvent(event);
	}
	public updateMediaSeek(src: string, seek: seconds) {
		const media = this.media[src];
		media.medium.currentTime = seek + this.ping / 1000;
		media.seek = seek * 1000;
	}
	public scheduleMedia(src: string, timeout = 0) {
		const domMedia = getMediaFromSrc(src);
		if (!domMedia) {
			console.error("Media not found!");
			return;
		}
		const media = new MediaController(domMedia, this);
		this.media[src] = media;
		media.onScheduled(timeout + performance.now());
	}
	public destroy(src: string) {
		delete this.media[src];
	}
	public getMedia(src: string) {
		return this.media[src];
	}

	public getMediaTimes(): mediaTuple[] {
		const media = [];
		for (const key in this.media) {
			if key.
				
		}
		return media;
		
	}
	// Private methods
	private syncMedia() {
		for (const video in this.media)
			this.media[video].sync();
	}

	//Fields
	private pings: milliseconds[];
	private ping: milliseconds;
	private media: mediaCollection = {};
	private emitter;

	//Children
	private CUClient: CatchUpClient;
	private discover: Discover;
	private master: Master | null;

	constructor(events: CallbackCollection | null = null,
		discover: Discover, sync: SyncObject) {
		this.emitter = new Emitter(events);
		this.discover = discover;
		setInterval(() => this.syncMedia(), MEDIA_SYNC_LOOP);

		this.discover.on("promotion", () => {
			this.master = new Master(discover);
			sync.onPromotion();
		});
		this.discover.on("demotion", () => {
			this.CUClient.destroy();
			sync.onDemotion();
		});

		this.discover.on("master", async (master: dMe, b: any, rinfo: dgram.RemoteInfo) => {
				if (this.CUClient) 
					await this.CUClient.destroy();				
				this.CUClient = new CatchUpClient(rinfo.address, master.initPort!, this);
				sync.onNewMaster();
			});


		this._eventList.Schedule_media = (args) => {
			const src    = args[0];
			const seek   = parseFloat(args[1]);
			const target = parseFloat(args[2]);
			
			const medium = this._media.find(
				(mediaController) => mediaController.medium.src === src
			);
			if (!medium) throw new Error("ERROR: Medio no encontrado");
			console.log("Scheduled via event at " + (+new Date() % 1000000));

			medium.onScheduled(seek, target);
		};

		this.discover.join("event", (event: EventMessage) => {
			this._emitter.eventIn(
				event.event,
				event.timeout,
				event.args
			);
		});

	}



}
