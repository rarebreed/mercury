# What is mercury?

mercury is a small websocket microservice that can act as either a client or server communicating over
websockets.

The main services it provides are for testing cockpit and Red Hat subscription management.  To support
this goal, mercury will do the following:

1. Capture all cockpit to subman DBus events
1. Capture react view state changes
1. Monitor certain directories for file changes

## Capturing cockpit to subman dbus events

This functionality requires that all the subman dbus objects have a signal emitted for certain method
calls.  For example, it would be nice to know when a client requested to Register, or when it made an
Attach method call.

For this to happen, we need to have signals emitted from the subscription-manager DBus interfaces.
Otherwise, there will be no way to know when certain actions (method calls) are happening.