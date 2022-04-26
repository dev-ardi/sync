interface ISyncable {}

export interface IRemoteProvider {}
export type CallbackCollection = Record<string, (...args: string[]) => any>;

export interface IMediaController extends ISyncable {}

export interface ISyncedEventEmitter extends ISyncable {}
//TODO: Wrapper for other html5 things
