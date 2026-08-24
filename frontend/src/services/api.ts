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
import { request, setToken } from './http';

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
    const result = await request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    setToken(result.access_token);

    const userId = getUserIdFromToken(result.access_token);
    const backendUser = await request(`/users/${userId}`) as BackendUser;
    currentUser = toUser(backendUser);
    return currentUser;
  },

  async getMe(): Promise<User> {
    return currentUser;
  },

  async updateMe(partial: Partial<User>): Promise<User> {
    currentUser = { ...currentUser, ...partial };
    return currentUser;
  },

  // Emergency Profile
  async getEmergencyProfile(): Promise<EmergencyProfile> {
    return currentProfile;
  },

  async updateEmergencyProfile(partial: Partial<EmergencyProfile>): Promise<EmergencyProfile> {
    currentProfile = {
      ...currentProfile,
      ...partial,
    };
    return currentProfile;
  },

  // Documents
  async getDocuments(): Promise<MedicalDocument[]> {
    return currentDocuments;
  },

  async uploadDocument(
    title: string,
    fileUrl: string,
    docType: 'report' | 'prescription' | 'scan' | 'other'
  ): Promise<MedicalDocument> {
    const summary = await summarizeMedicalDocument(title, docType);
    const newDoc: MedicalDocument = {
      id: `doc-${Date.now()}`,
      userId: currentUser.id,
      title,
      fileUrl,
      docType,
      uploadedAt: new Date().toISOString(),
      aiSummary: summary,
    };
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

    const newRequest: EmergencyRequest = {
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
