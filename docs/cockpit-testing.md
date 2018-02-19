# __Cockpit testing infrastructure and framework__

In order to test cockpit in an agile manner, we need an infrastructure in place that can test what needs to be tested,
when all the components necessary for testing are in order.  You can't just run a test when code is checked in, and the
infrastructure needs to handle this.  For example in order to test one needs to know:

- How to provision the test platform with all the required setup/installation for the product?
- How to configure/setup any testing dependencies required to test the product?
- How to capture the entire version chain the product was run on (eg cockpit, cockpit plugin, etc)?
- Do we test every single feature on every code commit, or only run a subset of tests based on the feature?
- How to organize the tests themselves?
- If the code only added one new feature, or changed an implementation, will that impact other features?
- Can tests be run in parallel to help speed them up, or do certain tests have to be run in a certain order?
- Do the tests clean up after themselves or do you just "throw away" the SUT when done testing?

In order to help answer all these questions, a new infrastructure needs to be put into place.  Right now, the defacto
standard is to use jenkins with some combination of messages received from the UMB CI bus.  However, there's really
no need to run with jenkins.

What is needed is a set of services all talking to each other and managing what needs to be done.  There are a couple
of basic services that make up the infrastructure:

| Service             | Description                                                     | Lang        | Status
|-------------------- |-----------------------------------------------------------------|------------ |--------
| polarizer-sentinel  | Watches for messages to know when and tests to run              | java/eta    | TBD
| polarizer-seneschal | Overall manager and director of test execution                  | java/eta    | TBD
| polarizer-fabrum    | creates, provisions and inventories all the Systems Under Test  | typescript  | TBD
| polarizer-emissary  | Runs the suites chosen by the scheduler, reporting results      | typescript  | TBD
| polarizer-mimir     | Database to hold SUT reservations, metadata, and test results   | java/eta    | TBD
| polarizer-vertx     | XUnit and TestCase importer, testcase metadata                  | java        | Done*
| polarizer-mercury   | Message format definitions between services                     | java/eta    | TBD
| polarizer-umb       | Low-level Unified Message Bus service (to be used by sentinel)  | java(eta)   | Done*

There are also some libraries that projects can import and make use of in their code

| Library             | Description                                                     | Lang        | Status
|---------------------|-----------------------------------------------------------------|-------------|---------
| metadata            | Metadata (object <=> json) translator for jvm                   | java/eta    | Done
| polarizer-py        | Metadata (object <=> json) translator for python testcases      | python 3.4+ | Inprogress
| polarizer-es        | Metadata (object <=> json) translator for javascript testcases  | typescript  | TBD
| polarizer           | Helper libraries for polarizer-vertx                            | java        | Done
| reporter            | TestNG xunit report generator.  Serialization utilities         | java        | Done

## General overview

Here's a bird's eye view of how things would work

