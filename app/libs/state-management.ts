/**
 * This module is to be used as a reuseable class to bridge rxjs stream <=> websockets
 */

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { List, Range } from 'immutable';

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
    stream: Observable<T>;
}

export class Just<T> {
    public constructor(protected value: T) {

    }

    public get(): T {
        return this.value;
    }
}

export type Maybe<T> = Just<T> | null;

// An interface describing how to lookup a StreamInfo entry
export interface Lookup {
    cName?: string;
    sName?: string;
    sType?: string; 
    index?: Record;
}

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
     * 
     */
    lookup = <T>(lookup: Lookup) => {
        let {cName, sName, sType, index} = lookup;
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

        let zipped = Range().zip(this.streams);
        let filtered: [number, StreamInfo<T>][] = zipped.toJS();
        let matched = filtered.filter(i => comp ? i[1].component === comp : true)
                .filter(i => streamName ? i[1].streamName === streamName : true)
                .filter(i => streamType ? i[1].streamType === streamType : true);

        return matched;
    }

    /**
     * Give a Record type, lookup in this.streams and remove if it is found. 
     * 
     * Sends a new emitted record from this.info Subject to let any interested parties know that the
     * StreamMap has been deleted.
     */
    unregister = <T>(rec: Record) => {
        let matched = this.lookup({index: rec} as Lookup);
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
        this.streams.delete(index);
        let info = Object.assign({action: 'unmounted'}, rec);
        this.info.next(info);
        return toRemove as StreamInfo<T>;
    }
}

export class WSBridge<T> {
    ws: WebSocket;
    stream$: Subject<T>;

    constructor(starting: T, disp: Dispatch) {
        this.stream$ = new BehaviorSubject(starting);
    }
}

export const dispatch = new Dispatch();