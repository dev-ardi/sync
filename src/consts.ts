import { milliseconds, minutes } from "./definitions";
export const MEDIA_SYNC_LOOP: milliseconds = 500; // TODO: Auto adjust too
export const MAX_SPEEDUP: number = 0.4; // This shouldn't be noticeable. when it is we should just seek.
export const SEEK_THRESHOLD: milliseconds = 300; //  
export const PING_LOOP_TIMEOUT: milliseconds = 200;
export const MEDIA_LOOP_TIMEOUT: milliseconds = 10000;


export const TOTAL_PINGS = 20; 
export const SYNC_DELTA_THRESHOLD: milliseconds = 15; // < 1 frame a 30fps
export const EVENT_TIMEOUT: milliseconds = 150
