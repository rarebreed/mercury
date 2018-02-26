# What is mercury

mercury is essentially three things:

- a proof-of-concept project for state management using rxjs 
- practice project to learn typescript, react, enzyme, jsdom and AVA
- a GUI front end project to help test polarizer's websocket end points (/testcase/import and /umblistener)

While we can do cockpit testing using webdriver.io for end to end system level testing, as the 
[Testing Pyramid][-tp] tells you, only about 10-20% of your testing "budget" should be system 
or UI tests.  The vast bulk should be unit and integration tests.

The dilemma is how do you test a UI level component in a unit test?

- [enzyme][-enzyme]: library from AirBnB to isolate react components and run them in jsdom
- [AVA][-AVA]: a modern testing framework built from the ground for async parallel testing
- [typescript][-ts]: language with good tooling and 3rd party support
- [rxjs][-rxjs]: low-level state management and bridge capabilities
- [jsdom][-jsdom]: a javascript "browser" that implements the DOM API, and can execute javascript

Integration tests are another interesting puzzle to solve.  Most of what happens in cockpit 
boils down to:

- User clicks on some DOM element in the GUI (eg a button)
- The plugin either:
  - Does something internally to itself (eg modifies local state)
  - Makes a websocket request to cockpit-ws
    - If using the cockpit.dbus API, the websocket request will forward from cockpit-ws to cockpit-bridge
    - From cockpit-bridge it will pass the now dbus formatted request to the subman DBus API
    - Subman DBus API will do its thing and return a dbus formatted message (back to cockpit-bridge)
    - The bridge will convert the dbus format back to Json and send it over websocket to the client

So, if you want to test some layer there, say for example, you want to make sure that your 
component code making use of cockpit.dbus API works, then you need access to cockpit.js.  But
this file is only included via the script tag.  This means that you have to run your tests from
within the browser itself, because you can't use node to import cockpit.js.

That means you need a framework that can run tests both inside and outside the browser, ruling 
out some frameworks like AVA.  Technically this might be possible, if jsdom can execute javascript code.
This may be something worth looking into since AVA does a lot of things nicer than jasmine (no globals!!).

Jest can run tests either outside the browser in node, or you can run tests inside the browser 
itself.  Jest also has a spiffy feature called snapshotting.  Essentially, it lets you take a 
known good state, and create a snapshot of the virtual DOM.  In your tests, you can then use 
this as an assertion value to make sure that your code renders to the virtual DOM correctly.

## Why not just include this in cockpit plugin?

While possible, there's so many moving parts, that it would be better to isolate the moving 
variables first.  This project is meant to see what it is like to unit test react components
and run some browser tests.

## What about state management?

TL;DR  I'd start with rxjs first, then try out mobx

So, everyone's first thought on this is redux.  It's definitely got the most mindshare.  But the 
more reading I do, the more people say how many workarounds you need to do for things, not to 
mention all the boilerplate code.

Mobx seems to be a promising alternative.  It is a FRP based library to handle state management.
Reactive programming is really nice and it solves many asynchronous _and_ state related problems.
The problem is it takes a lot of getting used to.  Most programmers are not familiar with either
functional or asynchronous programming, then you throw on top of that, the idea that state does
not belong to any object!  In reactive programming, state flows through the system, and interested
objects assign themselves (subscribe) to this stream of ever flowing data.

Mobx hides a lot of this complexity, but I've also heard that is its problem.  There's too much 
"magic" going on.  Using plain old rxjs would allow you to reimplement a lot of the same functionality
albeit with more upfront work.  You'd have to lay down the pipes so to speak, but there wouldn't
be any magic either.  And inevitably, when you start debugging stuff, you need to know how those
inner layers work anyway.

But if rxjs proves too costly to write all the plumbing, mobx seems to be the better alternative
to redux.

## Why typescript?  What about flow or plain old es2016-es2018?

