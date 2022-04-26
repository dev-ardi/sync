import { SyncObject } from "./module";

const sync1 = new SyncObject({
    log: () => console.log("ermano >:("),
    alog: (arg) => console.log("ermano >:(" + arg),
});

const sync2 = new SyncObject({
    log: () => console.log("ermano >:("),
    alog: (arg) => console.log("ermano >:(" + arg),
});

sync1.discover.promote();
sync1.addEventIn("alog", 10, "wtf");
