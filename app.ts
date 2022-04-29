import { SyncObject } from "./module";
import { IDiscover, milliseconds } from "./src/shared_definitions";
const discover = require("node-discover")
global.toarr = [];
const opts = {
    ignoreProcess : false, 
    ignoreInstance : false
}
const events =  { 
    log: () => console.log(performance.now()),
    alog: (arg: string) => console.log(performance.now() + arg),
    perfcheck: (time: string) => {
        let x = performance.now();
                console.log(x - parseFloat(time))} 
}
const sync1 = new SyncObject(events, new discover(opts, ()=>{
    console.log("done1")

}));
const sync2 = new SyncObject(events, new discover(opts,()=>{
    console.log("done2");
    sync1.discover.promote();
    console.log(performance.now())
}));

    //@ts-ignore
global.debug = {sync1, sync2};
setInterval(() => {
    console.log("----------")
    console.log(performance.now())
    sync1.addEventIn("perfcheck", 1000, (performance.now()- 1000).toString());
    sync1.addEventIn("perfcheck", 2000, (performance.now()- 2000).toString());
}, 2500);
