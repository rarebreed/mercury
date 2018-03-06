import * as React from 'react';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import 'rxjs/add/operator/map';
import { defaultXml, defaultMapping } from '../libs/default-values';
import { dispatch, Dispatch, StreamInfo, Lookup } from '../libs/state-management';

export interface MTProps {
    id: string;
    cols: number;
    rows: number;
    label: string;
}

/** 
 * Component for a textarea field with a submit button
 * 
 * Note that this uses rxjs with the emitter field.  This is used to read the actual current state of the 
 * component.  In other words, interested parties should subscribe to this.emitter, instead of trying to 
 * access this.state.  This is because setState is asynchronous, so this.state may not actually be updated
 * until react does some things.  Just as writes to this.state has to go through this.setState, all reads
 * for the current state come from this.emitter
 */
export class MultiText extends React.Component<MTProps, {args: string}> {
    // static emitters: Map<string, BehaviorSubject<string>> = new Map();
    state$: BehaviorSubject<string>;
    mountState: BehaviorSubject<Date>;
    dispatch: Dispatch;

    constructor(props: MTProps) {
        super(props);
        this.componentDidMount.bind(this);
        // Get the dispatch set up
        this.dispatch = dispatch;
        this.dispatch.info.subscribe(action => {
            console.log(`In MultiText, Got a dispatch event: ${JSON.stringify(action, null, 2)}`);
        });
        
        this.state = {
            args: this.loadDefaultArgs()
        };

        // Create all our StreamInfo types so we can register them to Dispatch
        let mountSI = this.makeStreamInfo('mount-state', 'Date', new Date());
        this.mountState = mountSI.stream as BehaviorSubject<Date>;
        let stateSI = this.makeStreamInfo('textarea', 'string', this.state.args);
        this.state$ = stateSI.stream as BehaviorSubject<string>;

        this.dispatch.register(mountSI);
        this.dispatch.register(stateSI);

        let lookup: Lookup = {
            cName: this.props.id,
            sName: 'textarea',
            sType: 'string'
        };
        let found = this.dispatch.lookup(lookup);
        console.debug(`Got this for found: ${JSON.stringify(found, null, 2)}`);
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
        } as StreamInfo<T>;
    }

    // Note:  If you dont write these methods with fat arrow style, _this_ is not bound correctly when called
    handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        event.persist();  // Had to persist the event, to make it a reuseable event from the SyntheticEvent pool
        let text: string = event.target.value;
        this.setState({args: text}, () => {
            this.state$.next(text);
        });
    }

    componentDidMount() {
        console.log(`Mounted MultiText ${this.props.id}`);
        this.mountState.next(new Date());
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
                    user: '',
                    password: ''
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
        };
          
        return JSON.stringify(args, null, 2);
    }

    loadDefaultArgs(): string {
        switch (this.props.id) {
            case 'args':
                return this.defaultArgs();
            case 'testcase':
                return defaultXml;
            case 'mapping':
                return defaultMapping;
            default:
                return '';
        }
    }

    render() {
        return (
            <div>
                <div className="label-submit">
                   <label>{this.props.label}</label>
                </div>
                <textarea
                    className="text-submit"
                    name={this.props.id} 
                    cols={this.props.cols} 
                    rows={this.props.rows} 
                    value={this.state.args} 
                    onChange={this.handleChange} 
                />
            </div>
        );
    }
}