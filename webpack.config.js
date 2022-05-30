const path = require('path');
const webpack = require('webpack');

module.exports = {
    target: 'web',
    mode: 'development',
    //mode: 'production',
    entry: [
        './src/javascripts/templateConfigs.js',
        './src/javascripts/modifierTypes.js',
        './src/javascripts/valueSlider.js',
        './src/javascripts/editorUI.js',
        './src/javascripts/editor3d.js',
        './src/javascripts/editor2d.js'
    ],
    output: {
        filename: 'canvas.js',
        path: path.resolve(__dirname, 'public/javascripts'),
    },
    plugins: [
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser',
        }),
    ],
    resolve: {
        extensions: [ '.ts', '.js' ],
        fallback: {
            "buffer": require.resolve("buffer"),
        }
    },
};