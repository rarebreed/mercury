import * as React from 'react'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Subscription } from 'rxjs/Subscription'
import 'rxjs/add/operator/map'
import { defaultXml, defaultMapping } from '../libs/default.values'
import { StreamInfo } from 'auctrix'
// import { RadioChoice } from './RadioChoice'
import { Mercury } from './Mercury'
const uuid = require('uuid/v4')

export interface MTProps {
    id: string;
    cols: number;  // Not sure if I should remove this.  It will be handled by bulma
    rows: number;
    label: string;
}

export interface MultiTextState {
    value: string
    visible: boolean
}

/** 
 * Component for a textarea field with a submit button
 * 
 * Note that this uses rxjs for state management  Observables are registered to a (singleton) Dispatch
 * (for example the textarea state is an Observable stream, and this stream is registered with the
 * central disatch).  Other compponents that need access to the changing state should lookup in the 
 * central dispatch this component's Observable streams that were registered.  Then they can subscribe
 * to these streams as usual.  Other components should directly access MultiText's this.state 
 * 
 * This is because setState is asynchronous, so this.state may not actually be updated
 * until react does some things.  Just as writes to this.state has to go through this.setState, all reads
 * for the current state come from this.emitter
 */
export class MultiText extends Mercury<MTProps, MultiTextState> {
    state$: BehaviorSubject<string>
    mountState: BehaviorSubject<Date>
    stateSubscription: Subscription

    constructor(props: MTProps) {
        super(props)
        this.componentDidMount.bind(this)
        
        this.state = {
            value: this.loadDefaultArgs(),
            visible: true
        }

        this.modelInit.bind(this)
        this.modelInit()
    }

    modelInit() {
        // First, create all our StreamInfo types so we can register them to Dispatch
        let mountSI = this.makeStreamInfo('mount-state', 'Date', new Date())
        this.mountState = mountSI.stream as BehaviorSubject<Date>
        let stateSI = this.makeStreamInfo('textarea', 'string', this.state.value)
        this.state$ = stateSI.stream as BehaviorSubject<string>

        this.dispatch.register(mountSI)
        this.dispatch.register(stateSI)

    }

    /**
     * Creates a StreamInfo type with BehaviorSubject
     */
    makeStreamInfo = <T extends {}>(sName: string, sType: string, start: T) => {
        return {
            component: this.props.id,
            streamName: sName,
            streamType: sType,
            stream: new BehaviorSubject(start)
        } as StreamInfo<T>
    }

    // Note:  If you dont write these methods with fat arrow style, _this_ is not bound correctly when called
    handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        event.persist()  // Had to persist the event, to make it a reuseable event from the SyntheticEvent pool
        let text: string = event.target.value
        this.setState({value: text}, () => {
            this.state$.next(text)
        })
    }

    componentDidMount() {
        console.log(`Mounted MultiText ${this.props.id}`)
        this.mountState.next(new Date())
        this.stateSubscription = this.state$.subscribe(text => {
            console.debug(`Current state: ${text}`)
            this.setState({value: text})
        })
    }

    componentWillUnmount() {
        if (this.stateSubscription)
            this.stateSubscription.unsubscribe()
    }

    defaultArgs = (): string => {
        let args = {
            project: 'PLATTP',
            author: 'stoner',
            packages: [
              ''
            ],
            servers: {
                polarion: {
                    url: 'https://polarion-devel.engineering.redhat.com/polarion',
                    domain: '.engineering.redhat.com',
                    user: 'stoner',
                    password: '!ronM@N1968'
                }
            },
            testcase: {
                endpoint: '/import/testcase',
                timeout: 300000,
                enabled: false,
                selector: {
                    name: 'rhsm_qe',
                    value: 'testcase_importer'
                },
                title: {
                    prefix: '',
                    suffix: ''
                }
            }
        }
          
        return JSON.stringify(args, null, 2)
    }

    defaultUMBListener = (): string => {
        let randUUID = uuid()
        let data = {
            topic: `Consumer.client-polarize.${randUUID}.VirtualTopic.qe.ci.>`,
            selector: '',
            action: 'start',
            tag: 'rhsmqe',
            clientAddress: null,
            'bus-address': 'rhsmqe.messages'
        }

        let args = { op: 'umb',
            type: 'request',
            data: JSON.stringify(data),
            tag: 'rhsm-qe',
            ack: false
        }
        return JSON.stringify(args, null, 2)
    }

    loadDefaultArgs(): string {
        switch (this.props.id) {
            case 'args':
                return this.defaultArgs()
            case 'testcase':
                return defaultXml
            case 'mapping':
                return defaultMapping
            case 'umb':
                return this.defaultUMBListener()
            default:
                return ''
        }
    }

    render() {
        return (
            <div>
                <div className="hero is-info is-small">
                    <div className="hero-body">
                        <div className="container">
                            <h1 className="title">{this.props.label}</h1>
                            {
                                // <RadioChoice id={`${this.props.id}-choice`} choices={['Hide', 'Show']}/> 
                            }
                        </div>
                    </div>
                    <div className="field">
                        <div className="control">
                            <textarea
                                className="textarea"
                                name={this.props.id}
                                cols={this.props.cols}
                                rows={this.props.rows}
                                value={this.state.value}
                                onChange={this.handleChange}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}