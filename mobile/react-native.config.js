module.exports = {
  dependencies: {
    'react-native-ssh-sftp': {
      platforms: {
        android: null, // Desactiva la compilación nativa de este módulo obsoleto (2017) que rompe Gradle 9
      },
    },
  },
};
