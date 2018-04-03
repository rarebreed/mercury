import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { App } from './components/App'
import './assets/css/bulma.css'

ReactDOM.render(
    <App cols={80} rows={15} />,
    document.getElementById('app')
)