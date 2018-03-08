import * as React from 'react'
import * as Rx from 'rxjs/Rx'
import { MultiText } from './MultiText'
// import { FilePicker } from './FilePicker';
import { Maybe } from '../libs/func'
import { makeRequest, TextMessage } from '../libs/default.values'
import { Dispatch
       , dispatch
       , getMatched
       , lookup
       , WStoStreamBridge
       , Lookup
       , IndexedStreamInfo } from '../libs/state.management'

interface RowCols {
    cols: number;
    rows: number;
}

export class App extends React.Component<RowCols, {umbOutput: string}> {
    args: Map<string, MultiText> = new Map()
    textState: Map<string, Rx.BehaviorSubject<string>> = new Map()
    cancel: Map<string, Rx.Subscription | null> = new Map()
    mount$: Rx.BehaviorSubject<number> = new Rx.BehaviorSubject(0)
    ws: Map<string, WebSocket> = new Map()
    umbWs: Map<string, WebSocket> = new Map()
    dispatch: Dispatch = dispatch
    bridge: WStoStreamBridge = new WStoStreamBridge(dispatch, 'ws://localhost:4001/ws')
    message$: Rx.Observable<TextMessage>
    message: TextMessage
    umbMsg$: Rx.Observable<string>

    constructor(props: RowCols) {
        super(props)

        this.state = {
            umbOutput: ''
        }

        // Listen for the dispatch events so that we know when the streams are ready
        this.dispatch.info
            .do(evt => console.log(`In App, Got a Dispatch event: ${JSON.stringify(evt, null, 2)}`))
            .filter(evt => evt.action === 'mounted')
            .subscribe(evt => {
                switch (evt.component) {
                    case 'umb':
                        // Get the umb output.  At this point, it should be available in Dispatch
                        this.getStreamFromDispatch<string>({cName: 'umb', sName: 'textarea'}, (found) => {
                            if (this.umbMsg$ === undefined || this.umbMsg$ === null)
                                if (found !== null) {
                                    this.umbMsg$ = found.get()[1].stream as Rx.Observable<string>
                                    // console.log(`umbMsg$ stream: ${JSON.stringify(this.umbMsg$)}`)
                                }
                        })
                        break
                    case 'umb-out':
                        this.getStreamFromDispatch<string>({cName: 'umb-out', sName: 'textarea'}, (found) => {
                            let umbOutTextArea = this.textState.get('umb-out-text')
                            if (umbOutTextArea === undefined)
                                if (found !== null) {
                                    let umbOut$ = found.get()[1].stream as Rx.BehaviorSubject<string>
                                    this.textState.set('umb-out-text', umbOut$)
                                    // console.log(`umbOut$ stream: ${JSON.stringify(umbOut$)}`)
                                }
                        })
                        break
                    default:
                        console.debug(`stream lookup for ${evt.component} not implemented yet`)
                }
            })
    }

    getStreamFromDispatch = <T extends any>( search: Lookup
                                           , fn: (indexsi: Maybe<IndexedStreamInfo<T>>) => void) => {
        let found = getMatched<T>(lookup(search, this.dispatch.streams))
        fn(found)
    }

    /**
     * Asynchronous handler to look up streams from dispatch
     */
    lookup = <T extends any>(search: Lookup) => {
        return this.dispatch.info.filter(item => item.component === search.cName)
            .filter(item => item.streamName === search.sName)
            .filter(item => item.action === 'mounted')
            .map(item => getMatched(lookup<T>(search, this.dispatch.streams)))
    }

    componentDidMount() {
        this.mount$.next(1)
    }

    /**
     * every time the onChange is called from MultiText component, it will emit the event.  Let's 
     * merge these together
     */
    accumulateState = (): Rx.Observable<TextMessage> => {
        console.log('Getting the state')
        // Look up in dispatch the Observables we need
        let args = getMatched<string>(lookup({cName: 'args', sName: 'textarea'}, this.dispatch.streams))
        let testcase = getMatched<string>(lookup({cName: 'testcase', sName: 'textarea'}, this.dispatch.streams))
        let mapping = getMatched<string>(lookup({cName: 'mapping', sName: 'textarea'}, this.dispatch.streams))
        
        // Sucks that typescript doesn't have pattern matching.  This is fugly
        if (args === null || testcase === null || mapping === null)
            throw Error('Subject was null')
        console.log('Getting actual streams')
        let args$ = args.get()[1].stream as Rx.Observable<string>
        let testcase$ = testcase.get()[1].stream as Rx.Observable<string>
        let mapping$ = mapping.get()[1].stream as Rx.Observable<string>

        // Combine these into a request that we can submit over a socket
        return Rx.Observable.merge( args$.map(a => new Object({tcargs: a}))
                                  , testcase$.map(t => new Object({testcase: t}))
                                  , mapping$.map(m => new Object({mapping: m})))
            .scan((acc, next) => Object.assign(acc, next), {})
            .map(data => {
                let request = makeRequest('testcase-import', 'na', 'mercury', data)
                return request
            })
    }

