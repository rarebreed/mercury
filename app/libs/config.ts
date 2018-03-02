// ONLY FOR DEBUG
import { resolve } from 'path';
let distPath = resolve(__dirname, 'dist');
console.log(`CWD is: ${distPath}`);
// Have to go up three, because we are in build/
import '../../../test/helpers/setup-test-env';

import { getService, getSvcProxy, RHSMSvc, suser, getDbusIface, ConfigProxy } from './cockpit.dbus';
import * as Rx from 'rxjs/Rx';

 /**
  * Uses the Configuration DBus interface to get a section:key from the rhsm.conf file
  *
  * @param {*} property
  */
export function getRhsmConf(property: string): Promise<{t: string, v: string}> {
    let res = getDbusIface(RHSMSvc, 'Config');
    let proxy: ConfigProxy = res.proxy;
    // let service = getService(RHSMSvc, suser)
    // let proxy = getSvcProxy(service, "Config")
    let waitPrm = proxy.wait();
    console.debug(`Got a promise: ${waitPrm}`);
    return waitPrm.then(() =>
        proxy.Get(property)
            .then(p => p)
            .catch(e => {
                let result = {
                    t: 's',
                    v: 'Could not get property'
                };
                return result;
          })
    );
}

/**
 * Sets a value in rhsm.conf
 *
 * TODO: make a regex to validate vtype
 *
 * @param {*} property The (section.)key to set (eg server.hostname)
 * @param {*} value What to se the value to
 * @param {*} vtype The dbus sig type of the value (eg "s" or "i")
 */
export function setRhsmConf( property: string
                           , value: any
                           , vtype: string)
                           : Promise<{t: string, v: any}> {
    let service = getService(RHSMSvc, suser);
    let proxy = getSvcProxy(service, 'Config');
    let prmPxy = proxy.wait();
    return prmPxy.then(() => {
        return proxy.Set(property, {t: vtype, v: value})
          .then(() => {
            return proxy.Get(property)
              .then((r: any) => {
                console.log(`In Get of Set: ${r.v}`);
                if (r.v !== value) {
                    console.error(`Did not set the value of ${property} to ${value}`);
                }
                return r;
              })
              .catch((e: Error) => console.error(e));
          })
          .catch((e: Error) => console.error(e));
    });
}

export function testSet() {
    let newVal = 'foo.bar';
    let setPrm: Promise<{}> = setRhsmConf('server.hostname', newVal, 's');
    let set$ = Rx.Observable.fromPromise(setPrm);
    set$.do(s => console.log(`Doing the set ${s}`))
        .concatMap((s) => {
            let getPrm = getRhsmConf('server.hostname');
            let get$ = Rx.Observable.fromPromise(getPrm);
            return get$.do(v => console.log(`From get$: ${v.v}`)).map(k => k);
        })
        .subscribe(res => {
            console.log(`Comparing ${res.v} to ${newVal}`);
        });
    console.debug('Running test to set server.hostname from rhsm.conf');
}

testSet();