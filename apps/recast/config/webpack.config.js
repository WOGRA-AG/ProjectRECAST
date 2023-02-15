const jsonImporter = require('node-sass-json-importer');

module.exports = {
  module: {
    rules: [
      {
        test: /\.scss$|\.sass$/,
        use: [
          {
            loader: require.resolve('sass-loader'),
            options: {
              implementation: require('sass'),
              sassOptions: {
                // bootstrap-sass requires a minimum precision of 8
                precision: 8,
                importer: jsonImporter({ convertCase: true }),
                outputStyle: 'expanded',
              },
            },
          },
        ],
      },
    ],
  },
};
