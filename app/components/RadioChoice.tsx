import * as React from 'react'
import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Mercury } from './Mercury'
import { StreamInfo, makeStreamInfo } from 'auctrix'

interface RadioChoices {
    id: string
    choices: string[]
}

type OnClickHandler = (evt: React.MouseEvent<HTMLInputElement>) => void

export const makeInput = (val: string, fn: OnClickHandler) => {
    return (
        <input type="radio" name="choice" value={val} onClick={fn}/>
    )
}

export class RadioChoice extends Mercury<RadioChoices, {}> {
    selected: BehaviorSubject<string>

    constructor(props: RadioChoices) {
        super(props)

        this.state = {
            selected: this.props.choices[0]
        }
        this.modelInit.bind(this)
        this.modelInit()
    }

    modelInit(): void {
        this.selected = new BehaviorSubject(this.props.choices[0])
        let si: StreamInfo<string> = makeStreamInfo(this.props.id, 'selected', 'string', this.selected)
        this.dispatch.register(si)
    }

    actionClick = (evt: React.MouseEvent<HTMLInputElement>) => {
        console.log(evt.currentTarget.value)
        this.selected.next(evt.currentTarget.value)
    }

    render() {
        return (
            <div className="field">
              <div className="control">{
                  this.props.choices.map(c => {
                      return (
                          <label key={c} className="radio">
                            {makeInput(c, this.actionClick)}{c}
                          </label>
                        )
                    })
              }
              </div>
            </div>
        )
    }
}