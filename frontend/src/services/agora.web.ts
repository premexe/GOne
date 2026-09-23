export type EmergencyAgoraOptions = {
  appId: string;
  token: string;
  channelName: string;
  uid: number;
};

export type EmergencyAgoraEngineHandle = {
  isNative: boolean;
  channelName: string;
  uid: number;
  leaveChannel: () => void | Promise<void>;
  release: () => void | Promise<void>;
};

export async function createEmergencyAgoraEngine(
  options: EmergencyAgoraOptions
): Promise<EmergencyAgoraEngineHandle> {
  console.log('[Agora] Web platform active with local fallback audio.');
  return {
    isNative: false,
    channelName: options.channelName,
    uid: options.uid,
    leaveChannel: () => {},
    release: () => {},
  };
}