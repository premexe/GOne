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

    // Dispatch immediately. A fresh GPS scan can take many seconds and must
    // never delay notifying the hospital. Use a recent position when present.
    let userLat = 19.697;
    let userLng = 72.766;
    try {
      const Location = await import('expo-location');
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const lastKnown = await Promise.race([
          Location.getLastKnownPositionAsync({ maxAge: 120000, requiredAccuracy: 1000 }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 750)),
        ]);
        if (lastKnown) {
          userLat = lastKnown.coords.latitude;
          userLng = lastKnown.coords.longitude;
        }
      }
    } catch (_gpsErr) { /* use Palghar center fallback */ }
    let request: EmergencyRequest;
    try {
      request = await api.createEmergencyRequest(symptoms, userLat, userLng, notesText);
    } catch (error) {
      set({ isEmergencyActive: false, isLocating: false, activeRequest: null });
      throw error;
    }
    set({ activeRequest: request, isLocating: false });

    // Obtain an exact current fix after dispatch. This keeps the SOS fast while
    // replacing any cached/fallback coordinates on the admin triage screen.
    void (async () => {
      try {
        const Location = await import('expo-location');
        let { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          ({ status } = await Location.requestForegroundPermissionsAsync());
        }
        if (status !== 'granted') return;

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const updated = await api.updateEmergencyLocation(
          request.id,
          position.coords.latitude,
          position.coords.longitude,
        );
        if (get().activeRequest?.id === request.id) {
          set({ activeRequest: updated });
        }
      } catch (locationError) {
        console.warn('Could not update SOS with precise location:', locationError);
      }
    })();

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
        // Server says no active SOS — clear stale local state & stop polling
        if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
        set({ isEmergencyActive: false, activeRequest: null, selectedSymptoms: [], notes: '' });
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
    try {
      if (activeRequest?.id) {
        await api.resolveEmergencyRequest(activeRequest.id);
      }
    } catch (err: any) {
      console.log('Safe end notice:', err?.message || err);
    } finally {
      set({
        isEmergencyActive: false,
        activeRequest: null,
        selectedSymptoms: [],
        notes: '',
      });
    }
  },
}));
