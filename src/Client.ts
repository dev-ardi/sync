import dgram from "dgram";
import { EventMessage, mediaTuple } from "./packet_definitions";
import { MEDIA_SYNC_LOOP, TOTAL_PINGS } from "./consts";
import {
	CallbackCollection,
	dMe,
	Discover, mediaCollection,
	milliseconds, seconds
} from "./definitions";
import { Emitter } from "./Emitter";
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
		if (event.event == "Schedule_media")
			event.args.push((event.timeout + performance.now()).toString())
		
		this.emitter!.newEvent(event, this.ping);
	}
	public updateMediaSeek(src: string, remoteTime: seconds) {
		const media = this.media[src];
		const deltaTime: milliseconds = (remoteTime - (+new Date() - media.initialTime + media.seek )) + this.ping ;
		media.seek += deltaTime;
	}
	public async scheduleMedia(src: string) {

		const media = this.findMedia(src)
		if (!media) return
		media.onScheduled();
	}
	public findMedia(src: string){
		if (this.media[src]) return this.media[src]
		const domMedia = getMediaFromSrc(src);
		if (!domMedia) {
			console.error("Media not found!");
			return;
		}
		const media = new MediaController(domMedia, this);
		this.media[src] = media;
		return media
	}
	public destroyMedia(src: string) {
		delete this.media[src];
	}
	public getMediaTimes(): mediaTuple[] {
		const media = [];
		for (const src in this.media) {
			const controller = this.media[src]
			const x: mediaTuple = [controller.medium.src, (+new Date() - controller.initialTime + controller.seek)]
			media.push(x);				
		}
		return media;		
	}
	public destroy(){
		this.CUClient!.destroy()
		this.CUClient = null;
		this.emitter = null;
	}
	// Private methods
	private syncMedia() {
		for (const video in this.media)
			this.media[video].sync();
	}

	//Fields
	private pings: milliseconds[] = [];
	private ping: milliseconds = 0;

	private media: mediaCollection = {};
	private emitter: Emitter | null;

	//Children
	private CUClient: CatchUpClient | null;
	private discover: Discover;
	private master: Master | null;
	private sync: SyncObject;

	constructor(events: CallbackCollection,
		discover: Discover, sync: SyncObject) {
		this.emitter = new Emitter(events);
		this.discover = discover;
		this.sync = sync;
		setInterval(() => this.syncMedia(), MEDIA_SYNC_LOOP);

		this.discover.on("promotion", () => {
			this.master = new Master(discover, this);
			this.sync.master = this.master
			this.sync.onPromotion();
		});
		this.discover.on("demotion", () => {
			this.master!.destroy();
			this.master = null
			this.sync.onDemotion();
		});

		this.discover.on("master", async (master: dMe, b: any, rinfo: dgram.RemoteInfo) => {
				if (this.CUClient) 
					await this.CUClient.destroy();
				this.CUClient = new CatchUpClient(rinfo.address, master.initPort!, this);
				console.log(`Started catch-up client listening to port ${ master.initPort!} from master at address ${rinfo.address}`)
				this.sync.onNewMaster();
			});


		events.Schedule_media = (args) => {
			const src    = args[0];
			const seek   = parseFloat(args[1]);
			this.scheduleMedia(src)
			this.updateMediaSeek(src, seek)
		};

		this.discover.join("event", (event: EventMessage) => 
			this.emitter!.newEvent(event, this.ping)
		);

	}



}
