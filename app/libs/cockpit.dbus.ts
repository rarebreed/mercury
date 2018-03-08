// TODO: Make a .d.ts file for cockpit
interface Cockpit {
    cockpit: any;
}

type MonkeyPatch = Window & Cockpit

const makePatch = (win: Window = window): MonkeyPatch => {
    let w = {cockpit: null}
    return Object.assign(w, win)
}

const windoe = makePatch()
export const cockpit = windoe.cockpit

// ====================================================================
// The com.redhat.SubscriptionManager Interfaces and Objects
// ====================================================================
// FIXME: This interface will be deprecated
export const SubManSvc = 'com.redhat.SubscriptionManager'
export const SubManIfcs = {
    EntitlementStatus: 'com.redhat.SubscriptionManager.EntitlementStatus'
}
export const SubManObjs = {
    EntitlementStatus: '/EntitlementStatus'
}

// The com.redhat.RHSM1 Interfaces and Objects
// TODO: Add methods for each IFType (eg RegisterServer.Start)
export type Services = 'com.redhat.RHSM1' | 'com.redhat.SubscriptionManager'
const RHSMPaths = ['com', 'redhat', 'RHSM1']
export const RHSMSvc = 'com.redhat.RHSM1' // RHSMPaths.join("."); if this is used, type checker will complain
export type RHSMIFTypes = 'Attach'
                        | 'Config'
                        | 'Entitlement'
                        | 'Products'
                        | 'Register'
                        | 'RegisterServer'
                        | 'Unregister'
export const RHSMInterfaces: Array<RHSMIFTypes> = 
    [ 'Attach'
    , 'Config'
    , 'Entitlement'
    , 'Products'
    , 'Register'
    , 'RegisterServer'
    , 'Unregister'
    ]
    
export const RHSMIfcs = RHSMInterfaces.reduce((acc, n) => {
    acc[n] = `${RHSMSvc}.${n}`
    return acc
}, {})
export const RHSMObjs = RHSMInterfaces.reduce((acc, n) => {
    acc[n] = '/'.concat(RHSMPaths.join('/').concat(`/${n}`))
    return acc
}, {})

export interface DBusOpts {
    bus?: string;
    host?: string;
    superuser?: 'require';
    track?: 'try';
}

// TODO: Add Facts Interface and Objects
export const suser: DBusOpts = { superuser: 'require' }

export interface Service {
    wait(fn?: () => any): Promise<any>;
    proxy( iface: string, obj: string): any;
}

export interface RegisterArgs {
    user: string;
    password: string;
    org: string | number;
    keys?: Array<string>;
}

export interface RegisterOptions {
    force?: boolean;
    name?: string;
    consumerid?: string;
    environment?: string;
}

// These will override what's in rhsm.conf
export interface RegisterConnectionOptions {
    host?: string;        // the subscription management server host
    port?: number;        // the subscription management server port
    handler?: string;     // the context of the subscription management server. E.g. /subscriptions
    insecure?: boolean;   // disable TLS/SSL host verification
    proxy_hostname?: string;
    proxy_user?: string;
    proxy_password?: string;
}

export interface Proxy {
    call(name: string, args: any[] | null, sig?: {type: string}): Promise<any>;
    wait(fn?: () => any): Promise<any>;
}

export interface RegisterServerProxy extends Proxy {
    Start(): string;
    Stop(): boolean;
}

export interface UnregisterProxy extends Proxy {
    Unregister(args: any): Promise<boolean>;
}

export interface RegisterProxy extends Proxy {
    Register(...args: any[]): Promise<string>;
}

export interface ConfigProxy extends Proxy {
    Get(name: string): Promise<{t: string, v: string}>;
    Set(name: string, val: string): Promise<void>;
}

export 
function getService( svcName: Services | null = RHSMSvc
                   , opts: DBusOpts = {superuser: 'require'})
                   : Service {
    console.debug(`Calling cockpit.dbus(${JSON.stringify(svcName)}, ${JSON.stringify(opts)})`)
    let svc: Service = cockpit.dbus(svcName, opts)
    return svc
}

export function getProxy( svc: Service
  , iface: string
  , obj: string)
  : Proxy {
console.debug(`Calling svc.proxy(${JSON.stringify(iface)}, ${JSON.stringify(obj)})`)
let cfgPxy = svc.proxy(iface, obj)
return cfgPxy
}

export function getSvcProxy(svc: Service, ifc: string, obj?: string) {
    if (obj == null)
        return svc.proxy(RHSMIfcs[ifc], RHSMObjs[ifc])
    else
        return svc.proxy(ifc, obj)
}
    
/**
 * Helper function to get the dbus service and a proxy
 *
 * If the sName argument is null, then it means that the cockpit dbus interface will talk to a peer.  The DBusOpts 
 * has a setting for bus options, however, in this case, you should pass null to sName.  This is useful for the Register
 * method, since the work is actually being done over a unix socket, rather than a user, system or session bus.
 * 
 * @param {*} sName 
 * @param {*} ifc 
 * @param {*} opts 
 */
export function getDbusIface(sName: Services | null, ifc: RHSMIFTypes, opts: DBusOpts = suser) {
    let service = getService(RHSMSvc, suser)
    let proxy = getSvcProxy(service, 'Config')
    return {
        service: service,
        proxy: proxy
    }
}