I've played a bit with flow.  While flow is supposed to be more rigourous and catch more compile
time errors (it is more sound and complete to be technical), I've had problems.  

Firstly, flow does let you incrementally type more easily.  This is a blessing and a curse.  This
means that if you have some 3rd party library without type definitions, you can pretty much just
drop them in and use them.  On the bad side, anything touching those functions/variables have no
typing information, so flow's type checker has to assume they are the _any_ type (which basically
means they can be any type except null or undefined)

Secondly, the tooling for flow kinda sucks.  I've had issues with both atom and vscode trying to 
get intellisense to work.  Also, there's a ton of stuff you have to hook into webpack and babel
to make sure flow compiles right.  Because typescript came out first, there are more libraries
with typescript definitions than for flow.  And Facebook itself seems to come up with both 
typescript and flow definitions anyways.

Lastly, I have to wonder about Facebook's committment to flow.  FB's new hotness is a language
called reasonml (which is basically ocaml <=> javascript).  Their messenger app is now written
almost totally in reasonml, and they are also writing react-reason.  Since reasonml has an even
more powerful typesystem than flow (which is already more powerful than java), I don't see why
FB would expend effort on two compile-to-javascript languages.

As for why not plain old ecmascript, typescript will help you catch more errors.  Also, with 
ecmascript, you need more configuration in your webpack config than with typescript.  Plus, 
typescript is a superset of ecmascript anyway (and you can even transpile the code typescript
generated with babel, in case typescript doesn't yet support the latest ecmascript version).

## Why react?  Why not cyclejs?

Ok, I like cyclejs a lot.  It's a really elegant framework that truly embraces Functional Reactive
Programming.  Calling react functional is almost insulting.  Most components are stateful and
the state is held either inside the component itself, or the state is stuffed inside a state 
store like redux or mobx.

React also has some quirks to it.  Being familiar with lifecycle events is required if you want
accurate testing results.  And if you use setState, you have to realize that this.state is 
updated asynchronously (in other words, the react devs force you to use setState to write to 
this.state, but they don't tell you how to asynchronously get the value of this.state).

On the other hand, cyclejs is a pure FRP framework.  There are no classes anywhere, and thus no
_this_ at all!  It follows the principles of functional composition, and it's Model-View-Intent
architecture is simpler than Flux.  So why not cyclejs?

Frankly, I'd love to see us use cyclejs, but this is probably not practically feasible. For one
it would require a rewrite of the existing code.  Two, there's not as documentation and tooling
for cycle as there is for react.  There's tons of stuff out there for react.

# Playground for reactive testing

Lastly, mercury will be a playground for reactive testing.  What do I mean by reactive testing?

Imagine if there was test dbus service listening for all the subman DBus signals, and this test
service could bridge the results over a websocket.  

You could do all kinds of interesting things:

- Monitor when rhsm.conf changes
  - Listen for Configuration Dbus signal
    - Can be used by tests to know to rerun rhsmd service
- Monitor when /etc/pki/product changes
  - send the data about what certs were added/deleted/edited to interested party (like a test)
- Send event to listener when react's componentDidMount() was fired
  - This means that the react component has been rendered to the physical DOM and can be tested
    with webdriver (no polling for DOM element to exist)
- Let components listen for emitted events from other components
  - Which is a major use case for redux which isn't needed
- Log the emitted state to a journal
  - Can be used for "time travel"
  - Another use case for redux which isn't needed
- Allow for the cancellation of a long running async task
  - Not possible with redux without jumping through hoops (redux-saga, etc)

[-tp]: http://www.agilecoachjournal.com/2014-01-28/the-agile-testing-pyramid
[-enzyme]: http://airbnb.io/enzyme/
[-AVA]: https://github.com/avajs/ava
[-ts]: https://www.typescriptlang.org/
[-rxjs]: http://reactivex.io/rxjs/
[-jsdom]: http://airbnb.io/enzyme/docs/guides/jsdom.html