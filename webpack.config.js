const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

const isProduction = process.env.NODE_ENV === 'production';

const CURRENT_WORKING_DIR = process.cwd();

const PATHS = {
  app: path.resolve(CURRENT_WORKING_DIR),
  assets: path.resolve(CURRENT_WORKING_DIR, 'public', 'assets'),
  compiled: path.resolve(CURRENT_WORKING_DIR, 'compiled'),
  public: '/assets/',
  modules: path.resolve(CURRENT_WORKING_DIR, 'node_modules'),
};

const node = { __dirname: true, __filename: true };

const externals = fs
  .readdirSync('node_modules')
  .filter(x => ['.bin'].indexOf(x) === -1)
  .reduce((acc, cur) => Object.assign(acc, { [cur]: `commonjs ${cur}` }), {});

const resolve = {
  modules: [PATHS.app, PATHS.modules],
  extensions: ['.js', '.jsx', '.css'],
};

const bannerOptions = {
  raw: true,
  banner: 'require("source-map-support").install();',
};
const compileTimeConstantForMinification = {
  __PRODUCTION__: JSON.stringify(isProduction),
};

const developmentPlugins = [
  new webpack.EnvironmentPlugin(['NODE_ENV']),
  new webpack.DefinePlugin(compileTimeConstantForMinification),
  new webpack.BannerPlugin(bannerOptions),
];

const productionPlugins = [
  ...developmentPlugins,
  new webpack.optimize.UglifyJsPlugin({ compress: { warnings: false } }),
];

const plugins = isProduction ? productionPlugins : developmentPlugins;

const config = {
  devtool: 'sourcemap',
  context: PATHS.app,
  entry: { server: 'server/server.js' },
  target: 'node',
  node,
  externals,
  output: {
    path: PATHS.compiled,
    filename: isProduction ? '[name].js' : '[name].dev.js',
    publicPath: PATHS.public,
    libraryTarget: 'commonjs2',
  },
  module: {
    rules: [
      {
        test: /\.js$|\.jsx$/,
        loader: 'babel-loader',
        options: {
          presets: ['es2015', 'stage-0'],
        },
        exclude: PATHS.modules,
      },
    ],
  },
  resolve,
  plugins,
};

module.exports = config;
