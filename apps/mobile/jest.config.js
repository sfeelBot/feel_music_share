module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-app-auth|react-native-base64|react-native-screens|react-native-safe-area-context)/)',
  ],
};
