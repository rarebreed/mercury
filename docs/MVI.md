# Model View Action (MVA)

This is a term modeled after MVI in the cyclejs world to describe their overall architecture.  In essence, a component 
has 3 main roles:

- model: the state used or needed by a component
- view: how state is represented and rendered to the DOM
- action: actions or events which can change the state

Where does rxjs fit into this picture?  So first, we have to consider that the component does not live in isolation.
It can receive information from the outside, as well as submit information.  

For example, look at the definition of Action.  It is a means for the state model to change.  How can this be done?
One example is by user interaction with the GUI.  A DOM element might be an <input> and the user clicked a button.
Or perhaps, a model change in another component can be detected by another component forcing its own state to change.

So the questions are:

1. How are the state values in the underlying model obtained?
2. How can actions change the model?
3. How can we make the model in this component available to other parties?

We will not be addressing how the model changes the view, or how actions can be implemented from the view layer, as 
that essentially what React itself is about.  This document will only discuss the action -> model relationship, not
the model -> view or view -> action.

## The model layer

A component needs to describe it's model...it's underlying state.  There are two places we need to consider:

- Creation time
- Application run time

At it's crux, a component needs to know where to get state from.  Even at creation time, it is possible that a component
will need to retrieve this state from somewhere else, for example a database or possibly a local file.