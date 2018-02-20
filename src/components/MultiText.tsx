import * as React from 'react';

interface MTProps {
    id: string;
    cols: number;
    rows: number;
    label: string;
}

export class MultiText extends React.Component<MTProps, {}> {
    constructor(props: MTProps) {
        super(props);

        this.state = {};
    }

    render() {
        return (
            <div>
                <label htmlFor={this.props.id}>{this.props.label}</label>
                <input type="text" id={this.props.id} value="" />
                <textarea name={this.props.id} cols={this.props.cols} rows={this.props.rows} />
            </div>
        );
    }
}
