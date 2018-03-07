# What is mercury?

mercury is a proof of concept framework to help both building and testing react based applications. At
its core it supplies two main features:

- rxjs based state managment between components
- rxjs Observable to websocket bridges

With the above two features in place, they will provide an easier way to both build and test cockpit 
plugins, including the and Red Hat subscription management plugin to cockpit.  For example, the 
above features will allow us to:

1. Capture all cockpit to subman DBus events
1. Capture react view state changes
1. Monitor certain directories for file changes
1. Web Interface to polarizer's http, umb and test verticles

We also need a way to do integration testing on cockpit.  For this, mercury will explore how to use
jest to run in-browser integration tests.  This in turn requires the tests to be embedded as plugins
in cockpit.

However, mercury should also be designed to run any react application, not just cockpit plugins.

## State management using rxjs

Instead of using redux or mobx, this is a homegrown solution.  A [lot][-react-with-rxjs] of people 
have already remarked how [rxjs can do what redux does][-rxjs-vs-redux].  Angular 2+ doesn't rely on
redux the way that the react world does, as they have ngrx instead (you can guess what the rx stands
for).  Also, mobx is a state management system built on top of FRP principles.

So why not redux?  Why not mobx?

For redux, the underlying assumption is still that state is tucked away inside some global state store.
Redux handles neither asynchronicity nor cancellation very well.  Let's put it this way: in a circuit
board, do all the components send their signal to some central component, which then notifies other
components?  Nope, each component is wired together as needed.  Signals emitted from one component
are asynchronous and more importantly, who "owns" the signal?  The transmitter, or the receiver?

In other words, throw away your concept of ownership of state and time.  They are illusions foisted
on you by imperative programming.  FRP on the hand talks about data flow oriented programming.  Data
comes in streams at unknown intervals.  So for two components to communicate, one component is a
sender (Observable) and another is a receiver (Observer)

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


[-rxjs-vs-redux]: http://rudiyardley.com/redux-single-line-of-code-rxjs/
[-react-with-rxjs]: https://michalzalecki.com/use-rxjs-with-react/