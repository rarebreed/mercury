/**
 * This module is to be used as a reuseable class to bridge rxjs stream <=> websockets
 */

import * as Rx from 'rxjs/Rx';
import { Map } from 'immutable';

interface Lookup {
    component: string;   // name of the component the stream belongs to
    streamName: string;  
}

export class Dispatcher {
    streams: Map<Lookup, Rx.Observable<any>>;

    constructor() {
        this.streams = Map<Lookup, Rx.Subject<any>>();
    }

    register = (lookup: Lookup, stream: Rx.Subject<any>) => {
        this.streams = this.streams.set(name, stream);
    }
}

export class WSBridge<T> {
    ws: WebSocket;
    stream$: Rx.Subject<T>;

    constructor(starting: T, dispatcher: Dispatcher) {
        this.stream$ = new Rx.BehaviorSubject(starting);
    }
}