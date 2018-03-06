/**
 * This module is to be used as a reuseable class to bridge rxjs stream <=> websockets
 * 
 * TODO: Move this into a separate npm module.
 */

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { List, Range } from 'immutable';
import { Just, Maybe } from './func';

/** 
 * Used as a data to describe metadata about an Observable
 */
export interface Record {
    component: string;   // name of the component the stream belongs to
    streamName: string;
    streamType: string;
    action?: 'mounted' | 'unmounted';
}

export interface StreamInfo<T> extends Record {
    stream: Observable<T> | Subject<T>;
}

// An interface describing how to lookup a StreamInfo entry
export interface Lookup {
    cName?: string;
    sName?: string;
    sType?: string;
    index?: Record;
}

type matcher<T> = Array<[number, StreamInfo<T>]>
                | Error;
export const  getMatched = <T>(matched: matcher<T>) => {
    if (matched instanceof Error) {
        return null;
    }

    if (matched.length === 0) {
        return null;
    }
    if (matched.length > 1) {
        return null;
    }

    return new Just<[number, StreamInfo<T>]>(matched[0]);
};

type LookupResult<T> = Error | Array<[number, StreamInfo<T>]>;

/**
 * Filters the List of StreamInfo from this.streams based on the data in lookup
 * 
 * Will throw an error if no fields at all defined in lookup, or if using one of the field name and the index type
 * but they dont both match.  It returns an array of [number, StreamInfo<T>] tuples.  It returns this format so that
 * entries can be deleted (using this.stream.delete).  (note however that only one element can be deleted at a time)
 * 
 * TODO: This is a poor way to find the stream we need.  It's a O(n) (actually (O(n*3))), but we should probably
 * store this.streams as nested maps: Map<string, Map<string, StreamInfo<any>>>
 */
export const lookup = <T>(search: Lookup, 
                          streams: List<StreamInfo<any>>): LookupResult<T> => {
    let {cName, sName, sType, index} = search;
    if (cName === undefined && sName === undefined && sType === undefined && index === undefined) {
        return Error('Must include at least one parameter of either cName, sName, sType or index');
    }

    let check = [[cName, 'component', 'cName'], [sName, 'streamName', 'sName'], [sType, 'streamType', 'sType']];
    check.map(entry => {
        let [name, key, type] = entry;
        if (name && index && key && (name !== index[key])) {
            return Error(`if using ${type} and index, index.${key} must match ${type}`);
        }
    });

    let comp = cName ? cName :
               index ? index.component : null;
    let streamName = sName ? sName :
                     index ? index.streamName : null;
    let streamType = sType ? sType :
                     index ? index.streamType : null;

    let zipped = Range().zip(streams);
    let filtered: [number, StreamInfo<T>][] = zipped.toJS();
    let matched = filtered.filter(i => comp ? i[1].component === comp : true)
            .filter(i => streamName ? i[1].streamName === streamName : true)
            .filter(i => streamType ? i[1].streamType === streamType : true);

    return matched;
};

export class Dispatch {
    streams: List<StreamInfo<any>>;
    info: Subject<Record>;

    constructor() {
        this.streams = List();
        this.info = new Subject();
    }

    register = <T>(smap: StreamInfo<T>) => {
        this.streams = this.streams.push(smap);
        let {component, streamName, streamType} = smap;
        let rec = {
            component: component,
            streamName: streamName,
            streamType: streamType,
            action: 'mounted'
        } as Record;
        this.info.next(rec);
    }

    /**
     * Give a Record type, lookup in this.streams and remove if it is found.
     *
     * Sends a new emitted record from this.info Subject to let any interested parties know that the
     * StreamMap has been deleted.
     */
    unregister = <T>(rec: Record) => {
        let matched = lookup({index: rec} as Lookup, this.streams);
        if (matched instanceof Error) {
            return matched;
        }

        if (matched.length === 0) {
            return null;
        }
        if (matched.length > 1) {
            return Error('Found more than one match which should not happen');
        }

        let [index, toRemove] = matched[0];
        console.log(`Removing ${toRemove} at index ${index}`);
        this.streams = this.streams.delete(index);
        let info = Object.assign({action: 'unmounted'}, rec);
        this.info.next(info);
        return toRemove as StreamInfo<T>;
    }
}

/**
 * A Websocket to rxjs Observable bridge
 */
export class WStoStreamBridge {
    ws: WebSocket;
    dispatch: Maybe<Dispatch>;
    streams: List<StreamInfo<any>> = List();

    constructor(disp?: Dispatch, url: string = 'ws://localhost:9000/') {
        if (disp === undefined) {
            this.dispatch = null;
        }
        else {
            this.dispatch = new Just(disp);
        }
        this.ws = new WebSocket(url);
    }

    /**
     * Adds a StreamInfo object to thee internal this.streams.
     * 
     * Can be used if a StreamInfo type is already available, or if there is no dispatch.  This method
     * will subscribe to the StreamInfo.stream, and forward the items it receives over the websocket
     * 
     * FIXME:  we need to take care here of backpressure.  Since websockets are slower than in-memory 
     * data structures, we need to be mindful of this.  Not to mention we can funnel several Observable
     * streams to a single websocket.  Because of this, we may want to to debounce some streams.  for example
     * we may want to debounce or accumulate events and send them at once.
     */
    add = <T>(si: StreamInfo<T>) => {
        let stream$ = si.stream as Subject<T>;
        stream$.subscribe(
            next => {
                this.ws.send(JSON.stringify(next, null, 2));
            },
            err => {
                this.ws.send(JSON.stringify({
                    status: 'error', ...si
                }, null, 2));
            },
            () => {
                this.ws.send(JSON.stringify({
                    status: 'completed', ...si
                }));
            }
        );
        this.streams = this.streams.push(si);
    }

    /**
     * Looks up an Observable in dispatch and adds to its internal this.streams
     */
    bridge = <T>(search: Lookup) => {
        console.log('In WStoStreamBridge: bridging');
        if (this.dispatch === null) {
            throw new Error('No dispatch assigned');
        }
        let stream = getMatched(lookup(search, this.dispatch.get().streams));
        if (stream !== null) {
            let si = stream.get()[1] as StreamInfo<T>;
            this.add(si);
        }
        else {
            console.log('Found no matches for bridge');
        }
    }

    /**
     * We only unbridge from the internel this.streams, not from this.dispatch.streams
     */
    unbridge = (search: Lookup) => {
        let matches = lookup(search, this.streams);
        if (matches instanceof Error) {
            console.log('No matches found to unbridge');
            return;
        }
        console.log(`Deleting ${JSON.stringify(matches, null, 2)}`);
        this.streams = this.streams.delete(matches[0][0]);
        if (matches.length > 1) {
            this.unbridge(search);
        }
    }
}

export const dispatch = new Dispatch();