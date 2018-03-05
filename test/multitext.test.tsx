import * as React from 'react';
import { mount } from 'enzyme';
import { MultiText } from '../app/components/MultiText';
import { configure } from 'enzyme';
import 'rxjs/add/operator/toPromise';
import 'rxjs/add/operator/skip';

const Adapter = require('enzyme-adapter-react-16');
configure({ adapter: new Adapter() });

test('Test MultiText textarea', (done) => {
    const wrapper = mount(<MultiText id="test" label="Just a test" rows={30} cols={80}/>);
    console.log(wrapper);
    // Make sure when calling this.setState, we pass the callback
    let state$ = MultiText.emitters.get('test');
    if (state$ === undefined) {
        fail('The Rx.Subject did not exist');
        done();
        return;
    }

    // Have to filter the first state since it's equal to ''
    let prm = state$.skip(1).toPromise();
    console.log(`promise is: ${JSON.stringify(prm)}`);
    wrapper.find('.text-submit').simulate('change', {target: {value: 'new value!'}});
    return prm.then(n => {
            console.log(`In subscribe: ${n}`);
            expect('new value!').toBe(n);
    }).catch(err => {
            fail('Error in MultiText subject');
    });
});