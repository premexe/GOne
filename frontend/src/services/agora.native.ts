import { Platform, PermissionsAndroid } from 'react-native';

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

function getAgoraModule(): any | null {
  try {
    // Dynamic import prevents runtime crashes if native C++ bindings are not compiled into the current APK build
    const agora = require('react-native-agora');
    if (agora && typeof agora.createAgoraRtcEngine === 'function') {
      return agora;
    }
    return null;
  } catch (error) {
    console.warn('[Agora] react-native-agora native binary is not linked in this build:', error);
    return null;
  }
}

export async function createEmergencyAgoraEngine({
  appId,
  token,
  channelName,
  uid,
}: EmergencyAgoraOptions): Promise<EmergencyAgoraEngineHandle> {
  if (Platform.OS === 'web') {
    console.warn('[Agora] Web platform does not support native Agora RTC.');
    return {
      isNative: false,
      channelName,
      uid,
      leaveChannel: () => {},
      release: () => {},
    };
  }

  // Request Android Audio Recording permission
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'LifeLink AI+ needs microphone access for the emergency voice assistant call.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('[Agora] Microphone permission not granted by user.');
      }
    } catch (err) {
      console.warn('[Agora] Error requesting RECORD_AUDIO permission:', err);
    }
  }

  const agora = getAgoraModule();

  if (!agora) {
    console.log(
      '[Agora] Running in AI Voice Assistant local fallback mode (Speech Recognition & TTS active).'
    );
    return {
      isNative: false,
      channelName,
      uid,
      leaveChannel: () => {},
      release: () => {},
    };
  }

  try {
    const engine = agora.createAgoraRtcEngine();

    // Initialize RTC engine
    engine.initialize({
      appId,
      channelProfile: agora.ChannelProfileType?.ChannelProfileCommunication ?? 0,
    });

    // Enable audio
    engine.enableAudio();
    if (typeof engine.setAudioProfile === 'function') {
      engine.setAudioProfile(
        agora.AudioProfileType?.AudioProfileDefault ?? 0,
        agora.AudioScenarioType?.AudioScenarioDefault ?? 0
      );
    }

    // Register event listeners
    if (typeof engine.registerEventHandler === 'function') {
      engine.registerEventHandler({
        onJoinChannelSuccess: (connection: any, elapsed: number) => {
          console.log(
            `[Agora] Joined channel ${connection?.channelId || channelName} with uid ${connection?.localUid || uid} in ${elapsed}ms`
          );
        },
        onUserJoined: (connection: any, remoteUid: number, elapsed: number) => {
          console.log(`[Agora] Remote user ${remoteUid} joined channel in ${elapsed}ms`);
        },
        onUserOffline: (connection: any, remoteUid: number, reason: number) => {
          console.log(`[Agora] Remote user ${remoteUid} left channel, reason: ${reason}`);
        },
        onError: (err: number, msg: string) => {
          console.warn(`[Agora] RTC Engine error code ${err}: ${msg}`);
        },
      });
    }

    // Join channel
    engine.joinChannel(token, channelName, uid, {
      clientRoleType: agora.ClientRoleType?.ClientRoleBroadcaster ?? 1,
      autoSubscribeAudio: true,
      publishMicrophoneTrack: true,
    });

    return {
      isNative: true,
      channelName,
      uid,
      leaveChannel: () => {
        try {
          engine.leaveChannel();
        } catch (e) {
          console.warn('[Agora] Error leaving channel:', e);
        }
      },
      release: () => {
        try {
          engine.leaveChannel();
          engine.release();
        } catch (e) {
          console.warn('[Agora] Error releasing engine:', e);
        }
      },
    };
  } catch (error) {
    console.warn('[Agora] Failed to start native Agora engine, falling back to local voice mode:', error);
    return {
      isNative: false,
      channelName,
      uid,
      leaveChannel: () => {},
      release: () => {},
    };
  }
}