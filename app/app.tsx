import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Rx from 'rxjs/Rx';
import { MultiText } from './components/MultiText';
import { FilePicker } from './components/FilePicker';
import { makeRequest, TextMessage } from './libs/default-values';

interface RowCols {
    cols: number;
    rows: number;
}

class App extends React.Component<RowCols, {}> {
    args: Map<string, MultiText>;
    textState: Map<string, Rx.BehaviorSubject<string>>;
    message$: Rx.Observable<TextMessage>;
    message: TextMessage;
    cancel: Rx.Subscription | null;

    constructor(props: RowCols) {
        super(props);
        this.args = new Map();
        this.textState = new Map();
        this.cancel = null;
    }

    componentDidMount() {
        console.log('===========================================');
        console.log('Something happened');
        console.log('===========================================');
    }

    /**
     * every time the onChange is called from MultiText component, it will emit the event.  Let's 
     * merge these together
     */
    accumulateState = () => {
        console.log('Getting the state');
        // merge the three Subjects into one stream
        let arg$ = MultiText.emitters.get('args');
        let testcase$ = MultiText.emitters.get('testcase');
        let mapping$ = MultiText.emitters.get('mapping');
        if (arg$ === undefined || testcase$ === undefined || mapping$ === undefined) {
            throw Error('Subject was null');
        }

        //
        return Rx.Observable.merge( arg$.map(a => new Object({tcargs: a}))
                                  , testcase$.map(t => new Object({testcase: t}))
                                  , mapping$.map(m => new Object({mapping: m})))
            .do(i => console.log(`Got new item: ${i}`))
            .scan((acc, next) => Object.assign(acc, next), {})
            .map(data => {
                let request = makeRequest('testcase-import', 'na', 'mercury', data);
                return request;
            });
    }

    /**
     * Once all the arguments have been finalized, when the Submit button is clicked, all the data will be sent
     * over the websocket to polarizer
     */
    onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        // Accumulate all textState Observables emitted data
        if (this.cancel === null) {
            this.message$ = this.accumulateState();
            this.cancel = this.message$.subscribe(
                n => {
                    this.message = n;
                    console.log(this.message.data);
                },
                e => {
                    console.error('Problem getting TextMessage');
                    this.message = makeRequest('', 'error', 'exception', {});
                }
            );
        }

        console.log(this.message.data);
        // console.log(`Going to submit the following:\n${JSON.stringify(this.message, null, 2)}`);
        event.preventDefault();
    }

    render() {
        return (
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
        );
    }
}

ReactDOM.render(
    <App cols={100} rows={50} />,
    document.getElementById('app')
);