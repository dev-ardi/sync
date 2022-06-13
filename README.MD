# Sync-lib

This is a library that allows for synchronization between devices that run electron, or node.js. 

This library allows for the synchronization of 
- Events
- HTML5 media

It exposes two functions and the constructor:

```ts
scheduleEvent(event: string, timeout: milliseconds, ...args: string[])
scheduleMedia(src: string, schedule: milliseconds, seek: seconds = 0)
new SyncObject(events?: CallbackCollection, discover?: Discover)
```

And three events: 
```ts
onPromotion: (...args: any) => any
onDemotion: (...args: any) => any 
onNewMaster: (...args: any) => any
```

# How to use
This is meant to be used a multiple process (or multiple device) scenario. 
This uses a master-slave relationship, where the master emits synchronized events to all of the slaves. When a new master is elected these events get called:
## Creating the sync object:
- You pass it a (optional) dictionary of events (callbacks): 
```js
{selectVideo: argSrc=>document.getElementById('vidElement1').src = argSrc}
```
-  and an (optional) instance of [node-discover](https://www.npmjs.com/package/node-discover). 
## Using the object

All of the logic should be in the callbacks provided by the library:

- `onPromotion`: This happens on the process that gets elected as a master. All of the synchronization logic should happen here. Example:

```ts
sync.onPromotion = ()=>{
    scheduleEvent('selectVideo', 1000, 'videos/vid1.webm')
    scheduleMedia(document.getElementById('vidElement1').src, 1000)
    }
```
- `onNewMaster`: This happens on all slave processes. All of the client logic should happen here.
- `onDemotion`: This might happen if a master with higher weight than this is found. All destruction logic might happen here, but this is unlikely to get called. Note that the underlying node-discover instance will not get garbage collected, its socket will still be opening and listening, aswell as sending hello messages.
- `scheduleEvent` Synchronize events by callback name.
- `scheduleMedia` Synchronize media by src in with an optional seek time.