import * as React from 'react'
import * as Rx from 'rxjs/Rx'
import { MultiText } from './MultiText'
import { Mercury } from './Mercury'
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

/**
 * This is the main application class.  It follows the Model-View-Action model (a loose interpretation of cyclejs's 
 * Model-View-Intent model).  The architecture is relatively simple:
 *
 * +-------+           +------+
 * | Model |---------->| View |
 * +-------+           +------+
 *     ^                  |
 *     |    +--------+    |
 *     +----| Action |<---+
 *          +--------+
 *
 * The model, or state information, gets rendered to the view (the virtual DOM, and then the real DOM).  The view
 * layer is then presented to the user, who may do something with this new view (eg, select a table in a row). This
 * action in turn can cause the state to be changed.
 *
 * Note however, that there is a MVA for each component.  In other words, the model change in one component, might 
 * affect the action layer in another.  However, a component (or any other code for that matter ) should only interact
 * or affect another component at the Action layer.  For example, Component A should never directly modify the model
 * or view components of Component B.
 *
 * There are 2 scenarios to consider:
 *
 * - Proactive:  Component A actively makes actions to Component B
 * - Reactive: Component B subscribes to the model layer in Component A
 *
 * It is usually preferable to follow the Reactive model.  If a change in the state of Component A needs to be addressed
 * in Component B, then it is preferable for Component B to subscribe to the state (which is an Observable/Subject 
 * stream).  The other option is for Component A to obtain a reference to a Subject in Component B, and call the 
 * subject.next() method.
 */
export class App extends Mercury<RowCols, {umbOutput: string}> {
    args: Map<string, MultiText> = new Map()
    textState: Map<string, Rx.BehaviorSubject<string>> = new Map()
    cancel: Map<string, Rx.Subscription | null> = new Map()
    mount$: Rx.BehaviorSubject<number> = new Rx.BehaviorSubject(0)
    sockets: Map<string, WebSocket> = new Map()
    umbWs: Map<string, WebSocket> = new Map()
    dispatch: Dispatch = dispatch
    bridge: WStoStreamBridge = new WStoStreamBridge(dispatch, 'ws://localhost:4000/ws')
    message$: Rx.Observable<TextMessage>
    message: TextMessage
    umbMsg$: Rx.Observable<string>
    currentArgsText: string

    constructor(props: RowCols) {
        super(props)

        this.state = {
            umbOutput: ''
        }
        this.modelInit.bind(this)
        this.modelInit()
    }

