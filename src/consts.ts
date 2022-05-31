import { milliseconds, minutes } from "./definitions";
export const MEDIA_SYNC_LOOP: milliseconds = 150; // TODO: Auto adjust too
export const EVENT_SYNC_LOOP: minutes = 1;
export const MAX_SPEEDUP: number = 0.4; // This shouldn't be noticeable. when it is we should just seek.
export const SEEK_THRESHOLD: milliseconds = 300; //  
export const PING_LOOP_TIMEOUT: milliseconds = 200;
export const MEDIA_UPDATE_LOOP_TIMEOUT: milliseconds = 2000;


export const TOTAL_PINGS = 20; 
export const SYNC_DELTA_THRESHOLD: milliseconds = 25;
export const EVENT_TIMEOUT: milliseconds = 150
export const AUTOSYNC_THRESHOLD: milliseconds = 2