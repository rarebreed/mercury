import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { App } from './components/App';
import './assets/css/bulma.css';

ReactDOM.render(
    <App cols={100} rows={25} />,
    document.getElementById('app')
);