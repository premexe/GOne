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
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_TOKEN_KEY = 'lifelink_access_token';

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

type UploadFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
};

type BackendSOS = {
  sos_id: number;
  user_id: number;
  description: string | null;
  status: string;
  dispatch_status?: string | null;
  accepted_hospital_id?: number | null;
  assigned_ambulance_id?: number | null;
  assigned_doctor_id?: number | null;
  patient_name?: string | null;
  patient_phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  hospital?: {
    hospital_id: number;
    name: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    phone_number?: string;
    total_beds?: number;
    icu_beds?: number;
    oxygen_beds?: number;
  } | null;
  ambulance?: {
    ambulance_id: number;
    vehicle_number: string;
    driver_name?: string;
    driver_phone?: string;
    status: string;
  } | null;
  doctor?: {
    doctor_id: number;
    name: string;
    specialization?: string;
    department?: string;
    phone?: string;
  } | null;
};

function toEmergencyRequest(sos: BackendSOS, cachedMatch?: Hospital): EmergencyRequest {
  const isResolved = sos.status === 'RESOLVED' || sos.dispatch_status === 'COMPLETED';
  const isAccepted = Boolean(sos.accepted_hospital_id) || sos.status === 'ACCEPTED' || sos.dispatch_status === 'ACCEPTED' || sos.dispatch_status === 'AMBULANCE_ASSIGNED' || sos.dispatch_status === 'EN_ROUTE';

  let matchedHosp: Hospital | undefined = cachedMatch;
  if (sos.hospital) {
    matchedHosp = {
      id: String(sos.hospital.hospital_id),
      name: sos.hospital.name,
      lat: sos.hospital.latitude || 19.7,
      lng: sos.hospital.longitude || 72.77,
      address: sos.hospital.address || 'Medical District',
      contact: sos.hospital.phone_number || '+1 800-555-0199',
      specialties: ['General Medicine', 'Emergency Care', 'ICU'],
      bedCapacity: sos.hospital.total_beds || 100,
      availableBeds: sos.hospital.icu_beds || 20,
      distanceKm: 2.4,
      etaMinutes: 5,
      recommendationReason: 'Confirmed Emergency Admission by ER Team',
    };
  }

  let assignedAmb = undefined;
  if (sos.ambulance) {
    assignedAmb = {
      id: String(sos.ambulance.ambulance_id),
      vehicleNumber: sos.ambulance.vehicle_number,
      driverName: sos.ambulance.driver_name || 'Assigned Paramedic',
      driverPhone: sos.ambulance.driver_phone || matchedHosp?.contact || '+1 800-555-0199',
      status: sos.ambulance.status || 'EN_ROUTE',
    };
  } else if (sos.assigned_ambulance_id) {
    assignedAmb = {
      id: String(sos.assigned_ambulance_id),
      vehicleNumber: `AMB-${sos.assigned_ambulance_id}`,
      driverName: 'Assigned Paramedic',
      driverPhone: matchedHosp?.contact || '+1 800-555-0199',
      status: 'EN_ROUTE',
    };
  }

  let assignedDoc = undefined;
  if (sos.doctor) {
    assignedDoc = {
      id: String(sos.doctor.doctor_id),
      name: sos.doctor.name,
      specialization: sos.doctor.specialization || 'Emergency Specialist',
      department: sos.doctor.department,
      phone: sos.doctor.phone,
    };
  }

  const normDispatch = (sos.dispatch_status || '').toUpperCase();
  let appStatus: 'locating' | 'matching' | 'connected' | 'en_route' | 'arrived' | 'closed' = 'connected';
  if (isResolved || normDispatch === 'COMPLETED') {
    appStatus = 'closed';
  } else if (normDispatch === 'ARRIVED' || normDispatch === 'PATIENT_PICKED_UP') {
    appStatus = 'arrived';
  } else if (normDispatch === 'EN_ROUTE' || normDispatch === 'AMBULANCE_ASSIGNED') {
    appStatus = 'en_route';
  } else if (isAccepted) {
    appStatus = 'connected';
  }

  return {
    id: String(sos.sos_id),
    userId: String(sos.user_id),
    hospitalId: sos.accepted_hospital_id ? String(sos.accepted_hospital_id) : (matchedHosp ? matchedHosp.id : null),
    status: appStatus,
    dispatchStatus: sos.dispatch_status || sos.status,
    symptoms: [],
    urgencyTier: 'critical',
    createdAt: sos.created_at,
    notes: sos.description || undefined,
    matchedHospital: matchedHosp,
    acceptedHospital: matchedHosp,
    assignedAmbulance: assignedAmb,
    assignedDoctor: assignedDoc,
    responderEtaMinutes: 5,
    userLatitude: sos.latitude || 19.697,
    userLongitude: sos.longitude || 72.766,
  };
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<User> {
    const result = await request('/users/login', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase(), password: password.trim() }) });
    setToken(result.access_token);
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, result.access_token);
    const backendUser = await request(`/users/${getUserIdFromToken(result.access_token)}`) as BackendUser;
    currentUser = toUser(backendUser);
    return currentUser;
  },

  async register(name: string, email: string, phone: string, password: string): Promise<User> {
    await request('/users/', {
        method: 'POST',
        body: JSON.stringify({
          full_name: name,
          email,
          phone_number: phone,
          password,
        }),
      });
    return this.login(email, password);
  },

  async restoreSession(): Promise<User | null> {
    const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (!savedToken) return null;
    setToken(savedToken);
    try {
      const backendUser = await request(`/users/${getUserIdFromToken(savedToken)}`) as BackendUser;
      currentUser = toUser(backendUser);
      return currentUser;
    } catch {
      setToken(null);
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      return null;
    }
  },

  async logout(): Promise<void> {
    setToken(null);
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
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
        const payload: Record<string, string> = {
          full_name: currentUser.name,
          phone_number: currentUser.phone,
        };
        if (currentUser.bloodGroup) payload.blood_group = currentUser.bloodGroup;
        if (currentUser.dob) payload.date_of_birth = currentUser.dob;
        await request(`/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
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

  async createEmergencyContact(name: string, relation: string, phone: string) {
    const contact = await request('/emergency-contacts/', {
      method: 'POST',
      body: JSON.stringify({ name, relationship: relation, phone_number: phone, is_primary: false }),
    });
    return {
      id: String(contact.contact_id),
      name: contact.name,
      relation: contact.relationship || '',
      phone: contact.phone_number,
    };
  },

  async deleteEmergencyContact(contactId: string): Promise<void> {
    await request(`/emergency-contacts/${contactId}`, { method: 'DELETE' });
  },

  // Documents
  async getDocuments(): Promise<MedicalDocument[]> {
    try {
      const userId = Number(currentUser.id);
      if (Number.isInteger(userId) && getToken()) {
        const backendDocs = await request(`/medical-records/${userId}`);
        if (Array.isArray(backendDocs)) {
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
    file: UploadFile,
    docType: 'report' | 'prescription' | 'scan' | 'other'
  ): Promise<MedicalDocument> {
    const summary = await summarizeMedicalDocument(title, docType);
    let newDoc: MedicalDocument = {
      id: `doc-${Date.now()}`,
      userId: currentUser.id,
      title,
      fileUrl: file.uri,
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
        
        // React Native accepts a URI-based file object; browser builds use Blob.
        if (typeof window === 'undefined') {
          formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
          } as unknown as Blob);
        } else {
          const blob = await (await fetch(file.uri)).blob();
          formData.append('file', blob, file.name);
        }

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
    try {
      const backendHospitals = await request('/hospitals');
      if (Array.isArray(backendHospitals) && backendHospitals.length > 0) {
        currentHospitals = backendHospitals.map((h: any) => {
          const genTotal = h.total_beds ?? 100;
          const genOcc = h.general_occupied ?? 0;
          const icuTotal = h.icu_beds ?? 20;
          const icuOcc = h.icu_occupied ?? 0;
          const emTotal = h.oxygen_beds ?? 15;
          const emOcc = h.emergency_occupied ?? 0;

          return {
            id: String(h.hospital_id || h.id),
            name: h.name || h.hospital_name || 'Medical Center',
            lat: h.latitude || h.lat || 19.700,
            lng: h.longitude || h.lng || 72.770,
            specialties: h.specialties || ['General Medicine', 'Emergency Care', 'Critical ICU'],
            bedCapacity: genTotal + icuTotal + emTotal,
            availableBeds: Math.max(0, genTotal - genOcc) + Math.max(0, icuTotal - icuOcc) + Math.max(0, emTotal - emOcc),
            generalBeds: { total: genTotal, occupied: genOcc, available: Math.max(0, genTotal - genOcc) },
            icuBeds: { total: icuTotal, occupied: icuOcc, available: Math.max(0, icuTotal - icuOcc) },
            emergencyBeds: { total: emTotal, occupied: emOcc, available: Math.max(0, emTotal - emOcc) },
            contact: h.phone_number || h.contact || '+1 800-555-0199',
            address: h.address || 'Medical District',
            rating: h.rating || 4.8,
          };
        });
      }
    } catch (err) {
      console.warn('Could not fetch hospitals from backend, using default list:', err);
    }
    return rankHospitalsForEmergency(currentHospitals, lat, lng, specialty);
  },

  async getHospitalById(id: string): Promise<Hospital | undefined> {
    const ranked = await this.getNearbyHospitals(19.700, 72.770);
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
      let activeToken = getToken();
      if (!activeToken) {
        activeToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (activeToken) setToken(activeToken);
      }

      if (activeToken) {
        const description = [symptoms.length ? `Symptoms: ${symptoms.join(', ')}` : '', notes || '']
          .filter(Boolean)
          .join('\n');

        let rawSos: any = null;
        // Fast direct POST /sos/ (connects instantly to hospital triage board)
        try {
          rawSos = await request('/sos/', {
            method: 'POST',
            body: JSON.stringify({
              latitude: userLat,
              longitude: userLng,
              description,
              patient_name: currentUser?.name || undefined,
            }),
          });
        } catch (_sosErr) {
          // Fallback to /emergency/trigger orchestration if needed
          const trigResp = await request('/emergency/trigger', {
            method: 'POST',
            body: JSON.stringify({
              latitude: userLat,
              longitude: userLng,
              description,
            }),
          });
          rawSos = trigResp?.sos || trigResp;
        }

        if (rawSos) {
          newRequest = {
            ...newRequest,
            ...toEmergencyRequest(rawSos),
            symptoms,
            urgencyTier: triage.urgencyTier,
            matchedHospital: topMatch,
            responderEtaMinutes: topMatch?.etaMinutes || 6,
          };
        }
      }
    } catch (err) {
      console.warn('Backend SOS trigger notice:', err);
    }

    currentEmergencyRequests.unshift(newRequest);
    return newRequest;
  },

  async getEmergencyRequest(id: string): Promise<EmergencyRequest | undefined> {
    return currentEmergencyRequests.find((r) => r.id === id);
  },

  async getActiveEmergencyRequest(): Promise<EmergencyRequest | null> {
    try {
      let activeToken = getToken();
      if (!activeToken) {
        activeToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (activeToken) setToken(activeToken);
      }
      if (!activeToken) return null;

      const sos = await request('/sos/my-active') as BackendSOS | null;
      return sos ? toEmergencyRequest(sos) : null;
    } catch (err: any) {
      return null;
    }
  },

  async resolveEmergencyRequest(sosId: string): Promise<void> {
    try {
      await request(`/sos/${sosId}/resolve`, { method: 'PUT' });
    } catch (err: any) {
      if (err?.message && err.message.toLowerCase().includes('already resolved')) {
        return;
      }
      console.warn('Resolve request status:', err?.message || err);
    }
  },

  async getNotifications() {
    return request('/notifications/') as Promise<Array<{
      notification_id: number;
      message: string;
      status: string;
      channel: string;
      created_at: string;
    }>>;
  },

  async markNotificationRead(notificationId: number): Promise<void> {
    await request(`/notifications/${notificationId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'READ' }),
    });
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

