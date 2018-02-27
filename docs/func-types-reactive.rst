Functional Reactive Programming tutorial
########################################

This post will try to convince you how to take advantage of Functional Reactive Programming to make a more robust
product.  This post is intended for developers as much as for QE.  I came up with this tutorial for a few reasons:

- I am new to reactive programming (but not functional programming)
- I am new to the javascript ecosystem which is mostly asynchronous
- I needed to learn how to deal with asynchronous programming
- I wanted to create some vertx microservices using rxjava

So, this tutorial is a guide for people who are new to either functional programming or reactive programming.
Technically FRP (Functional Reactive Programming) involves reacting to *continuous* data streams, but the term has been
hijacked and has come to be applied for reacting to *discrete* streams of data. But what I will cover here is the
combination of functional and reactive programming using the rxjs library with the flow language, and why you really
need to use this style especially with javascript.

In this guide, I'm going to cover some principles from computer science as well as some "get your hands dirty" guides to
help you program in this style.  I also endeavor to explain *why* this programming style is worth the effort to learn.
In other words, this isn't just some fancy new paradigm to prove how cool, hip and smart you are.  FRP is a way to help
ease the pain of concurrent programming that is superior to OOP with imperative state in many use cases:

The theory part (links open to external sites):

- `Functional Programming`_
- `Type systems`_
- `Reactive style async programming`_
- `Pure functional languages`_

The practical part

- :ref:`flow-types`
- `Setting up and using flow`_
- `Getting and using VS Code`_

I am going to illustrate, as much as possible, examples using the `Flow`_ language.  Flow is basically a type
checker for javascript with a fairly powerful type system (more powerful than Java actually).  I recommend
going to flow's site and looking at their Getting Started docs.

Why FRP?
========

It might be useful to begin with why we even need FRP in the first place. Doesn't OOP give me everything I need? Why all
this hoopla about Functional Programming (FP)? And now Reactive? What's wrong with good old transactions and locks?

Where OOP got it wrong
----------------------

Quick, name the 3 foundations of OOP:

- Polymorphism
- Encapsulation
- Inheritance

Keep those in mind, but for now, why did OOP catch on? Those 3 features are nice and all, and they do allow for some
better abtractions than plain old imperative programming ala C. But perhaps the biggest selling point of OOP was how
intuitive it seems. It seems like it models the real world much better than C's style of declaring structs and functions
that work on those structs.  Why not combine them together?  If anything, this binding of functionality (algorithms)
to data is the hallmark of OOP.  Consider the following class:

.. code-block:: java

   class Point {
       private final float x;
       private final float y;

       public Point(float x, float y) {
           this.x = x;
           this.y = y;
       }

       public Point(float x) {
           this(x, 0.0);
       }

       public Point(float y) {
           this(0.0, y);
       }

       public Point() {
           this(0.0, 0.0);
       }

       float getX() { return this.x; }
       float getY() { return this.y; }

       float slope(Point other) {
          return (other.y - this.y)/(other.x - this.x);  // watch out for overflow and imprecision
       }

       public static void main(String[] args) {
           Point one = new Point(1.0, 2.0);
           Point two = new Point(4.0, -1.0);
           float result = one.slope(two);
       }
   }

Here we have a Point class which has a method which can determine the slope given another Point, with a single method
that can determine a slope given another Point object.  Makes sense right?  Seems logical that the slope method is part
of the Point class type.  Let's look at an alternative using Java 8+

.. code-block:: java

   // In Point.java
   class Point {
       private final float x;
       private final float y;

       public Point(float x, float y) {
           this.x = x;
           this.y = y;
       }

       public Point(float x) {
           this(x, 0.0);
       }

       public Point(float y) {
           this(0.0, y);
       }

       public Point() {
           this(0.0, 0.0);
       }

       float getX() { return this.x; }
       float getY() { return this.y; }

       public static void main(String... args) {
           Point one = new Point(1.0, 2.0);
           Point two = new Point(4.0, -1.0);
           BiFunction<Point, Point, Float> slope = (p1, p2) -> {
               return (p1.getY() - p2.getY())/(p1.getX() - p2.getX());
           }
           Float result = slope.apply(one, two);
       }
   }

   
Ok, so what did that buy us? If anything, the second example is a little more verbose. Also, this seems counter
intuitive, because we had to define a BiFunction type with that gnarly Generic type signature. What did all that buy us?

We now have a separation of concerns.  Calculating slope no longer belongs to the Point type.  How is that beneficial I
hear you ask?  Afterall, calculating the slope seems logically tied to what a Point is.  But does it?  

**Encapsulation errata**

I was careful in creating this class to make it have two private final fields in the class with no setters.  This makes
it impossible to "accidentally" change those values.

So we have the first hint here in functional programming that algorithms (functions) are not tightly coupled with the
data it works on.  And you do remember in Software Engineering 101 that you aren't supposed to tightly couple things
together right?  So why did OOP do this?  My guess is it is _intuitive_.

But there's another problem lurking here.  Why do I even have the fields x and y?  Now maybe you are thinking I am crazy.
How can you do anything if you don't encapsulate the state inside something?  Encapsulation is awesome isn't it?  Because
now I (the class) can decide how others interact with me, including how to change my internal state.  What is the
alternative? Keep passing stuff as arguments to functions?   

Yup, that's exactly what you do.  If you are wondering how to keep track of all those variables, that's what Observables
are for :)

**Polymorphism problems**

Functional Programming (FP)
===========================

This has been a buzz word of late if you visit any kind of techie site, whether it's medium.com or dzone or anything in
between. Unfortunately, I have seen a lot of myths abound and a lot of hate surrounding FP usually from OOP enthusiasts
who think FP is just overblown marketing hype akin to microservices or SOA. So, let me dispell some misconceptions and
define what FP is first, and then explain the advantages that FP brings

What is FP?
-----------

Functional Programming, despite many people's misconceptions is not *against* Object Oriented Programming (OOP).  But
before I explain why, what in general is FP all about, and why is it such a hot topic lately?

There's actuallly no solid definition for what FP is, but in general most people consider it to have:

- A preference for `total pure functions`_
- Higher order functions
- Composition of (pure) functions as the program itself
- `Immutable data`_ and the transformation of data versus mutation of data in-place

  - Persistent data structures

- Declarative style versus imperative style

I'll explain these points in detail in the sections below.  But why is FP becoming such a hot topic lately?  There's
several reasons for this, but mostly it boils down to sane management of state, which in turn makes it easier to reason
about concurrency.  The big motivator behind FP is taking advantage of all your cores.  Even javascript is becoming
truly multicore with the ability to use web-workers with shared memory and atomics, which also means you can no longer
be assured of `"run to completion" semantics`_).

Consider that asynchronous and multithreaded programming are very similar. They are both concurrency models in the way
that multiple actions could be affecting data "simultaneously" (I put that in quotes because the javascript async model
is (normally) single threaded, but you still have to worry about data consistency). With imperative programming, state
is mutated willy-nilly, and this is a problem. The problem is that with either code running in another thread or
sometime later in the event loop, you do not know when the code might possibly mutate some state that another thread is
looking at. This is the classic race-condition problem.

Lastly, FP is not **against** OOP. FP isn't even against mutation of state. Afterall, there are cases where you might
have to share state with another thread, and even haskell eventually has to write to the console, a file, or some other
output or you would never know the result of the computation! What FP is *against* is undisciplined and unnecesary
mutation of state. OOP is often just imperative programming in disguise, where state is held internally and manipulated
via (usually) private functions. But encapsulation via private is not enough.

So how does FP help?  Keep reading to find out.

Pure functions
++++++++++++++

Pure functions are the mathematical definition of a function:

#. A pure function can not affect the outside world (no side effects like IO operations)
#. A pure function can not be affected by the outside world (for example reading a global variable)
#. A pure function, given the same input, will always yield the same output
#. A pure function, by its mathematical definition, only takes one argument and returns only one value

  - The input's value belongs to a set called the domain
  - The outpus's value belongs to a set called the codomain

A pure function can not affect the outside world. It can't for example write to a file or make a network request or even
print to the console. Why is that? Well, look at the 3rd definition. Given the same value passed in as an argument to a
function, is it true that you will always get the same value back? Possibly no. What if the file system went away or the
file was locked or changed permission? What if the socket timed out? By the same token, the outside world can not affect
the result of the computation. For example the function should not rely on the existence of a file or the availability
of some global variable. The third reason has another name, referential transparency, and it means that you can replace
a function (with a given argument) with the value it produces because they will always be the same.

The last point is confusing for people, because *obviously* functions can take more than one argument. But actually,
that is not the mathematical definition of a function. A function is an ordered pair (or 2 element tuple). And there are
actually benefits to doing computations this way. You can "fake" multiple arguments to a function either by passing in
n-element tuples to your function, or through currying. I'll explain currying a little later.

Notice also that a function takes one argument and returns a single value.  You can not have, for example, the same
argument return two different values.  Now, when I say value or argument, it could be a 2-element tuple example.  Or a
map of string to integers.  A function can be thought of as an ordered 2-element pair.  The first element in the pair
is your argument (or input), and the 2nd element is the return value (or output).  You can not have a function that
could potentially return 2 different values (for example, depending on when the function is executed or the existence
of some external state).

Ok, so that's a pure function in a nutshell. The astute reader will notice that given the above definitions, that a pure
function is immune to time. The deterministic nature of a pure function means that no matter when I call a pure function
or what the surrounding global environment state happens to be, a pure function given the same value as input will
*always* yield the same output. Now think about that for a second. How is that useful to you?

