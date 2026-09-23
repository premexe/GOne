import Constants from 'expo-constants';
import { Platform } from 'react-native';

type EmergencyAgoraOptions = {
  appId: string;
  token: string;
  channelName: string;
  uid: number;
};

export function createEmergencyAgoraEngine({ appId, token, channelName, uid }: EmergencyAgoraOptions) {
  if (Platform.OS === 'web') {
    throw new Error('Secure Agora calls are only available on iOS and Android.');
  }

  if (Constants.appOwnership === 'expo') {
    throw new Error(
      'Agora voice calls require a custom native development build. Expo Go is not supported. Please run the app via an Expo dev client or a native build.',
    );
  }

  void appId;
  void token;
  void channelName;
  void uid;

  throw new Error('Agora native engine is not initialized. Please rebuild the app with the native Agora module installed.');
}