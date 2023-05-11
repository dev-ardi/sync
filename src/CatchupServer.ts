import dgram from "dgram";
import { IP } from "./definitions";
import { Master } from "./Master";
import {
  CatchupMessage,
  eventMessages,
  mediaTuple,
} from "./packet_definitions";

export class CatchupServer {
  public async destroy(): Promise<void> {
    return new Promise<void>((resolve) => this.socket.close(() => resolve()));
  }
  private master;

  private socket;
  private pongMessage() {
    return Buffer.alloc(0);
  }
  private timesMessage(): string {
    const x: CatchupMessage = {
      media: this.master.getMediaTimes(),
    };
    return JSON.stringify(x);
  }
  private eventsMessage(): string {
    const x: CatchupMessage = {
      media: this.master.getMediaTimes(),
      events: this.master.getEvents(),
    };
    return JSON.stringify(x);
  }
  constructor(master: Master) {
    console.log("setting up catch-up server");
    this.master = master;

    this.socket = dgram.createSocket("udp4", (msg, rinfo) =>
      this.receiver(msg, rinfo.port, rinfo.address)
    );
    this.socket.bind();
    this.socket.on("listening", () =>
      master.activateHello(this.socket.address().port)
    );
    this.socket.on("close", () => {
      console.log("Catch-up server socket closed!");
    });
  }
  private receiver(msg: Buffer, port: number, address: IP) {
    if (msg.length == 0) {
      this.socket.send(this.pongMessage(), port, address);
      return;
    }
    if (msg.toString() === "getTimes") {
      this.socket.send(this.timesMessage(), port, address);
      return;
    } else this.socket.send(this.eventsMessage(), port, address);
  }
}
