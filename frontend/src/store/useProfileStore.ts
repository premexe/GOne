import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmergencyProfile, ReadinessScore } from '../types';
import { api } from '../services/api';

const WALLET_CACHE_KEY = 'lifelink_emergency_wallet_v1';

interface ProfileState {
  profile: EmergencyProfile | null;
  readinessScore: ReadinessScore | null;
  isLoading: boolean;

  fetchProfileAndReadiness: () => Promise<void>;
  updateProfile: (partial: Partial<EmergencyProfile>) => Promise<void>;
  addEmergencyContact: (name: string, relation: string, phone: string) => Promise<void>;
  removeEmergencyContact: (id: string) => Promise<void>;
  loadCachedWallet: () => Promise<EmergencyProfile | null>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  readinessScore: null,
  isLoading: false,

  fetchProfileAndReadiness: async () => {
    set({ isLoading: true });
    try {
      const profile = await api.getEmergencyProfile();
      const readinessScore = await api.getReadinessScore();

      // Cache for offline Emergency Wallet
      await AsyncStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(profile));

      set({ profile, readinessScore, isLoading: false });
    } catch (e) {
      // Fallback offline cache
      const cached = await get().loadCachedWallet();
      set({ profile: cached, isLoading: false });
    }
  },

  updateProfile: async (partial) => {
    const updated = await api.updateEmergencyProfile(partial);
    const updatedReadiness = await api.getReadinessScore();

    await AsyncStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(updated));
    set({ profile: updated, readinessScore: updatedReadiness });
  },

  addEmergencyContact: async (name, relation, phone) => {
    const current = get().profile;
    if (!current) return;
    const newContact = await api.createEmergencyContact(name, relation, phone);
    const updatedContacts = [...current.emergencyContacts, newContact];
    const updated = { ...current, emergencyContacts: updatedContacts };
    await AsyncStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(updated));
    set({ profile: updated });
  },

  removeEmergencyContact: async (id) => {
    const current = get().profile;
    if (!current) return;
    await api.deleteEmergencyContact(id);
    const updated = { ...current, emergencyContacts: current.emergencyContacts.filter((c) => c.id !== id) };
    await AsyncStorage.setItem(WALLET_CACHE_KEY, JSON.stringify(updated));
    set({ profile: updated });
  },

  loadCachedWallet: async () => {
    try {
      const data = await AsyncStorage.getItem(WALLET_CACHE_KEY);
      if (data) {
        return JSON.parse(data) as EmergencyProfile;
      }
    } catch (e) {
      console.warn('Failed to read offline wallet cache', e);
    }
    return null;
  },
}));
