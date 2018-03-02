import { test } from 'ava';
import * as React from 'react';
import { mount } from 'enzyme';
import { MultiText } from '../app/components/MultiText';

test('Test MultiText textarea', (t) => {
    const wrapper = mount(<MultiText id="test" label="Just a test" rows={30} cols={80}/>);
    // Make sure when calling this.setState, we pass the callback
    let state$ = MultiText.emitters.get('test');
    if (state$ === undefined) {
        t.fail('The Rx.Subject did not exist');
        return;
    }

    // Have to filter the first state since it's equal to ''
    state$.skip(1).subscribe(
        n => {
            console.log(`In subscribe: ${n}`);
            t.is('new value!', n);
        }, 
        err => {
            t.fail('Error in MultiText subject');
        }
    );
    wrapper.find('.text-submit').simulate('change', {target: {value: 'new value!'}});

    // FIXME:  Unfortunately, it doesn't seem to support either returning the Observable, nor does
    // state$.toPromise() seem to work (though that seems to be a typescript thing)
});