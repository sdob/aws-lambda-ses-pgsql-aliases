const path = require('path');
const NodeTargetPlugin = require('webpack/lib/node/NodeTargetPlugin');
const ZipPlugin = require('zip-webpack-plugin');

module.exports = {
  target: 'node',
  entry: [
    path.resolve(__dirname, 'src/index.js'),
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs',
  },
  plugins: [
    new NodeTargetPlugin(),
    new ZipPlugin({
      path: path.join(__dirname, 'dist'),
      filename: 'bundle.zip',
    }),
  ],
  resolve: {
    alias: {
      'pg-native': path.join(__dirname, 'alias/pg-native.js'),
      'pg-pass$': path.join(__dirname, 'alias/pg-pass.js'),
    },
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
      query: {
        presets: [
          'stage-3',
          ['env', {
            targets: {
              node: '6.10',
            },
          }],
        ],
      },
    }],
  },
};
