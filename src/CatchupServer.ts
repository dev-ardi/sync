import dgram from "dgram";
import { IP } from "./definitions";
import { Master } from "./Master";

export class CatchupServer {
	private socket;
    private pongMessage(){
        return Buffer.alloc(0)
    }
	constructor(master: Master) {
		this.socket = dgram.createSocket("udp4");
		this.socket.on("listening", () =>
			master.activateHello(this.socket.address().port)
		);
        this.socket.on("message",(msg, rinfo)=>this.receiver(msg, rinfo.port, rinfo.address))
	}
    private receiver(msg: Buffer, port: number, address: IP) {
        if (msg.length == 0){
            this.socket.send(this.pongMessage() ,port, address)
            return
        }
        
    }
}
