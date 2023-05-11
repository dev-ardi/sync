import { Discover, SyncObject } from "./module";

const opts = {
  ignoreProcess: false,
  ignoreInstance: false,
};
const arr: number[] = [];
const events = {
  log: () => console.log(performance.now()),
  alog: (arg: string) => console.log(performance.now() + arg),
  dlog: (arg: string) =>
    console.log(
      `===================================
Date is: ${+new Date() % 1000000},
event was at: ${arg}
diff is: ${(+new Date() % 1000000) - Number(arg)}`
    ),
  perfcheck: (time: string) => {
    const lag = performance.now() - parseFloat(time);
    arr.push(lag);
    console.log(
      `now: ${lag}, avg: ${arr.reduce((x, y) => x + y) / arr.length}`
    );
  },
};
const sync1 = new SyncObject(
  events,
  new Discover(opts, () => {
    console.log("done1");
    console.log(performance.now());
  })
);
// const sync2 = new SyncObject(events, new discover(opts,()=>{
//     console.log("done2");
//     console.log(performance.now())
// }));

//@ts-ignore
//sync1.debugid = "sync1"
//@ts-ignore
// sync2.debugid = "sync2"
//@ts-ignore
// global.debug = {sync1, sync2};
sync1.onPromotion = () => fn3(sync1);
//sync2.onPromotion = () => fn(sync2)
function fn(arg: SyncObject) {
  console.log("fn");

  return setInterval(() => {
    console.log("----------");
    console.log(performance.now());
    const arg1 = 500;
    const arg2 = 800;

    arg.scheduleEvent("perfcheck", arg1, (performance.now() + arg1).toString());
    arg.scheduleEvent("perfcheck", arg2, (performance.now() + arg2).toString());
  }, 2000);
}
function fn2(arg: SyncObject) {
  console.log("fn2");
  const arg1 = 3000;
  arg.scheduleEvent("dlog", arg1, (performance.now() + arg1).toString());
}

function fn3(arg: SyncObject) {
  console.log("fn3");

  return setInterval(() => {
    arg.scheduleEvent("dlog", 500, (+new Date() % 1000000).toString());
  }, 1000);
}
