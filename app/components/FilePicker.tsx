/**
 * This component will let you pick default files
 */

import * as React from 'react';

type KeyValueList = [string, string][];

interface FilePickerProps {
    options: KeyValueList;
}

interface FilePickerState {
    selected: string;
    file: string;
}

export class FilePicker extends React.Component<FilePickerProps, FilePickerState> {
    fileInput: HTMLInputElement | null;

    constructor(props: FilePickerProps) {
        super(props);

        this.state = {
            selected: '',
            file: ''
        };
    }

    onChange = (event: React.FormEvent<HTMLSelectElement>) => {
        event.persist();
        console.log(event);
        this.setState({selected: event.currentTarget.value});
    }

    handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        let sel = '';
        if (this.fileInput !== null && this.fileInput.files !== null) {
            sel = this.fileInput.files[0].name;
        }
        alert(
            `Selected file - ${sel}`
        );
        event.preventDefault();
    }

    render() {
        return (
            <form name="import" onSubmit={this.handleSubmit}>
                <h1 className="todo">The File Input form does not yet work!!</h1>
                <div>
                    <label>Import existing file for:</label>
                    <select value={this.state.selected} onChange={this.onChange}>
                        {
                            this.props.options.map(entry => {
                                let [k, v] = entry;
                                console.log(`k=${k}, v=${v}`);
                                return <option key={k} value={k}>{v}</option>;
                            })
                        }
                    </select>
                    <input 
                        type="file" 
                        name="files" 
                        accept="text/html" 
                        ref={input => {
                            this.fileInput = input;
                        }}
                    />
                    <input type="submit" value="Import" />
                </div>
            </form>
        );
    }
}