    /**
     * Listen for the dispatch events so that we know when the streams have been registered and are ready.
     * 
     * This is where we look for components that have registered to Dispatch.  Once we get this event, we
     * know it is ready to be used.  If any of the streams get subscribed here, add the subscription object
     * to this.cancel so that when the component unmounts, we can unsubscribe 
     * 
     */
    modelInit() {
        let mountAction$ = this.dispatch.info
            .do(evt => console.log(`In App, Got a Dispatch event: ${JSON.stringify(evt, null, 2)}`))
            .filter(evt => evt.action === 'mounted')

        let mountsub = mountAction$.subscribe(evt => {
            switch (evt.component) {
                case 'umb':
                    // Get the umb output.  At this point, it should be available in Dispatch
                    this.getStreamFromDispatch<string>({cName: 'umb', sName: 'textarea'}, (found) => {
                        if (this.umbMsg$ === undefined || this.umbMsg$ === null)
                            if (found !== null)
                                this.umbMsg$ = found.get()[1].stream as Rx.Observable<string>
                                // console.log(`umbMsg$ stream: ${JSON.stringify(this.umbMsg$)}`)
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
                case 'args':
                    this.getStreamFromDispatch<string>({cName: 'args', sName: 'textarea'}, (found) => {
                        let argsTextArea = this.textState.get('args')
                        if (argsTextArea === undefined)
                            if (found !== null) {
                                let args$ = found.get()[1].stream as Rx.BehaviorSubject<string>
                                this.textState.set('args', args$)
                                let sub = args$.subscribe(n => {
                                    this.currentArgsText = n
                                })
                                this.cancel.set('args', sub)
                            }  
                    })
                    break
                default:
                    console.debug(`For mount: stream lookup for ${evt.component} not implemented yet`)
            }
        })
        this.cancel.set('model-mount', mountsub)

        // The same, but listen for when a component has unregistered so we can cancel subscriptions
        let unmountAction$ = this.dispatch.info.filter(evt => evt.action === 'unmounted')

        // As above, but for when a component unmounts, we can unsubscribe or do other cleanup
        let unmountsub = unmountAction$.subscribe(evt => {
            switch (evt.component) {
                case 'args':
                    let argsTextArea = this.textState.get('args')
                    if (argsTextArea === undefined) {
                        console.error('This should not have happened.  We unmounted before we mounted')
                        return
                    }
                    let sub = this.cancel.get('args')
                    if (sub !== undefined && sub !== null)
                        sub.unsubscribe()
                    break
                default:
                    console.debug(`For unmount: stream lookup for ${evt.component} not implemented yet`)
            }
        })
        this.cancel.set('model-unmount', unmountsub)
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
    actionAccumulateState = (): Rx.Observable<TextMessage> => {
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
        this.sockets.set(key, ws)
    }

    /**
     * Once all the arguments have been finalized, when the Submit button is clicked, all the data will be sent
     * over the websocket to polarizer
     */
    onTestCaseSubmit = (event: React.MouseEvent<HTMLButtonElement>) => {
        // FIXME
        let search = {
            cName: 'args',
            sName: 'textarea'
        } as Lookup
        this.bridge.bridge<string>(search)

        // Accumulate all textState Observables emitted data
        if (this.cancel.get('testcase') === undefined) {
            this.message$ = this.actionAccumulateState()
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

    editTestCaseTextArea = (event: React.FormEvent<HTMLInputElement>) => {
        event.persist()  // Had to persist the event, to make it a reuseable event from the SyntheticEvent pool
        let text: string = event.currentTarget.value
        let id = event.currentTarget.id
        // Get the args textarea Stream so that we can write to it
        let args$ = this.textState.get('args')
        if (args$ === undefined) {
            console.log('The args textarea element has not been looked up yet')
            return
        }
        let sub = args$.take(1).subscribe(
            next => {
                let current = JSON.parse(next)
                switch (id) {
                    case 'tc-name':
                        current.servers.polarion.user = text
                        break
                    case 'tc-password':
                        current.servers.polarion.password = text
                        break
                    case 'tc-polarion':
                        current.servers.polarion.url = text
                        break
                    default:
                        console.error('Unknown input id')
                }
                // Stupid IDE/linter bug
                if (args$ !== undefined)
                    args$.next(JSON.stringify(current, null, 2))
            }
        )
        sub.unsubscribe()
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
                        <div className="field">
                            <div className="control">
                                <label htmlFor="tc-name">Polarion User</label>
                                <input type="text" onInput={this.editTestCaseTextArea} id="tc-name"/>
                                <label htmlFor="tc-password">Polarion Password</label>
                                <input type="text" onInput={this.editTestCaseTextArea} id="tc-password"/>
                                <label htmlFor="tc-polarion">Polarion URL</label>
                                <input type="text" onInput={this.editTestCaseTextArea} id="tc-polarion"/>
                                <MultiText label="Test Config Args" id="args" {...this.props} />
                            </div>
                        </div>
                        <MultiText label="TestCase XML" id="testcase" {...this.props} />
                        <MultiText label="Mapping Json" id="mapping" {...this.props} />
                        <button onClick={this.onTestCaseSubmit}>Submit</button>
                    </div>
                    <div className="field">
                        <div className="control">
                            <MultiText label="Unified Message Bus config" id="umb" rows={10} cols={50}/>
                            <button onClick={this.onUMBSubmit}>Submit</button>
                            <button onClick={this.cancelUMB}>Cancel</button>
                        </div>
                    </div>
                    <div className="field">
                        <div className="control">
                            <MultiText label="TestCase websocket config" id="umb" {...this.props}/>
                            <button onClick={this.onTestCaseSubmit}>Submit</button>
                            <button onClick={this.cancelUMB}>Cancel</button>
                        </div>
                    </div>
                </div>
                <div className="column is-half">
                    <MultiText label="UMB Output" id="umb-out" rows={100} cols={50}/>
                </div>
            </div>
        )
    }
}