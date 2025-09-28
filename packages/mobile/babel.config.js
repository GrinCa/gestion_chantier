module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Support pour les imports du workspace
      ['module-resolver', {
        alias: {
          '@gestion-chantier/core': '../core/dist/index.js'
        }
      }]
    ],
  };
};