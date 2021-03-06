const express = require('express');
const webpackMiddleware = require('webpack-dev-middleware');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');
const path = require('path');
const WS = require('ws');
const http = require('http');
const url = require('url');

const makeapp = () => {
    // tslint:disable-next-line:no-shadowed-variable
    const app = express();
    // app.use(webpackMiddleware(webpack(webpackConfig)));
    const indexPath = path.join(__dirname, 'app.html');
    console.log(`indexPath = ${indexPath}`);

    let dpath = path.join(__dirname, 'dist');
    const publicPath = express.static(dpath);
    console.log(`publicPath = ${dpath}`);

    app.use('/dist', publicPath);
    app.get('/', (_, res) => { res.sendFile(indexPath); });

    return app;
};

const app = makeapp();
const server = http.createServer(app);
const wss = new WS.Server({ path: '/ws', server });

wss.on('connection', (ws, req) => {
    const location = url.parse(req.url, true);
    // You might use location.query.access_token to authenticate or share sessions
    // or req.headers.cookie (see http://stackoverflow.com/a/16395220/151312)
  
    ws.on('message', (message) => {
      console.log('received: %s', message);
    }); 
});

let service = server.listen(4001, () => console.log('Running mercury service at localhost:4001'));