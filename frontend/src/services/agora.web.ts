type EmergencyAgoraOptions = {
  appId: string;
  token: string;
  channelName: string;
  uid: number;
};

export function createEmergencyAgoraEngine(_options: EmergencyAgoraOptions): never {
  throw new Error('Secure Agora calls are only available on iOS and Android.');
}