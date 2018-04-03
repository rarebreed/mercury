import * as React from 'react'
import { dispatch, Dispatch } from 'auctrix'

export abstract class Mercury<P, S> extends React.Component<P, S> {
    dispatch: Dispatch

    constructor(props: P) {
        super(props)
        this.dispatch = dispatch
    }

    /** 
     * All registering and lookup in dispatch should be done here
     */
    abstract modelInit(): void
}