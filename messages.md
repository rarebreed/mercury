# Messaging protocol

When you have a microservice architecture, different services need to know how to communicate with 
one another.  Usually, this is done by talking with a central message bus or other communication
channel (eg websockets) between two clients.

The trick is that when you have more than 2 clients talking to each other, where you can hard code
how the messages exchanged works between only those two, you need some way to standardize on the
information in a message so that all parties know what they can look for.

## Messaging format

This is very much a work in progress.  Please submit any feedback

I can foresee two different base kinds of messages: Text and Binary.  Text is useful for exchanging
human readable data while binary messages are more useful when the data section (see below) is a 
big chunk of data (eg a file).

The required fields and their representation:

- op: string
- type: string
- tag: string
- ack: boolean
- data-type: string
- data: string


Here's a look at the JSON representation:

```
{
    "op": "testcase-import",
    "type": "request",
    "tag": "rhsm-qe-1",
    "ack" true,
    "data-type": "TestCaseImportData",
    "data": "{ ... }"
}
```

### op

The op is short for op code, and is a way to determine what you want the receiving client to do with
this message.  Another way to think about this is that op is sort of like a function name.

**Questions**

- How does Client A know what ops Client B accepts?
- What happens to an unrecognized op?

### type

This is perhaps a bad name, but type was some way to identify the type of the message itself.  In 
other words, was this a request?  Plain old data?  An Error?

**Questions**

- Do we really need this field?  How will a client make use of it?
- What are the valid values for type?
- Does type and op have a relationship?

### tag

The tag is a unique identifier from the perspective of the sender.  It is used so that if and when
a response comes back to the client, the client knows to what request the response belonged to. So
this is not a per-client tag, this is a per operation tag.  Imagine a single client makes several 
different requests to listen to several different dbus listeners.  How will it know from incoming
events which message came from which dbus listener?  This is what the tag is for.

**Questions**

- Should the service answering a request append information to the tag?
- Should there be a sent-from field to indicate who responded?

### ack

Some messages might require an acknowledgement from the recipient.  In this case, the ack will be 
set to true, so that receiver knows it needs to send a reply back.

**Questions**

- What if the recipient also wants an ack?  an acl/nak?  A boolean is not sufficient

### data-type

As will be explained later, the data type is just a raw string.  The data-type field describes the
actual type of the data, so that the client can serialize the raw data (as a string) into an 
instance of data-type.

### data

This is the payload of our message.  If the type is a request, it contains the information that the
receiving party will need to decipher.  If the type is data, it's just a hunk of data for the 
recipient to do something with.

Notice that the data type is a string.  Ideally, it would have also been another JSON object.  The
problem basically was with Java.  In polarizer, there is a TextMessage class which encapsulates 
a sent message.  Ideally, the data type would be generic.  For example:

```java

class TextMessage<T> {
    @JSonProperty
    private String op;
    @JsonProperty
    private String type;
    @JSonProperty
    private String tag;
    @JSonProperty
    private Boolean ack;
    @JSonProperty
    private T data;
}
```

The problem however, is that when you want to deserialize data, and you need to pass a class instance
of the generic type, you can't do it.  You can't in java do this:


```java
TextMessage<String> message = Serializer.from(TextMessage<String>.class, dataAsString);
```

Java does not let you get the class instance of a genericized type.  So that meant that instead of data
being generic, for java, we had to assume it was just a string.  Then it would be possible to serialize
a data type.

```
TextMessage msg = Serializer.from(TextMessage.class, dataAsString);
UMBListenerData data = Serializer.from(UMBListener.class, msg.data)
```