By being able to ignore time as a hidden variable, this greatly simplifies how you can reason about your code. You do
not ever have to worry if some other function was called first to set up some state, or that some other code running
concurrently might change state. The only thing a pure function cares about is what value got passed in as its argument.
That's it folks.

**"But, but state!!"**

Yes, I can hear you saying this already. Don't worry, I'll get to that in a bit. Let me just say for now that state
isn't needed anywhere as much as you think it does. And there are ways for pure functions to be "stateful" (actually
they don't have state, but they have the illusion of state).

.. note:: If a variable mutates in your code and no one (can ever) see it, is it still pure?

  Here's a little thought experiment now that I've given a definition of what a pure function is.  Is it possible to have
  a pure function that can memoize the values it has already taken so that it does not have to recalculate the answer?

  If you don't know what memoizing is, just think of it like a little cache.  Rather than recompute already performed
  calculations, a function can memoize, or cache, these results saving it a lot of work.  This comes in really handy
  in certain recursive calculations like the fibonacci algorithm.

  But can you have a pure function which can also be memoized?  To make a memoized function, the function would have to
  store already calculated values *somewhere* and then if it sees a call to itself with the same argument, it can just
  look up the cached answer.

Currying
++++++++

I decided to give this its own section, because while it's simple, people confuse it with partial application because
they are sort of similar.

First, recall the definition of a function: it can only take a single parameter.  So how can you have a function that
takes multiple arguments?  There's two possibilities:

- Pass in a tuple of values as your only argument
- Have a function that takes one argument, and returns a function that takes an argument, etc etc

Currying is the second approach.  Let's see how you can do this in javascript

.. code-block:: typescript

    // This is an Object Type.  We state the keys and the types of the keys.  Note that for subtyping purposes, if an
    // object has the same keys of the same types, compared to another object with at least the same keys of the same
    // type, ven if the other object has additional key:types the former is a subtype of the latter.
    type Employee = { company: string
                    , age: number
                    , name: string
                    }

    // This is an es6 style arrow function with flow.  The first argument is a function type, so it takes 3 args which
    // respectively are a string a number and a string, and it returns an Employee object
    const employee = (fn: (string, number, string) => Employee) => {
                       (company: string) => {
                         (age: number) => {
                           (name: string) => {
                             return fn(company, age, name)
                           }
                         }
                       }
                     }

    let redHatEmployee = employee("Red Hat")       // notice, you dont have to do partial(employee, "Red Hat")
    let redHatEmployees: Array<Employee> = []
    redHatEmployees.push(redHatEmployee(45, "Marcus"))
    redHatEmployees.push(redHatEmployee(30, "Jennifer"))

    // how currying is different from partial
    let redHatEmployeeAge38 = redHatEmployee(38)   // notice, I dont have to call partial.  I get a new function
    redHatEmployeeAge38("Thomas").company

    // The downside is you now have to call it differently if you have all the args already.  There's also some
    // small performance overhead
    let RHEmployee = employee("Red Hat")(44)("Jonah")

Why is this a big deal? Currying is useful due to automatically creating a closure so it closes over captured arguments
for you. It also makes some programming paradigms much easier and cleaner, when you need a callback for example that
only takes one argument. Currying also allows for "lazy" functions. If you don't have enough parameters to invoke the
function, you just keep supplying them until you do.

The disadvantage to this style (used this way in javascript...but not for example in haskell or purescript) is that you
now have to call the function with all its arguments a little differently. For javascript, lack of currying is not a
deal breaker like it is in haskell dialects (it's a requirement in those languages, because that's the mathematical
definition of a function and it's required in some places like Applicatives for multi arg functions).

You can see an example of how to auto-curry a javascript function in the section on Typing below.

Higher Order Functions
++++++++++++++++++++++

This is just a fancy term for functions as first class citizens so that functions can be passed in as arguments to a
function, or returned by a function. If you've done javascript, every time you pass in a callback the function taking
the callback is a higher order function. Conversely, if you've ever returned a function from a function, that's an HOF
also (for example, the decorator syntax in python is just syntactic sugar for a function that returns a new modified
function).

Why are higher order functions a big deal? Why did Java 8 bother with lambdas (or c++11 for that matter)? By being able
to pass in a function to a function, you no longer have to hardcode some algorithm in the function. You delegate the
algorithm to the passed in function instead. This is, for example, how sorts, maps, filters, reduce, etc all work. Also,
by returning a function from a function, you can easily create a closure, which you can think of like a poor man's
object (a function encapsulating state). Just remember though that even with closures, pure functions are your best
option (be careful of creating closed over state that is mutable).

Composition is the key
----------------------

I can't say this enough, but the essence of FP is the composition of functions. Yup, that's pretty much it. In
imperative programming, you see computations as a series of steps usually with control flow and the manipulation of
state along the way. With functional programming, everything is a pipeline. The output of one function becomes the input
of another. A pipeline *is* composition. A graph of nodes with edges *is* composition. This is because you can treat the
node as a black box of computation whose incoming edge is its parameter, and (one of) its outgoing edge is its return
value.

A computation therefore is the traversal of a graph!! When you hear fancy talk about Functors, Applicatives, Monads etc,
what that is, in a vastly simplified nutshell, is a way to glue your pipeline together (and to separate the pure part of
a computation from the impure parts).

.. image:: ./images/computation-as-graph.png
   :scale: 70 %

So why is it advantageous to think of a program as composition of functions or like a graph? If you see your program in
this light, it is easier to visualize the flow and transformation of data along the way. Async and multithreaded
functions become bifurcations in the pipeline (ie, you have an associated, and possibly disjoint graph associated with
the main graph). Instead of having state that can be mutated internally in some object, state *flows* through the graph.
In reactive, you will often hear that reactive is "the propagation of change" in a system. I think that's too specific
though, because it's not just *change*. It's the propagation of *data* (because from one function to the next, it is
possible that the data doesn't change at all and it is just passed through).

In the Actor model (of which reactive is a very close cousin), state is never exposed externally and all state change
occurs by one actor (think computation process) sending a message to another Actor. So, start thinking of state as just
another parameter (perhaps implicit as is the case with closures) that flows through the computation.


Immutable data
--------------

Since pure functions can't rely on changing state how can you model data that needs to change? Immutable data just means
that you can't change the value of something. For example, a number is an immutable value. If *x = 10* and I want *x* to
become 20, I don't do something like x.setTensPlace(2). Strings in most languages are also immutable. If you substring a
string or replace part of a string, what gets returned is a new string rather than a mutation of the original string.
For example in python::

    name = "Sean"
    new_name = name.replace("a", "e")
    print(name)
    print(new_name)

Why is this a good thing?  By returning a new modified or transformed value from an original value, we aren't disturbing
any other code also looking at *name*.  Imagine if there was some asynchronous function or function running on another
thread and it also needed the value held in name.  Depending on when the other function needed to read in the value of
name, had name been mutated by the replace() method call, well, now we might possibly be in an inconsistent state.

Immutability also works for container data types like lists, maps or other sequences. The trick here is that instead of
copying the entire data structure and then adding/replacing the new data, you can structurally share any of the old data
and just create a branch to new data. In essence, this is how git works. Git is basically a tree data structure. Imagine
what would happen if (for example) you made three new commits on one branch, but from another branch you wanted to
commit a change from where it was originally created. If git did not have an immutable data structure and mutated the
branches in place, you would not be able to have a history of the changes because the mutation would overwrite it.

That is another way to look at immutable container data structures. They can give you a history of the transformations
over time while still being very space efficient (only log n changes are required instead of n changes).

When data is immutable, it can be freely shared among any other concurrently running processes/threads. This is because
race conditions only happen when mutable data is shared. Persistent data structures won't prevent you from dealing with
*stale* data (ie not the most current), but it *will* prevent you from having data in an inconsistent state (think of
persistent data as sort of being transaction-like, in that if another piece of code "changes" your data structure, the
original code is still looking at the original). But reactive programming is all about dealing with the latest data, so
you can get the best of both worlds.

But what if two processes/threads do need to share state with each other?  Good question; keep reading for some answers.



Declarative vs. Imperative
--------------------------

FP eschews imperative programming because imperative programming requires specifying how to do a computation at a low
level. Usually this involves changing state, control flow and explicit error handling. A declarative style however
captures the essence of what the computation is doing without requiring low level details like looping (or even explicit
recursion). The canonical example of this is summation.

Here's the imperative style in javascript

.. code-block:: javascript

   let sum = 0
   for (var i=0; i < 10; i++) {
       sum += i;
   }
   console.log(sum)

   // Or with newer es6
   sum = 0
   for(let i of [...Arrays(10).keys()]) {
       sum += i
   }

   // or even with forEach
   sum = 0
   [...Arrays(10).keys()].forEach(i => sum+= i)

And this is the functional (declarative) style

.. code-block:: javascript

   let range = [...Arrays(10).keys()]
   console.log(range.reduce((acc, n) => acc + n))

Hmmmm, so that last imperative example using forEach looks a lot like the functional one.  What's the difference?  In
the imperative one, we are mutating the sum variable. Also, the use of reduce tells us basically what we want to do.
A reduce (or fold) function reduces a collection of values into a single value (hence you reduce the collection).  The
same is true of other classic functional functions like map, filter or concat.  If we use a map function, we know that
the purpose of the function is to transform the values in a collection from one value to a different value (possibly
of another type), and with a filter, we know we are only interested in certain elements of the collection.  With an
imperative style function, you have to examine the code to figure out what it's actually doing.


Error handling FP style
+++++++++++++++++++++++

**TODO** This section needs some clean up and additional notes

This style of error handling comes more from the pure FP lineage (ie, haskell and its derivatives) but these concepts
can be applied to pretty much any language.  Some languages or libraries are more particular about FP style error
handling than others (for example RxJS and cyclejs use a very monadic style of error handling, but clojure seems to
eschew FP style error handling with its lack of null-handling and imperative style try/catch macros).

Let's look at two of the most common errors that you will have to deal with: null values and runtime exceptions (usually
caused by some kind of IO).

With null values, this problem can mostly be solved with strongly typed languages that have Maybe types (or their
equivalent).  What do you do if you have a function that normally returns some valid value, but in certain cases, it
might be a null value?  With most languages, you are stuck with a bunch of conditional logic to check to see if the
value returned in your function is null not.  Take this simple code:

.. code-block:: javascript

    function getStudentGradesByNameClass(students, name, cls) {
        return student.name.cls
    }

    // except, it's possible the name of the student doesn't exist in students or the student didn't take that class
    function getStudentGradesByNameClass(students, name, cls) {
        if (students.name === undefined)
            return undefined
        else
            return students.name.class
    }

    // But now we force callers of this function to see if they've got an undefined value, and what if we use this
    // value in subsequent functions?
    let grade = getStudentGradesByNameClass(students, "Robin", "Calclus")
    let inHonorRoll = determineHonorsList("Robin", grade)  // if determineHonorsList doesn't check, dohhhhh

There's got to be a better way.  And there is.  When you have a Functor, you can lift a pure function into some context
and then do computations within this context.  A very common Functor is a Maybe type.  Maybe types have a context where
there may or may not be a valid value.  The trick to Functors (or Monads) is that you store (or lift) a pure value
inside a little "computational container".  The only way to access the pure value is by going inside the computational
container.  How does this help?  Let's look at an example in Flow


.. code-block:: typescript

    class Just<A> {
        val: A
        constructor(a: A) {
            this.val = a
        }
    }

    type Nothing = null | undefined
    type Maybe<A> = Nothing | Just<A>

    interface Functor<A> {
        map<A, B>(): 
    }

    // Unfortunately, flow doesn't have pattern matching.  There's actually a better way to do what I am doing here
    // with these conditional tests.  In fact, when you start having a lot of conditional checks, that's a code smell
    // for FP style.  A better approach to "digging" into a nested data structure is to use a lens
    function getStudentGrade( students: Map<string, Map<string, number>>
                            , name: string
                            , cls: string )
                            : Maybe<number> {
        try {
          let grade: number = students.get(name).get(cls)
          if (grade === undefined)
              return Nothing
          return Just<grade>
        }
        catch(err) {
           return Nothing
        }
    }

So before I explain this, look how even the Flow version is horrible.  Why is this horrible?  Because whenever you have
try/catch blocks, you now have to worry about two potential exit paths, which makes ensuring your function is pure that
much harder.  Try catch is another code smell for FP.  But, this was necessary since we want to account for the possible
undefined value, which we've now captured as its own type.  Note that this function returns a Maybe<number>.  This has
a couple of benefits.  First, it clearly indicates that the return value might be null or undefined.  Secondly, by
having this type, we 


Why pure FP has more advantages than mostly FP
==============================================

Technically, this should probably be a sub-category under Functional Programming, but this deserves mention on its own.
This is where some "functional" languages will disagree and say it is not a requirement to be a pure functional
language.  Indeed, other than the haskell dialects (haskell, purescript, idris, agda, etc) and lux, there's really no
other pure functional languages around.  That being said, the more pure functional you get, the more reliable and
easier to test your product becomes.  Sounds like hyperbole?  Some zealot trying to preach to the masses?  Read on :)

