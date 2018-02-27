# What is mercury

mercury is essentially three things:

- a proof-of-concept project for state management using rxjs 
- practice project to learn websockets, typescript, react, enzyme, jsdom and AVA
- a GUI front end project to help test polarizer's websocket end points (/testcase/import and /umblistener)

While we can do cockpit testing using webdriver.io for end to end system level testing, as the 
[Testing Pyramid][-tp] tells you, only about 10-20% of your testing "budget" should be system 
or UI tests.  The vast bulk should be unit and integration tests.

What tools can help us for both UI and unit/integration tests?

- [enzyme][-enzyme]: library from AirBnB to isolate react components and run them in jsdom
- [AVA][-AVA]: a modern testing framework built from the ground for async parallel testing
- [typescript][-ts]: language with good tooling and 3rd party support
- [rxjs][-rxjs]: low-level state management and bridge capabilities
- [jsdom][-jsdom]: a javascript "browser" that implements the DOM API, and can execute javascript
- [websockets][-ws]: a protocol (with many library implementations) for components to communicate

Integration tests are another interesting puzzle to solve.  Most of what happens in cockpit 
boils down to:

- User clicks on some DOM element in the GUI (eg a button)
- The plugin either:
  - Does something internally to itself (eg modifies local state)
  - Makes a websocket request to [cockpit-ws][-cockpit-ws]
    - If using the [cockpit.dbus API][-cp-dbus], the websocket request will forward from cockpit-ws to cockpit-bridge
    - From cockpit-bridge it will pass the now dbus formatted request to the subman DBus API
    - [Subman DBus API][-subman-db] will do its thing and return a dbus formatted message (back to cockpit-bridge)
    - The bridge will convert the dbus format back to Json and send it over websocket to the client

So, if you want to test some layer there, say for example, you want to make sure that your 
component code making use of cockpit.dbus API works, then you need access to cockpit.js.  But
this file is only included via the script tag.  This means that you have to run your tests from
within the browser itself, because you can't use node to import cockpit.js.

That means you need a framework that can run tests both inside and outside the browser, ruling 
out some frameworks like AVA.  Technically this might be possible, if jsdom can execute javascript code.
This may be something worth looking into since AVA does a lot of things nicer than jasmine (no globals!!).

AVA, like jest, has a feature called snapshotting. It lets you take a 
known good state, and create a snapshot of the virtual DOM.  In your tests, you can then use 
this as an assertion value to make sure that your code renders to the virtual DOM correctly.

## Why websockets?

Well, for starters, that's how cockpit (the browser [SPA][-spa]) talks to cockpit (the server, cockpit-ws).  All
the messaging going back and forth is being done as websockets.  Therefore, it's not a bad thing to
learn about them.

Secondly, websockets, unlike REST, are bidirectional.  This enables websockets to do things that 
traditional http can't (though [Server Sent Events][-SSE] can touch on).  Websockets are really nice when 
you want real-time data to be pushed without having to poll and ask for it.

We could also make use of websockets for testing.  Just like one of the big use cases for cockpit
is to act as a dbus to html bridge, we can leverage other kinds of bridges to connect one 
component to another.  What could we do with them?

- Write react DOM render events to a testing listener to know when to do something (eg click)
- External listener for subman DBus signals, like an Attach for a product
- Listen for when product certs have been created/edited
- Write a (persistent) journal log for all state events
- Play back the state in the journal over the websocket to change react state (play back feature)

This gets more complicated when multiple clients start talking to each other.  If you have A, B
and C clients, each exposing some service or data that the other wants, how do you get them to talk
"the same language"?  That's why you basically have to implement your own little application level
protocol when you use websockets (or any bidirectional asynchronous protocol for that matter).

That means we have to think about what kind of messages can be exchanged between clients, how
those messages can be decoded, and whether a response is even required.

## Why not just include this in cockpit plugin?

