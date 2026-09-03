import { create } from 'zustand';
import { EmergencyRequest } from '../types';
import { api } from '../services/api';

interface EmergencyState {
  isEmergencyActive: boolean;
  activeRequest: EmergencyRequest | null;
  selectedSymptoms: string[];
  notes: string;
  isLocating: boolean;

  toggleSymptom: (symptom: string) => void;
  clearSymptoms: () => void;
  setNotes: (text: string) => void;
  triggerSOS: (symptomsList?: string[], userNotes?: string) => Promise<EmergencyRequest>;
  refreshActiveEmergency: () => Promise<void>;
  endEmergency: () => Promise<void>;
}

export const useEmergencyStore = create<EmergencyState>((set, get) => ({
  isEmergencyActive: false,
  activeRequest: null,
  selectedSymptoms: [],
  notes: '',
  isLocating: false,

  toggleSymptom: (symptom) => {
    const current = get().selectedSymptoms;
    if (current.includes(symptom)) {
      set({ selectedSymptoms: current.filter((s) => s !== symptom) });
    } else {
      set({ selectedSymptoms: [...current, symptom] });
    }
  },

  clearSymptoms: () => set({ selectedSymptoms: [], notes: '' }),
  setNotes: (notes) => set({ notes }),

  triggerSOS: async (symptomsList, userNotes) => {
    set({ isEmergencyActive: true, isLocating: true });
    const symptoms = symptomsList || get().selectedSymptoms;
    const notesText = userNotes || get().notes;

    const request = await api.createEmergencyRequest(symptoms, 19.700, 72.770, notesText);
    set({ activeRequest: request, isLocating: false });

    return request;
  },

  refreshActiveEmergency: async () => {
    try {
      const activeRequest = await api.getActiveEmergencyRequest();
      set({ activeRequest, isEmergencyActive: Boolean(activeRequest) });
    } catch (error) {
      console.warn('Failed to refresh SOS status:', error);
    }
  },

  endEmergency: async () => {
    const activeRequest = get().activeRequest;
    if (activeRequest?.id) {
      await api.resolveEmergencyRequest(activeRequest.id);
    }
    set({
      isEmergencyActive: false,
      activeRequest: null,
      selectedSymptoms: [],
      notes: '',
    });
  },
}));
