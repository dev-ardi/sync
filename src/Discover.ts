/*
Esta es una versión alternativa de node-discover, en typescript y más ajustado a 
las necesidades de este proyecto. La librería de sincronización está muy acoplada
al node-discover original, por lo que no es fácil de reemplazar.
*/

import dgram from "node:dgram";
import { setInterval } from "node:timers";

const config = {
  port: 42069,
  timeout: 10000,
  helloInterval: 1000,
};
type hello = {
  date: number;
  forceMaster: boolean;
  isMaster: boolean;
  port?: number;
};
export type DiscoverCallbacks = {
  onMaster: (ip: string, UDPport: number, TCPport: number) => void;
  onPromotion: () => number;
  onDemotion: () => void;
};
export class Discover {
  private socket: dgram.Socket;
  private port: number;
  private cDate: number;
  private forceMaster: boolean;
  private isMaster: boolean;
  private msg: hello;
  private cacheMsg: string;
  private lastSeen: number;
  private masterIp: string;
  constructor(
    callbacks: DiscoverCallbacks,
    messageHandler: Map<string, (...args: string[]) => void>,
    forceMaster: boolean = false,
    port: number = config.port
  ) {
    this.port = port;
    this.socket = dgram.createSocket("udp4");
    this.cDate = Date.now();
    this.forceMaster = forceMaster;

    this.msg = {
      date: this.cDate,
      forceMaster: this.forceMaster,
      isMaster: this.isMaster,
    };
    this.cacheMsg = JSON.stringify(this.msg);

    this.socket.on("message", (raw, rinfo) => {
      /*

    - Si tanto el objeto actual como el mensaje entrante afirman ser el maestro,
       maneja el conflicto.
    - Si tanto el objeto actual como el mensaje entrante tienen forzado de maestro, 
      verificar cuál es más nuevo.
    - Si el objeto actual es más nuevo, establece el objeto actual como no maestro
       y actualiza la información del maestro.
    - Si el mensaje entrante es el maestro, actualiza la información del maestro y 
      establece la marca de tiempo de la última vista.

    */
      const msg = JSON.parse(raw.toString()) as
        | hello
        | { id: string; args: string[] };
      if ("id" in msg) return messageHandler.get(msg.id)!.apply(null, msg.args);
      const updateMasterInfo = () => {
        this.isMaster = false;
        if (this.masterIp !== rinfo.address)
          callbacks.onMaster(rinfo.address, rinfo.port, msg.port!);
        this.masterIp = rinfo.address;
        this.lastSeen = Date.now();
      };

      if (this.isMaster && msg.isMaster) {
        // conflict
        if (this.forceMaster && msg.forceMaster) {
          // Config error
          console.warn("[discover] Config error: both force master");
          // both force master
          if (this.cDate > msg.date) {
            // this is newer
            updateMasterInfo();
            callbacks.onDemotion();
          }
        } else if (!this.isMaster) {
          updateMasterInfo();
        }
      } else if (msg.isMaster) {
        updateMasterInfo();
      }
      if (Date.now() - this.lastSeen < config.timeout) {
        this.isMaster = true;
        this.msg.isMaster = true;
        this.cacheMsg = JSON.stringify(this.msg);
        callbacks.onPromotion();
        this.hello();
      }
      setInterval(this.hello, config.helloInterval);
    });
  }

  private hello(): void {
    this.socket.send(this.cacheMsg, this.port, "255.255.255.255", (error) => {
      if (error) {
        console.error("[discover] error:\n" + error);
      }
    });
  }
  public broadcastMessage(id: string, args: string[]) {
    this.socket.send(
      JSON.stringify({ id, args }),
      this.port,
      "255.255.255.255",
      (error) => {
        if (error) {
          console.error("[discover] error:\n" + error);
        }
      }
    );
  }
}
