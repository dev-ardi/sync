import { frames, milliseconds, minutes, seconds } from "./shared_definitions";
//client
export const MEDIA_POLL_TIME: milliseconds = 10; // TODO: Auto adjust too
export const MEDIA_SYNC_THRESHOLD: milliseconds = 20;
export const EVENT_SYNC_THRESHOLD: milliseconds = 5;
export const SYNC_ON_PING_THRESHOLD: milliseconds = 2;
export const EVENT_REFRESHABLE: minutes = 5; // TODO: Calculate based on the skew

export const MAX_SPEEDUP: number = 0.2;
export const FRAME_THRESHOLD: seconds = 0.5;
//server
export const MAX_OFFSET_ARRAY_LENGHT = 5;
export const TODO: milliseconds = 999999;
export const SEND_FREQUENCY: milliseconds = 10; // Defined so that SEND_FREQUENCY / skew == 1 ms
