import { IMediaController } from "./client_definitions";
import {
	FRAME_THRESHOLD,
	MAX_SPEEDUP,
	MEDIA_SYNC_LOOP,
	SYNC_DELTA_THRESHOLD,
} from "./shared_consts";
import { milliseconds, seconds, Timestamp } from "./shared_definitions";

export class MediaController implements IMediaController {
	public medium: HTMLMediaElement;
	private _t0: Timestamp = NaN;
	public scheduled: boolean = false;
	public seek0: milliseconds = 0;

	constructor(medium: HTMLMediaElement) {
		this.medium = medium;
	}
	public sync(offset: milliseconds): void {
		/* All units are in ms because 
			1) multiply is faster than divide
			2) easier to think about because they are smaller units
			3) you only have to make the division back in the seek case
		*/
		if (!this.scheduled) return;
		const targetVideoTimeAtNextTick: milliseconds =
			performance.now() -
			this._t0 + // Target time now
			this.seek0 + // Account for initial seek offset
			MEDIA_SYNC_LOOP + // Target time then
			offset; // Account for the delay or something
			const videoNow: milliseconds = this.medium.currentTime * 1000;
			const delta: milliseconds = targetVideoTimeAtNextTick - videoNow;
		// DEBUG:
		const debugInfo = {
			targetNow : performance.now() - this._t0,
			targetThen : performance.now() - this._t0 + MEDIA_SYNC_LOOP,
			targetAfterSeek : performance.now() - this._t0 + MEDIA_SYNC_LOOP + this.seek0,
			delta: delta,
			gap: delta - MEDIA_SYNC_LOOP,
			t0: this._t0, // Target time now
			seek0: this.seek0, // Account for initial seek offset
		};
		//console.log(JSON.stringify(debugInfo))
		if (true)
			//Debug
			//@ts-ignore
			document.getElementById("currentTime").innerHTML =
				//@ts-ignore
				`abs t0: ${Math.round(window.absoluteT0)}
			video time: ${Math.round(this.medium.currentTime * 1000)}\n
			perf.now: ${Math.round(performance.now())}
			`;
		if (Math.abs(delta) < SYNC_DELTA_THRESHOLD) 
			return

		if (Math.abs(delta) > FRAME_THRESHOLD) {
			// seek if it's too big.
			this.medium.currentTime +=
				(delta - MEDIA_SYNC_LOOP) / 1000;
			this.medium.playbackRate = 1;
			return;
		}
		const speedupRate = delta / MEDIA_SYNC_LOOP; // AKA how many seconds per second
		if (Math.abs(1 - speedupRate) < MAX_SPEEDUP) {
			this.medium.playbackRate = speedupRate;
			return;
		}
		this.medium.playbackRate =
			speedupRate < 0 ? 1 - MAX_SPEEDUP : 1 + MAX_SPEEDUP;
	}
	public onScheduled(seek: seconds, t0: Timestamp) {
		this.medium.currentTime = seek;
		this.medium.onended = () => (this.scheduled = false);
		this.seek0 = seek * 1000;
		this.medium.play();
		this.scheduled = true;
		this._t0 = t0; // Date.getTime is faster than performance.now() and we don't need that much precision
		//@ts-ignore
		window.absoluteT0 = (+new Date() - this.seek0) % 10000;
		this.sync(0);
	}
}
