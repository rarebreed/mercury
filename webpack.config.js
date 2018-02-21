const path = require('path');
// const CleanWebpackPlugin = require('clean-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

let distPath = path.resolve(__dirname, 'dist');
console.log(distPath);

module.exports = {
    entry: "./app/app.tsx",
    devtool: "inline-source-map",
    output: {
        filename: "bundle.js",
        path: distPath,
        publicPath: "dist/"
    },
    resolve: {
        // Add '.ts' and '.tsx' as a resolvable extension.
        extensions: [".jsx", ".ts", ".tsx", ".js"],
    },
    module: {
        rules: [
            // all files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'
            { 
                test: /\.tsx?$/, 
                use: "ts-loader" 
            },
            { 
                enforce: "pre", 
                test: /\.js$/, 
                use: "source-map-loader" 
            },
            { 
                test: /\.css$/, 
                use: ExtractTextPlugin.extract({fallback: "style-loader", use: "css-loader"})
            },
            { 
                // Look for any image files, and if they are more than 20k, load in separate dir 
                test: /\.({jpe?g}|png|gif|svg)$/, 
                use: [
                  {
                      loader: 'url-loader',
                      options: { limit: 20000 }
                  },
                  'image-webpack-loader'
                ]
            }
        ]
    },
    plugins: [
        // new CleanWebpackPlugin(["dist"]),
        new ExtractTextPlugin("styles.css")
    ]
}