What's the difference between a pure functional language and a *mostly* pure FP language? For starters, in a pure FP
language like haskell or purescript, all functions are pure (though they may not be total). If a function in a pure FP
language needs to do side effects of some kind, they will have a type which indicates some kind of impure context. In a
pure FP langauge, these impure contexts are wrapped inside one of the Functor typeclass family In
other words, you can tell from the type of a function whether it is impure or not. This is done through their type
systems (which is why there are no pure functional dynamic languages). The type of the function indicates what (if any)
and what type of side effect a function may have. This is an extremely valuable property for robustness and testing.

How is this a great boon for testing?

The argument for system testing is that only end-to-end system tests can catch certain kinds of bugs. Afterall, it is
obvious from experience that it is possible for a product to have 100% test coverage via unit tests, and yet still have
bugs. But few people ever wonder why or how that is possible. So let's think about this. How is it possible for a
product to have 100% unit test coverage with 100% passing, and yet the product may still fail in an end to end test?

There are a couple of possibilities

- Not every possible input(s) to a function was tested causing a runtime error
- The state of the system was different between unit tests and end to end testing
- The "glue" between different unit level tests was not considered

Now, think about what I said earlier about pure functions.  If you are given the same input, you always get the same
output.  Further, a pure function is neither affected by, nor affects the outside world (ie, the state of the system).
Lastly, consider a functional program as the composition (or chaining or pipelining if you prefer) of one function's
output, to another function's input.

What this means is that if all the functions in your compositional "pipeline" are pure...the only way for the pipeline
as a whole to fail is there was some value which was valid as input was not acceptable to the function (ie. the function
was pure but partial).

What is a partial function? Recall the definition of a function: it takes an argument whose value belongs to some set
called the domain, and it returns a value of some set belonging to a codomain. A partial function is a function where
there exists elements in the domain that if passed to the function, either return a value that doesn't belong to the
codomain, or where there is no mapping at all.

Here is an example of a pure but partial function:

.. code-block:: typescript

   const broken = (a: number, b: number, c: number): number => a / (b + c)
   let answer = broken(10, 2, -2)

The problem here is that we may get a runtime error due to division by 0.  This is because the function can also return
an Error, not just a number and an Error object is not a member of the type number.  That being said, this function can
be made total:

.. code-block:: typescript

    class Left<L> {
         value: L;
         constructor(val: L) {
             this.value = val;
         }
     }

     class Right<R> {
         value: R
         constructor(val: R) {
             this.value = val;
         }
     }

     class Either<L, R> {
         either: Left<L> | Right<R>;
         constructor(val: Left<L> | Right<R>) {
             this.either = val;
         }
     }

     const fixed = (a: number, b: number, c: number): Either<Error, number> => {
         if ((b + c) === 0) {
             let err = new Error("Division by zero!");
             let left: Left<Error> = new Left(err);
             return new Either(left);
         }
         else {
             let result: number = a / (b + c);
             let right: Right<number> = new Right(result);
             return new Either(right);
         }
     }

     let answer: Either<Error, number> = fixed(10, 2, -2)
     if (typeof answer.either === Right)
        console.log(`The answer is ${answer.either}`)
     else
        console.log(answer.either)


Ok, so maybe you aren't familiar with Flow (yet), but basically that's an Either type stolen from Haskell.  However
there are two important parts here.  The first is that this function became total because I changed the codomain (the
type of the return).  Instead of only returning numbers, it can now return an Error type.  Now all valid inputs are
tested.  The second important part is that not all partial functions are so easily solved.  Partial functions can
be solved once you know and account for invalid input values.

So, getting back to how pure and total functions can't fail, why is that?  Because by definition:

- A pure function is neither affected by, nor affects the outside world

  - therefore it is immune to the state of the system (barring catastrophic states like OOM errors or memory corruption)

- A pure function is immune to time

  - Therefore it doesn't matter when you run it

- A pure and total function has all possible inputs mapped to an output

  - Therefore there are no inputs which can cause (uncaught) runtime errors

- A purely function program is a composition of pure functions

  - Therefore the only "glue" between components is that the output of one function is the input to the next

So that leaves two places where your programs fail:

- Partial functions
- Impure functions

And because a purely functional language shows you which of your functions are impure half your job is done!  That means
you can concentrate on the weak points which are your impure functions.  But what about those pesky partial functions?
That can be resolved by using generative testing.  Generative testing basically pumps in all possible values as inputs
into your functions.  This helps you find invalid inputs (or combinations of inputs as was the case with the broken
function where it took 2 arguments combined to produce an invalid output).

This is the biggest reason why we should really all be using a purely functional language like haskell or purescript.
It means that finding bugs becomes easier because you basically just have to look for your impure functions.

The biggest downside to pure functional programming is the discipline required.  Haskell dialects make this a little
easier (or harder depending on your point of view) because this discipline is enforced in the language itself.  For
other languages, this discipline must be maintained by convention, which as we know, often gets tossed out the window.
This is also why pure functional languages are not just "another" language with one or two nifty features (eg, channels
in go, or macros in clojure).  It represents a fundamental change in the way you think about programming.

That being said, even if you don't use a haskell dialect, the more you can make it clear which of your functions are
impure the better.And that leads us to the next topic...typing.

Typing 101
==========

Ok, let's get this out there.  I know a lot of people out there *hate* static typing with a righteous hazy purple
passion.  All I'm going to say is...let's consider what you are missing.

Why type systems are worth using (and learning)
-----------------------------------------------

When you don't know what the types are that your functions takes or returns, it makes it very hard for consumers of your
functions to figure out what's going on.  What am I supposed to pass in?  Wait, sometimes this function returns a
string and sometimes it returns an Error?  And how do you tell your consumer that your function might return a null or
undefined?

The answer is you force your consumers to either grok the source code, or step through a debugger. This eats into the
supposed time that dynamic programming languages saves you. Or how about refactoring? You think pycharm is going to save
you when you refactor something in your classes or defs? Then you haven't done enough refactoring. Pycharm or other
IDE's have to guess at many things. Why does it have to guess? Because there is no type information!

