import {
  SEEK_THRESHOLD,
  MAX_SPEEDUP,
  MEDIA_SYNC_LOOP,
  SYNC_DELTA_THRESHOLD,
} from "./consts";
import { milliseconds, Timestamp } from "./definitions";
import { Client } from "./Client";

export class MediaController {
  public medium: HTMLMediaElement;
  public initialTime: Timestamp = NaN;
  public scheduled: boolean = false;
  public seek: milliseconds = 0;

  constructor(medium: HTMLMediaElement, client: Client) {
    this.medium = medium;
    this.medium.addEventListener("ended", () =>
      client.destroyMedia(this.medium.src)
    );
  }
  public sync(): void {
    /* All units are in ms because
			1) multiply is faster than divide
			2) easier to think about because they are smaller units
			3) you only have to make the division back in the seek case
		*/
    if (!this.scheduled) return;
    const targetVideoTimeAtNextTick: milliseconds =
      +new Date() -
      this.initialTime + // Target time now
      this.seek; // Account for initial seek offset
    const videoNow: milliseconds = this.medium.currentTime * 1000;
    const delta: milliseconds = targetVideoTimeAtNextTick - videoNow;
    if (true)
      //Debug

      document.getElementById("currentTime")!.innerHTML =
        //@ts-ignore
        `${window.isMaster() ? "Master" : "Slave"} 
			t0: ${Math.round((this.initialTime - this.seek) % 1000000)}
			video time: ${Math.round(videoNow)} 
			delta: ${delta}`;

    return;
    if (Math.abs(delta) < SYNC_DELTA_THRESHOLD) {
      this.medium.playbackRate = 1;
      return;
    }

    if (Math.abs(delta) > (1 + MAX_SPEEDUP) * MEDIA_SYNC_LOOP) {
      // 210 with current settings
      // seek if it's too big.
      this.medium.currentTime += delta / 1000;
      this.medium.playbackRate = 1;
      return;
    }
    const speedupRate = delta / MEDIA_SYNC_LOOP; // AKA how many seconds per second
    if (Math.abs(speedupRate) < MAX_SPEEDUP) {
      this.medium.playbackRate = 1 + speedupRate;
      return;
    }
    this.medium.playbackRate =
      speedupRate < 0 ? 1 - MAX_SPEEDUP : 1 + MAX_SPEEDUP;
  }
  public onScheduled() {
    this.medium.play();
    this.scheduled = true;
    this.initialTime = +new Date();
    this.sync();
  }
}
