import { CatchupServer } from "./CatchupServer";
import { Client } from "./Client";
import { Discover } from "./definitions";
import { EventMessage, eventMessages } from "./packet_definitions";

export class Master {

    //Public methods
    public scheduleEvent(message: EventMessage){
        this.send(message);

		const events = this.events;
        const eventID = performance.now()
		events.eventID = message;
		setTimeout(()=> delete events[eventID], message.timeout); // TODO test!
    }
    public destroy(){
        this.CUServer!.destroy();
        this.CUServer = null;
        this.discover.me.initPort = undefined;
    }
    public getEvents(): eventMessages {
        return this.events
    }
    public activateHello(port: number){
        this.discover.me.initPort = port;
        this.discover.canHello = true;
        this.discover.hello();
        console.log("catch-up server listening on port: " + port)
    }
    
    public getMediaTimes(){
        return this.client.getMediaTimes()
    }
    // Private methods
    private send(msg: any) {
        this.discover.send("event", msg)
    }
    // Fields
    private events: eventMessages = {};
    // children
    private discover;
    private CUServer: CatchupServer | null;
    private client;
    constructor(discover: Discover, client: Client){
        this.discover = discover;
        this.CUServer = new CatchupServer(this)
        this.client = client;
    }
}
