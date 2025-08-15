const merge = require('webpack-merge');
const webpack = require('webpack');
const path = require('./paths');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  devtool: 'eval-source-map',

  devServer: {
    contentBase: path.appDist,
    historyApiFallback: true,
    hot: true,
    // test map proxy
    // proxy: {
    //   '/amap': {
    //     target: 'https://webapi.amap.com/',
    //     changeOrigin: true,
    //     pathRewrite: {
    //       '^/amap': '',
    //     },
    //   },
    // },
  },

  mode: 'development',

  plugins: [
    new webpack.HotModuleReplacementPlugin(), // 热替换插件
  ],
});
