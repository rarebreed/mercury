const { JSDOM } = require('jsdom');

// const jsdom = new JSDOM('<!doctype html><html><body></body></html>');

const jsdom = new JSDOM(`
<html lang="en">
    <body>
        <noscript>You need to enable JavaScript to run this app.</noscript>
        <div id="app"></div>
        <script src="../assets/cockpit.js"></script>
    </body>
</html>
`)

const { window } = jsdom;

function copyProps(src, target) {
  const props = Object.getOwnPropertyNames(src)
    .filter(prop => typeof target[prop] === 'undefined')
    .reduce((result, prop) => ({
      ...result,
      [prop]: Object.getOwnPropertyDescriptor(src, prop),
    }), {});
  Object.defineProperties(target, props);
}

window.Object = Object;
window.Math = Math;

global.window = window;
global.document = window.document;
// Hack to load cockpit.js into jsdom
global.cockpit = require('../assets/cockpit');
global.navigator = {
  userAgent: 'node.js',
};
copyProps(window, global);