import { EVENT_TIMEOUT } from "./consts";
import { CallbackCollection, milliseconds, queue, Timestamp } from "./definitions";
import { avg, enqueue } from "./utils";

export class Emitter {
	readonly callbacks: CallbackCollection;
	ping;
	delay = 0
	delays: queue<milliseconds> = []
	constructor(
		callbacks: CallbackCollection,
		pingByRef: { ping: milliseconds }
	) {
		this.ping = pingByRef;
		this.callbacks = callbacks;
	}

	public eventIn(callback: string, argIn: milliseconds, args: string[]): void { 
		//TODO move pings to caller
		//TODO pass actual callback
		let In = argIn - this.ping.ping
		if (In < -EVENT_TIMEOUT) {
			console.log(`event expired by ${-(In - EVENT_TIMEOUT)}ms `);
			return;
		}
		In -= this.delay
		console.log("Will launch at (date): " + (In + +new Date()) % 1000000)
		
		if (callback == "Schedule_media"){ // Ugly af change pls
			args.push((In + performance.now()).toString())
		}
		try {
			const at = argIn + performance.now() - this.ping.ping; //TODO
			setTimeout( ()=>this.scheduledEvent(this.callbacks[callback], at, args), In);
		} catch (e) {
			console.log(
				`WARNING: El evento ${callback} no está definido.\n${e}`
			);
		}
	}
	private scheduledEvent(callback: Function, at: Timestamp, args: any ){
		callback(args)
		enqueue(this.delays, performance.now() - at, 5)
		this.delay = avg(this.delays)
	}
}
