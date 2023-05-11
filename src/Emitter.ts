import { EVENT_TIMEOUT } from "./consts";
import {
  CallbackCollection,
  milliseconds,
  queue,
  Timestamp,
} from "./definitions";
import { EventMessage } from "./packet_definitions";
import { avg, enqueue } from "./utils";

export class Emitter {
  readonly callbacks: CallbackCollection;
  delay = 0;
  delays: queue<milliseconds> = [];
  constructor(callbacks: CallbackCollection) {
    this.callbacks = callbacks;
  }
  public newEvent(event: EventMessage, ping: milliseconds) {
    let timeout = event.timeout - ping;
    if (timeout < -EVENT_TIMEOUT) {
      console.log(`event expired by ${-(timeout - EVENT_TIMEOUT)}ms `);
      return;
    }
    timeout -= this.delay;
    try {
      const at = timeout + performance.now() + ping;
      setTimeout(
        () => this.scheduledEvent(this.callbacks[event.event], at, event.args),
        timeout
      );
    } catch (e) {
      console.error(`ERROR: El evento ${event.event} no está definido.\n${e}`);
    }
  }
  public getEvents() {
    return this.callbacks;
  }
  private scheduledEvent(callback: Function, at: Timestamp, args: any) {
    callback.apply(null, args);
    enqueue(this.delays, performance.now() - at, 5);
    this.delay = avg(this.delays);
  }
}
