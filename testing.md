# What is mercury?

mercury is a small websocket microservice that can act as either a client or server communicating over
websockets.

The main services it provides are for testing cockpit and Red Hat subscription management.  To support
this goal, mercury will do the following:

1. Capture all cockpit to subman DBus events
1. Capture react view state changes
1. Monitor certain directories for file changes
1. Web Interface to polarizer's http, umb and test verticles
1. Proof of concept testbed for using jest and enzyme to test react components

## Capturing cockpit to subman dbus events

This functionality requires that all the subman dbus objects have a signal emitted for certain method
calls.  For example, it would be nice to know when a client requested to Register, or when it made an
Attach method call.

For this to happen, we need to have signals emitted from the subscription-manager DBus interfaces.
Otherwise, there will be no way to know when certain actions (method calls) are happening.

## Capture react view state changes

Everyone seems to want to use redux for this, but I think we can use rxjs for the same purpose.  It
has a couple of advantages too.

For one, we can have Observables emitting the state values over time.  Any interested parties can 
then hook themselves in by subscribing to the Observable.  More interestingly, react has a lifecycle
function called componentDidMount().  This function is called after the component has been inserted
into the real physical DOM.

This means that we can have an Observable emit something in the call to componentDidMount().  Other
parties can Observe this by calling this.mountstate.subscribe().  For example:

```typescript
// In project/src/components/Foo.ts
export class Foo extends React.Component<{}, {}> {
    mountState: Rx.Subject<Date | null>

    constructor(props) {
        super(props)

        this.mountState = new Rx.BehaviourSubject(null).filter(n => n !== null)
    }

    componentDidMount = () => {
        this.mountState.next(new Date())
    }

    render() {
        return (
            <form>
                <label>Just a test</label>
                <input type="text" value="Your Name">
            </form>
        )
    }
}

// In project/__tests__/simpletest.ts
import { Foo } from '../../src/components/Foo'

describe('Checks that a new name was written')

```