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

let pollingTimer: any = null;

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

    const request = await api.createEmergencyRequest(symptoms, 19.076, 72.877, notesText);
    set({ activeRequest: request, isLocating: false });

    // Start 3-second live polling loop for real-time hospital acceptance & ambulance dispatch
    if (pollingTimer) clearInterval(pollingTimer);
    pollingTimer = setInterval(async () => {
      if (!get().isEmergencyActive) {
        clearInterval(pollingTimer);
        pollingTimer = null;
        return;
      }
      await get().refreshActiveEmergency();
    }, 3000);

    return request;
  },

  refreshActiveEmergency: async () => {
    try {
      const activeRequest = await api.getActiveEmergencyRequest();
      if (activeRequest) {
        set({ activeRequest, isEmergencyActive: activeRequest.status !== 'closed' });
      } else {
        // If server says no active SOS, keep local state unless explicitly ended
      }
    } catch (error) {
      console.warn('Failed to refresh SOS status:', error);
    }
  },

  endEmergency: async () => {
    if (pollingTimer) {
      clearInterval(pollingTimer);
      pollingTimer = null;
    }
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
