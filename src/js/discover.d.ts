import { EventEmitter } from "events";

export interface Options {
  helloInterval?: number;
  checkInterval?: number;
  nodeTimeout?: number;
  masterTimeout?: number;
  address?: string;
  port?: number;
  broadcast?: string;
  multicast?: string;
  multicastTTL?: number;
  unicast?: string | string[];
  key?: string;
  mastersRequired?: number;
  weight?: number;
  client?: boolean;
  reuseAddr?: boolean;
  ignoreProcess?: boolean;
  ignoreInstance?: boolean;
  advertisement?: any;
  hostname?: string;
}

export type ReadyCallback = (error?: Error, success?: boolean) => void;

export interface Node {
  isMaster: boolean;
  weight: number;
  id: string;
  lastSeen: number;
  address: string;
  hostName: string;
  port: number;
}
export interface Me {
  isMaster: boolean;
  weight: number;
  id?: string;
  initPort?: number;
}
export default class Discover extends EventEmitter {
  constructor(options?: Discover.Options, callback?: Discover.ReadyCallback);

  static weight(): number;

  promote(): void;
  demote(permanent?: boolean): void;
  master(node: Discover.Node): void;
  hello(): void;
  advertise(obj: any): void;
  eachNode(fn: (node: Discover.Node) => void): void;
  join(channel: string, fn?: Function): boolean;
  leave(channel: string): boolean;
  send(channel: string, obj: any): boolean;
  start(callback?: Discover.ReadyCallback): void;
  stop(): void;
  on(event: DiscoverEvent, callback: (arg: Me, ...args: any) => void): void;
  me: Me;
  canHello: boolean;
}
