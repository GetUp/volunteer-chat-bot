var nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: [
    'babel-polyfill',
    './bot.js',
    './messenger.js'
  ],
  target: 'node',
  externals: [nodeExternals()],
  module: {
    loaders: [{
      test: /\.js$/,
      loaders: ['babel'],
      include: __dirname,
      exclude: /node_modules/,
    }]
  }
};
