import * as React from 'react';
import * as Rx from 'rxjs/Rx';
import { MultiText } from './MultiText';
import { FilePicker } from './FilePicker';
import { makeRequest, TextMessage } from '../libs/default-values';
import { Dispatch, dispatch, getMatched, lookup, WStoStreamBridge, Lookup } from '../libs/state-management';

interface RowCols {
    cols: number;
    rows: number;
}

export class App extends React.Component<RowCols, {}> {
    args: Map<string, MultiText>;
    textState: Map<string, Rx.BehaviorSubject<string>>;
    message$: Rx.Observable<TextMessage>;
    message: TextMessage;
    cancel: Map<string, Rx.Subscription | null>;
    mount$: Rx.BehaviorSubject<number>;
    ws: Map<string, WebSocket>;
    umbOutput: string;
    umbMsg$: Rx.Observable<string>;
    dispatch: Dispatch;
    bridge: WStoStreamBridge;

    constructor(props: RowCols) {
        super(props);
        this.args = new Map();
        this.textState = new Map();
        this.cancel = new Map();
        this.mount$ = new Rx.BehaviorSubject(0);
        this.ws = new Map();
        this.bridge = new WStoStreamBridge(dispatch, 'ws://localhost:4001/ws');

        this.dispatch = dispatch;
        let found = getMatched(lookup({
            cName: 'testcase',
            sName: 'mount-state'
        }, this.dispatch.streams));
        console.log(`in Aop: mountstate stream: ${found}`);
        if (found !== null) {
            found.get()[1].stream.subscribe(n => {
                console.log('The testcase component was mounted');
            });
        }

        this.dispatch.info.subscribe(evt => {
            console.log(`In App, Got a Dispatch event: ${JSON.stringify(evt, null, 2)}`);
        });
    }

    componentDidMount() {
        console.log('===========================================');
        console.log('Something happened to mount App');
        console.log('===========================================');
        this.mount$.next(1);
    }

    /**
     * every time the onChange is called from MultiText component, it will emit the event.  Let's 
     * merge these together
     */
    accumulateState = () => {
        console.log('Getting the state');
        // Look up in dispatch the Observables we need
        let args = getMatched<string>(lookup({cName: 'args', sName: 'textarea'}, this.dispatch.streams));
        let testcase = getMatched<string>(lookup({cName: 'testcase', sName: 'textarea'}, this.dispatch.streams));
        let mapping = getMatched<string>(lookup({cName: 'mapping', sName: 'textarea'}, this.dispatch.streams));
        
        // Sucks that typescript doesn't have pattern matching.  This is fugly
        if (args === null || testcase === null || mapping === null) {
            throw Error('Subject was null');
        }
        console.log('Getting actual streams');
        let args$ = args.get()[1].stream as Rx.Observable<string>;
        let testcase$ = testcase.get()[1].stream as Rx.Observable<string>;
        let mapping$ = mapping.get()[1].stream as Rx.Observable<string>;

        // Combine these into a request that we can submit over a socket
        return Rx.Observable.merge( args$.map(a => new Object({tcargs: a}))
                                  , testcase$.map(t => new Object({testcase: t}))
                                  , mapping$.map(m => new Object({mapping: m})))
            .do(i => console.log(`Got new item: ${i}`))
            .scan((acc, next) => Object.assign(acc, next), {})
            .map(data => {
                let request = makeRequest('testcase-import', 'na', 'mercury', data);
                return request;
            });
    }

    setupWebSocket = (key: string, request: TextMessage, url: string = 'ws://localhost:9000/testcase/ws/import') => {
        console.log('Going to send message over websocket');
        let ws = new WebSocket(url);
        ws.onmessage = (event) => {
            console.log(event.data);
        };
        ws.onopen = (event) => {
            ws.send(JSON.stringify(request));
            console.log('Sent data over websocket');
        };
        this.ws.set(key, ws);
    }

    /**
     * Once all the arguments have been finalized, when the Submit button is clicked, all the data will be sent
     * over the websocket to polarizer
     */
    onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        let search = {
            cName: 'args',
            sName: 'textarea'
        } as Lookup;
        this.bridge.bridge<string>(search);
        
        // Accumulate all textState Observables emitted data
        if (this.cancel.get('testcase') === undefined) {
            this.message$ = this.accumulateState();
            let unsub = this.message$.subscribe(
                n => {
                    this.message = n;
                    console.log(this.message);
                },
                e => {
                    console.error('Problem getting TextMessage');
                    this.message = makeRequest('', 'error', 'exception', {});
                }
            );
            this.cancel.set('testcase', unsub);
        }

        console.log(this.message.data);
        this.setupWebSocket('testcase', this.message);
        event.preventDefault();
    }

    onUMBSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        if (this.cancel.get('umb') === undefined) {
            console.error('no websocket');
        }
        console.log(event);
    }

    render() {
        return (
            <div>
                <div>
                    <FilePicker 
                        options={
                            [['args', 'TestCase JSON args'], 
                            ['testcase', 'TestCase XML'], 
                            ['mapping', 'Mapping Json']]
                        } 
                    />
                    <MultiText label="Test Config Args" id="args" {...this.props} />
                    <MultiText label="TestCase XML" id="testcase" {...this.props} />
                    <MultiText label="Mapping Json" id="mapping" {...this.props} />
                    <form onSubmit={this.onSubmit}>
                        <input type="submit" value="Submit"/>
                    </form>
                </div>
                <div>
                    <MultiText label="Unified Message Bus config" id="umb-out" {...this.props}/>
                    <form onSubmit={this.onUMBSubmit}>
                        <input type="submit" value="Submit"/>
                    </form>
                    <p>Initial</p>
                </div>
            </div>
        );
    }
}