And what about just dumb errors caused by passing in the wrong type to a function? That's something that would be
trivially caught at compile time with a static language. Worse, in dynamic languages sometimes these wrong type errors
are silent. Everytime you do something in your code like:

.. code-block:: python

   def foo(**kwargs):
       if "mykey" not in kwargs:
           kwargs["mykey"] = "some default"

   # or

   def bar(value):
       if isinstance(value, str):
          doBlah(value)
       elif isinstance(value, int):
          doOtherBlah(value)

  
Then you are effectively writing your own (poor) mini type checker. Again, wasted time and effort even though dynamic
languages are supposed to save you time. And I know everyone gets bitten by this (which is why you see that sort of
defensive checking).

Maybe you are thinking that duck typing is good enough. If it walks like a duck and quacks like a duck, it's a duck
right? Are you sure about that? What if I have a class BadDoctor? Maybe the BadDoctor class has a walk() and quack()
method too. The name of a method is not sufficient to determine the desired behavior.

Or perhaps you are saying that types limits your expressivity. I will grant you that, but even still, too much
expressivity can be a bad thing. First off, I hope you dont monkey-patch some class to hack-on oops, I mean tack-on some
extra or overridden functionality. And how many times do you *really* need a type of something to be...well anything?
Even dyn lang programmers usually have in mind some kind of type or interface that they want to either use as an arg
or return as a type.

