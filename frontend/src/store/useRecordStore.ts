import { create } from 'zustand';
import { MedicalDocument } from '../types';
import { api } from '../services/api';
import { useProfileStore } from './useProfileStore';

interface RecordState {
  documents: MedicalDocument[];
  isUploading: boolean;
  isLoading: boolean;

  fetchDocuments: () => Promise<void>;
  uploadDocument: (
    title: string,
    file: { uri: string; name: string; mimeType?: string | null },
    docType: MedicalDocument['docType']
  ) => Promise<MedicalDocument>;
}

export const useRecordStore = create<RecordState>((set, get) => ({
  documents: [],
  isUploading: false,
  isLoading: false,

  fetchDocuments: async () => {
    set({ isLoading: true });
    try {
      const docs = await api.getDocuments();
      set({ documents: docs, isLoading: false });
    } catch (e) {
      set({ isLoading: false });
    }
  },

  uploadDocument: async (title, file, docType) => {
    set({ isUploading: true });
    try {
      const newDoc = await api.uploadDocument(title, file, docType);
      const docs = await api.getDocuments();
      set({ documents: docs, isUploading: false });

      // Refresh readiness score
      useProfileStore.getState().fetchProfileAndReadiness();
      return newDoc;
    } catch (e) {
      set({ isUploading: false });
      throw e;
    }
  },
}));
