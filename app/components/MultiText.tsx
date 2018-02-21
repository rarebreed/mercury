import * as React from 'react';

interface MTProps {
    id: string;
    cols: number;
    rows: number;
    label: string;
}

export class MultiText extends React.Component<MTProps, {args: string}> {
    constructor(props: MTProps) {
        super(props);

        this.state = {
            args: this.loadDefaultArgs()
        };
    }

    loadDefaultArgs(): string {
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

    handleSubmit(event: Event) {
        console.log('An essay was submitted: \n' + this.state.args);
        event.preventDefault();
    }

    handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        this.setState({args: event.currentTarget.value});
    }

    render() {
        return (
            <form>
                <label htmlFor={this.props.id}>{this.props.label}
                    <textarea
                        name={this.props.id} 
                        cols={this.props.cols} 
                        rows={this.props.rows} 
                        value={this.state.args} 
                        onChange={this.handleChange} 
                    />
                </label>
                <input type="submit" id={this.props.id} value="Submit" />
            </form>
        );
    }
}