What about if what you are receiving is an unknown type, for example you get some data on the wire? Well, if that's
true, how can you do anything with that type? If you have no idea what you are getting across the wire there's nothing
you can do with it! You dont know what the keys are (if it's JSON or YAML for example), or if its some serialized
object, you have no idea what method's come with it! I suppose you could assume a type, and try to do something with it
and then catch errors, but then, how is that different from casting to a type?

Ok, here's the last common argument I hear.  But type systems are gross and hard!  Ok, that's what the next section is
for.

But first, a caveat
-------------------

There are some things which just aren't really possible in a statically typed system.  There are valid programs that
exist in dynamically typed systems which can't be expressed via a typed system.  To give you an example, let's try to
make a function in javascript which auto-curries a function.

.. code-block:: javascript

     /**
     * FIXME: How would you express the types for a function that auto curries another function? 
     * 
     * The problem here is that both collected and args need to be non-homogeneous of any kind of type.  So how would you 
     * type this?  Tuples can be a container of any type which might work for collected, but not for the spread operator
     * since what is "spread" in the spread operator has to be an Array, and arrays have to be homogeneous.
     *
     * Even typing the fn would be super painful.  You would have to parameterize currier so that the fn could be supplied
     * types from the currier parameterized types.  This function would be incredibly painful to type if even possible.
     * 
     * Obviously currying with types is not impossible (afterall, haskell does it, and it's named after Haskell Curry!!)
     * This is why your language should be like haskell :)  
     * 
     * @param {*} fn the function to curry
     * @param {*} collected the amount of partially applied collected args so far
     * @param {*} args any amount of args to be supplied to fn
     */
    function currier(fn, collected, ...args) {
        if (collected.length >== fn.length) {
            return fn(...collected)
        }
        else if ((collected.length + args.length) >= fn.length) {
            let all = collected.concat(args)
            return fn(...all)
        }
        else {
            // I could have made a recursive call by doing something like:
            // if (args.length !== 0) let [arg, ...more] = args; collected.push(args); return currier(fn, collected, ...more)
            // but that would be more expensive due to unnecessary pushes to the call stack and more space wasted for closures
            // we're already mutating collected anyway.  Know when to abandon functional purity
            while(args.length !== 0) {
                collected.push(args.shift())
            }
            return (...rest) => {
                return currier(fn, collected, ...rest)
            }
        }
    }

    function curry(fn, ...args) {
        return currier(fn, [], ...args)
    }

    /**
     * An example function we will auto-curry
     */
    function foo(x, y, z) {
        return (x + y) * z
    }

    let partial = curry(foo, 2)
    let answer = partial(3, 4)
    console.log(`the answer is: ${answer}`)  // should be 20


Not your father's types
-----------------------

If all you are familiar with in type systems are C, Java or (heaven help you) Go, then you've got some catching up to
do. Let's start with some basics. What exactly is a type? You probably already have an intuition for it, but let's
clarify.

type
    A set of objects which all have a common set of properties.

Keep that definition in the back of your head. Take for example numbers. 5 and 2.0 are both members of the number type
because they have properties like addition, subtraction, multiplication or even things like comparison.

So why are type systems better than what we had in C and Java? Afterall, Java got generics years ago. If you're thinking
that's state of the art for type systems, there is much to learn :)

Type inference
--------------

One huge argument I hear from the dyn lang camp is that static type systems are so laborious to write out.  And if they
came from the Java or C++ world, I can't blame them.  But compilers have moved on with a technique called type inference
(which btw, java and c++ are slowly catching on with as well, like type inferencing in java 8 lambdas, or >= c++11 auto
keyword)

Many modern typed languages now have this nifty feature. Since my primary audience will be for people doing work with
javascript, let me go over examples with the Flow language.

.. code-block:: typescript

    let num = 10;  // flow knows this has to be a number based on the value you assigned it
    let name = "Sean";  // Again, flow knows this is a string based on the value.
    let full_name = name + " " + "Toner"  // again, it knows it's a string

See, that wasn't so bad.  Now granted, there are places where type inference doesn't work for flow.  Purescript and
haskell have a much more sophisticated compiler, and they are much better at type inference and it's therefore rare to
need type annotate anything, other than as a convenience for consumers.

.. flow-types:

Literal Types
-------------

Usually we think of types as being a set (or if you're really brave, as a category), but flow allows for literal types.
This and Union types is a powerful combination. Imagine if you knew that a function can only take the values 1-4 or
null. You could write out a function like this:

.. code-block:: typescript

    function check(x: 1 | 2 | 3 | 4 | null): ?number {
        if (typeof x === 'number') {
            switch(x) {
                case 1:
                case 2:
                case 3:
                case 4:
                    console.log(`A valid input of ${x} was received`)
                    break;
                default:
                    console.log("Invalid value passed in")
                    return null
            }
        }
        else {
            console.log("Using a default of 1")
            return 1
        }
    }

Maybe Types
-----------

One of the biggest benefits to newer typed languages is dealing with the null/undefined problem.  As Tony Hoare has
admitted himself, null was his billion dollar mistake.  But there are solutions.

So this was an idea stolen from haskell.  A Maybe type is how you specify that a value might be a null/undefined type.
You prefix your type with a ?.  So for example, a function which might return a string would look like this:

.. code-block:: typescript

    // This is how you type annotate a parameter with a default in flow
    function maybeName(name: string = "Sean"): ?string {
        if (!name)  // if name was "", null or undefined
            return null
        else
            return `How are you ${name}?`
    }

    let greeting: ?string = maybeName(name="")
    if (greeting != null)
        console.log(greeting)
    else
        console.log("hey, what's your name?")

Using Maybe types properly means that you can eliminate null bugs. You might be wondering how this solves the null
problem. The key here is that the compiler will check to see if it is possible that in any function invocation, it is
possible to pass in a null/undefined. If it is possible, but you don't declare your type as ?someType then it will be
flagged as a compiler error. Let the compiler keep track of when a null/undefined can be passed in instead of your
brain!!

Function Types
--------------

.. code-block:: typescript

   // This is how you declare the type of a function in flow.  Note I am declaring it as returning a string
   type func = (name: string = "Sean") => string;

One advantage that flow has over java generic methods is that when you have a generic function type in flow, instead
of the argument being implicitly checked for it's type, you can explicitly specify it:

**TODO** Show how to do this

Object Types
------------

It is very common to pass data around as JSON.  Wouldn't it be nice if there was a way to type this JSON?  That's what
Object types are for.  Suppose you have a function, and you know it takes an object like this:

.. code-block:: typescript

    let obj = {
        name: "Sean",
        company: "Red Hat"
    };

    let result = employeeUpdate(obj);


In this example, the obj is right above the use of employeeUpdate, so it is clear that employeeUpdate takes an object
with fields of name and object.  Well, is it?  Maybe I made a mistake and its full_name instead of name.  This is what
Object types help with.  Now I can say this instead:


.. code-block:: typescript

    type Employee = { name: string
                    , company: string
                    , title: string
                    , yearsIn: number
                    }

    function employeeUpdate(employee: Employee) {
        let [ first, ...rest ] = employee.name.split(" ");
        let lastname = last(...rest);
        let middlename = butlast(...rest);
        // ...
    }

What happens if I pass in an object with more keys than Employee?  Say for example I had another object with an extra
key of department.  As long as all the other keys had the same type, that's fine.  This "bigger" object is effectively
a sub-type of Employee even without explicitly declaring it as so, because it has all the same key name, value types
in common.

Another common scenario is when you have optional keys in the object.  What if for example there was an optional field
called geoSite?  Now you could define Employee as:

.. code-block:: typescript

    type GeoSite = "rdu" | "blr" | "brn" | "phx" | "bos";
    type Employee = { name: string
                    , company: string
                    , title: string
                    , yearsIn: number
                    , geoSite?: GeoSite
                    }

    function employeeUpdate(employee: Employee) {
        let [ first, ...rest ] = employee.name.split(" ");
        let lastname = last(...rest);
        let middlename = butlast(...rest);
        if (employee.geoSite != null) {
          // ...
        }
        // ...
    }

If you failed to check that employee.geoSite was null or undefined (null will suffice), then the compiler will flag that
as an error preventing a runtime error.  Note that geoSite?: GeoSite is different from geoSite: ?GeoSite.  The former
means that the key-val pair doesn't have to exist in the object, but the latter means the key has to be in the object
but it's value may be null.

A subtle but important distinction.

Type aliases
------------

One nice feature that flow that is similar to C(++) but lacking in java is the ability to declare a type alias.  You
use a type alias to provide a shortcut definition for a type, or as a more declarative form.  For example, let's say
you have a super long function type:

.. code-block:: typescript

    type ProcessInfo<T1, T2> = { data: Rx.Observable<T1>
                               , done: Rx.Observable<T2>
                               }

    type DefaultProcess = ProcessInfo<string, number | string>;
              
Now I can use for example ProcessInfo<string, number | string> instead of the object literal notation.


Union Types
-----------

Union types are another powerful new feature that many modern languages like ceylon, haskell, scala, kotlin and flow
have.  A union type basically says that a value can belong to one or more types.  In flow, it would look something like
this:

.. code-block:: typescript

   // In flow, you first state the name of the variable, a : and then the type.  The return value comes after the
   // end of the parens.  So this function takes a value of type number, and returns either a number or a string
   function depends(val: number): number | string {
       if (val > 10)
           return 2 * val
       else
           return "Number must be greater than 10"
   }

This new union feature alone will account for a very common use case with dynamic languages.  Unions are also good for
replacing enums:

.. code-block:: typescript

   type CardType = "SPADES" | "CLUBS" | "HEARTS" | "DIAMONDS";
   type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | "JACK" | "KING" | "QUEEN" | "ACE" | "JOKER";
   class Card {
     suite: CardType;
     value: CardValue;
   }

Union types have a relative called Intersection types, which as the name implies, the type must satisfy all the indicated
types.  This is mostly used when you need to have some object that must implement more than one interface.

Interface Types
---------------

This is not a biggie for those familiar with java or c#, but this is a nice feature added for javascript people who are
not accustomed to this.  Flow allows you to write an interface type, and then have a class implement this interface.

The only difference (that I am aware of so far) between flow's interface and java's is that flow allows user-defined
variance.  As mentioned earlier, variance is a tricky topic that's a bit hard to explain.  But there are 4 kinds of
variance:

- Invariant: the types have to exactly match
- Covariant: the types can be more specific (or from the perspective of a container, the container can hold subtypes)
- Contravariant: the types can be less specific (from the perspective of a container, the container can hold supertypes)
- Bivariant: the type relationships are both covariant and contravariant

Examples of these variances will be shown in the type contraints for generics.


Generics
--------

Generic programming is a somewhat complex capability but very powerful.  Indeed, C++ programmers tend to do more generic
templated programming than OOP style programming (hence the STL or Standard Template Library).  For people who use
java generics, there's not much difference with flow's take on it.  One difference however is that you can specify the
kind of variance for your generics.

`Variance`_ is a tricky topic, so I will simply point you to the Flow documentation.

- **TODO** Show some other examples using Flow with generics as was done with the Either<L, R> class earlier
- **TODO** Show how to write generic functions and generic function types
- **TODO** Show some examples of interfaces with generics


Type refinement
---------------

Flow types (hence the name of the language) and refinement all go hand in hand. A flow type is basically a type that can
vary based on conditionals.  The refinement is sort of like type casting based on conditionals.  Let's say you have some
function which can take a union.  With type refinement, you just check to see using typeof what type it is, and then
in the if code block, the object becomes that type.  It's sort of like a safer form of typecasting.

`Type refinement`_ allows works when you have a Union type or a type of Mixed.  Basically you "narrow" your types down via
a switch operator and in your cases, you check to see if it belongs to a type you know you can work with.  The switch
(or if conditional) using the typeof operator will do the typecasting for you.

**TODO** Show example of this

Type constraints on generics
----------------------------

Usually when you have a parametrically polymorphic type (fancy word for a class/function that takes an argument where
the type of the argument is itself a type), it's usually used as a container type. Think for example in java HashMap<T>
or ArrayList<T>. The code doesn't know what type T is, nor does it care, but all those things do is store T. They don't
actually use any functionality of an object of type T.

Sometimes this is not enough though.  You might want to store a more limited type in your generic, but in return you can
specify what those types do.  This is usually done by specifying a constraint with an interface.  That way, any type
which implements that interface can be used inside your generic.

This is similar to do something in java like

.. code-block:: java

    interface Bar {
        int doSomething(int x);
    }

    class Foo<T extends Bar> {
        public T field;

        public int myFunc(int y) {
            return field.doSomething(y);
        }
    }

Flow also has this ability along with a little more power.  This has to do with something called covariance and
contravariance when dealing with generics.

**TODO**
- Show example of a simple bounds on a generic
- Show example of parametric polymorphism
- Show how to enforce covariance for a generic parameter
- Show how to enforce contravariance for a generic parameter


Functional Reactive Programming
===============================

FRP as the name suggests, is functional + reactive programming. Actually, it's a subset of both FP and RP. I outlined
what functional programming was and the advantages it has, but it's still missing something. That's where reactive comes
in. All the FP books I have read so far, with the exception of one book on reactive programming in clojure, hasn't
focused on dealing with reactive problems. Sure, they talk about concurrency, and how FP is the killer feature for
concurrency, but usually they tackle the concurrency problem by other means.

For clojure and to some degree haskell, the concurrency problem is "solved" via one of their STM (Software Transactional
Memory) constructs.  Basically, STM is a way to ensure that if two processes (running in threads or whatnot) are both
using the same variable, but one of those processes needs to mutate it, that the other thread(s) sees that state in a
consistent way.  Think of transactions but for regular programming.  If 2 threads step on each others toes, one of the
threads retries using the now updated state to avoid inconsistencies.

But, this still assumes a fundamental problem. And that's that the data is tucked away somewhere (in clojure, inside
some agent or ref) and other code has to manipulate it. With reactive programming, there is an inversion of control.
Instead of some client actively asking for or changing some data tucked away inside some object, the object with the
data tells interested parties when its data has changed:

.. image:: ./images/react-vs-proact.png
   :scale: 70%

Notice how we inverted the agent in control as well as the flow of data?  That is what reactive is.

Why is this paradigm a game changer? Because it can still follow functional principles, and it no longer requires an
interested party to have to actively ask if/when data has changed. How many times have you wanted to know when a record
in a database table changed? How many times have you wished the server would tell you the data was ready instead of
polling it (sending *another* REST request) to see if it is ready?

Better yet, error handling is baked in with reactivex because rxjs uses the concept of a Functor to handle errors.

What about state?
-----------------

So earlier in this tutorial, I said I'd talk about state later.  I'll have to weave how state is done in reactive style
programming through the remainder of the tutorial, but I'd like to impart one crucial piece of insight now.

In imperative style programming, and especially OOP, state is contained inside some instance of a class (or possibly
statically in the class itself).  To change state, and therefore have your programming actually calculate something,
one object will usually request another object (often through a public method) to perform some action.  This action will
in turn modify the hidden and supposedly encapsulated state.  But the idea here is that some object jealously guards
some state, only allowing another object to change the state through private methods.  The other take away is that the
object which has the state that another object wants, is blissfully unaware of any other objects wanting this data.

Observables (aka Streams)
-------------------------

Reactive programming is all about streams of asynchronous events.  But let's throw the word reactive out.  You can
model any computation as a pipeline of streams.  So let's make sure we are all on the same common ground with
terminology.

asynchronous
    A function which starts and/or finishes at some unknown time or data which is not yet available

event
    A value of some type

stream
    A lazy, asynchronous and possibly infinite collection of data

observable
    A stream to which Observers (or Subscribers) may attach themselves to

observer
    An object which can respond to (react) to events coming from the stream


What is important here is that time is an important factor with relation to streams/observables. Because it is an
asynchronous source of data, you can't write code which expects data to be immediately available. This includes for and
while loops for example (yeah, this is why async programming ain't easy). This also explains why it is **Functional**
Reactive Programming. Functional Programming eschews the use of for and while loops precisely because a) pure functions
are immune to time and b) for and while loops require mutating state.


Promises and reactive
---------------------

In this section I want to talk about how to handle async programming. TLDR; Don't use callbacks and be careful with
promises.

While Javascript as a language standard is synchronous, the programming environment it used in is not.  Nodejs is
almost entirely asynchronous minus a few syncrhonous blocking calls, and most functions that the browser uses are as
well (you dont want the browser to hang waiting for a click event do you?).

Since javascript for most of its history has been single threaded and you didn't want to block the web browser on some
long blocking call, the vast majority of javascript API's (including nodejs) are asynchronous in nature.  The trick is
learning how to program when you don't know when (or even if) an asynchronous function will complete.

This goes against the programming style of most other languages which are synchronous in nature (the exception being
multi threaded programming which is also asynchronous in the sense that one thread does not know when another thread
will write data to a field or complete). For most of javascript's history the answer to asynchronous programming has
been via the use of callbacks. Imagine for a second that you have two functions

.. code-block:: python

    def foo(start, name="Sean"):
        if not name:
            name = "Sean"
        if start > 0:
            return name
        else
            raise Error("Starting value can not be negative")

    def bar(default_name):
        return len(default_name)

  name = foo(10, "Marcus")
  answer = bar(name)

Now in python, first foo() would run, and then bar() would run with the argument that was determined from the call made
by foo(). But what would happen if we did this in javascript?