![Testing Framework](https://github.com/rarebreed/mercury/blob/master/docs/images/ParallelTesting-RHSM-qe.png)

## __Test watcher | Sentinel__

How do you know when to kick a test off?  Continuous Integration implies that every time a new version of the product
is ready to test, that tests should be run in conjunction.  Indeed, there are at least 2 levels of this:

1. Unit and Integration tests that are triggered on git commits
2. Functional and end-to-end tests that are triggered when the test subject artifact has been created

To put another way, the first set of tests are triggered before the product is "packaged up" so to speak, while the 
second set of tests occur once a testable artifact is available or service has been deployed.  The first kind of 
test can be triggered via git(hub) commit hooks, while the second can be triggered by some kind of release artifact 
tool (for example koji or brew) or from devOps indicating a service is live on some kind of staging server.  In any
case, a message is sent on some kind of message bus so that the testing tools know when to run the respective kind
of tests.

The Sentinel watches for these messages, and determines what needs to be kicked off based on the contents of the 
message.

### *Work to do*

```
Projects:
- polarizer-sentinel
- polarizer-vertx
```

The messages from the UMB factory are already well defined, so we can look for a brew message to determine when to 
trigger full tests.  This has been implemented in Jenkins with a listener, but I have yet to see it actually work.

Instead we can use polarizer-vertx and the umb verticle to listen to a message for us.  If it finds an appropriate
message, the umb verticle can trigger a test to run, by sending a vertx (or apache kafka) event bus messaage to the 
Sentinel.

For github, we can use github's pubsubhubbub feature.  This means we need to create a new polarizer-vertx microservice
to listen for these events.

We also need to come up with some kind of Json format to send to seneschal, so that it can make a decision.

## __Scheduler | Seneschal__

The Seneschal is the service that will actually tell two other services what to do to actually run the tests.  It will
receive from the Sentinel that some artifact(s) are ready for testing as well as what kind of testing to do (unit,
integration, system or other).  Based on the type of testing it needs to do, the Seneschal will look at the metadata
for a testsuite so that it can then tell Fabrum to either reserve TP's (Test Platforms) or create new ones if needed
and possible.

As the TP's come up, they will report their availability to the Seneschal.  The Seneschal will then inform the Emissary
which suite(s) to run.  From that point, the Seneschal is done.

The idea behind all this is to run as many tests as possible.  Implied in this is how to organize the test suites
themselves.  The test suites should be fairly granular so they can be run independently and atomically.  However, there
is probably some common factor among the tests.  For example, do you group tests by features?  By importance?  By how
much code coverage they provide?

All this information has to come from somewhere, and this metadata is part of both the test suite, and the test methods
themselves.

### Work to do

```
Projects:
- polarizer-seneschal
- polarizer-mimi
```

Once a message is received from the sentinel it needs to:

- Query Mimir to see what testcases implement the features affected or implemented by this PR
  - What tests need to be run (eg unit/integration)
  - Can filter by determining just tests applicable to a PR
- Partition the tests based on testcase metadata
  - Determine all the tests compatible with each other (eg same Test Platform)
  - For each partition in which all the tests can be run in parallel, create a TestSuite
    - Create or reserve as many TestPlatforms as possible
  - For each partition in which some of the tests need to be run serially, create a TestSuite
    - Create one TestPlatform to run all the tests in that TestSuite


### Test metadata

This is a very important and crucial piece of the testing story.  Unfortunately, having metadata about the tests is 
often either done poorly, or written in such a way that there is not a way to get programmatic access to it.

For example, it is very common to store testcase information in some kind of ALM tool, like ClearQuest, qTest, Spira,
etc.  However, accessing this information, or even entering it in can be a nightmare.  Why not let the metadata about
the tests live with the tests themselves?  Beyond the usual testcase information, like what kind of test it is (unit,
 integration, etc), if it is automated, or what steps it contains, other kinds of metadata are often necessary.  This 
could be information like test dependencies, and how the test needs to be executed.

So, each test method should contain metadata.  The metadata will be stored either in the test method itself as some
kind of metadata (for example, a decorator or annotation) or can be stored in an external file.  The different kinds of
metadata to include are:

- What kind of test
  - Unit test
  - Integration
  - Functional/System
  - Performance/Load/Stress
  - Acceptance
- A Unique ID (stored in a database, actually all the metadata will be stored in a database)
- Reference(s) to Requirement ID(s) where this Requirement is stored in a database
  - What kind of role (depends on, verifies, related to, etc)
- Project the method is applicable to
- BDD file (if applicable)
- Feature category (for example, the product should be broken down into categories)
- Feature dependencies (does this feature depend on another feature)
- Provisioning information
  - Ansible playbooks and how to execute it
  - Dockerfiles (ideally ansible container instead)
  - Vagrantfiles
- Test Dependencies
  - Side Effects/State (to determine if test can run in parallel)
    - Resources/Assets that need to already exist on system or test environment
    - Resourcest that the test itself will create/modify
    - Other tests that need to be run (before or concurrently)
    - Other services (eg file monitors, log monitors, web services, databases)
  - SUT Platforms information
    - VM, container, bare metal
    - Arch
    - Distro version
    - Setup information
      - Ansible roles/playbooks
      - dockerfiles


### *Work to do*

```
Projects: 
- polarizer-mimir
- polarizer-vertx
- polarizer-metadata
```

A lot still needs to be done here.  First, we need to come up with some new metadata types, or possibly a freeform 
field, so that test authors can insert metadata as needed.

Polarizer then needs to examine this info and store it in Mimir as needed.  By storing this information in a database,
it allows analytics and querying to be performed such as:

- What tests cover what features?
- What tests have dependencies on other tests?
- Show all tests that have resource_x as a dependency
- Show all tests that can run on a container


## __Metadata | Mimir__

The tests have a lot of metadata associated with them, and we need some way to store, retrieve and query this data.  The
original idea behind polarize was that all the metadata about tests should be stored _with_ the tests.  In other words, 
don't store metadata about tests hidden away behind some database that the upstream community has no access to.

This led to the natural assumption that metadata could be stored either as annotations in Java, or via decorators in 
python.  The other idea was to link a test method to a human readable file such as json or yaml for the required metadata.
However, there's a problem with data stored in text files: you can't really query on them.

Moreover, there is a cost to the polarizer verticle microservices, because now the client has to upload these files to the
endpoint(s) for each request, and this can start to cause a lot of network traffic.  The original mapping.json that I 
worked on was around 60k in size, which is already fairly big.  But this team only had about 1000 testcases.  There are
teams that can have in the hundreds of thousands of tests.

Clearly, this is not a very scalable solution.  So for a long term solution, the text files will continue to exist on 
the local machine and will be considered the canonical source of truth, but requests to the polarizer verticles will 
eventually make queries to mimir instead.

Mimir will be an orientdb database, and written in java/eta.  It will use the live query feature so that other clients 
can be notified with nodes change.

### Benefits of mimir

Having a database for the metadata and results opens up all kinds of interesting things to do:

- Get only tests which cover some feature
- Get only the tests which can run on a certain test platform
- Get tests which differ between rhel versions
- Find out how long each test takes on average

### How TestSuites can be dynamic

Here's an example of how based on a different trigger type, the TestSuite can be determined.

![TestSuite flow](https://github.com/rarebreed/mercury/blob/master/docs/images/TestGenerationDetailed.png)

### *Work to do*

The currently named project is alexandria and has a little bit of code to setup the orientdb database.  But the majority
of the work is:

- Create the schema for all the metadata
- Marshall from text file to nodes/edges
- Helper libraries to perform queries
- Add new polarizer-http endpoints to make use of the database instead of sending mapping.json files


## __SUT Manager | Fabrum__

Currently, the way that rhsm-qe runs its tests, it has a few long-lived test clients that have already been provisioned
ahead of time.  One of the problems with this is clean up of the test client.  The client may have been left in a 
"dirty" state by some previous test, especially if that test failed due to some problem, and the AfterTest or 
AfterSuite hooks never got called.

Ideally, a new Test Platform should be created for each TestSuite to be executed.  The Test Platform is not just the
client (which is called the SUT or System Under Test) but the entire test environment needed by the test.  For example,
if a testcase requires a new candlepin (because it has different TESTDATA) that would be part of the TestPlatform.

Fabrum's job is to create TestPlatform as needed, and it does so by looking at the metadata 

Fabrum gets signaled by Sentinel, and it is involved primarily with the creation of Test Platforms:

- Create Test Platforms which could be one of the following:
  - Openstack compute nodes
  - Docker or Openshift containers (eg running cockpit and browser)
  - Atomic host + containers
  - Bare metal Beaker machines
- An inventory of all the TP's needs to be kept track of
  - Pools of the SUT platforms will be maintained
- If no TP's are currently available
  - If possible, create a new SUT platform
  - If not, be put into a queue
- When a TP is done with a test suite it will:
  - Take itself out of reserved status to be put back in an available pool
  - Clean itself if possible, or be destroyed (to create a new instance)
- Each TP will have installed on it the Emissary agent to perform several tasks
- Fabrum can also create new instances for other services as needed and add them to service discovery
  - ci-metrics
  - rhsm-jenkins-slave
  - polarizer verticles
    - sentinel
    - vertx/http
    - mimir
    - fabrum

### *Work to do*

```
Projects:
- polarizer-fabrum
- To be named ansible-container
```

**Openstack**

The hard part here will be creating the Openstack Compute Instance nodes.  The problem is that we often use some kind 
of compose snapshot.  The old way was to create a KVM instance based on a compose URL, and then run the deploy.sh to 
provision it.

One workaround currently, is to just use some known good image, and then create some repo files so that it uses the 
same compose.  Once a yum update is run, it will grab the same rpm packages that would be installed from the compose.

Ideally however, there should be a qcow image of every compose, and then we could create an Openstack glance image
from it.  We could then use the glance image to provision an instance from it.

**Docker**

For the docker/container story, we need to use ansible container to set up the Test Platform.  That means that along
with the regular ansible playbooks, we also need some new project for ansible container.  We also have to figure out
how to make it find our internal ansible roles, since they are not available on Ansible Galaxy

Note that most of the tests can not run on containers, due to the way that subscription management works on containers.
That being said, the future of Red Hat is moving this direction, so what does it mean for a container to be running
cockpit, and to perform a subscription Register and Attach on it?

**Openshift**

Need to investigate more on openshift since I know so little about it.  We might be able to leverage some of the 
in-house Openshift deployments.

## __TestRunner Service | Emissary__

To reduce network load, the test suite should be run locally on a SUT.  In fact, we may entirely skip the jenkins
machinery.  What really needs to happen is this:

- When Fabrum creates a new Test Platform, emissary will be installed on it
  - It will be registered as a systemd service
  - When it comes up, it will run a service discovery to find the seneschal, and report that it is ready
- Emissary will listen for triggers to indicate a test suite (of a certain type) should be executed
- It will clone the required test project as needed, and run the testsuite(s) indicated
- It will report the results of each test method in real time to Mimir
- It will send stdout to a log monitor
- At the end of the testsuite:
  - Make a call to polarizer http to make a xunit import
  - Publish a message to the UMB for the Metrics Data Collection

### *Work to do*

**Pick a Framework**

The first and obvious thing to do is actually create some tests!!  First, we need to decide on what test framework to
use.  Also, we need to figure out if we want a unified test project (all tests in subscription manager) or if we want
two test projects (one for unit/integration tests, and another for end to end tests).

Once we choose a framework (or two), emissary needs to create a wrapper around the execution of the test.  Further, 
the chosen test framework needs to be able to return the test report in xunit style format, or at least have a way to 
do so.

Framework features:

| Must have | Feature
|-----------|--------------------------------------------------------------------------
| yes       | AfterTest hooks
| yes       | Test Report in xunit format
| yes       | Able to run webdriver.io tests
| yes       | Built in async support
| no        | In browser tests for cockpit.dbus
| no        | Test discover

**Reporting and Metrics**

It's no good to run a test but not report the results.  QE Management has a big push to centralize all the metrics
about not just the result of the test suites, but also metadata about the testing.  For example, was the test run on
openstack, beaker machines, docker or openshift?  What distro was it run on?  What version did it run on?  Was the 
test triggered manually, from a git commit, or from a brew build?  Was a test a failure because of actual assertion
failures, or because of some infrastructure problem?

These are all the kinds of things that QE management wants to know so they can perform analytics on it to help determine
PQI or how "ready to ship" our product is, as well as other metrics like how often tests fail due to infrastructure, etc).  

Polarizer (as a system) was designed primarily around two use cases.  One was as a format to store metadata about the 
tests, so that it could be imported into Polarion as a TestCase (as well as other non-Polarion related metadata).
The other main usecase was for reporting these metrics.

The xunit importer mostly works now, although the switch to the UMB muddied things up and so some extra work still 
needs to be done.  The other bit that needs to be worked on 

### Test suite design

We should avoid the way that rhsm-qe arranged the suites.  In rhsm-qe each suite is rather large and as a consequence,
it takes a long time for them to complete.  Also, because each test method does not have enough information about
dependencies and setup/teardown information, it's not really possible to run the suites in parallel.  It's very
important for tests to run quickly because it's entirely possible to get a new git commit if tests take a day to run.

Another thing we should replace is the notion of "tiered" tests.  We should really be testing by feature.  If the tests
contain information about feature/component dependencies, then if you run a test, it will implicitly know what other
test(s) need to be run.  In essence, testing is a graph where each node is a feature and the edges are dependencies.

# __TODO__

Here's a list of things still to do

## cockpit test framework

Ton of stuff to do here, even just research.  We need to figure out how to do the unit/integration tests, as well as 
the end to end tests.  Jan has been working on the end-to-end tests, so I will let him work on that.  

- Jest or AVA?
- Proof of concept for redux-observable
- Proof of concept for react component testing
- Proof of concept webdriver.io test

## Build Tooling

Often neglected, but vitally important.  We need to make it easy to build all these services

- Get oss.jfrog snapshots for polarizer
- Convert to Java 9 modules
- Document or automate all the necessary bits for building

### Artifactory snapshots

I still haven't fully figured out how to get the JFrog artifactory to deploy the various polarizer projects.  This is
a pain, because it forces someone building this on a new machine to git clone all the dependency projects and then 
run gradlew install.

### Java 9 modules

Java will be moving forward very fast, so it would be a good idea to start converting over to Java 9 modules.  Moreover,
by using modules, it separates concerns and forces you to modularize your code.

One potential snag is if eta will support Java 9 modules (can it build Java 9 modules or consume them?)

### Documentation for building

There's a lot of hidden bits going on with the build process.  This needs to be documented or automated as much as 
possible.  For example, the gradle.properties file, the configuration files, even the UMB TLS certs all need to be 
explained.

## Language conversions

- Add eta bindings for rxjava
- Convert polarizer-umb to eta
- Convert polarizer-vertx to eta
- Quartermaster to typescript

**Why eta?**

Being a haskell means pure FP.  Being pure FP means we know where the moving parts are.  This will help determine 
where most of the bugs lie waiting.

**Why typescript**

While flow is pretty cool, the tooling was just not all that great.  Also, I wonder how much Facebook will support it
given that they seem to be moving to reasonml.  Typescript seems to very popular, with a growing number of libs.  It's
also got pretty good tooling support.

## Polarizer (as a microservice system)

There's still quite a bit of work to do for polarizer.

- Add https support to polarizer
- Turn polarizer into true microservice
- Add websockets for some of the endpoints
  - Include a python websocket client
  - Include a javascript websocket client (both browser and node)
  - Include a vertx websocket client
- Finish polarizer-py for python
- Create polarizer-es for ecmascript
- Test all the imports
- Hook in the queue browser support

### Https support for polarizer

We need a way to lock down the transport between the client and polarizer.  This is both for the http based services
on polarizer-vertx, and also the websockets and event bus traffic

### Turn polarizer into a real microservice

To do this, polarizer needs a couple of things:

1. Containerization
1. Service discovery mechanism
1. Health monitoring
1. Clustering

The first step will be to containerize polarizer-vertx.  This will let us fire up multiple instances and bind the 
ports differently.  The next step will be to create a service discovery mechanism.  There might be additional 
services in the future (for example dbus, cockpit, and db services).  In conjunction with the service discovery, 
we need a way to know when these services come and go (intentionally or not), so some kind of health monitoring
is required.  Lastly, for scalability and for redundancy, these services should run on a cluster.  Ideally, this 
cluster should probably live in 2 different places (one in our Openstack deployment, and another possibly in the
Openshift management)

### Websocket endpoints

The import endpoints for XUnit and TestCase need to be converted to websockets.  The reason is that it can take a 
long time for Polarion to respond back with the message.  We don't want to hold an Http connection open that long.

This also means that we need to specify the format of the frames being sent over the websocket.

Furthermore, we need at least 4 different clients:

- python: for use by polarizer-py to upload testcase imports
- javascript-browser: for redux-observable to send state events to interested party
- javascript-node: for polarizer-es, and to send dbus events and file monitor events to interested party
- vertx: java based for testing polarizer-vertx

### polarizer-py

To make adoption of polarizer more wide-spread, we need tooling for the python teams.  A lot of work was done in 
polarizer to divorce it from java, which led to the creation of polarizer-vertx.  Many of the functions originally
done in polarize were moved to a web service, allowing the possibility of non-java teams to make use of it.

The polarizer-py project is underway, but still needs some testing.  Currently, it can generate the yaml files
and the mapping.json file, but we still need to:

- make an import
- edit the definition and mapping files once the response is returned
- figure out how to find all metadata decorated functions

### polarizer-es

This will be the javascript (typescript) version of polarizer-py.  In fact, I like the architecture of polarizer-py
more than how Java does it.  

Javascript, and even typescript, don't support decorators the same way that python does.  So the syntax will be a
bit more ugly, but the concepts will essentially be the same.  In fact, it will probably just be a typescript port
of the python code.  The hard part might be figuring out what functions were decorated.  In python, we could make 
use of the modulefinder module, and the fact that when you import a module containing the code, the code inside 
the decorator would run.  This might not be true for javascript.

### Test the xunit and testcase importers

Since we are doing a lot of changes to polarizer, we should test these endpoints once they have the websockets in
place.  This means writing some unit tests for them.

### Queue browser support

Polarion has a new feature where you can query it to see if an import job is still pending in the queue or not.
This means if a timeout has expired we can:

- Check if the submitted job is still pending in the queue, if so, continue waiting
- If it was completed, check the status

This will eliminate some false negatives if an import took longer than the timeout.

## Metrics data collection

Need to collect data specific to Platform.  Work was started on this with the metricizer project, but some of the 
data they need, and the format they want it in has changed.

We can use polarizer-vertx umb service to upload this data.  We will need to create a new TLS cert though since
they will have a new VirtualTopic.  

**Blocker**

Have to wait until the CI Ops guys hook their stuff into the UMB 

## Database support

- Add db support for Testcases, Testresults and Metadata
- Add graphql for db

Polarion has a couple of problems.  Firstly, we dont have query capability (not even read-only).  Secondly, it's
slow as molasses.  And thirdly, it's SQL.  

Currently, polarizer is making use of mapping.json files or test definition yaml files to represent the TestCases
so that we can convert them to an XML file, and upload this XML file to Polarion to create or update the TestCase
in Polarion.  Wouldn't it be nicer to just have a database you can directly query yourself?

Also, we need a way to store metadata for the TestCase and TestSuites.  This data will be things like how to 
provision a TestPlatform in order to run a particular test.  It can specify other requirements, or relationships
(perhaps TestCase A depends on TestCase B running first).

The database will most likely be OrientDB using graphs.

## Microservices to replace Jenkins

- Create a kafka message bus to inform emissary
- Create the emissary for testrunner service

Jenkins tries to solve things either through old-fashioned jobs, or by Pipelines.  But here's the problem.  Jenkins,
like many build tools, wants to describe how to do things statically.  It's rather difficult to do if/else 
branches in Jenkins (also with pipelines).  You can define your "job as code" through the DSL, but you still have
to reconcile DSL creation time, with job run time.  How do you express that jobs can be run in parallel?

Fundamentally, all this kicking off of things, and knowing what to do and when to do it is a graph problem.  The
nodes are "things to do", and the edges are "when to do it".  That's it :)  So how do you express this?  You can
express "things to do" as code that gets executed by a microservice, and the "when to do it" as messages that are
sent and received by the microservices over a message bus.

You could make this all sugary, and create some kind of DSL, so that you can hook "steps" (a Pipeline term for a 
Task to run) together with some kind of message that gets sent.  The advantages are that

- It's code you can manipulate at runtime
- It's easier to debug
- Jenkins assumes a synchronous world, but it's not

Take for example running a job that 1) may fail and/or 2) takes an indeterminate amount of time.  How do you tell
jenkins if this job failed or not?  One option is to just keep the job running until some specified timeout, and
if it exceeds that, assume a failure.  That's well and good, but you still keep the job running for the period
specified in the timeout.

