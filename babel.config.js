module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Hermes (bundled with RN 0.81) doesn't parse private class fields
      // (e.g. `#x`) — Skia 2.x uses them. Transpile them out here.
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      ['@babel/plugin-transform-private-property-in-object', { loose: true }],
      // Reanimated v4 delegates its worklet transform to
      // react-native-worklets. This plugin must be listed LAST.
      'react-native-worklets/plugin',
    ],
  };
};