.. code-block:: javascript

    const foo = (start, name="Sean") => {
        if (!name)
            name = "Sean"
        if (start > 0)
            return name
        else
            throw new Error("Starting value can not be negative")
    }

    const bar = (defaultName) => return defaultName.length

    let name = foo(10, "Marcus")
    let answer = bar(name)

Well, it won't be what you think. That's because foo() will return immediately in which case name will be undefined. So,
the old style of solving this would look something like this:

.. code-block:: javascript

    const bar = (defaultName) => return defaultName.length

    const foo = (start, name="Sean", bar) => {
        if (!name)
            name = "Sean"
        if (start > 0)
            return bar(name)
        else
            throw new Error("Starting value can not be negative")
    }

Here, the third argument to foo is a callback function. In the definition body of foo, it will supply the name arg to
the callback, and the callback will be run. For just 2 functions, this isn't so bad. But what happens when qux() needs
baz() to be run before bar() which needs to be run before foo()? This long dependency chain is referred to as "callback
hell".

Promises
++++++++

So, es6 came up with an alternative to callbacks called promises.  Here is an example of a Promise I found online and I
slightly modified it:

.. code-block:: javascript

    var willIGetNewPhone = new Promise(
        function (resolve, reject) {
            let rand = Math.random()
            if (rand > 0.5) {
                var phone = {
                    brand: 'Samsung',
                    color: 'black'
                };
                resolve(phone); // fulfilled
            } else {
                var reason = new Error('not enough dinero for a phone :( ');
                reject(reason); // reject
            }

        }
    );

    // Notice that we only use the .resolve() method here, because we don't have to worry about
    // an error case.
    function showOff(phone) {
        let msg = `my new phone is a ${phone.color} ${phone.brand}!`
        return Promise.resolve(msg)
    }

    var phone2 = willIGetNewPhone
    .then(showOff)
    .then(fulfilled => console.log(`my new phone is a ${fulfilled}`))
    .catch(err => console.log(err));

To create a Promise, you give the promise two callbacks, one for the happy path with the resolve function, and another
for the error scenario with the reject function. Now those callbacks are kind of confusing, because I wasn't sure what
kind or how many arguments those callback functions could take. This is one of those bad things about javascript since
it's not a strongly typed language (to the point that javascript doesn't even care about how many args you pass to a
function... you can pass either more or less args to a javascript function than it is specified to use, and javascript
wont care).

The trick is that the function you pass to the .then() *is* your resolve function, and what you pass in your catch *is*
your reject function. In other words, whatever arg(s) gets passed into the resolved function is passed to the function
that was specified in the then() handler. Same with the reject.

A nice feature about promises is that they are chainable. The .then() method always returns another Promise.  If the
resolve method that was passed to .then() itself returns a Promise, you can keep chaining the .then() methods together.
This is very useful so that you can have one async function be called only after another async function has completed
(by calling it's resolve handler).

There are problems with promises though. Namely that they can only return a single value (or a single container of
values). Promises can not return streams (which if you recall from the definition given earlier, is a lazy, asynchronous
and possibly infinite sequence of values).

However, for things which only return one item, but you just don't know when that will happen, then Promises require
less work than reactive streams do.

Don't fear the Monad!
+++++++++++++++++++++

So, if you are like me, you are probably wondering how you get the value out of the Promise.  If you look at the code,
there's a then() portion for the next function you want to call, and a catch() portion to handle an error somewhere in
your promise computational context.  But, the .then() method always returns another Promise.  It doesn't return a value
that an outside function can receive.  So how do you actually make use of a return value inside a Promise?  For example,
what if the second .then() in the example above was defined as:

.. code-block:: typescript

    var phone2 = willIGetNewPhone
      .then(showOff)
      .then(fulfilled => `my new phone is a ${fulfilled}`)
      .catch(err => console.log(err));

Now, instead of logging what we got, we actually "return" a string indicating what we got?  If we ran this code, we
wont know since we're no longer logging it, but presumably, some other function would like to make use of it.  But there
is no way to pull it out of the Promise!

*Arrgghhh what good is that!!*

So how *do* we make use of the result of an asynchronous function if it is needed by the rest of the program?  When we use
the callback style of programming, this is akin to what is called Continuation Passing Style.  A continuation is
essentially, the "rest of the program".  By this, the callback function declares the "next thing to do".  And this
callback can in turn have a callback which is "the next thing to do".  This however leads to callback hell.

In some ways, promises and reactive are no better.  Both of these style must *also* declare "the rest of the computation".
When you program with asynchronous functions, you are inside a little computational context, where the context is that
the computation is not deterministically known with respect to time.

*"But wait, didn't you say way back earlier that pure functions are immune to time?"*

Yes they are in the mathematical sense. They are immune in that no matter when you call that function, given the same
argument, you get the same answer.

But here's the rub.  In math, a function "returns" immediately.  It just "knows" the answer.  No actual computation is
involved (and I don't mean the time you spent doing your math homework. Our human brains had to "discover" the answer,
but the answer was always there to begin with).  But with computers, it takes time to calculate.  There's also the problem
with those pesky partial functions (that can be pure).  A partial function may in fact, never return at all.  This is
why asynchronous functions have to be dealt with in their own little "world" which you may hear FP'ers call a context.

What's this got to do with Monads? Functors, Applicatives, Arrows and Monads are typeclasses (think of a typeclass as an
interface which has methods which obey a few mathematical laws), but they all deal with an interesting property. They
all deal with functions which have a certain non-pure context. For example, the Maybe typeclass deals with a type whose
value may or may not exist. And don't forget, functions are also types not just "objects". Another example is a List.
Why is a List a Functor/Monad? Because a List can (potentially) represent a computation with non-deterministic results
(ie, instead of a single answer, you can get multiple possible answers).

Before I get to Monads, I have to explain Functors a little first, since a Monad *is* a Functor.

A Functor is simply a typeclass (remember, think interface for now), that has a method member called map. Yup. That map
that you use all the time with arrays or other sequences. Haskell, has a really elegant way of typing out functions.
Basically you will see a type and an arrow, and another type. These arrows can be repeated to simulate multiple
arguments:

.. code-block:: haskell

    -- A function foo, that takes a string, and returns a list of strings
    foo :: String -> [ String ]

    -- A function that takes 2 Ints, and returns an Int.  Notice how we have two arrows and 3 types.  The last item
    -- is always the return type
    adder :: Int -> Int -> Int

    -- Recall that a function really only takes one argument, and returns one result.  So to see how this is actually
    -- represented, think of it as a function that takes an Int, and returns a function. In fact, the -> is the
    -- constructor for a function type
    adder2 :: Int -> (Int -> Int)

    -- The (Functor f) => is a type constraint declaration, and says that whatever type f is, it must be of typeclass
    -- Functor (think of this as the f type must implement the Functor interface).
    --
    -- Note that *a* and *b* here represent a type of some kind (eg String or Int) and that it is possible that *b* is the
    -- same type as *a*
    map :: (Functor f) => (a -> b) -> f a -> f b

So what is map telling us?  Let's consider two explanations for this function.  The first, is that map takes a function
of type a which returns a type b, and some (functor a), which returns a (functor b).  But what is a (functor a) or a
(functor b)?  Remember what I said about context?  A Functor really represents some computational context, in our case
an asynchronous computation.  In many tutorial sites, you will see it explained that a Functor (or Monad) is like a box
that holds some value.  While this analogy is useful at first, remember, a Functor is not a simple container type.

But getting back to this explanation of map, we have an alternative way of thinking about map.  Recall that a function
only takes one argument.  So we can also view map like this:

.. code-block:: haskell

    map :: (Functor f) => (a -> b) -> (f a -> f b)

Hmmm, so map is a function, that takes a function...that returns a new function?  And it turns out that this new function
takes a (functor a) and returns a (functor b).  This alternative explanation is actually very useful and I want you to
keep it in mind.  It basically means that what map does is that it takes a pure function of (a -> b) and *lifts* it into
a new computation context represented by the Functor f.  How is that useful to us?

Because now we can take pure functions, and apply them inside this non-pure context...for example asynchronicity.

And now with that brief intro to Functors out of the way, I can talk about Monads.  A Monad is a typeclass which has one
important member function called bind.  It is defined as this:

.. code-block:: haskell

    bind :: (Monad m) => m a -> (a -> m b) -> m b

So, bind takes a (Monad a) and some function that takes a pure type of a which returns a (Monad b), and then returns a
(Monad b).  Does this remind you of anything?  Hint...think about a Promise.

What does a Promise do?  A promise's then() function can take some argument (passed to it from the resolve callback), and
then() returns another Promise.  So, what if a Promise was a Monad?

.. code-block:: haskell

    -- The then() function takes a Promise of type a, which in javascript is the implicit *this*, and it takes a new
    -- function which can be passed some pure argument.  And to make it a chainable then(), this method has to itself
    -- return a Promise.  That's the (a -> p b) part.  And then invoking then() returns the (Promise b)
    then :: (Promise p) => p a -> (a -> p b) -> p b 

A-ha!! A Promise **is** a Monad!! And you thought Monads were hard :)

Well, guess what.  Reactive streams are monads too, for the same reason Promises are.  Each of the operators on an
Observable returns an Observable, just like the then() in a Promise always returns a Promise.  In fact, Observable
operators which return another Observable (ie, nested Observables in the stream) are similiar to Monad Transformer stacks
(which I wont get into here).

*"But you still haven't answered the problem.  How do you make use of the result of an async function??"*

