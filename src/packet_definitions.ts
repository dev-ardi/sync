import { milliseconds, seconds, Timestamp } from "./definitions";

export type eventMessages = Record<string, EventMessage>; //Need a unique id and a uuid is overkill
export type mediaTuple = [src: string, seek: seconds];
export interface EventMessage {
  event: string;
  timeout: milliseconds;
  args: string[];
}

export interface CatchupMessage {
  events?: eventMessages;
  media?: mediaTuple[];
}
