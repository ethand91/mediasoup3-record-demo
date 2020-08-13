const path = require('path');

module.exports = {
  entry: './src/index.js',
  mode: process.env.NODE_ENV || 'development',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'var',
    library: 'Lib'
  },
  devServer: {
  	contentBase: path.join(__dirname, 'dist')
  }
};
