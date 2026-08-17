import { create } from 'zustand';
import { Hospital } from '../types';
import { api } from '../services/api';

interface HospitalState {
  hospitals: Hospital[];
  selectedSpecialty: string | null;
  searchQuery: string;
  viewMode: 'list' | 'map';
  isLoading: boolean;

  fetchHospitals: (lat?: number, lng?: number) => Promise<void>;
  setSelectedSpecialty: (specialty: string | null) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'list' | 'map') => void;
}

export const useHospitalStore = create<HospitalState>((set, get) => ({
  hospitals: [],
  selectedSpecialty: null,
  searchQuery: '',
  viewMode: 'list',
  isLoading: false,

  fetchHospitals: async (lat = 19.700, lng = 72.770) => {
    set({ isLoading: true });
    try {
      const data = await api.getNearbyHospitals(lat, lng, get().selectedSpecialty || undefined);
      set({ hospitals: data, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  setSelectedSpecialty: (specialty) => {
    set({ selectedSpecialty: specialty });
    get().fetchHospitals();
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
