import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { MultiText } from './components/MultiText';

ReactDOM.render(
    <MultiText label="Test Config Args" id="args" cols={80} rows={50} />,
    document.getElementById('app')
);