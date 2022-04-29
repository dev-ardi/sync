import {
	CallbackCollection,
	IMediaController,
	ISyncedEventEmitter,
} from "../client_definitions";
import {
	EVENT_REFRESHABLE,
	FRAME_THRESHOLD,
	MAX_SPEEDUP,
	MEDIA_POLL_TIME,
} from "../shared_consts";
import { milliseconds, seconds, Timestamp } from "../shared_definitions";

export class MediaController implements IMediaController {
	public medium: HTMLMediaElement;
	private _t0: Timestamp;
	private scheduled: boolean = false;

	constructor(medium: HTMLMediaElement) {
		this.medium = medium;
	}
	public sync(x: Timestamp): void {
		if (!this.scheduled) return;
		const targetTimeAtNextTick: seconds = x - this._t0; // TODO rename
		const delta: seconds = this.medium.currentTime - targetTimeAtNextTick;
		if (delta > FRAME_THRESHOLD) {
			this.medium.currentTime += delta - MEDIA_POLL_TIME / 1000;
			return;
		}
		const speedup =
			targetTimeAtNextTick / MEDIA_POLL_TIME -
			this.medium.defaultPlaybackRate;
		if (Math.abs(speedup) < MAX_SPEEDUP) {
			this.medium.defaultPlaybackRate += speedup;
			return;
		}
		this.medium.defaultPlaybackRate =
			speedup < 0 ? 1 - MAX_SPEEDUP : 1 + MAX_SPEEDUP;
	}
	public onScheduled(seek: number) {
		this.medium.currentTime = seek;
		this.medium.play();
		this.scheduled = true;
		this._t0 = performance.now() + seek * 1000; // TODO does this work with seek?
	}
	
}

interface TimeoutHolder {
	callback: string;
	target: Timestamp;
	args: string[];
	timeoutID: number;
}
export class SyncedEmitter implements ISyncedEventEmitter {
	readonly callbacks: CallbackCollection;
	_refreshable: Array<TimeoutHolder> = [];

	constructor(callbacks: CallbackCollection) {
		this.callbacks = callbacks;
	}

	public eventIn(callback: string, In: milliseconds, args: string[]): void {
		try {
			const timeout = setTimeout(this.callbacks[callback], In, args);

			if (In / 60000 > EVENT_REFRESHABLE)
				this._refreshable.push({
					callback: callback,
					target: performance.now() + In,
					args: args,
					timeoutID: timeout,
				});
		} catch (e) {
			throw new Error(
				`[ERROR] El evento ${callback} no está definido.\n${e}`
			);
		}
	}

	public sync(delta: milliseconds): void {
		const now = performance.now() + delta;
		for (const holder of this._refreshable) {
			clearTimeout(holder.timeoutID);
			holder.timeoutID = setTimeout(holder.callback, now, holder.args);
		}
		
	}
}
