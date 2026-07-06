module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Reanimated v4 delegates its worklet transform to react-native-worklets.
      // This plugin must be listed LAST. babel-preset-expo already handles
      // class fields correctly for on-device Hermes.
      'react-native-worklets/plugin',
    ],
  };
};
