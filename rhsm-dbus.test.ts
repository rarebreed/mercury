import { getRhsmConf, setRhsmConf } from '../app/libs/config';
import * as Rx from 'rxjs/Rx';

xdescribe('rhsm Config dbus tests', () => {
    xtest('Checks that we can write to rhsm.conf file with dbus', (t) => {
        console.debug('Running test to get server.prefix from rhsm.conf');
        let getPrm = getRhsmConf('server.prefix');
        let get$ = Rx.Observable.fromPromise(getPrm);
        get$.map(key => key)
            .subscribe(k => {
                console.log(`In get, comparing ${k.v} to default`);
                expect(k.v).toBe('/subscription');
            }, err => t.fail('Error getting values from rhsm.conf'));
    });
    
    xtest('Sets the server.hostname in rhsm.conf to foo.bar', (t) => {
        let newVal = 'foo.bar';
        let setPrm = setRhsmConf('server.hostname', newVal, 's');
        let set$ = Rx.Observable.fromPromise(setPrm);
        set$.do(s => console.log(`Doing the set ${s}`))
            .concatMap((s) => {
                let getPrm = getRhsmConf('server.hostname');
                let get$ = Rx.Observable.fromPromise(getPrm);
                return get$.do(v => console.log(`From get$: ${v.v}`)).map(k => k);
            })
            .subscribe(res => {
                console.log(`Comparing ${res.v} to ${newVal}`);
                expect(res.v).toBe(newVal);
            });
        console.debug('Running test to set server.hostname from rhsm.conf');
    });
});