    setupWebSocket = ( key: string
                     , request: TextMessage
                     , url: string = 'ws://localhost:9000/testcase/ws/import') => {
        console.log('Going to send message over websocket')
        let ws = new WebSocket(url)
        ws.onmessage = (event) => console.log(event.data)

        ws.onopen = (event) => {
            ws.send(JSON.stringify(request))
            console.log('Sent data over websocket')
        }
        this.ws.set(key, ws)
    }

    /**
     * Once all the arguments have been finalized, when the Submit button is clicked, all the data will be sent
     * over the websocket to polarizer
     */
    onSubmit = (event: React.MouseEvent<HTMLButtonElement>) => {
        // FIXME
        let search = {
            cName: 'args',
            sName: 'textarea'
        } as Lookup
        this.bridge.bridge<string>(search)

        // Accumulate all textState Observables emitted data
        if (this.cancel.get('testcase') === undefined) {
            this.message$ = this.accumulateState()
            let unsub = this.message$.subscribe(
                n => {
                    this.message = n
                    console.debug(this.message)
                },
                e => {
                    console.error('Problem getting TextMessage')
                    this.message = makeRequest('', 'error', 'exception', {})
                }
            )
            this.cancel.set('testcase', unsub)
        }

        console.log(this.message.data)
        this.setupWebSocket('testcase', this.message)
        event.preventDefault()
    }

    onUMBSubmit = (event: React.MouseEvent<HTMLButtonElement>) => {
        let ws = new WebSocket('ws://localhost:9000/umb/start')
        console.log(`umb websocket: ${JSON.stringify(ws)}`)

        let check = this.umbWs.get('umb')
        if (check)
            check.close()

        ws.onmessage = (evt) => {
            console.log(evt.data)
            let umbOut$ = this.textState.get('umb-out-text')
            this.setState({umbOutput: evt.data}, () => {
                if (umbOut$ !== undefined)
                    umbOut$.next(evt.data)
            })
        }
        this.umbWs.set('umb', ws)

        // Check this.umbMsg$
        console.log(`umbMsg$: ${JSON.stringify(this.umbMsg$)}`)
        console.log(`umb websocket: ${JSON.stringify(ws)}`)
        if (this.umbMsg$ !== undefined || this.umbMsg$ !== null) {
            let subscription = this.umbMsg$.do(s => console.log(s))
                .subscribe(n => {
                if (ws !== undefined)
                    ws.onopen = (evt) => {
                        console.log(`Connection opened to remote host`)
                        ws.send(n)
                    }
                else
                    console.error('Websocket for UMB does not exist')
            })
            this.cancel.set('umb', subscription)
            console.log(event)
        }
        else
            console.error(`umbMsg$ = ${this.umbMsg$}`)
    }

    /**
     * Cancels the UMB connection
     *
     * TODO:  Need to add a call to the polarizer-vertx to stop (unless the websocket closing does that for us)
     */
    cancelUMB = () => {
        let subscription = this.cancel.get('umb')
        if (subscription !== undefined && subscription !== null)
            subscription.unsubscribe()

        let ws = this.umbWs.get('umb')
        if (ws !== undefined)
            ws.close()
        console.log('Closed UMB connection')
    }

    render() {
        return (
            <div className="columns">
                <div className="column is-half">
                    <div className="block">
                        {/*
                        <FilePicker
                            options={
                                [['args', 'TestCase JSON args'],
                                ['testcase', 'TestCase XML'],
                                ['mapping', 'Mapping Json']]
                            }
                        />
                        */}
                        <MultiText label="Test Config Args" id="args" {...this.props} />
                        <MultiText label="TestCase XML" id="testcase" {...this.props} />
                        <MultiText label="Mapping Json" id="mapping" {...this.props} />
                        <button onClick={this.onSubmit}>Submit</button>
                    </div>
                    <div className="field">
                        <MultiText label="Unified Message Bus config" id="umb" rows={10} cols={50}/>
                        <button onClick={this.onUMBSubmit}>Submit</button>
                        <button onClick={this.cancelUMB}>Cancel</button>
                    </div>
                </div>
                <div className="column is-half">
                    <MultiText label="UMB Output" id="umb-out" rows={100} cols={50}/>
                </div>
            </div>
        )
    }
}