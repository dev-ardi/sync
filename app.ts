import { SyncObject } from "./module";
import { IDiscover } from "./src/shared_definitions";
const discover = require("node-discover")

const opts = {
    ignoreProcess : false, 
    ignoreInstance : false
}

const sync1 = new SyncObject({
    log: () => console.log("ermano >:("),
    alog: (arg) => console.log("ermano >:(" + arg),
}, new discover(opts, ()=>{
    console.log("done1")
    //sync1.discover.promote();
    //sync1.addEventIn("alog", 10, "wtf");
}));
const sync2 = new SyncObject({
    log: () => console.log("ermano >:("),
    alog: (arg) => console.log("ermano >:(" + arg),
}, new discover(opts,()=>{
    console.log("done1")}));

    //@ts-ignore
global.debug = {sync1, sync2};
    