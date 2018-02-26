import * as React from 'react';
import * as Rx from 'rxjs/Rx';
import '../assets/css/default.css';
import { defaultXml, defaultMapping } from '../libs/default-values';

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
    emitter: Rx.BehaviorSubject<string>;
    mountState: Rx.BehaviorSubject<Date>;

    constructor(props: MTProps) {
        super(props);

        this.state = {
            args: this.loadDefaultArgs()
        };

        this.mountState = new Rx.BehaviorSubject(new Date());
        this.emitter = this.makeEmitter();
        this.emitter.subscribe(n => console.log(`Got a new value:\n${n}`));

        this.componentDidMount.bind(this);
    }

    makeEmitter = () => {
        let obs = new Rx.BehaviorSubject(this.state.args);
        // TODO:  Store or persist state.
        return obs;
    }

    // Note:  If you dont write these methods with fat arrow style, _this_ is not bound correctly when called
    handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        event.persist();  // Had to persist the event, to make it a reuseable event from the SyntheticEvent pool
        let text: string = event.target.value;
        this.setState({args: text}, () => {
            this.emitter.next(text);
        });
    }

    componentDidMount() {
        this.mountState.next(new Date());
    }

    defaultArgs = (): string => {
        let args = {
            xunit: {
                importer: {
                    xml: '/home/stoner/Projects/testpolarize/test-output/testng-polarion.xml',
                    args: '/home/stoner/polarizer-xunit.json' 
                },
                generate: {
                    // tslint:disable-next-line:max-line-length
                    focus: '/home/stoner/Projects/testpolarize/test-output/junitreports/TEST-com.github.redhatqe.rhsm.testpolarize.TestReq.xml',
                    args: '/home/stoner/polarizer-xunit.json',
                    mapping: '/home/stoner/Projects/testpolarize/mapping.json'
                }
            },
            testcase: {
                importer: {
                    xml: '/home/stoner/Projects/testpolarize/test-output/testng-polarion.xml',
                    args: '/home/stoner/polarizer-testing-testcase.json',
                    mapping: '/home/stoner/Projects/testpolarize/mapping.json'
                },
                mapper: {
                    focus: '/home/stoner/Projects/testpolarize/build/libs/testpolarize-0.1.0-SNAPSHOT-all.jar',
                    mapping: '/home/stoner/Projects/testpolarize/mapping.json',
                    args: '/home/stoner/polarizer-testcase.json'
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
