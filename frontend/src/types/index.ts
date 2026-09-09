export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  dob: string;
  bloodGroup: string;
  avatarUrl?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

export interface EmergencyProfile {
  id?: string;
  userId?: string;
  bloodGroup: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  organDonor: boolean;
  emergencyNotes: string;
  emergencyContacts: EmergencyContact[];
}

export interface MedicalDocument {
  id: string;
  userId: string;
  title: string;
  fileUrl: string;
  docType: 'report' | 'prescription' | 'scan' | 'other';
  uploadedAt: string;
  aiSummary?: {
    overview: string;
    allergies: string[];
    medications: string[];
    conditions: string[];
    keyFindings: string[];
    confidence: number; // 0 to 1
  };
}

export interface BedBreakdown {
  total: number;
  occupied: number;
  available: number;
}

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  specialties: string[];
  bedCapacity: number;
  availableBeds: number;
  generalBeds?: BedBreakdown;
  icuBeds?: BedBreakdown;
  emergencyBeds?: BedBreakdown;
  contact: string;
  address: string;
  rating?: number;
  distanceKm?: number;   // computed dynamically
  etaMinutes?: number;   // computed dynamically
  matchScore?: number;   // computed recommendation score (0-100)
  recommendationReason?: string; // AI generated explanation
}

export interface AssignedAmbulance {
  id: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone: string;
  status: string;
}

export interface AssignedDoctor {
  id: string;
  name: string;
  specialization: string;
  department?: string;
  phone?: string;
}

export interface EmergencyRequest {
  id: string;
  userId: string;
  hospitalId: string | null;
  status: 'locating' | 'matching' | 'connected' | 'en_route' | 'arrived' | 'closed';
  dispatchStatus?: string;
  symptoms: string[];
  urgencyTier: 'low' | 'moderate' | 'high' | 'critical';
  createdAt: string;
  notes?: string;
  matchedHospital?: Hospital;
  acceptedHospital?: Hospital;
  assignedAmbulance?: AssignedAmbulance;
  assignedDoctor?: AssignedDoctor;
  responderEtaMinutes?: number;
  userLatitude?: number;
  userLongitude?: number;
}

export interface ReadinessScore {
  userId: string;
  score: number;              // 0-100
  missingFields: string[];
  computedAt: string;
  history: Array<{
    date: string;
    score: number;
  }>;
}

export interface SafetyTip {
  id: string;
  title: string;
  subtitle: string;
  category: 'Preparation' | 'First Aid' | 'SOS Guide' | 'AI Health';
  readTime: string;
  imageUrl?: string;
  content: string[];
  publishedAt: string;
}
