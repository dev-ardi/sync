import { MediaController } from "./MediaController";
import { Me } from "./js/discover";

export type Signal = "stop" | "start" | "etc";
export type Timestamp = number;
export type milliseconds = number;
export type seconds = number;
export type minutes = number;

export type frames = number;
export type IP = string;
export type uuid = string;
export type CallbackCollection = Record<string, (...args: string[]) => void>;
export type NodeCollection = Record<uuid, Me>;
export type mediaCollection = Record<string, MediaController>;
export type queue<T> = Array<T>;

type DiscoverEvent =
  | "promotion"
  | "demotion"
  | "added"
  | "removed"
  | "master"
  | "helloReceived"
  | "helloEmitted";
