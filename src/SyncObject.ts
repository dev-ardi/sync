import { Discover } from "../module";
import { Client } from "./Client";
import { CallbackCollection, milliseconds, seconds } from "./definitions";
import { Master } from "./Master";
import { EventMessage } from "./packet_definitions";

export class SyncObject {
  public master: Master | undefined;
  private client: Client;
  public scheduleEvent(
    event: string,
    timeout: milliseconds,
    ...args: string[]
  ) {
    if (!this.master) {
      console.error(
        "error: El cliente no es maestro, el evento no se emitirá."
      );
      return;
    }
    const message: EventMessage = {
      event: event,
      timeout: timeout,
      args,
    };
    this.master.scheduleEvent(message);
  }
  public scheduleMedia(src: string, schedule: milliseconds, seek: seconds = 0) {
    this.scheduleEvent("Schedule_media", schedule, src, seek.toString());
  }
  public onPromotion: (...args: any) => any = () => {};
  public onDemotion: (...args: any) => any = () => {};
  public onNewMaster: (...args: any) => any = () => {};
  public isMaster() {
    return this.master ? true : false;
  }
  public destroy() {
    this.master?.destroy();
    this.client.destroy();
  }
  constructor(events?: CallbackCollection, discover?: Discover) {
    //console.log(typeof Discover)
    //console.log(new Discover())
    // @ts-ignore
    discover ??= new Discover();
    events ??= {};
    this.client = new Client(events || {}, discover!, this);
  }
}
