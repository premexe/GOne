import {
  User,
  EmergencyProfile,
  MedicalDocument,
  Hospital,
  EmergencyRequest,
  ReadinessScore,
  SafetyTip,
} from '../types';
import {
  INITIAL_USER,
  INITIAL_EMERGENCY_PROFILE,
  SAMPLE_HOSPITALS,
  INITIAL_READINESS,
  SAMPLE_DOCUMENTS,
  SAFETY_TIPS,
} from './mockData';
import { rankHospitalsForEmergency } from './recommendationEngine';
import { calculateReadinessScore, classifySymptomUrgency, summarizeMedicalDocument } from './aiService';
import { getToken, request, setToken } from './http';

type BackendUser = {
  user_id: number;
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string | null;
  blood_group: string | null;
  profile_photo: string | null;
};

function toUser(user: BackendUser): User {
  return {
    id: String(user.user_id),
    name: user.full_name,
    email: user.email,
    phone: user.phone_number,
    dob: user.date_of_birth ?? '',
    bloodGroup: user.blood_group ?? '',
    avatarUrl: user.profile_photo ?? undefined,
  };
}

function getUserIdFromToken(token: string): number {
  const payload = token.split('.')[1];
  if (!payload) throw new Error('The server returned an invalid access token.');

  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
  const parsedUserId = Number(JSON.parse(json).sub);

  if (!Number.isInteger(parsedUserId)) {
    throw new Error('The access token does not contain a valid user ID.');
  }

  return parsedUserId;
}

// In-memory persistent state for API mock
let currentUser: User = { ...INITIAL_USER };
let currentProfile: EmergencyProfile = { ...INITIAL_EMERGENCY_PROFILE };
let currentDocuments: MedicalDocument[] = [...SAMPLE_DOCUMENTS];
let currentHospitals: Hospital[] = [...SAMPLE_HOSPITALS];
let currentEmergencyRequests: EmergencyRequest[] = [];

