import { milliseconds, minutes } from "./shared_definitions";
export const EVENT_REFRESHABLE: minutes = 5; // TODO: Calculate based on the skew
export const MEDIA_SYNC_LOOP: milliseconds = 1000; // TODO: Auto adjust too
export const EVENT_SYNC_LOOP: minutes = 1;
export const MAX_SPEEDUP: number = 0.2; // This shouldn't be noticeable. when it is we should just seek.
export const FRAME_THRESHOLD: milliseconds = 200; //  
export const PING_LOOP_TIMEOUT: milliseconds = 200;
export const MEDIA_UPDATE_LOOP_TIMEOUT: milliseconds = 300;


export const TOTAL_PINGS = 20; // whatever, could be adjusted in another way
export const SYNC_DELTA_THRESHOLD: milliseconds = 15;
export const EVENT_TIMEOUT: milliseconds = 50
