# What is mercury

mercury is a couple of things:

- a proof-of-concept project for state management using rxjs 
- practice project to learn websockets, typescript, react, enzyme, jsdom and AVA
- a GUI front end project to help test polarizer's websocket end points (/testcase/import and /umblistener)

While we can do cockpit testing using webdriver.io for end to end system level testing, as the [Testing Pyramid][-tp]
tells you, only about 10-20% of your testing "budget" should be system or UI tests.  The vast bulk should be unit and
integration tests.

What tools can help us for both UI and unit/integration tests?

- [websockets][-ws]: a protocol (with many library implementations) for components to communicate
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
  - Makes a websocket request to [cockpit-ws][-cockpit-ws]
    - If using the [cockpit.dbus API][-cp-dbus], the websocket request will forward from cockpit-ws to cockpit-bridge
    - From cockpit-bridge it will pass the now dbus formatted request to the subman DBus API
    - [Subman DBus API][-subman-db] will do its thing and return a dbus formatted message (back to cockpit-bridge)
    - The bridge will convert the dbus format back to Json and send it over websocket to the client

So, if you want to test something using cockpit, say for example, you want to make sure that your component code making
use of cockpit.dbus API works, then you need access to cockpit.js.  But this script is only included via the html's 
script tag.  This means that you have to run your tests from within the browser itself, because you can't use node to 
import cockpit.js.

This means the framework has to be able to execute tests within a browser.  Normally AVA would not be able to do this,
however, it might be possible by using the jsdom.

But how can we _design for test_?  What does that even mean?  It comes from the hardware world, and it means that 
how you design and architect your solution has to take into account features that make testing easier.  So, what
are some things we can do to make the product easier to test and debug?  

## Why websockets?

Well, for starters, that's how cockpit (the browser [SPA][-spa]) talks to cockpit (the server, cockpit-ws).  All the
messaging going back and forth is being done as websockets.  Therefore, it's not a bad thing to learn about them.

Secondly, websockets, unlike REST, are bidirectional.  This enables websockets to do things that traditional http
can't (though [Server Sent Events][-SSE] can touch on).  Websockets are really nice when you want real-time data to 
be pushed without having to poll and ask for it.

We could also make use of websockets for testing.  Just like one of the big use cases for cockpit is to act as a dbus
to html bridge, we can leverage other kinds of bridges to connect one component to another.  What could we do with 
them?

- Write react DOM render events to a testing listener to know when to do something (eg click)
- External listener for subman DBus signals, like an Attach for a product
- Listen for when product certs have been created/edited
- Write a (persistent) journal log for all state events
- Play back the state in the journal over the websocket to change react state (play back feature)

This gets more complicated when multiple clients start talking to each other.  If you have A, B and C clients, each
exposing some service or data that the other wants, how do you get them to talk "the same language"?  That's why you
basically have to implement your own little application level protocol when you use websockets (or any bidirectional
asynchronous protocol for that matter).

That means we have to think about what kind of messages can be exchanged between clients, how those messages can be
decoded, and whether a response is even required.

One last thing to consider.  Imagine making an agent that can push notifications in real-time for when products are
attached to a system.  This agent could, "phone home" and therefore act as a _real time_ auditing and reporting tool
(which is a **far** superior solution to using ansible to essentially do an inventory)

## What about state management?

TL;DR  I'd start with rxjs first, then try out [mobx][-mobx]

So, everyone's first thought on this is [redux][-redux].  It's definitely got the most mindshare.  But the more reading
I do, the more people say [how many workarounds][-sitept] you need to do for things, not to mention all the boilerplate
code.

Mobx seems to be a promising alternative.  It is a FRP based library to handle state management. Reactive programming
is really nice and it solves many asynchronous _and_ state related problems. The problem is it takes a lot of getting 
used to.  Most programmers are not familiar with either functional or asynchronous programming, then you throw on top
of that, the idea that state does not belong to any object!  In reactive programming, state flows through the system,
and interested objects assign themselves (subscribe) to this stream of ever flowing data.