While possible, there's so many moving parts, that it would be better to isolate the moving 
variables first.  This project is meant to see what it is like to unit test react components
and run some browser tests.

## What about state management?

TL;DR  I'd start with rxjs first, then try out [mobx][-mobx]

So, everyone's first thought on this is [redux][-redux].  It's definitely got the most mindshare.  But the 
more reading I do, the more people say [how many workarounds][-sitept] you need to do for things, not to 
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
drop them in and use them. 

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
ecmascript, you need more configuration in your webpack config than with typescript.

## Why react?  Why not cyclejs?

Ok, I like [cyclejs][-cyclejs] a lot.  It's a really elegant framework that truly embraces Functional Reactive
Programming.  Calling react functional is almost insulting.  Most components are stateful and
the state is held either inside the component itself, or the state is stuffed inside a state 
store like redux or mobx.

React also has some quirks to it.  Being familiar with [react lifecycle][-react-evts] is required if you want
accurate testing results.  And if you use setState, you have to realize that this.state is 
updated asynchronously (in other words, the react devs force you to use setState to write to 
this.state, but they don't tell you how to asynchronously get the value of this.state).  Why is 
this important to know?

Because this.setState() updates state _asynchronously_, if somewhere else in your code you blindly
check this.state (which the react docs don't really talk about), you might have a problem.  This is
because this.setState() is asynchronous and will only change this.state's values _at some future time_.
So, not only must you only use this.setState() to make sure your state is synchronized properly, 
you really also need some way to know when the state values have actually changed.  Here's an
example of where this can go wrong:

```javascript

interface AccountProps {
  holder: string,
  id: number
}

interface BalanceState {
    balance: number
}

class Foo extends React.Component<AccountProps, BalanceState>
  constructor(props: AccountPros) {
    super(props);
  }

  // Use this syntax using fat arrows, so we properly bind _this_
  onHandle = (event) => {
    this.setState({balance: event.currentTarget.value})
  }

  onSubmit = (event) => {
    // Wrong, could blow up here.  If onSubmit gets called very soon to when onHandle was called, 
    // there is no guarantee that this.setState has updated this.state.balance yet.
    if (this.state.balance > 100) { 
      ...
    }
  }
}
``` 

This kind of problem is avoided in cyclejs.  Since cyclejs only has stateless components! So 
cyclejs is a pure FRP framework.  There are no classes anywhere, and thus not only is there no
this.state, there is no _this_ at all!  It follows the principles of functional composition, 
and its Model-View-Intent architecture is simpler than Flux.  So why not cyclejs?

Frankly, I'd love to see us use cyclejs, but this is probably not practically feasible. For one,
it would require a rewrite of the existing code.  Two, there's not as much documentation and 
tooling for cycle as there is for react.  There's tons of stuff out there for react.

# Playground for reactive testing

So, first things first.  Why bother learning FRP?  There are a couple of good reasons to learn
new ways of doing things, but only one that managers really care about:  How does this new
fangled technology help make our product better?

In other words, what problems does it solve that the current way of doing things either can't, 
or creates too much technical debt for.  FRP started out as a research topic within the haskell
community, but it turned out to be more than just some library.  It's an entirely different 
approach to solving problems.

## What does reactive solve?

Note: you might want to read my [functional reactive programming notes][-frp-notes] as well

I will wager that most programmers over about 26 probably didn't learn about reactive or even
functional programming.  So let's start with something familiar; how we program in an imperative
and synchronous fashion.

We are used to solving problems in a linear and sequential way.  Do step 1, and take the results
of Step 1 to help solving Step 2.  Very simple and easy to reason about.  But then we started 
holding certain state inside of objects.  So the logical conclusion was, "hey Object B, I need
to know what your 'checkingBalance' is, let me know what it is".  Seemed logical right?  Have
the state and methods that work on that state next to each other.

In this world, not only do you do your computations step by step in a linear fashion (from top
to bottom), objects ask for data from each other.  Here, "asking" for data is a method call.
If Object A wants some state from Object B, and Object B exposes this in B.getBalance(), then 
A takes some reference to B and calls B.getBalance(), then stuffs the result away somewhere to
be worked on.

This should all be second nature to programmers.  The problem is, the world doesn't always work
this way.  The first problem is the sequential linearity to this programming.  In other words, 
the world very often is not synchronous.  Or at best, it might be synchronous, but the answer
may take a very long time in the coming (ie, the function call that will get you some data has
to block).  At best, this is wasteful, and at worst, you will get the wrong data.  

```javascript
let ans = do_something(10)  // If this code returns a promise or is asynchronous...
let final_result = something_else(ans)  // what is the value of ans when we pass it in?
```

If you have a blocking synchronous call, either your thread waits until it gets data (or maybe
it times out), or, you spawn some new thread and your main thread goes about its business until
your thread completes and sends a signal, or you try to retrieve the result of a future/promise.
But evil darkness waits within when you start using threads (and promises and futures are just
high level abstractions around threads).  I'll explain what evil lurks inside in a bit, but
concurrency via threads is not very scalable.  For a long time, single threaded node web servers
were thrashing java web servers in performance.  How is that possible if node is single threaded?

So, remember how I said evil lurks inside when using threads?  The problem has to do with concurrent
modification (eg writes) to some shared data.  If you have multiple observers (read-only) to some
shared state, no problem.  But as soon as one actor modifies state, you enter a world of hurt.
Now, you have to somehow make sure that none of the other reader/writers are accessing the data
while some other writer is modifying the data, otherwise the other reader/writers are going to 
be accessing inconsistent data.  This is a further nail in the performance of thread based
approach to concurrency, because while that one writer is modifying data, any other actors are
blocked (either through a lock, mutex, or some kind of transaction).  Now you've got lock based
contention to worry about.  Did I mention livelocks and deadlocks?  I haven't talked about the
overhead of thread context switching either.  And isn't the whole point of using more threads 
supposed to make my program faster and _more_ lively?

Instead of approaching concurrency with multiple threads (or processes), there's another approach
that has gained popularity.  A single threaded event loop (or reactor) model.  Back before 
multiprocessors were common, computer games were speedy enough.  How did they do it?  Games then
(and I presume today, albeit with some multiprocessing) were basically big old event loops.
At some point in the loop, keyboard and mouse events were collected, and then the loop would move
to the next piece of code (graphics updating, model updating, etc).  

Nodejs took the idea of an event loop and proved how fast it could be.  Java only started 
overtaking nodejs web performance when its web frameworks also started supporting reactor 
(or proactor) event models.  In an event loop model, all functionality has to be made asynchronous,
and therefore non-blocking.  If you didn't do that, the event loop would hang waiting for some 
blocking method call, and everyone downstream in the loop would hang.

But wait, how do you program when you don't know when some function call will return?  We are 
so ingrained to doing something like this:

```python
balance = get_current_balance("Sean Toner", account=12345)
if (balance > 100)
  print("Gunna buy me a new PC game")
```

Looks perfectly reasonable right?  get_current_balance() returns the balance in account 12345, 
and if it's greater than 100, I get to buy myself a video game.  Except, that's now how it works
in an async world.  In fact, if get_current_balance returns a promise, balance may not have been
resolved yet (it's value is indeterminate), because get_current_balance hasn't had enough time
yet to actually get a value.

A common solution to this problem is to use callbacks:

```javascript
get_current_balance("Sean Toner", account=12345, (result, error) => {
  if (error) {
    console.error("awww man, the bank is down")
    return
  }
  if (result > 100)
    console.log("Gunna buy me a new PC game")
})
```

Callbacks have their own problem called "callback hell" which occurs when you have deeply 
nested callbacks.  It's not just hard to read, it's hard to do error handling right when you have
deep nesting of callbacks.  To solve this, many languages support the idea of a promise.  
Promises do have a lot of potential to solve asynchronous problems, but they do have one weakness
which I will get to in a moment.  Because of this weakness, another new async solving solution
called Observables was developed.  Observables are closely related to the original FRP solution
and are also related to the Actor model.

Before I can talk about how [Observables/Observers][-obsv] work, I need to discuss another fundamental
problem that our imperative synchronous solutions have ingrained on us. We are used to asking for
data from some other object, because we are used to jealously guarding state inside of some 
object, and only doling it out with great care (see above).  But instead of one object _asking_
for state, why not let it be _told_ about state changes instead?

This is the fundamental premise of reactive programming.  Instead of asking for state (from an 
Object called an Observable), an object (called an Observer) is _told_ about state changes.  To
put it another way, the imperative synchronous model is **pull** oriented, where the reactive
model is **push** oriented (where the perspective is from the object containing data).  Do you
see the advantages to this?  How often have you wished for a database that could tell you when
a record or table was updated?  And instead of some reader trying to ask for access to some data
(and maybe waiting on a transaction to finish), it can just sit and be notified when data changes
and _react_ to the new incoming data.  What about writers you ask?  Data comes from an Observable
which emits new data as it receives them.  Normally, Observables are self-contained, but there
is a special kind of Observable called a Subject which allows not just output, but input.

```
          | Observable [1,2,3,4] | ===> emitted 
item ===> | Subject              | ===> emitted
```

Furthermore, Observables and Observers are kind of like a mini-bus with pub-sub capabilities.
You can have multiple Observers subscribed to the same Observable, in which case the Observers
all receive an identical copy of the emitted data.  Lastly, when an Observer subscribes to an 
Observable, the return of the subscribe() call is a Subscription.  This Subscription object allows
you to cancel what the Observer does with the incoming data as well as inform the connected 
Observable to stop emitting new events (as long as there are no other subscribers).  As long as
the intermediate operators perform no side effects, this allows you to cancel actions (and is 
why all side-effectul actions should happen on the Observer side, not in the intermediate 
operators).  Another way to think about an Observable (and Subject) as as a kind of potentially
infinite generator.  And in fact, you can turn a generator into an Observable.

Why not just use promises?  Wasn't promises supposed to solve all the javascript async problems?
Promises are nice.  They are a monadic solution to the nested callback hell.  But they have two
limitations:

- They can't abort like an Observable can
- They can't yield multiple items

If you're only thinking XHR (XmlHttpRequest, which is an async http call), then the last bullet 
point may not make sense.  But imagine for second onClick handler for a DOM event.  That can 
yield an infinite number of clicks, and the onClick handler itself might make some asynchronous
call (for example, an XHR request).  So now what do you do?  Promises aren't going to help you 
with that.

This is the fundamental concept of reactive programming, of which rxjs is a leading framework in 
the javascript world (with its equally popular cohort rxjava in the java world). In the reactive
programming model, computations become like a graph model, where the vertices are either some 
kind of Observable emitting data, or an Observer acting on that data, and the outgoing edges are
the emitted data.  

If you have done any circuit programming or data-flow oriented programming (ala LabView, or vhdl)
, this may sound a little familiar.  When you have a circuit board, you don't have all the circuits
lined up from top to bottom or left-to-right.  Each component on the circuit board can connect to 
many others, and it is simultaneously sending and receiving signals (this by the way, is the _true_
definition of FRP as defined by the Haskell authors, since FRP was designed for _continuous_ 
signals, as opposed to reactivex's more discrete emitted data) 

## What does rxjs buy us?

So, what does all that buy us?  Isn't all this like super-hard and overbloated?

Let's think about the consequences of not doing this, and write same-o-same-o tests the way we 
always have. 

**Lessons from the gui tests**

### Polling pains

We could always do what we did before.  Our GUI tests are littered with _waitForGUI_ kinds of methods
which basically poll to see if the widget element in the GUI exists.  And if it doesn't show up
within some timeout period, we assume some failure.  

```
Instead, we can use rxjs with a hook into the componentDidMount to know when the react component
is mounted in the physical DOM.  No wasted time polling and another test can run in the meanwhile
```

### Linear tests

We have to run our tests serially for a couple of reasons.  For one, sometimes one test has a 
dependency on another test (which is a bad idea, if a test needs some state that state should be
set up in a beforeSuite or beforeTest method).  Another reason is that we don't want tests to 
potentially clobber each other.  Perhaps one test is attaching a product...imagine if a concurrently
running test is also detaching a product.  If all we do is count the number of product certs, we 
will run into a problem, especially because this means to assert the correct value, we have to 
first ascertain "how many certs/products do we currently have" as a comparison.  As a consequence,
we have to run tests serially so that one test doesn't mess with the state of another.

```
Taking the above example, it doesn't matter if an attach and detach test runs concurrently.  All 
that matters is that the test receives an event that a product was added and removed respectively.
In fact, this will mirror the real world better (one developer and one sysadmin both logged into
the same machine simultaneously, each wanting to do something different)
```

### Scraping for files or logs

In some of our tests, we have to dig into the file system to make sure that something got created,
or count how many files there are before and after some function was invoked.  In other cases, 
we have to search through the log file to make sure something happened.  

```
All these use cases are solved using rxjs.  You can have a nodejs file service monitor watching
for a certain directory, and let you know when files are created/modified.  All the test has to 
do is hook into (subscribe) to this file monitor.  Same with the log monitoring, and indeed if
we journal the state, this will be much easier to parse than text in a log file.
```

## Towards a better cockpit plugin

It's not just testing that will benefit from using rxjs (and a bridge).  Instead of using a state
store like redux or mobx, rxjs handles many of the same tasks (albeit, you'll have to roll your
own solutions...but mobx is essentially an FRP state-change framework on top of reactive)

- Replacement for many use cases of redux
- Handles cases where promises dont work
  - If user wants to cancel an action that is taking too long
  - For any kind of potentially 
- Allows for a bus-like message passing system to connect disparate components
  - Unlike redux's global state store, only the connected components need to care about each other
- Allows for real-time data collection and reaction to data changes
  - No polling
  - If bridged over a websocket, allows real-time events to be sent

I gave some examples of how websockets could be helpful, but consider these more concrete examples.
Imagine if there some other (test) services listening for information sent by some Observable, and 
these services could bridge the results over a websocket. You could do all kinds of interesting 
things:

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
- Allow for the user to cancel a long running async task (eg manifest generation)
  - Not possible with redux without jumping through hoops (redux-saga, etc)

[-tp]: http://www.agilecoachjournal.com/2014-01-28/the-agile-testing-pyramid
[-enzyme]: http://airbnb.io/enzyme/
[-AVA]: https://github.com/avajs/ava
[-ts]: https://www.typescriptlang.org/
[-rxjs]: http://reactivex.io/rxjs/
[-jsdom]: http://airbnb.io/enzyme/docs/guides/jsdom.html
[-cockpit-ws]: http://cockpit-project.org/guide/latest/cockpit-ws.8
[-cp-dbus]: http://cockpit-project.org/guide/latest/cockpit-dbus
[-subman-db]: http://www.candlepinproject.org/docs/subscription-manager/dbus_objects.html
[-spa]: https://www.codeschool.com/beginners-guide-to-web-development/single-page-applications
[-SSE]: https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events
[-mobx]: https://mobx.js.org/
[-sitept]: https://www.sitepoint.com/redux-vs-mobx-which-is-best/
[-cyclejs]: https://cycle.js.org/
[-frp-notes]: https://github.com/rarebreed/mercury/blob/master/docs/func-types-reactive.rst
[-obsv]: http://reactivex.io/documentation/observable.html
[-redux]: https://redux.js.org/
[-ws]: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
