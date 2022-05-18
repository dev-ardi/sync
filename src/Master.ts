import { CatchupServer } from "./CatchupServer";
import { Discover } from "./definitions";

export class Master {
    //Public methods
    public activateHello(port: number){
        this.discover.me.initPort = port;
        this.discover.canHello = true;
        this.discover.hello();

    }
    // children
    private discover;
    private CUServer;
    constructor(discover: Discover){
        this.discover = discover;
        this.CUServer = new CatchupServer(this)
    }
}
