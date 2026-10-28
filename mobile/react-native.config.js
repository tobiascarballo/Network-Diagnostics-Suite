module.exports = {
  dependencies: {
    'react-native-keychain': {
      platforms: {
        android: {
          // Alinea el nombre de librería de autolinking con el codegenConfig de package.json ("RNKeychainSpec")
          libraryName: 'RNKeychainSpec',
        },
      },
    },
  },
};