Actually, I did answer the question :) The only way to make use of the result of an asynchronous function is to continue
the monad. In other words, once you have a Promise, the only way for another function to make use of an earlier Promise
is for itself to become part of the Promise chain. The same is true with reactive. The only way for an Observer X to
make use of events seen by another Observer Y is for Observer X to become part of the same stream Observer Y is in.

This is why reactive programming is sometimes called Data Flow programming.  In Object Oriented programming, you have
become conditioned to think of state as being owned by some object.  Other instances must query this object directly to
get or set the state.  This is where OOP went all wrong.  In the reactive model, data flows reactively, from one object
to the next, like leaves in a stream.  This mental model of water running in a stream also fits, because water in a stream
only runs in one direction (it is possible however to bifurcate or split a stream, and then have one stream feed back into
the original...nevertheless, the stream never reverses flow).

So, the only way for a function to make use of data obtained in an asynchronous computation is to insert itself into the
"asynchronous computational context".  To make use of the monad, you must become one with the monad :)  

**TODO** Show an example of mergeMap in RxJS which is similar to haskell's bind

Reactive Programming with rxjs
++++++++++++++++++++++++++++++

This is where Reactive comes in. Reactive lets you think in terms of streams which are sources of asynchronous and
potentially infinite values. For example, think of getting all mouse clicks over time. Another advantage of reactive is
that data flow (ie the dependencies of data) becomes more apparent. If you think about it, all programming including
asynchronous programming is really a flow graph. If one function depends on another, it is serial and can be seen like
this::

   [ foo() ] ---> [ bar() ] ---> [ baz() ] ---> [ quux() ]

If they are concurrent or parallel, then the graph would be drawn differently. For example, if foo, bar and baz were all
independent of each other (ie, they didn't write to data any of the others looked at, or consumed data that one or more
of the others produced) but quux needed to be run after all of them, the graph would look like this::

   [ foo() ]-------\
   [ bar() ]--------+---[ quux() ]
   [ baz() ]-------/


The reactive model makes this more apparent, and this is how asynchronous functions are called. In essence, functions
are chained together by having Observables which produce values over time, and Observers which consume those values (by
subscribing to the Observable).

Let's look at a real world example.  Let's create a child process, and you want to get the stdout of the child process
in real time.


.. code-block:: typescript

    type ProcessInfo<T1, T2> = { data: Rx.Observable<T1> 
                               , done: Rx.Observable<T2>
                               }

    class Command {
        cmd: string;
        args: ?Array<string>;
        options: ?SpawnOpts;
        child: ChildProcess;

        constructor(cmd: string, args?: Array<string>, opts?: SpawnOpts) {
            this.cmd = cmd;
            if (!!args)
                this.args = args;
            if (!!opts)
                this.options = opts;
        }

        /**
         * Launches a subprocess and captures the stdout, sends both the data from the child's stdout, and the possible
         * exit code of the child process to an Observable
         */
        run(): ProcessInfo<string, ?number> {
            let args: Array<string> = [];
            let opts: SpawnOpts = {};
            if (this.args != null)
                args = this.args;
            if (this.options != null)
                opts = this.options;
            this.child = spawn(this.cmd, args, opts);

            // This is where we rx-ify it
            // Here, we convert an EventEmitter to an Observable stream.  Everytime data is available on the child's
            // stdout, we will get it as a Buffer or string of data.
            let dataStream$: Rx.Observable<string> = Rx.Observable.fromEvent(this.child.stdout, "data")
                .map((d: string | Buffer) => {
                    if (typeof d === "string")
                        return d
                    else
                        return d.toString("utf-8")
                })

            // This stream is technically a one-shot (ie, only one event will ever be emitted if at all)
            // But an observer of this Stream can be notified when the child is done.
            let doneStream$: Rx.Observable<number | string> = Rx.Observable.fromEvent(this.child, "exit");

            return { data: dataStream$
                   , done: doneStream$
                   };
        }
    }

    // This iostat command will generate the io statistics 4 times, every 2 seconds.
    let cmd = new Command("iostat", ["2", "4"]);
    let { data, done } = cmd.run();

    // In a more serious program, the observer here would accumulate the output.  The question is, how would you
    // accumulate it and then make use of this accumulated data?
    data.subscribe(out => { 
        console.log(out)
    });
    done.subscribe((evt) => { 
        console.log(evt)
        //console.log(`finished with exit code: ${evt.code} on signal ${evt.signal}`);
    });