What if you could say "hey, I'm not sure how long this job will take.  If it takes more than 30min, consider it a
failure, but I'll let you know one way or another".  You can't really do this in jenkins because jenkins assumes
a synchronous world.  You can't tell it "go ahead, move along.  I'll get back to you later".

## Microservices for testing

- websocket service to listen to dbus on the TestPlatform
- redux-observable websocket bridge
- file monitoring (cert directories)
- rpm monitoring

Logs are the traditional way to debug.  While they are useful, they are really only consumed during a postmortem to
try to figure out what went wrong.  Since the logs contain information about what the system was doing, this is 
useful.

But what if we get information in a well defined manner, in real time?  This would allow analysis of these messages
in real-time.  This allows some interesting usecases, like being able to "time travel" because you can see all the
state changes as they happened.  In effect, you can replay the system.

### Websocket for dbus signals 

One of the tools that will be useful, is to monitor and record all the dbus signals going on when cockpit requests
certain things.  We can use this to track when a product is attached, or when a system is registered for example

**Blocker**

Have to wait until the developers implement the dbus signals though.

### redux-observable websocket bridge

In the cockpit plugin, the redux store (or just a rxjs handler) can be bridged to a websocket, so that everytime
an Observable's onNext is called, it will be subscribed to a websocket Observer.  This websocket Observer simply 
forwards the state along to some other interested party.

### File monitoring

Very handy to know when certain files or directories change. For example, making sure that on a Register, the 
client cert is created, or when an attach is made, that a product pem is created

## Analytics

- Machine Learning real time analyzer of test output


# What to do next

So, that's a lot of stuff that still needs to be done!!  Where do we start?  How do we prioritize?

1. Convert polarizer-vertx import endpoints to websockets
1. Write new unit tests for the xunit and testcase imports in polarizer-vertx
1. Write the polarizer-py importer for the websocket
1. Add https support to polarizer-vertx (including websockets and event bus)
1. Write the websocket microservices for cockpit 
   - File monitor
   - rpm monitor
1. Proof of concept redux-observable with websocket
1. Microservice architecture for polarizer
   - dockerize polarizer
   - service discovery
   - health monitor
   - cluster
1. Metrics data collection (metricizer)
1. Get Artifactory snapshots working
1. Automate and document build process
1. Add more metadata types to polarizer
1. Work on orientdb to hold all the metadata for tests

[-jest]: https://facebook.github.io/jest/
[-AVA]: https://github.com/avajs/ava