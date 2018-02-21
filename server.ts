const express = require('express');
const webpackMiddleware = require('webpack-dev-middleware');
const webpack = require('webpack');
const webpackConfig = require('./webpack.config.js');
const path = require('path');

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
let service = app.listen(4000, () => console.log('Running mercury service at localhost:4000'));