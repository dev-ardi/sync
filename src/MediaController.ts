import {
	SEEK_THRESHOLD,
	MAX_SPEEDUP,
	MEDIA_SYNC_LOOP,
	SYNC_DELTA_THRESHOLD
} from "./consts";
import { milliseconds, Timestamp } from "./definitions";
import { Client } from "./Client";



export class MediaController {
	public medium: HTMLMediaElement;
	public initialTime: Timestamp = NaN;
	public scheduled: boolean = false;
	public seek: milliseconds = 0;

	constructor(medium: HTMLMediaElement, client: Client, destroyable = false) {
		this.medium = medium;
		this.medium.onended = () => {
			if (destroyable)
				client.destroyMedia(this.medium.src);
		};

	}
	public sync(): void {
		/* All units are in ms because
			1) multiply is faster than divide
			2) easier to think about because they are smaller units
			3) you only have to make the division back in the seek case
		*/
		if (!this.scheduled)
			return;
		const targetVideoTimeAtNextTick: milliseconds = Date.now() - this.initialTime + // Target time now
			MEDIA_SYNC_LOOP + // Target time then
			this.seek; // Account for initial seek offset
		const videoNow: milliseconds = this.medium.currentTime * 1000;
		const delta: milliseconds = targetVideoTimeAtNextTick - videoNow;
		console.log(`delta was ${delta}`)
		if (true)
			//Debug
			//@ts-ignore
			document.getElementById("currentTime").innerHTML =
				//@ts-ignore
				`abs t0: ${Math.round((window.absoluteT0 - this.seek) % 1000000)}
			video time: ${Math.round(videoNow)}\n
			perf.now: ${Math.round(performance.now())}
			`;
		if (Math.abs(delta) < SYNC_DELTA_THRESHOLD)
			return;

		if (Math.abs(delta) > SEEK_THRESHOLD) {
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
	public onScheduled() {
		this.medium.play();
		this.scheduled = true;
		this.initialTime = Date.now(); 
		this.sync();
	}
}
