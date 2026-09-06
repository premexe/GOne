import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { User } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricsEnabled: boolean;
  loginWithBiometrics: () => Promise<{ success: boolean; message?: string }>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, phone: string, password: string) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (partial: Partial<User>) => Promise<void>;
}

const BIOMETRIC_LOGIN_KEY = 'lifelink_biometric_login';

async function rememberBiometricLogin(email: string, password: string) {
  // SecureStore's native implementation is not available in Expo web builds.
  // Do not place reusable passwords in browser storage; biometric unlock is a
  // native-only convenience while normal web sessions use the access token.
  if (Platform.OS === 'web') return;
  await SecureStore.setItemAsync(BIOMETRIC_LOGIN_KEY, JSON.stringify({ email, password }));
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  biometricsEnabled: true,

  loginWithBiometrics: async () => {
    set({ isLoading: true });
    try {
      if (Platform.OS === 'web') {
        set({ isLoading: false });
        return {
          success: false,
          message: 'Biometric unlock is available in the LifeLink mobile app. Please sign in with your email and password on web.',
        };
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        set({ isLoading: false });
        return {
          success: false,
          message: 'No fingerprint or face unlock is enrolled on this device. Add one in your phone Settings first.',
        };
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock LifeLink AI+',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        set({ isLoading: false });
        return { success: false, message: 'Biometric verification was cancelled or not recognised.' };
      }

      const savedLogin = await SecureStore.getItemAsync(BIOMETRIC_LOGIN_KEY);
      if (!savedLogin) {
        set({ isLoading: false });
        return { success: false, message: 'Sign in once with email and password before using fingerprint unlock.' };
      }
      const credentials = JSON.parse(savedLogin) as { email?: string; password?: string };
      if (!credentials.email || !credentials.password) {
        await SecureStore.deleteItemAsync(BIOMETRIC_LOGIN_KEY);
        set({ isLoading: false });
        return { success: false, message: 'Your saved fingerprint sign-in needs to be set up again. Sign in with email and password.' };
      }
      const user = await api.login(credentials.email, credentials.password);
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch {
      set({ isLoading: false });
      return { success: false, message: 'Fingerprint unlock could not verify your saved session. Please sign in with email and password.' };
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const user = await api.login(email, password);
      await rememberBiometricLogin(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name, email, phone, password) => {
    set({ isLoading: true });
    try {
      const user = await api.register(name, email, phone, password);
      await rememberBiometricLogin(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  restoreSession: async () => {
    set({ isLoading: true });
    const user = await api.restoreSession();
    set({ user, isAuthenticated: Boolean(user), isLoading: false });
  },

  logout: async () => {
    await api.logout();
    // Keep the encrypted biometric login record so the user can unlock again
    // with their device fingerprint and receive a fresh backend session.
    set({ user: null, isAuthenticated: false });
  },

  updateUser: async (partial) => {
    const updated = await api.updateMe(partial);
    set({ user: updated });
  },
}));