So that's all the code there is!! Let me just say how remarkably little code that is, and how amazingly clean it is. I
have written both a `library in python`_ and `clojure`_ which deals with grabbing the stdout of a child process, and
this is substantially less code (even if it doesn't do SSH like those other libs do). And with a little more work, it
could do what the clojure command library does and have a pub-sub style of getting output to multiple interested
observers (I would have just had to use Rx.Subject instead of Rx.Observable and then call publish or relay).

If I needed another function that had to wait for the child process to exit, it could subscribe to the *done* stream
with a different function. By the same token, if another function needed the standard output from the childprocess to
consume, it would subscribe to the *data* stream with a different function.

But what if a 3rd function needed some result of this 2nd function?  That's where nested Observables and the mergeMap
operator comes in handy, or possibly the use of a Subject instead of an Observable.

Nested Observables
++++++++++++++++++

A common occurence when working with Observables is that you will need to use an operator that itself may generate
another Observable. For example, a mouse click might make an ajax request to get some data. This is an Observable (the
mouse click) that can generate another Observable (the ajax request/response). The problem is that a subscriber
generally doesn't deal with an Observable directly; it deals with the values emitted by an Observable.

So one solution to this is to perform one of the varieties of merge/concat with a flatten.  Here's an example from the
quartermaster project where the textInputView function takes two Observables:

.. code:: typescript

  /**
   * Creates the actual DOM component for the labeled input
   * 
   * FIXME:  Everytime someone enters text in the field, the div will be redrawn which seems like a performance waste.
   * 
   * @param {*} props$ 
   * @param {*} state$ 
   */
  function textInputView( props$: Rx.Observable<LabelInputProps>
                        , state$: Rx.Observable<string>)
                        : Rx.Observable<string> {
      return props$.mergeMap(p => {
          return state$.map(s => 
              div(".labeled-input",[
                  label(".label", p.name),
                  input(".input", {attrs: {type: "text", defaultValue: p.initial}})
              ])
          )
      })
  }

Here, the props$ variable is an Observable containing properties we need, and it will be merged with a state stream. We
have to use a mergeMap here because the map operator will return another Observable. Had I not used mergeMap here, and
used a regular map() operator instead, the result would have been a type of Observable<Observable<string>>. What we want
returned though is Observable<string>. What the mergeMap() operator does is it flattens the stream so that what is
returned is just Observable<string>.


Generators and await/async
--------------------------

You might be wondering if generators or the proposed es2017 async/await will be good solutions for asynchronous
programming. My understanding of this is that async/await is basically syntax sugar around generators and promises. The
interesting thing is that while promises only return one value, generators can return many.

So for generators, this is a possibility.  Generators, like Observables, allow for multiple return values over time using
the yield keyword.  Like Observables, then can also be communicated with, since the next() method can take an argument,
which the generator function will then recieve.  

However, the whole Observables API (it's scheduled to become part of ecmascript hopefully for es2018) is much richer and
would require less hand-rolling.

There's some good reading about `generators and async/await here`_

**TODO** play around with a generator as the source of an Observable stream

A word about debugging
----------------------

Debugging an FP program, and especially in an asynchronous environment, is especially problematic. Traditional debuggers
were designed around an imperative and synchronous computational model. Eg, "step into this function, then step over
that line of code...". In FP, where for and while loops are replaced by (hidden) recursion inside of reduce, map,
filter, etc, and "stepping" becomes much trickier. Now add in the fact that you are dealing with data that may not be
there yet, and which doesn't respond well to "stop the world" (ie an event loop system).

So how do you debug?  Good old logging statements can help.  On the one hand, logging statements often (but not always
as in the case of haskell's Writer Monad) break purity due to their IO.  If you can live with the IO, one good thing about
FRP is that any extra latency added by the logging doesn't really matter since the whole system accounts for latency.
This is the main bugbear when using print statements for debugging in imperative programming.

I remember during my first job out of school, one of my first tasks was to remove all printk() functions in our driver
code to clean it up and to improve performance. As it turned out, there was one printk statement that introduced *just*
enough latency to allow one of the pins driving a SPI bus to go active high and allow the hardware to work.  Lesson
learned (and that was not fun to debug at all).

That being said, you can set up VS Code to help you with debugging.

**TODO**
- Show how to make use of the launch.json and tasks.json files in .vscode

cycle.js
========

`Cyclejs`_ is a framework that uses reactive style asynchronous data flow along with pure functions. The purity comes
from the isolation of all effects (ie, any kind of IO) in drivers. If you are familiar with Monads, this is a similar
concept.  This actually makes cycle more functional than react + redux.  Where redux is used as a state management
system for react apps, cycle just uses Observable streams to do state management.  It has the ability to store state
over time just like react, and appears overall to me, to a more elegant solution than react + redux.

The cycle in cyclejs
--------------------

In the cyclejs model, you have your main() function which contains all your business logic, and you have drivers which
contain all your effectul code. The output of your main() is a sink and its input is a source both of which are streams.
Conversely, the source (or input) of the driver code comes from the output of main, and its sink (or output) is fed
as the input to main.  Notice the loop or cycle going on here, and hence the name of the framework.

What is really interesting about cyclejs is that to genericize your components, you can treat them like little main's.
A generic component will have source and sink streams, you just chain your components together as need be.

What's really nice though is that since all the effectful code should be in the driver part of the code, that makes
testing a lot simpler.  It means you don't need to mock as much stuff, and you mostly just have to come up with a way
to feed input values and capture the output for testing.

Getting Flow and Setting it up
==============================

As mentioned earlier, types can help make your program more robust and easier to reason about.  No more guessing what you
need to pass in and what some function returns.  It does have a cost in terms of thinking about types, but while this
upfront cost is greater in the short term, it will save more time in the long term.

I mostly just followed the directions on how to set up flow and it just worked.  I recommend that you use yarn instead
of npm, and you install flow locally to your project.  So basically creating a flow project is:

- Create a directory layout for your project

  - toplevel (eg name of your project)

    - src

      - libs

    - tests
    - build
- Init a package.json
- Add npm scripts to package.json
- Add all the dev dependencies via yarn
- Add all regular dependencies
- Install .vscode directory

  - Generate a basic launch.json (for debugging)
  - Generate a basic task.json (to compile before debugging)

So lets do all that shall we?  I have created an ansible playbook which will do (most of) the above. 

::

    git clone https://rhsm-gitlab.usersys.redhat.com/stoner/ansible-playground
    cd ansible-playground
    ./setup_ansible
    ansible-playbook  -i "localhost," -u {user} frp-project.yml -e "project_name={/path/to/yourproject} base_user={user}" -K 
    
where {user} is replaced with the username on your local machine, and {/path/to/yourproject} is the absolute path to the
location where you want to create a new project.

There is one additional thing you will need to do however that I couldn't figure out how to do with ansible. In the
package.json file, add a section called "scripts" to the json

.. code-block:: javascript

  "scripts": {
    "build": "webpack",
    "flow-src": "babel src -d build/lib/src --source-maps inline",
    "flow-tests": "babel tests -d build/lib/tests --source-maps inline",
    "start": "node ./node_modules/webpack-dev-server/bin/webpack-dev-server.js"
  },


Setting up VS Code
==================

I've been using Visual Studio Code as my IDE with pretty good luck.  I know what you are thinking, "Why are you using a
Microsoft product at Red Hat??"

Well, first off, Microsoft has been contributing a **lot** to the opensource world lately.  Indeed, RxJS wouldn't have
existed without Microsoft donating the original Rx.Net code base.  Also, Visual Studio Code (ne vscode) is open source.
Thanks to the mono runtime, vscode is actually **more** opensource and free than anything based on Java (remember, Oracle
sued Google, and the Supreme Court agreed that API's are patentable).

So, embrace it :)  To get started, just follow their webpage

A Word about Javascript Unit Testing Frameworks
===============================================

So far, I haven't found a unit testing framework that ticks off all my checklist items.


+-----------+------------+------------+-----------+------------------+--------------+----------------------+
| Framework | In browser | No globals | Fat arrow | Async Support    | Flow Support | Others               |
+===========+============+============+===========+==================+==============+======================+
| Jasmine   | Y          | N          | N         | Promises         | typescript   |                      |
+-----------+------------+------------+-----------+------------------+--------------+----------------------+
| Mocha     | Y          | N          | N         | Promises         | ?            | requires assertions  |
+-----------+------------+------------+-----------+------------------+--------------+----------------------+
| Jest      | N          | N          | Y         | Prom,async/await | flow         | has snapshotting     |
+-----------+------------+------------+-----------+------------------+--------------+----------------------+
| AVA       | N          | Y          | Y         | Prom,async/await | flow         |                      |
+-----------+------------+------------+-----------+------------------+--------------+----------------------+
| Tape      | Y          | Y          | Y         | None (callbacks) | None         |                      |
+-----------+------------+------------+-----------+------------------+--------------+----------------------+

You might be wondering why I wanted those checklist items...

In Browser
----------

This lets you insert test code inside the browser itself.  If you have javascript libraries that only run in a
browser and not in node, then this becomes more important.  This is the case with the cockpit.js.  It only runs
from within a browser environment.  That makes unit or integration testing the cockpit.js API more difficult
to run without a browser (it should run in headless chrome though).

No Globals
----------

Do you really want a framework injecting stuff into the global this/window variable?  Now you have to wonder if
you have the same name variable as something the framework is using.  And javascript module support is pretty
crappy as it is.

Fat Arrow
---------

This is javascript's lambda function starting in es6.  It allows you to do this:

.. code-block:: javascript

  describe("Test a fat arrow function", () => {
    it("Fat arrow functions are different from function declarations", () => {
       console.log(this)  // fat arrow functions _this_ is set at declaration time, not call-site time
    })
  })


While lack of fat arrow functions are not a deal breaker, it is annoying not being able to take advantage of
fat arrow functions and the simpler handling of the *this* context.

Async Support
-------------

Javascript is full of asynchronous programming.  Node is almost entirely async based, and a lot of browser code
is too (just think Event Emitters like button clicks).  The old solution, callbacks, has a nasty problem called
callback hell.  Basically, you can wind up with a very deeply nested function and it gets hard to follow.

And that doesn't include error handling which becomes a nightmare to propagate up. Solutions to callback hell have been
either support for Promises (included in es6/es2015) and async/await (included in es2017). Async/await is basically
sugar syntax for promises and generators. I still need to try out async/await, and it *looks* like it can handle
multiple return values (that's what generators allow for). Ideally, the framework would support async/await in addition
to promises

Another option is support for Observables (which will hopefully make it in for es2018). However, I don't know of any
test frameworks which natively support Observables.

Flow Support
------------

This is probably the least impactful choice because it can be worked around.  But if a library supports flow
types, then IDE's can take advantage of it automatically.  This makes writing tests a lot faster.

Integration Testing Frameworks
==============================

How about integration testing frameworks?  For integration testing, there's basically two camps:  the selenium
or webdriver based libraries, and the lightweight-DOM tools.

Selenium/Webdriver
------------------

This is maybe the more common of the two.  This simulates a user clicking on the webpage by remote controlling
a browser through the W3C webdriver protocol.

**Pros**

- Uses a real browser
- Lots of tools and 3rd party clients (selenium, webdriver, nightwatch, etc)
- Can also drive the lightweight-DOM version

**Cons**

- These kinds of tests are slower
- Don't have access to any internal state or logging
- Only sees what the customer sees (yes, this is a disadvantage)

Lightweight-DOM
---------------

This style of testing uses a headless (or mostly headless) browser to run tests inside of.  Examples of a light
weight DOM are phantom-js, slimerjs and the new headless chrome.

**Pros**

- Faster to execute since it doesn't have to render the GUI

  - Therefore requires a less beefy system to test on so you can spawn more of them

- Can be used for test frameworks that cant be run in real browser
- Easier to inject javascript
- (Verify this) Has access to EventEmitters and redux state stores

**Cons**

- Not a real browser
  - Though technically, headless chrome is


Other javascript libraries useful for testing
---------------------------------------------

- Karma is a testrunner that can setup a browser for running in-browser testing
- Enzyme is a library for unit testing React components
- Redux though not a testing library per-se is *very* useful for debugging


References
==========

Here's a compendium of resources I used which don't have any inline links:

- `egghead.io`_: Some free online video tutorials
- `exploring es2016 and 2017`_: Free online book about es2016 and es2017 (proposed)
- `exploring es6`_: Book by same author as above covering es6 
- `avajs`_: asynchronous test runner
- `allonge`_: Javascript Allonge sixth edition
- `reactivex`_: One of the best documented sites I've ever seen.
- `rxjs`_: The javascript implementation of reactivex
- `ramda`_: Javascript library for functional programming (seems more pure FP'ish than underscore or lodash)

.. _Functional Programming: https://medium.com/javascript-scene/the-rise-and-fall-and-rise-of-functional-programming-composable-software-c2d91b424c8c
.. _Reactive style async programming: https://manning-content.s3.amazonaws.com/download/e/c2b3ad4-82b9-471e-9579-0c656d472fcd/Daniels_RxJSiA_MEAP_V08_ch1.pdf
.. _Pure functional languages: https://dzone.com/articles/functional-programming-is-not-what-you-probably-th
.. _Flow: http://flow.org
.. _Type Systems: https://flow.org/en/docs/types/
.. _total pure functions: https://dzone.com/articles/total-and-partial-functions-in-fp
.. _Immutable data: https://facebook.github.io/immutable-js/
.. _Variance: https://flow.org/en/docs/lang/variance/
.. _Cyclejs: https://cycle.js.org/
.. _Type refinement: https://flow.org/en/docs/lang/refinements/
.. _redux: http://redux.js.org/
.. _generators and async/await here: https://medium.com/javascript-scene/the-hidden-power-of-es6-generators-observable-async-flow-control-cfa4c7f31435
.. _exploring es2016 and 2017: http://exploringjs.com/es2016-es2017.html
.. _egghead.io: https://egghead.io/
.. _exploring es6: http://exploringjs.com/es6/index.html
.. _allonge: https://leanpub.com/javascriptallongesix/read
.. _reactivex: http://reactivex.io/
.. _rxjs: http://reactivex.io/rxjs/
.. _ramda: http://ramdajs.com/
.. _avajs: https://github.com/avajs/ava
.. _Setting up and using flow: https://flow.org/en/docs/getting-started/
.. _Getting and using VS Code: https://code.visualstudio.com/
.. _immutablejs: https://facebook.github.io/immutable-js/
.. _library in python: https://github.com/rarebreed/smog/blob/master/smog/core/commander.py
.. _clojure: https://github.com/rarebreed/commando/blob/master/src/commando/command.clj
.. _flow types: https://flow.org/en/docs/lang/
.. _"run to completion" semantics: http://2ality.com/2017/01/shared-array-buffer.html
