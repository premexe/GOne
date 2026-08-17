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
  advanceStatus: (nextStatus: EmergencyRequest['status']) => void;
  endEmergency: () => void;
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

    // Auto-advance simulated emergency steps for live real-time feel
    setTimeout(() => {
      get().advanceStatus('matching');
    }, 1800);

    setTimeout(() => {
      get().advanceStatus('connected');
    }, 3800);

    return request;
  },

  advanceStatus: (nextStatus) => {
    const current = get().activeRequest;
    if (!current) return;
    set({
      activeRequest: {
        ...current,
        status: nextStatus,
      },
    });
  },

  endEmergency: () => {
    set({
      isEmergencyActive: false,
      activeRequest: null,
      selectedSymptoms: [],
      notes: '',
    });
  },
}));
