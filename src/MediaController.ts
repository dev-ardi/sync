import {
	SEEK_THRESHOLD,
	MAX_SPEEDUP,
	MEDIA_SYNC_LOOP,
	SYNC_DELTA_THRESHOLD,
	AUTOSYNC_THRESHOLD,
} from "./consts";
import { milliseconds, Timestamp } from "./definitions";
import { Client } from "./Client";;

export class MediaController {
	public medium: HTMLMediaElement;
	public initialTime: Timestamp = NaN;
	public scheduled: boolean = false;
	public seek: milliseconds = 0;
	private autosync = 0;
	private count = 0;
	constructor(medium: HTMLMediaElement, client: Client, destroyable = false) {
		this.medium = medium;
		this.medium.onended = () => {
			if (destroyable) client.destroyMedia(this.medium.src);
		};
	}

	public sync(): void {
		/* All units are in ms because
			1) multiply is faster than divide
			2) easier to think about because they are smaller units
			3) you only have to make the division back in the seek case
		*/
		if (!this.scheduled) return;
		if (this.count < 5) {
			this.count++;
			return;
		}
		const targetVideoTime: milliseconds = +new Date() - this.initialTime + this.seek; // Target time now
		const videoNow: milliseconds = this.medium.currentTime * 1000;
		if (this.count === 5) {
			this.count++;
			this.autosync = targetVideoTime - videoNow - this.seek;
		}
		const delta: milliseconds = targetVideoTime - videoNow - this.autosync;

		console.debug(`delta was ${delta}`);
		if (true) {
			//Debug
			document.getElementById(
				"currentTime"
			)!.innerHTML = `abs t0: ${Math.round(
				(this.initialTime - this.seek) % 1000000
			)}
			video time: ${Math.round(videoNow)}\n
			Date : ${Math.round(+new Date() % 1000000)}
			`;
		}
		if (Math.abs(delta) < SYNC_DELTA_THRESHOLD) return;

		if (Math.abs(delta) > SEEK_THRESHOLD) {
			// seek if it's too big.
			this.medium.currentTime += delta / 1000;
			this.medium.playbackRate = 1;
			return;
		}
		const speedupRate = (delta + MEDIA_SYNC_LOOP) / MEDIA_SYNC_LOOP; // AKA how many seconds per second
		if (Math.abs(1 - speedupRate) < MAX_SPEEDUP) {
			this.medium.playbackRate = speedupRate;
			return;
		}
		this.medium.playbackRate =
			speedupRate < 0 ? 1 - MAX_SPEEDUP : 1 + MAX_SPEEDUP;
	}
	public onScheduled() {
		this.initialTime = +new Date();
		this.medium.play()
		console.log(+new Date() - this.initialTime);
		this.scheduled = true;
		this.sync();
	}
}
