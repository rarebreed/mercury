import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Rx from 'rxjs/Rx';
import { MultiText, MTProps } from './components/MultiText';
import { FilePicker } from './components/FilePicker';

interface RowCols {
    cols: number;
    rows: number;
}

class App extends React.Component<RowCols, {}> {
    args: Map<string, MultiText>;
    textState: Map<string, Rx.BehaviorSubject<string>>;

    constructor(props: RowCols) {
        super(props);

        this.args = new Map();
        this.textState = new Map();
        this.makeMT('Test Config Args', 'args');
        this.makeMT('TestCase XML', 'testcase');
        this.makeMT('Mapping JSON', 'mapping');

        // Accumulate all textState Observables emitted data

    }

    /**
     * every time the onChange is called from MultiText component, it will emit the event.  Let's 
     * merge these together
     */
    accumulateState = () => {
        console.log('Getting the state');
    }

    makeMT = (label: string, id: string) => {
        let props: MTProps = {
            label: label,
            id: id,
            cols: 100,
            rows: 50
        };
        const mt =  new MultiText(props);
        this.textState.set(id, mt.emitter);
        this.args.set(id, mt);
        return mt;
    }

    /**
     * Once all the arguments have been finalized, when the Submit button is clicked, all the data will be sent
     * over the websocket to polarizer
     */
    onSubmit = (event: React.FormEvent<HTMLFormElement>) => {

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