Mobx hides a lot of this complexity, but I've also heard that is its problem.  There's too much "magic" going on.  
Using plain old rxjs would allow you to reimplement a lot of the same functionality albeit with more upfront work.  
You'd have to lay down the pipes so to speak, but there wouldn't be any magic either.  And inevitably, when you start 
debugging stuff, you need to know how those inner layers work anyway.

I will show an actual rxjs example at the end for how to use rxjs for state management 

## Why typescript?  What about flow or plain old es2016-es2018?

I've played a bit with flow.  While flow is supposed to be more rigourous and catch more compile time errors (it is 
more sound and complete to be technical), I've had problems with it.  Mostly it boiled down to problems with the 
tooling and lack of 3rd party libraries with flow types.

As for why not plain old ecmascript, typescript will help you catch more errors.  Also, with ecmascript, you need more 
configuration in your webpack config than with typescript.  But static typing is definitely the way to go.  Not only
does it enforce documentation (how many times have you looked at python code and gone, "now, what am I supposed to 
pass into that function?").  Any claims that dynamic languages are faster to program in rings hollow, once you factor
in the head scratching of what tyoes to pass in, grokking the source code to figure it out, writing unit tests that
are poor type checkers anyways, going through a debugger because you hit a bug that could have been found with a 
compiler, and dealing with an irate customer, because your code hit a runtime issue that could have been caught at 
runtime.

Just say no to dynamic programming. And remember, friends dont let friends dynamic type.

## Why react?  Why not cyclejs? (or can we make react more pure?)

Ok, I like [cyclejs][-cyclejs] a lot.  It's a really elegant framework that truly embraces Functional Reactive
Programming.  Calling react functional is almost insulting.  Most components are stateful and the state is held either
inside the component itself, or the state is stuffed inside a state store like redux or mobx.

React also has some quirks to it.  Being familiar with [react lifecycle][-react-evts] is required if you want
accurate testing results.  And if you [use setState][-setState], you have to realize that this.state is updated 
asynchronously (in other words, the react devs force you to use setState to write to this.state, but they don't tell 
you how to asynchronously get the value of this.state).  Why is this important to know?

Because this.setState() updates state _asynchronously_, if somewhere else in your code you blindly check this.state 
(which the react docs don't really talk about), you might have a problem.  This is because this.setState() is 
asynchronous and will only change this.state's values _at some future time_. So, not only must you only use 
this.setState() to make sure your state is synchronized properly, you really also need some way to know when the state 
values have actually changed  before reading this.state.  Here's an example of where this can go wrong:

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

This kind of problem is avoided entirely in cyclejs.  Since cyclejs only has stateless components! So cyclejs is a pure
FRP framework.  There are no classes anywhere, and thus not only is there no this.state, there is no _this_ at all!  It
ollows the principles of functional composition, and its Model-View-Intent architecture is simpler than Flux.  So why
not cyclejs?

Frankly, I'd love to see us use cyclejs, but this is probably not practically feasible. For one, it would require a 
rewrite of the existing code.  Two, there's not as much documentation and tooling for cycle as there is for react.  
There's tons of stuff out there for react.

There are some ways to make react more cyclejs like.  For one, it is possible to make all components stateless.  There
would be no this.state, and instead of extending React.Component, you just use functions that return DOM elements.  So
how would you deal with state?  Even stateless components can still accept props.  Your state would be your props.

Waiittt!! The react docs says you can only use props during instantiation, as they are otherwise read-only.  That is
true, so that means if you want a component to receive or update some new value, you have to recreate a new instance.
This is not as expensive as it sounds, since the virtual DOM can calculate only what needs to change.  It's not as fast, 
but it is something to consider.

*TODO* 

- Show example

# Playground for reactive testing

So, first things first.  Why bother learning FRP?  There are a couple of good reasons to learn new ways of doing things
, but only one that managers really care about:  How does this new fangled technology help make our product better?

In other words, what problems does it solve that the current way of doing things either can't, or creates too much 
technical debt for.  FRP started out as a research topic within the haskell community, but it turned out to be more 
than just some library.  It's an entirely different approach to solving problems.

## What does reactive solve?

Note: you might want to read my [functional reactive programming notes][-frp-notes] as well

I will wager that most programmers over about 26 probably didn't learn about reactive or even functional programming.  
So let's start with something familiar; how we program in an imperative and synchronous fashion.

We are used to solving problems in a linear and sequential way.  Do step 1, and take the results of Step 1 to help 
solving Step 2.  Very simple and easy to reason about.  But then we started holding certain state inside of objects.  
So the logical conclusion was, "hey Object B, I need to know what your 'checkingBalance' is, let me know what it is".
Seemed logical right?  Have the state and methods that work on that state next to each other.

In this world, not only do you do your computations step by step in a linear fashion (from top to bottom), objects ask
for data from each other.  If Object A wants some state from Object B, and Object B exposes this in B.getBalance(), 
then A takes some reference to B and calls B.getBalance(), then stuffs the result away somewhere to be worked on.

This should all be second nature to programmers.  The problem is, the world doesn't always work this way.  The first 
problem is the sequential linearity to this programming.  In other words, the world very often is not synchronous.  Or 
at best, it might be synchronous, but the answer may take a very long time in the coming (ie, the function call that 
will get you some data has to block).  At best, this is wasteful, and at worst, you will get the wrong data.  

```javascript
let ans = do_something(10)  // If this code returns a promise or is asynchronous...
let final_result = something_else(ans)  // what is the value of ans when we pass it in?
```

If you have a blocking synchronous call, either your thread waits until it gets data (or maybe it times out), or, you 
spawn some new thread and your main thread goes about its business until your thread completes and sends a signal, or
you try to retrieve the result of a future/promise.

But evil darkness waits within when you start using threads (and promises and futures are just high level abstractions 
around threads).  I'll explain what evil lurks inside in a bit, but concurrency via threads is not very scalable.  For 
a long time, single threaded node web servers were thrashing java web servers in performance.  How is that possible if
node is single threaded?

So, remember how I said evil lurks inside when using threads?  The problem has to do with concurrent modification (eg 
writes) to some shared data.  If you have multiple observers (read-only) to some shared state, no problem.  But as soon
as one actor modifies state, you enter a world of hurt. Now, you have to somehow make sure that none of the other 
reader/writers are accessing the data while some other writer is modifying the data, otherwise the other reader/writers
are going to be accessing inconsistent data.  This is a further nail in the performance of thread based approach to 
concurrency, because while that one writer is modifying data, any other actors are blocked (either through a lock, 
mutex, or some kind of transaction).  Now you've got lock based contention to worry about.  Did I mention livelocks and
deadlocks?  I haven't talked about the overhead of thread context switching either.  And isn't the whole point of using
more threads supposed to make my program faster and _more_ lively?

Instead of approaching concurrency with multiple threads (or processes), there's another approach that has gained
popularity.  A single threaded event loop (or reactor) model.  Back before multiprocessors were common, computer games
were speedy enough.  How did they do it?  Games then (and I presume today, albeit with some multiprocessing) were 
basically big old event loops. At some point in the loop, keyboard and mouse events were collected, and then the loop 
would move to the next piece of code (graphics updating, model updating, etc).  

Nodejs took the idea of an event loop and proved how fast it could be.  Java only started overtaking nodejs web 
performance when its web frameworks also started supporting reactor (or proactor) event models.  In an event loop 
model, all functionality has to be made asynchronous, and therefore non-blocking.  If you didn't do that, the event 
loop would hang waiting for some blocking method call, and everyone downstream in the loop would hang.

But wait, how do you program when you don't know when some function call will return?  We are so ingrained to doing 
something like this:

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

### Real World example

Enough theory.  Let's show a proof of concept from Mercury itself.  Here's an example of what the 
main App looks like:

![Fresh start up][startup]

As you can see, there are a couple of <textarea> elements.  These are coming from the MultiText 
component. Take a look at the MultiText react component.  Notice that it has field that is an Rx.Subject:

```typescript
export class MultiText extends React.Component<MTProps, {args: string}> {
    static emitters: Map<string, Rx.BehaviorSubject<string>> = new Map();
    emitter: Rx.BehaviorSubject<string>;
    mountState: Rx.BehaviorSubject<Date>;
    //...
}
```

What is that doing?  To help visualize what is going on, let's blank out all the text in the <textarea>

![Cleared out textarea][clearedout]

Notice that the MultiText component has a field called emitter which is a Rx.BehaviorSubject of string type.
What is it doing?  Let's look at the code:

```typescript
    // ...
    constructor(props: MTProps) {
        super(props);

        this.state = {
            args: this.loadDefaultArgs()
        };

        this.mountState = new Rx.BehaviorSubject(new Date());  // Subject for componentDidMount events
        this.emitter = this.makeEmitter();                     // 1. Created here
        MultiText.emitters.set(props.id, this.emitter);        // 2. Add it to the static MultiText.emitters

        this.componentDidMount.bind(this);
    }

    makeEmitter = () => {
        let obs = new Rx.BehaviorSubject(this.state.args);     // Initial value is this.state.args
        // TODO:  Store or persist state in a journal
        return obs;
    }
    // ...
```

So basically, it's just creating an new Rx.BehaviorSubject, and assigning it to the component's 
this.emitter.  Furthermore, we assign this to the static MultiText.emitters map of them (we will see
why in a bit).  But how is this.emitter used?

```typescript
    // Note:  If you dont write these methods with fat arrow style, _this_ is not bound correctly when called
    handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        event.persist();  // Had to persist the event, to make it a reuseable event from the SyntheticEvent pool
        let text: string = event.target.value;
        this.setState({args: text}, () => {
            this.emitter.next(this.state.args);
        });
    }
```

The handleChange method is called whenever the MultiText's <textarea> element gets an onChange event.  So, if
the user starts typing in this component's <textarea> the onChange element in the DOM fires, which in turn 
causes handleChange to fire.  So what does handChange do exactly?

Ultimately, it calls this.setState, with an optional callback.  This callback is run once this.state has actually
been set.  This callback when run, will invoke the subject (this.emitter) and pass through whatever the text currently
is.  In other words the following flow of events happens:

```
User types in <textarea> => DOM onChange event => handleChange() => update this.state.args  => this.state.args to emitter 
```

So let's try adding some text in one of the textarea and see what happens

![Adding text to textarea][nothing-happened]

Wait, how come nothing special seems to have happened?  There's nothing in the console?  That's because the main
App hasn't subscribed to the emitters yet!  So how do we do that?  We click the Submit button:

![Clicked on Submit button][clicked-submit]

Hmmm, doesn't seem like anything happened.  How come?  This is actually a feature (or problem depending on how you look 
at it) of the difference between hot and cold Observables.  The Subject we created is a Hot Observable.  This means that
Observers who subscribe to a Hot Observable will only get items emitted from the moment they subscribe and on.  A cold
Observable on the other hand will emit all items it has emitted since it was created no matter when a new Observer does
a subscribe.  An analogy is that Hot Observables are like watching old TV.  If you tuned in 10 minutes too late, too bad.
Cold Observables are sort of like watching TV on TIVO.  You can watch stuff from the beginning.

So how does the App subscribe to the MultiText's emitters?  And what good does this do us?  Once the App subscribes to the
MultiText emitters, this means all data being entered in the MultiText's <textarea> element will be available to App.
component (that we care about) is available to any other component, so long as it has access to this.emitter.  

Let's see how that's done in the App component:

```typescript

class App extends React.Component<RowCols, {}> {
    cancel: Rx.Subscription | null;
    // ...

    /**
     * every time the onChange is called from MultiText component, it will emit the event.  Let's 
     * merge these together
     */
    accumulateState = () => {
        console.log('Getting the state');
        // merge the three Subjects into one stream
        let arg$ = MultiText.emitters.get('args');
        let testcase$ = MultiText.emitters.get('testcase');
        let mapping$ = MultiText.emitters.get('mapping');
        if (arg$ === undefined || testcase$ === undefined || mapping$ === undefined) {
            throw Error('Subject was null');
        }

        // Merge the three Subject streams into a single stream.  Each stream we pass here is actually
        // a new one, such that it returns an object instead of just a string
        return Rx.Observable.merge( arg$.map(a: string => new Object({tcargs: a}))
                                  , testcase$.map(t: string => new Object({testcase: t}))
                                  , mapping$.map(m: string => new Object({mapping: m})))
            .do(i => console.log(`Got new item: ${i}`))
            .scan((acc, next) => Object.assign(acc, next), {})  // merge the objects into one big one
            .map(data => {
                let request = makeRequest('testcase-import', 'na', 'mercury', data);
                return request;
            });
    }

    /**
     * Once all the arguments have been finalized, when the Submit button is clicked, all the data will be sent
     * over the websocket to polarizer
     */
    onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        // Accumulate all textState Observables emitted data.  Initially, this.cancel will be null.
        if (this.cancel === null) {
            this.message$ = this.accumulateState();
            this.cancel = this.message$.subscribe(
                n => {
                    this.message = n;
                    console.log(this.message.data);
                },
                e => {
                    console.error('Problem getting TextMessage');
                    this.message = makeRequest('', 'error', 'exception', {});
                }
            );
        }

        console.log(this.message.data);
        // console.log(`Going to submit the following:\n${JSON.stringify(this.message, null, 2)}`);
        event.preventDefault();
    }
    // ...

}
```

What's going on here?  Let's look at what accumulateState is doing.  The App has 3 MultiText components 
inside it.  App knows the props.id, since it assigned them to the MultiText components, so we can use the 
id to retrieve the Rx.Subjects from the MultiText.emitters Map<string, Rx.Subject>.  It then merges three
new streams (these streams are based off the original streams, but instead of returning a regular string, 
these streams return a javascript object).  I won't go into too much detail about what the operators are 
doing, but do() is like for side-effects, scan() is like a continuous reduce(), and map() is like map() in
regular functional programming.

The accumulateState function returns this new Observable stream (btw, stream and Observable are often used
interchangeably), and then in the onSubmit function (which is called when we click the Submit button), the 
App component subscribes to this Observable.  All it currently does is print out the object to the console, 
but in the future, we can send this data over a websocket.

Let's see what happens when we start entering text in the <textarea> now that App has subscribed to MultiText.

![Entering text after subscribing][onchange]

Voila!!  Now we see the entered text.  Which means that in the App component, we can call in the onSubmit 
other functionality, like sending the accumulated data to a websocket.

Now, imagine applying this same principle to the componentDidMount method:

```typescript
    mount$: Rx.BehaviorSubject<number>;

    constructor(props: RowCols) {
        super(props);
        this.args = new Map();
        this.textState = new Map();
        this.cancel = null;
        this.mount$ = new Rx.BehaviorSubject(0);
    }

    componentDidMount() {
        console.log('===========================================');
        console.log('Something happened to mount MultiText');
        console.log('===========================================');
        this.mount$.next(1);

        // TODO: make this Observable emit the event to a websocket
    }
```

Since componentDidMount is called whenever the react component has been mounted from the virtual DOM into the
physical DOM, we know that the element can be accessed (as long as the disabled property isn't set) from the 
real DOM.  Wouldn't it be nice to let an external client, like maybe a webdriverio test know about this?

One of the things that kills UI tests over time is how long they take, and the brittleness of knowing if/when
an html element will appear.  Unlike in-browser tests, which don't have access to DOM events, there's no good
way for selenium style tests to know when an element appears other than to waste cycles polling.

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
[-set-state]: https://reactjs.org/docs/react-component.html#setstate
[startup]: https://github.com/rarebreed/mercury/blob/master/docs/images/Initial.png
[clearedout]: https://github.com/rarebreed/mercury/blob/master/docs/images/Cleared-before-submit.png
[nothinghappened]: https://github.com/rarebreed/mercury/blob/master/docs/images/ChangedText-Nothing-In-Console.png
[clicked-submit]: https://github.com/rarebreed/mercury/blob/master/docs/images/Clicked-Submit.png
[onchange]: https://github.com/rarebreed/mercury/blob/master/docs/images/OnChange-Shows-In-Console.png