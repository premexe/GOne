import { create } from 'zustand';
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
      const user = await api.login();
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (e) {
      set({ isLoading: false });
      return false;
    }
  },

  loginAsGuest: async () => {
    set({ isLoading: true });
    const user = await api.login('guest@lifelink.ai');
    set({ user, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  updateUser: async (partial) => {
    const updated = await api.updateMe(partial);
    set({ user: updated });
  },
}));
