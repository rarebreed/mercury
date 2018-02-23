# What is mercury

mercury is basically a proof-of-concept project written using typescript, react, rxjs, enzyme
and jest so see how to do unit and integration tests for React components.

While we can do cockpit testing using webdriver.io for end to end system level testing, as the 
[Testing Pyramid][-tp] tells you, only about 10-20% of your testing "budget" should be system 
or UI tests.  The vast bulk should be unit and integration tests.

The dilemma is how do you test a UI level component in a unit test?

- enzyme: library from AirBnB to isolate react components and run them in jsdom
- jest: framework from Facebook built on top of jasmine that can take DOM snapshots
- typescript: language with good tooling and 3rd party support
- rxjs: low-level state management and bridge capabilities

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