export const api = {
  // Auth
  async login(email: string, password: string): Promise<User> {
    try {
      const result = await request('/users/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setToken(result.access_token);

      const userId = getUserIdFromToken(result.access_token);
      const backendUser = await request(`/users/${userId}`) as BackendUser;
      currentUser = toUser(backendUser);
      return currentUser;
    } catch (err) {
      console.warn('Backend login failed, using guest mode fallback:', err);
      return currentUser;
    }
  },

  async register(name: string, email: string, phone: string, password: string): Promise<User> {
    try {
      const newUser = await request('/users/', {
        method: 'POST',
        body: JSON.stringify({
          full_name: name,
          email,
          phone_number: phone,
          password,
        }),
      }) as BackendUser;
      currentUser = toUser(newUser);
      return currentUser;
    } catch (err) {
      console.warn('Backend register failed, using local profile fallback:', err);
      currentUser = { ...currentUser, name, email, phone };
      return currentUser;
    }
  },

  async getMe(): Promise<User> {
    try {
      if (getToken() && currentUser.id !== 'usr-1') {
        const userId = Number(currentUser.id);
        if (Number.isInteger(userId)) {
          const backendUser = await request(`/users/${userId}`) as BackendUser;
          currentUser = toUser(backendUser);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch me from backend:', err);
    }
    return currentUser;
  },

  async updateMe(partial: Partial<User>): Promise<User> {
    currentUser = { ...currentUser, ...partial };
    try {
      const userId = Number(currentUser.id);
      if (Number.isInteger(userId) && getToken()) {
        await request(`/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({
            full_name: currentUser.name,
            phone_number: currentUser.phone,
            blood_group: currentUser.bloodGroup,
            date_of_birth: currentUser.dob,
          }),
        });
      }
    } catch (err) {
      console.warn('Failed to update user on backend:', err);
    }
    return currentUser;
  },

  // Emergency Profile & Wallet
  async getEmergencyProfile(): Promise<EmergencyProfile> {
    try {
      const userId = Number(currentUser.id);
      if (Number.isInteger(userId) && getToken()) {
        const wallet = await request(`/wallet/${userId}`);
        const contacts = await request('/emergency-contacts/');
        currentProfile = {
          ...currentProfile,
          bloodGroup: wallet.blood_group || currentUser.bloodGroup || 'O+',
          allergies: wallet.allergies ? wallet.allergies.split(',').map((s: string) => s.trim()) : currentProfile.allergies,
          medications: wallet.medications ? wallet.medications.split(',').map((s: string) => s.trim()) : currentProfile.medications,
          conditions: wallet.chronic_conditions ? wallet.chronic_conditions.split(',').map((s: string) => s.trim()) : currentProfile.conditions,
          organDonor: true,
          emergencyNotes: wallet.emergency_notes || currentProfile.emergencyNotes,
          emergencyContacts: contacts.map((c: any) => ({
            id: String(c.contact_id),
            name: c.full_name,
            relation: c.relationship,
            phone: c.phone_number,
          })),
        };
      }
    } catch (err) {
      console.warn('Failed to fetch emergency profile from backend:', err);
    }
    return currentProfile;
  },

  async updateEmergencyProfile(partial: Partial<EmergencyProfile>): Promise<EmergencyProfile> {
    currentProfile = {
      ...currentProfile,
      ...partial,
    };
    try {
      const userId = Number(currentUser.id);
      if (Number.isInteger(userId) && getToken()) {
        await request(`/wallet/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({
            blood_group: currentProfile.bloodGroup,
            allergies: currentProfile.allergies.join(', '),
            medications: currentProfile.medications.join(', '),
            chronic_conditions: currentProfile.conditions.join(', '),
            emergency_notes: currentProfile.emergencyNotes,
          }),
        });
      }
    } catch (err) {
      console.warn('Failed to update wallet on backend:', err);
    }
    return currentProfile;
  },

  // Documents
  async getDocuments(): Promise<MedicalDocument[]> {
    try {
      const userId = Number(currentUser.id);
      if (Number.isInteger(userId) && getToken()) {
        const backendDocs = await request(`/medical-records/${userId}`);
        if (Array.isArray(backendDocs) && backendDocs.length > 0) {
          currentDocuments = backendDocs.map((d: any) => ({
            id: String(d.record_id),
            userId: String(d.user_id),
            title: d.title,
            fileUrl: d.file_path || '',
            docType: (d.record_type as any) || 'report',
            uploadedAt: d.created_at || new Date().toISOString(),
            aiSummary: d.ocr_text ? {
              overview: d.ocr_text.slice(0, 280),
              allergies: [],
              medications: [],
              conditions: [],
              keyFindings: [d.ocr_text.slice(0, 100)],
              confidence: 0.5,
            } : undefined,
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to fetch documents from backend:', err);
    }
    return currentDocuments;
  },

  async uploadDocument(
    title: string,
    fileUrl: string,
    docType: 'report' | 'prescription' | 'scan' | 'other'
  ): Promise<MedicalDocument> {
    const summary = await summarizeMedicalDocument(title, docType);
    let newDoc: MedicalDocument = {
      id: `doc-${Date.now()}`,
      userId: currentUser.id,
      title,
      fileUrl,
      docType,
      uploadedAt: new Date().toISOString(),
      aiSummary: summary,
    };

    try {
      const userId = Number(currentUser.id);
      if (Number.isInteger(userId) && getToken()) {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('record_type', docType);
        
        // Mock blob for web/expo file upload if string path
        const fileBlob = new Blob(['sample file content'], { type: 'text/plain' });
        formData.append('file', fileBlob, `${title.replace(/\s+/g, '_')}.txt`);

        const created = await request('/medical-records/upload', {
          method: 'POST',
          body: formData,
        });

        newDoc.id = String(created.record_id);
        
        // Trigger OCR in background
        request(`/medical-records/record/${created.record_id}/process-ocr`, {
          method: 'POST',
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('Backend upload failed, saved locally:', err);
    }

    currentDocuments = [newDoc, ...currentDocuments];
    return newDoc;
  },

  async getDocumentSummary(id: string): Promise<MedicalDocument['aiSummary']> {
    const doc = currentDocuments.find((d) => d.id === id);
    if (!doc) throw new Error('Document not found');
    if (!doc.aiSummary) {
      doc.aiSummary = await summarizeMedicalDocument(doc.title, doc.docType);
    }
    return doc.aiSummary;
  },

  // Hospitals
  async getNearbyHospitals(
    lat: number = 19.700,
    lng: number = 72.770,
    specialty?: string
  ): Promise<Hospital[]> {
    return rankHospitalsForEmergency(currentHospitals, lat, lng, specialty);
  },

  async getHospitalById(id: string): Promise<Hospital | undefined> {
    const ranked = rankHospitalsForEmergency(currentHospitals, 19.700, 72.770);
    return ranked.find((h) => h.id === id);
  },

  // Emergency Requests (SOS)
  async createEmergencyRequest(
    symptoms: string[] = [],
    userLat: number = 19.700,
    userLng: number = 72.770,
    notes?: string
  ): Promise<EmergencyRequest> {
    const triage = classifySymptomUrgency(symptoms);
    const rankedHospitals = rankHospitalsForEmergency(
      currentHospitals,
      userLat,
      userLng,
      triage.primarySpecialty,
      triage.urgencyTier
    );
    const topMatch = rankedHospitals[0];

    let newRequest: EmergencyRequest = {
      id: `sos-${Date.now()}`,
      userId: currentUser.id,
      hospitalId: topMatch ? topMatch.id : null,
      status: 'locating',
      symptoms,
      urgencyTier: triage.urgencyTier,
      createdAt: new Date().toISOString(),
      notes,
      matchedHospital: topMatch,
      responderEtaMinutes: topMatch?.etaMinutes || 6,
    };

    try {
      if (getToken()) {
        const sosResponse = await request('/emergency/trigger', {
          method: 'POST',
          body: JSON.stringify({
            latitude: userLat,
            longitude: userLng,
            symptoms,
            notes,
          }),
        });
        if (sosResponse && sosResponse.sos) {
          newRequest.id = String(sosResponse.sos.sos_id);
        }
      }
    } catch (err) {
      console.warn('Backend SOS trigger failed, running local SOS flow:', err);
    }

    currentEmergencyRequests.unshift(newRequest);
    return newRequest;
  },

  async getEmergencyRequest(id: string): Promise<EmergencyRequest | undefined> {
    return currentEmergencyRequests.find((r) => r.id === id);
  },

  // Readiness Score
  async getReadinessScore(): Promise<ReadinessScore> {
    return calculateReadinessScore(currentProfile, currentDocuments.length);
  },

  // Safety Tips
  async getSafetyTips(): Promise<SafetyTip[]> {
    return SAFETY_TIPS;
  },
};

