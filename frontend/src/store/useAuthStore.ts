import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import { User } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  biometricsEnabled: boolean;
  loginWithBiometrics: () => Promise<boolean>;
  loginAsGuest: () => Promise<void>;
  logout: () => void;
  updateUser: (partial: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  biometricsEnabled: true,

  loginWithBiometrics: async () => {
    set({ isLoading: true });
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        set({ isLoading: false });
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock LifeLink AI+',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        set({ isLoading: false });
        return false;
      }

      // The current app is a demo workspace, so local authentication unlocks
      // its local demo profile. It deliberately does not send empty login
      // credentials to the API.
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  loginAsGuest: async () => {
    set({ isLoading: true });
    try {
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  updateUser: async (partial) => {
    const updated = await api.updateMe(partial);
    set({ user: updated });
  },
}));
