/** Opaque string so future backend UUIDs do not require UI changes. */
export type HospitalId = string;
export type DataMode = 'mock' | 'api';
export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
export type GlobalSosStatus =
  | 'created'
  | 'location_acquired'
  | 'triaged'
  | 'contacts_notified'
  | 'facility_matched'
  | 'dispatched'
  | 'en_route'
  | 'arrived'
  | 'closed';

export type EmergencyStatus =
  | 'RECEIVED'
  | 'UNDER_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'AMBULANCE_ASSIGNED'
  | 'EN_ROUTE'
  | 'PATIENT_PICKED_UP'
  | 'ARRIVED'
  | 'COMPLETED';

export type AmbulanceStatus = 'AVAILABLE' | 'ASSIGNED' | 'EN_ROUTE' | 'TRANSPORTING' | 'UNAVAILABLE' | 'MAINTENANCE' | 'OFFLINE';
export type DoctorStatus = 'AVAILABLE' | 'BUSY' | 'OFF_DUTY';

export interface Patient {
  id: string;
  name: string;
  age?: number;
  gender?: string;
  bloodGroup?: string;
  medicalConditions?: string[];
  allergies?: string[];
  medications?: string[];
  criticalNotes?: string[];
}

/** Emergency-relevant patient data authorized for responder use; not a citizen account or full medical record. */
export interface PatientEmergencyHandoff extends Patient {
  dateOfBirth?: string;
  emergencyContacts?: Array<{ name: string; relationship?: string; phone?: string }>;
  consentReference?: string;
}

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
  address: string;
  area?: string;
  city?: string;
  accuracyMeters?: number;
  capturedAt?: string;
  source?: 'citizen_device' | 'backend' | 'manual' | 'mock' | string;
}

export interface HospitalLocation extends EmergencyLocation {
  name: string;
  department: string;
}

export interface Hospital extends HospitalLocation {
  id: HospitalId;
  shortName: string;
  networkRegion: string;
  emergencyBeds: { available: number; total: number };
  icuBeds: { available: number; total: number };
  averageResponseTimeMinutes: number;
  completedToday: number;
  acceptanceRate: number;
  providerId?: string;
  email?: string;
  capabilities?: string[];
  specialities?: string[];
  status?: 'CONNECTED' | 'DEGRADED' | 'OFFLINE' | string;
  availabilityUpdatedAt?: string;
  availabilitySource?: 'hospital_system' | 'manual' | 'mock' | string;
  availabilityVerificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'STALE' | string;
}

export interface HospitalAccount {
  hospitalId: HospitalId;
  email: string;
  password: string;
}

export interface TimelineEvent {
  id: string;
  label: string;
  timestamp?: string;
  completed: boolean;
  current?: boolean;
  type?: string;
  status?: string;
  actorType?: 'hospital' | 'backend' | 'citizen' | 'system' | string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export interface AllocationMetadata {
  hospitalId?: string;
  matchRank?: number;
  priorityScore?: number;
  severityScore?: number;
  distanceKm?: number;
  travelTimeMinutes?: number;
  capabilityMatch?: number | boolean;
  availabilityScore?: number;
  freshness?: { updatedAt?: string; source?: string; verificationStatus?: string };
  reason?: string | string[];
  modelVersion?: string;
  allocatedAt?: string;
  /** Keeps the handoff tolerant while the allocation team's final schema is being agreed. */
  additionalFields?: Record<string, unknown>;
}

export interface Ambulance {
  id: string;
  hospitalId: HospitalId;
  vehicleNumber: string;
  status: AmbulanceStatus;
  driverName: string;
  locationLabel: string;
  registrationNumber?: string;
  driverPhone?: string;
}

export interface Doctor {
  id: string;
  hospitalId: HospitalId;
  name: string;
  specialization: string;
  status: DoctorStatus;
  currentCases: number;
  department?: string;
  phone?: string;
}

export interface Emergency {
  id: string;
  sosId?: string;
  hospitalId: HospitalId;
  requestStatus: RequestStatus;
  type: string;
  symptoms?: string[];
  urgency?: string;
  severity?: string;
  status: EmergencyStatus;
  priority: {
    score: number;
    level: PriorityLevel;
    reasons: string[];
  };
  patient: PatientEmergencyHandoff;
  location: EmergencyLocation;
  globalSosStatus?: GlobalSosStatus;
  allocatedHospitalId?: string;
  allocationStatus?: string;
  hospitalDecision?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  allocation?: AllocationMetadata;
  distanceKm?: number;
  estimatedArrivalMinutes?: number;
  allocationEstimatedTravelMinutes?: number;
  routeEstimatedTravelMinutes?: number;
  createdAt: string;
  updatedAt?: string;
  allocatedAt?: string;
  acceptedAt?: string;
  assignedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
  assignedAmbulance?: Ambulance;
  assignedDoctor?: Doctor;
  timeline: TimelineEvent[];
}

export interface DashboardStats {
  availableGeneralBeds?: number;
  totalGeneralBeds?: number;
  availableEmergencyDoctors?: number;
  newEmergencies: number;
  ongoingCases: number;
  activeEmergencies: number;
  criticalCases: number;
  availableAmbulances: number;
  totalAmbulances: number;
  availableDoctors: number;
  totalDoctors: number;
  availableBeds: number;
  totalBeds: number;
  availableIcuBeds: number;
  totalIcuBeds: number;
  averageResponseTimeMinutes: number;
  completedToday: number;
  acceptanceRate: number;
}

export interface ActivityPoint {
  time: string;
  emergencies: number;
}

export interface RouteResult {
  coordinates: Array<[number, number]>;
  distanceKm: number;
  durationMinutes: number;
  provider: 'OSRM';
}

export interface AuthSession {
  hospital: Hospital;
  accessToken?: string;
  expiresAt?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  request_id?: string;
}

export interface BedResource { total: number; occupied: number; available: number }
export type BedKind = 'general' | 'icu' | 'emergency';
export type BedUpdate = Record<BedKind, { total: number; occupied: number }>;
export interface HospitalResourceSummary {
 hospitalId: HospitalId; beds: Record<BedKind, BedResource>; doctors: Doctor[]; ambulances: Ambulance[]; updatedAt: string;
}
export type DoctorInput = Pick<Doctor, 'name' | 'department' | 'specialization' | 'phone' | 'status'>;
export type AmbulanceInput = Pick<Ambulance, 'vehicleNumber' | 'driverName' | 'driverPhone' | 'status'>;
export type HospitalApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
export interface HospitalRegistrationInput {
 hospitalName: string; licenseNumber: string; hospitalType: string; address: string; city: string; state: string; pinCode: string;
 emergencyPhone: string; hospitalEmail: string; website?: string; latitude?: number; longitude?: number;
 adminName: string; designation: string; adminEmail: string; adminPhone: string; password: string;
 generalBeds: number; icuBeds: number; emergencyBeds: number; ambulanceCount: number;
}
export interface HospitalRegistration extends Omit<HospitalRegistrationInput, 'password'> {
 id: string;
 /** Assigned immediately in mock mode; a future API may omit it until approval. */
 hospitalId?: HospitalId;
 status: HospitalApprovalStatus;
 submittedAt: string;
}
