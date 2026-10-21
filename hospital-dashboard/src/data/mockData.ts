import type { ActivityPoint, Ambulance, Doctor, Emergency, EmergencyStatus, Hospital, HospitalAccount, HospitalId, TimelineEvent } from '../types';

export const hospitals: Hospital[] = [
  {
    id: 'HSP-001', name: 'CityCare Hospital', shortName: 'CityCare', department: 'Emergency Department',
    latitude: 19.1192, longitude: 72.8465, address: 'Juhu Scheme, Mumbai, Maharashtra', area: 'Juhu', city: 'Mumbai',
    networkRegion: 'Mumbai West', emergencyBeds: { available: 12, total: 20 }, icuBeds: { available: 4, total: 8 },
    averageResponseTimeMinutes: 8.4, completedToday: 21, acceptanceRate: 92, status: 'CONNECTED',
    providerId: 'DEMO-PROVIDER-001', capabilities: ['Emergency', 'ICU', 'Cardiology'], specialities: ['Emergency Medicine', 'Cardiology', 'Trauma Surgery'],
    availabilityUpdatedAt: '2026-08-31T10:00:00Z', availabilitySource: 'mock', availabilityVerificationStatus: 'UNVERIFIED',
  },
  {
    id: 'HSP-002', name: 'Metro General Hospital', shortName: 'Metro General', department: 'Emergency & Trauma Centre',
    latitude: 19.0436, longitude: 72.8617, address: 'Sion Circle, Mumbai, Maharashtra', area: 'Sion', city: 'Mumbai',
    networkRegion: 'Mumbai Central', emergencyBeds: { available: 8, total: 15 }, icuBeds: { available: 3, total: 6 },
    averageResponseTimeMinutes: 10.1, completedToday: 16, acceptanceRate: 88, status: 'CONNECTED',
    providerId: 'DEMO-PROVIDER-002', capabilities: ['Emergency', 'Trauma'], specialities: ['Emergency Medicine', 'Neurology', 'Trauma Surgery'],
    availabilityUpdatedAt: '2026-08-31T10:00:00Z', availabilitySource: 'mock', availabilityVerificationStatus: 'UNVERIFIED',
  },
  {
    id: 'HSP-003', name: 'Lifeline Medical Centre', shortName: 'Lifeline', department: 'Acute Care Unit',
    latitude: 19.1176, longitude: 72.9060, address: 'Hiranandani Gardens, Powai, Mumbai, Maharashtra', area: 'Powai', city: 'Mumbai',
    networkRegion: 'Mumbai North-East', emergencyBeds: { available: 10, total: 18 }, icuBeds: { available: 5, total: 9 },
    averageResponseTimeMinutes: 7.6, completedToday: 18, acceptanceRate: 94, status: 'CONNECTED',
    providerId: 'DEMO-PROVIDER-003', capabilities: ['Emergency', 'ICU', 'Pulmonology'], specialities: ['Emergency Medicine', 'Pulmonology', 'Critical Care'],
    availabilityUpdatedAt: '2026-08-31T10:00:00Z', availabilitySource: 'mock', availabilityVerificationStatus: 'UNVERIFIED',
  },
  {
    id: 'HSP-004', name: 'Harbourview Emergency Hospital', shortName: 'Harbourview', department: 'Emergency Response Unit',
    latitude: 18.9067, longitude: 72.8147, address: 'Colaba Causeway, Mumbai, Maharashtra', area: 'Colaba', city: 'Mumbai',
    networkRegion: 'Mumbai South', emergencyBeds: { available: 7, total: 12 }, icuBeds: { available: 2, total: 5 },
    averageResponseTimeMinutes: 9.2, completedToday: 13, acceptanceRate: 90, status: 'CONNECTED',
    providerId: 'DEMO-PROVIDER-004', capabilities: ['Emergency', 'ICU', 'Trauma'], specialities: ['Emergency Medicine', 'Cardiology', 'Neurology'],
    availabilityUpdatedAt: '2026-08-31T10:00:00Z', availabilitySource: 'mock', availabilityVerificationStatus: 'UNVERIFIED',
  },
];

export const hospitalAccounts: HospitalAccount[] = [
  { hospitalId: 'HSP-001', email: 'citycare@lifelink.demo', password: 'CityCare@123' },
  { hospitalId: 'HSP-002', email: 'metro@lifelink.demo', password: 'Metro@123' },
  { hospitalId: 'HSP-003', email: 'lifeline@lifelink.demo', password: 'Lifeline@123' },
  { hospitalId: 'HSP-004', email: 'harbourview@lifelink.demo', password: 'Harbour@123' },
];

export const initialAmbulances: Ambulance[] = [
  { id: 'AMB-01', hospitalId: 'HSP-001', vehicleNumber: 'LL-A01', registrationNumber: 'MH-02-AB-4582', status: 'AVAILABLE', driverName: 'Arjun Nair', locationLabel: 'Hospital Bay A' },
  { id: 'AMB-02', hospitalId: 'HSP-001', vehicleNumber: 'LL-A02', registrationNumber: 'MH-02-BC-2102', status: 'EN_ROUTE', driverName: 'Sameer Khan', locationLabel: 'Bandra East' },
  { id: 'AMB-03', hospitalId: 'HSP-001', vehicleNumber: 'LL-A03', registrationNumber: 'MH-02-CD-3303', status: 'AVAILABLE', driverName: 'Nikhil More', locationLabel: 'Hospital Bay B' },
  { id: 'AMB-04', hospitalId: 'HSP-001', vehicleNumber: 'LL-A04', registrationNumber: 'MH-02-DE-4404', status: 'AVAILABLE', driverName: 'Karan Rao', locationLabel: 'Hospital Bay C' },
  { id: 'AMB-05', hospitalId: 'HSP-001', vehicleNumber: 'LL-A05', registrationNumber: 'MH-02-EF-5505', status: 'AVAILABLE', driverName: 'Imran Shaikh', locationLabel: 'Hospital Bay D' },
  { id: 'AMB-06', hospitalId: 'HSP-001', vehicleNumber: 'LL-A06', registrationNumber: 'MH-02-KL-4106', status: 'ASSIGNED', driverName: 'Vikram Patil', locationLabel: 'Near CityCare' },
  { id: 'AMB-07', hospitalId: 'HSP-001', vehicleNumber: 'LL-A07', registrationNumber: 'MH-02-GH-7707', status: 'AVAILABLE', driverName: 'Tushar Pawar', locationLabel: 'Hospital Bay E' },
  { id: 'AMB-08', hospitalId: 'HSP-001', vehicleNumber: 'LL-A08', registrationNumber: 'MH-02-HJ-8808', status: 'UNAVAILABLE', driverName: 'Ritesh Singh', locationLabel: 'Maintenance' },
  { id: 'AMB-09', hospitalId: 'HSP-001', vehicleNumber: 'LL-A09', registrationNumber: 'MH-02-JK-9909', status: 'AVAILABLE', driverName: 'Dev Menon', locationLabel: 'Hospital Bay F' },

  { id: 'MAMB-01', hospitalId: 'HSP-002', vehicleNumber: 'MG-A01', registrationNumber: 'MH-01-MA-1101', status: 'AVAILABLE', driverName: 'Kabir Joshi', locationLabel: 'Metro Bay A' },
  { id: 'MAMB-02', hospitalId: 'HSP-002', vehicleNumber: 'MG-A02', registrationNumber: 'MH-01-MA-2202', status: 'AVAILABLE', driverName: 'Aman Gupta', locationLabel: 'Metro Bay B' },
  { id: 'MAMB-03', hospitalId: 'HSP-002', vehicleNumber: 'MG-A03', registrationNumber: 'MH-01-MA-3303', status: 'AVAILABLE', driverName: 'Irfan Ali', locationLabel: 'Metro Bay C' },
  { id: 'MAMB-04', hospitalId: 'HSP-002', vehicleNumber: 'MG-A04', registrationNumber: 'MH-01-MA-4404', status: 'AVAILABLE', driverName: 'Yash Naik', locationLabel: 'Metro Bay D' },
  { id: 'MAMB-05', hospitalId: 'HSP-002', vehicleNumber: 'MG-A05', registrationNumber: 'MH-01-MA-5505', status: 'EN_ROUTE', driverName: 'Farhan Khan', locationLabel: 'Kurla West' },
  { id: 'MAMB-06', hospitalId: 'HSP-002', vehicleNumber: 'MG-A06', registrationNumber: 'MH-01-MA-6606', status: 'ASSIGNED', driverName: 'Om Sawant', locationLabel: 'Near Metro General' },
  { id: 'MAMB-07', hospitalId: 'HSP-002', vehicleNumber: 'MG-A07', registrationNumber: 'MH-01-MA-7707', status: 'UNAVAILABLE', driverName: 'Ravi Das', locationLabel: 'Maintenance' },

  { id: 'LAMB-01', hospitalId: 'HSP-003', vehicleNumber: 'LM-A01', registrationNumber: 'MH-03-LM-1101', status: 'AVAILABLE', driverName: 'Rohan Bhosale', locationLabel: 'Lifeline Bay A' },
  { id: 'LAMB-02', hospitalId: 'HSP-003', vehicleNumber: 'LM-A02', registrationNumber: 'MH-03-LM-2202', status: 'AVAILABLE', driverName: 'Manish Jha', locationLabel: 'Lifeline Bay B' },
  { id: 'LAMB-03', hospitalId: 'HSP-003', vehicleNumber: 'LM-A03', registrationNumber: 'MH-03-LM-3303', status: 'AVAILABLE', driverName: 'Sahil More', locationLabel: 'Lifeline Bay C' },
  { id: 'LAMB-04', hospitalId: 'HSP-003', vehicleNumber: 'LM-A04', registrationNumber: 'MH-03-LM-4404', status: 'ASSIGNED', driverName: 'Neeraj Rai', locationLabel: 'Near Powai Lake' },
  { id: 'LAMB-05', hospitalId: 'HSP-003', vehicleNumber: 'LM-A05', registrationNumber: 'MH-03-LM-5505', status: 'UNAVAILABLE', driverName: 'Akash Kale', locationLabel: 'Maintenance' },

  { id: 'HAMB-01', hospitalId: 'HSP-004', vehicleNumber: 'HV-A01', registrationNumber: 'MH-01-HV-1101', status: 'AVAILABLE', driverName: 'Suresh Nadar', locationLabel: 'Harbour Bay A' },
  { id: 'HAMB-02', hospitalId: 'HSP-004', vehicleNumber: 'HV-A02', registrationNumber: 'MH-01-HV-2202', status: 'AVAILABLE', driverName: 'Ajay Pillai', locationLabel: 'Harbour Bay B' },
  { id: 'HAMB-03', hospitalId: 'HSP-004', vehicleNumber: 'HV-A03', registrationNumber: 'MH-01-HV-3303', status: 'AVAILABLE', driverName: 'Jay Shah', locationLabel: 'Harbour Bay C' },
  { id: 'HAMB-04', hospitalId: 'HSP-004', vehicleNumber: 'HV-A04', registrationNumber: 'MH-01-HV-4404', status: 'AVAILABLE', driverName: 'Mihir Patil', locationLabel: 'Harbour Bay D' },
  { id: 'HAMB-05', hospitalId: 'HSP-004', vehicleNumber: 'HV-A05', registrationNumber: 'MH-01-HV-5505', status: 'TRANSPORTING', driverName: 'Neil Dsouza', locationLabel: 'Marine Drive' },
  { id: 'HAMB-06', hospitalId: 'HSP-004', vehicleNumber: 'HV-A06', registrationNumber: 'MH-01-HV-6606', status: 'UNAVAILABLE', driverName: 'Raj Malhotra', locationLabel: 'Maintenance' },
];

export const initialDoctors: Doctor[] = [
  { id: 'DOC-01', hospitalId: 'HSP-001', name: 'Dr. Aditi Mehta', specialization: 'Emergency Medicine', status: 'AVAILABLE', currentCases: 1 },
  { id: 'DOC-02', hospitalId: 'HSP-001', name: 'Dr. Rohan Kulkarni', specialization: 'Cardiology', status: 'AVAILABLE', currentCases: 0 },
  { id: 'DOC-03', hospitalId: 'HSP-001', name: 'Dr. Sana Sheikh', specialization: 'Trauma Surgery', status: 'BUSY', currentCases: 2 },
  { id: 'DOC-04', hospitalId: 'HSP-001', name: 'Dr. Neel Joshi', specialization: 'Internal Medicine', status: 'AVAILABLE', currentCases: 1 },
  { id: 'DOC-05', hospitalId: 'HSP-001', name: 'Dr. Isha Nair', specialization: 'Pulmonology', status: 'AVAILABLE', currentCases: 0 },
  { id: 'DOC-06', hospitalId: 'HSP-001', name: 'Dr. Kavya Shah', specialization: 'Orthopedics', status: 'BUSY', currentCases: 2 },
  { id: 'DOC-07', hospitalId: 'HSP-001', name: 'Dr. Aarav Deshmukh', specialization: 'Emergency Medicine', status: 'AVAILABLE', currentCases: 1 },
  { id: 'DOC-08', hospitalId: 'HSP-001', name: 'Dr. Zoya Khan', specialization: 'Critical Care', status: 'OFF_DUTY', currentCases: 0 },

  { id: 'MDOC-01', hospitalId: 'HSP-002', name: 'Dr. Reema Sethi', specialization: 'Emergency Medicine', status: 'AVAILABLE', currentCases: 0 },
  { id: 'MDOC-02', hospitalId: 'HSP-002', name: 'Dr. Harsh Vora', specialization: 'Trauma Surgery', status: 'BUSY', currentCases: 2 },
  { id: 'MDOC-03', hospitalId: 'HSP-002', name: 'Dr. Naina Rao', specialization: 'Neurology', status: 'AVAILABLE', currentCases: 1 },
  { id: 'MDOC-04', hospitalId: 'HSP-002', name: 'Dr. Kunal Menon', specialization: 'Cardiology', status: 'AVAILABLE', currentCases: 0 },
  { id: 'MDOC-05', hospitalId: 'HSP-002', name: 'Dr. Fiza Ansari', specialization: 'Internal Medicine', status: 'AVAILABLE', currentCases: 1 },
  { id: 'MDOC-06', hospitalId: 'HSP-002', name: 'Dr. Devika Sen', specialization: 'Critical Care', status: 'OFF_DUTY', currentCases: 0 },

  { id: 'LDOC-01', hospitalId: 'HSP-003', name: 'Dr. Tanvi Gokhale', specialization: 'Emergency Medicine', status: 'AVAILABLE', currentCases: 0 },
  { id: 'LDOC-02', hospitalId: 'HSP-003', name: 'Dr. Parth Iyer', specialization: 'Pulmonology', status: 'AVAILABLE', currentCases: 1 },
  { id: 'LDOC-03', hospitalId: 'HSP-003', name: 'Dr. Ria Thomas', specialization: 'Cardiology', status: 'BUSY', currentCases: 1 },
  { id: 'LDOC-04', hospitalId: 'HSP-003', name: 'Dr. Vivek Shetty', specialization: 'Orthopedics', status: 'AVAILABLE', currentCases: 0 },
  { id: 'LDOC-05', hospitalId: 'HSP-003', name: 'Dr. Anika Bose', specialization: 'Critical Care', status: 'OFF_DUTY', currentCases: 0 },

  { id: 'HDOC-01', hospitalId: 'HSP-004', name: 'Dr. Mira Fernandes', specialization: 'Emergency Medicine', status: 'AVAILABLE', currentCases: 0 },
  { id: 'HDOC-02', hospitalId: 'HSP-004', name: 'Dr. Rishi Kapoor', specialization: 'Cardiology', status: 'AVAILABLE', currentCases: 1 },
  { id: 'HDOC-03', hospitalId: 'HSP-004', name: 'Dr. Pooja Nair', specialization: 'Trauma Surgery', status: 'BUSY', currentCases: 2 },
  { id: 'HDOC-04', hospitalId: 'HSP-004', name: 'Dr. Kabir Contractor', specialization: 'Neurology', status: 'AVAILABLE', currentCases: 0 },
  { id: 'HDOC-05', hospitalId: 'HSP-004', name: 'Dr. Sara Merchant', specialization: 'Critical Care', status: 'OFF_DUTY', currentCases: 0 },
];

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const stageOrder: EmergencyStatus[] = ['RECEIVED', 'ACCEPTED', 'AMBULANCE_ASSIGNED', 'EN_ROUTE', 'PATIENT_PICKED_UP', 'ARRIVED', 'COMPLETED'];
const stageLabels = ['SOS received', 'Hospital accepted emergency', 'Ambulance assigned', 'Ambulance en route', 'Patient picked up', 'Arrived at hospital', 'Case completed'];

function timeline(status: EmergencyStatus): TimelineEvent[] {
  if (status === 'REJECTED') return [
    { id: '1', label: 'SOS received', timestamp: 'Recorded', completed: true },
    { id: '2', label: 'Emergency rejected', timestamp: 'Recorded', completed: true, current: true },
  ];
  const effective = status === 'UNDER_REVIEW' ? 'RECEIVED' : status;
  const currentIndex = Math.max(0, stageOrder.indexOf(effective));
  return stageLabels.map((label, index) => ({
    id: `${index + 1}`,
    label,
    timestamp: index <= currentIndex ? (index === 0 ? 'Received' : 'Updated') : undefined,
    completed: index <= currentIndex,
    current: index === currentIndex,
  }));
}

const ambulance = (id: string) => ({ ...initialAmbulances.find((item) => item.id === id)! });
const doctor = (id: string) => ({ ...initialDoctors.find((item) => item.id === id)! });

export const initialEmergencies: Emergency[] = [
  {
    id: 'EMG-1043', sosId: 'SOS-DEMO-1043', hospitalId: 'HSP-001', allocatedHospitalId: 'HSP-001', allocationStatus: 'NOTIFIED', hospitalDecision: 'PENDING', globalSosStatus: 'facility_matched', requestStatus: 'PENDING', type: 'Cardiac Emergency', status: 'RECEIVED',
    priority: { score: 94, level: 'CRITICAL', reasons: ['Reported chest pain', 'Patient age', 'Cardiac emergency type', 'Hospital capacity available'] },
    patient: { id: 'PT-301', name: 'Rahul Sharma', age: 58, gender: 'Male', bloodGroup: 'B+', medicalConditions: ['Hypertension', 'Diabetes'], allergies: ['Penicillin'] },
    location: { latitude: 19.1136, longitude: 72.8697, address: 'Andheri East, Mumbai, Maharashtra', area: 'Andheri East', city: 'Mumbai', accuracyMeters: 24, capturedAt: ago(3), source: 'mock' },
    allocation: { hospitalId: 'HSP-001', matchRank: 1, priorityScore: 94, distanceKm: 2.3, travelTimeMinutes: 7, reason: ['Demo allocation supplied to the hospital client'], modelVersion: 'mock-demo' },
    allocationEstimatedTravelMinutes: 7, distanceKm: 2.3, estimatedArrivalMinutes: 7, createdAt: ago(2), timeline: timeline('RECEIVED'),
  },
  {
    id: 'EMG-1042', hospitalId: 'HSP-001', requestStatus: 'PENDING', type: 'Road Accident', status: 'UNDER_REVIEW',
    priority: { score: 81, level: 'HIGH', reasons: ['Possible trauma', 'Road accident report', 'Moderate travel distance'] },
    patient: { id: 'PT-300', name: 'Priya Shah', age: 34, gender: 'Female', bloodGroup: 'O+' },
    location: { latitude: 19.1004, longitude: 72.8810, address: 'Marol, Mumbai, Maharashtra', area: 'Marol', city: 'Mumbai' },
    distanceKm: 5.1, estimatedArrivalMinutes: 14, createdAt: ago(5), timeline: timeline('UNDER_REVIEW'),
  },
  {
    id: 'EMG-1041', hospitalId: 'HSP-001', requestStatus: 'ACCEPTED', type: 'Breathing Difficulty', status: 'ACCEPTED',
    priority: { score: 72, level: 'HIGH', reasons: ['Respiratory distress reported', 'Older patient'] },
    patient: { id: 'PT-299', name: 'Meera Iyer', age: 63, gender: 'Female', bloodGroup: 'A+' },
    location: { latitude: 19.1363, longitude: 72.8277, address: 'Versova, Mumbai, Maharashtra', area: 'Versova', city: 'Mumbai' },
    distanceKm: 4.6, estimatedArrivalMinutes: 15, createdAt: ago(9), acceptedAt: ago(6), timeline: timeline('ACCEPTED'),
  },
  {
    id: 'EMG-1040', hospitalId: 'HSP-001', requestStatus: 'ACCEPTED', type: 'Fall Injury', status: 'AMBULANCE_ASSIGNED',
    priority: { score: 53, level: 'MEDIUM', reasons: ['Possible fracture', 'Stable vitals reported'] },
    patient: { id: 'PT-298', name: 'Rohan Desai', age: 41, gender: 'Male' },
    location: { latitude: 19.1070, longitude: 72.8360, address: 'Vile Parle West, Mumbai, Maharashtra', area: 'Vile Parle West', city: 'Mumbai' },
    distanceKm: 2.7, estimatedArrivalMinutes: 9, createdAt: ago(14), acceptedAt: ago(12), assignedAmbulance: ambulance('AMB-06'), assignedDoctor: doctor('DOC-06'), timeline: timeline('AMBULANCE_ASSIGNED'),
  },
  {
    id: 'EMG-1039', hospitalId: 'HSP-001', requestStatus: 'PENDING', type: 'Minor Laceration', status: 'RECEIVED',
    priority: { score: 28, level: 'LOW', reasons: ['Bleeding controlled', 'Patient conscious and stable', 'Short travel distance'] },
    patient: { id: 'PT-297', name: 'Ananya Kulkarni', age: 27, gender: 'Female', bloodGroup: 'AB+' },
    location: { latitude: 19.1283, longitude: 72.8442, address: 'Andheri West, Mumbai, Maharashtra', area: 'Andheri West', city: 'Mumbai' },
    distanceKm: 2.5, estimatedArrivalMinutes: 8, createdAt: ago(18), timeline: timeline('RECEIVED'),
  },

  {
    id: 'EMG-2043', hospitalId: 'HSP-002', requestStatus: 'PENDING', type: 'Road Traffic Trauma', status: 'RECEIVED',
    priority: { score: 91, level: 'CRITICAL', reasons: ['Multiple injuries reported', 'Possible internal bleeding', 'Trauma team available'] },
    patient: { id: 'PT-401', name: 'Aditya Verma', age: 29, gender: 'Male', bloodGroup: 'O-' },
    location: { latitude: 19.0726, longitude: 72.8845, address: 'Kurla West, Mumbai, Maharashtra', area: 'Kurla West', city: 'Mumbai' },
    distanceKm: 4.8, estimatedArrivalMinutes: 13, createdAt: ago(3), timeline: timeline('RECEIVED'),
  },
  {
    id: 'EMG-2042', hospitalId: 'HSP-002', requestStatus: 'PENDING', type: 'Severe Dehydration', status: 'UNDER_REVIEW',
    priority: { score: 58, level: 'MEDIUM', reasons: ['Persistent vomiting', 'Reduced consciousness', 'Stable breathing'] },
    patient: { id: 'PT-402', name: 'Neha Banerjee', age: 46, gender: 'Female', bloodGroup: 'B-' },
    location: { latitude: 19.0522, longitude: 72.9005, address: 'Chembur West, Mumbai, Maharashtra', area: 'Chembur West', city: 'Mumbai' },
    distanceKm: 5.2, estimatedArrivalMinutes: 15, createdAt: ago(11), timeline: timeline('UNDER_REVIEW'),
  },
  {
    id: 'EMG-2041', hospitalId: 'HSP-002', requestStatus: 'ACCEPTED', type: 'Neurological Emergency', status: 'EN_ROUTE',
    priority: { score: 86, level: 'HIGH', reasons: ['Sudden weakness', 'Speech difficulty', 'Stroke pathway indicated'] },
    patient: { id: 'PT-403', name: 'Mohan Lal', age: 67, gender: 'Male', bloodGroup: 'A+' },
    location: { latitude: 19.0633, longitude: 72.8678, address: 'Dharavi, Mumbai, Maharashtra', area: 'Dharavi', city: 'Mumbai' },
    distanceKm: 3.1, estimatedArrivalMinutes: 10, createdAt: ago(24), acceptedAt: ago(21), assignedAmbulance: ambulance('MAMB-05'), assignedDoctor: doctor('MDOC-02'), timeline: timeline('EN_ROUTE'),
  },
  {
    id: 'EMG-2040', hospitalId: 'HSP-002', requestStatus: 'ACCEPTED', type: 'Acute Abdominal Pain', status: 'ACCEPTED',
    priority: { score: 62, level: 'MEDIUM', reasons: ['Severe pain', 'Persistent symptoms', 'Surgical assessment requested'] },
    patient: { id: 'PT-404', name: 'Farah Sheikh', age: 38, gender: 'Female', bloodGroup: 'AB-' },
    location: { latitude: 19.0269, longitude: 72.8553, address: 'Matunga East, Mumbai, Maharashtra', area: 'Matunga East', city: 'Mumbai' },
    distanceKm: 2.4, estimatedArrivalMinutes: 8, createdAt: ago(31), acceptedAt: ago(28), timeline: timeline('ACCEPTED'),
  },

  {
    id: 'EMG-3043', hospitalId: 'HSP-003', requestStatus: 'PENDING', type: 'Asthma Exacerbation', status: 'RECEIVED',
    priority: { score: 79, level: 'HIGH', reasons: ['Severe wheezing', 'Rescue inhaler ineffective', 'Pulmonology available'] },
    patient: { id: 'PT-501', name: 'Sonal Patil', age: 22, gender: 'Female', bloodGroup: 'O+' },
    location: { latitude: 19.1235, longitude: 72.9123, address: 'Chandivali, Mumbai, Maharashtra', area: 'Chandivali', city: 'Mumbai' },
    distanceKm: 2.2, estimatedArrivalMinutes: 7, createdAt: ago(4), timeline: timeline('RECEIVED'),
  },
  {
    id: 'EMG-3042', hospitalId: 'HSP-003', requestStatus: 'PENDING', type: 'Minor Burn', status: 'RECEIVED',
    priority: { score: 31, level: 'LOW', reasons: ['Small affected area', 'Patient alert', 'Burn cooled at scene'] },
    patient: { id: 'PT-502', name: 'Dhruv Malhotra', age: 19, gender: 'Male', bloodGroup: 'B+' },
    location: { latitude: 19.1296, longitude: 72.9174, address: 'Kanjurmarg West, Mumbai, Maharashtra', area: 'Kanjurmarg West', city: 'Mumbai' },
    distanceKm: 3.6, estimatedArrivalMinutes: 11, createdAt: ago(16), timeline: timeline('RECEIVED'),
  },
  {
    id: 'EMG-3041', hospitalId: 'HSP-003', requestStatus: 'ACCEPTED', type: 'Cardiac Arrhythmia', status: 'AMBULANCE_ASSIGNED',
    priority: { score: 89, level: 'CRITICAL', reasons: ['Irregular pulse reported', 'Dizziness and collapse', 'Cardiac team alerted'] },
    patient: { id: 'PT-503', name: 'Leena Dsouza', age: 61, gender: 'Female', bloodGroup: 'A-' },
    location: { latitude: 19.1439, longitude: 72.9383, address: 'Bhandup West, Mumbai, Maharashtra', area: 'Bhandup West', city: 'Mumbai' },
    distanceKm: 5.1, estimatedArrivalMinutes: 14, createdAt: ago(27), acceptedAt: ago(25), assignedAmbulance: ambulance('LAMB-04'), assignedDoctor: doctor('LDOC-03'), timeline: timeline('AMBULANCE_ASSIGNED'),
  },

  {
    id: 'EMG-4043', hospitalId: 'HSP-004', requestStatus: 'PENDING', type: 'Suspected Heart Attack', status: 'RECEIVED',
    priority: { score: 96, level: 'CRITICAL', reasons: ['Crushing chest pain', 'Cold perspiration', 'High-risk cardiac signs'] },
    patient: { id: 'PT-601', name: 'Rajiv Khanna', age: 64, gender: 'Male', bloodGroup: 'B+' },
    location: { latitude: 18.9340, longitude: 72.8353, address: 'Fort, Mumbai, Maharashtra', area: 'Fort', city: 'Mumbai' },
    distanceKm: 4.2, estimatedArrivalMinutes: 12, createdAt: ago(1), timeline: timeline('RECEIVED'),
  },
  {
    id: 'EMG-4042', hospitalId: 'HSP-004', requestStatus: 'PENDING', type: 'Head Injury', status: 'UNDER_REVIEW',
    priority: { score: 68, level: 'MEDIUM', reasons: ['Fall with head impact', 'Patient conscious', 'Observation required'] },
    patient: { id: 'PT-602', name: 'Sana Merchant', age: 35, gender: 'Female', bloodGroup: 'O+' },
    location: { latitude: 18.9442, longitude: 72.8237, address: 'Marine Lines, Mumbai, Maharashtra', area: 'Marine Lines', city: 'Mumbai' },
    distanceKm: 4.7, estimatedArrivalMinutes: 13, createdAt: ago(13), timeline: timeline('UNDER_REVIEW'),
  },
  {
    id: 'EMG-4041', hospitalId: 'HSP-004', requestStatus: 'ACCEPTED', type: 'Severe Allergic Reaction', status: 'PATIENT_PICKED_UP',
    priority: { score: 84, level: 'HIGH', reasons: ['Facial swelling', 'Breathing difficulty', 'Emergency medication administered'] },
    patient: { id: 'PT-603', name: 'Vikram Sood', age: 43, gender: 'Male', bloodGroup: 'AB+' },
    location: { latitude: 18.9217, longitude: 72.8332, address: 'Churchgate, Mumbai, Maharashtra', area: 'Churchgate', city: 'Mumbai' },
    distanceKm: 3.1, estimatedArrivalMinutes: 9, createdAt: ago(33), acceptedAt: ago(30), assignedAmbulance: ambulance('HAMB-05'), assignedDoctor: doctor('HDOC-03'), timeline: timeline('PATIENT_PICKED_UP'),
  },
];

export const emergencyActivityByHospital: Record<HospitalId, ActivityPoint[]> = {
  'HSP-001': [{ time: '08:00', emergencies: 3 }, { time: '10:00', emergencies: 5 }, { time: '12:00', emergencies: 4 }, { time: '14:00', emergencies: 7 }, { time: '16:00', emergencies: 6 }, { time: '18:00', emergencies: 9 }],
  'HSP-002': [{ time: '08:00', emergencies: 2 }, { time: '10:00', emergencies: 4 }, { time: '12:00', emergencies: 6 }, { time: '14:00', emergencies: 5 }, { time: '16:00', emergencies: 7 }, { time: '18:00', emergencies: 5 }],
  'HSP-003': [{ time: '08:00', emergencies: 1 }, { time: '10:00', emergencies: 3 }, { time: '12:00', emergencies: 2 }, { time: '14:00', emergencies: 5 }, { time: '16:00', emergencies: 4 }, { time: '18:00', emergencies: 6 }],
  'HSP-004': [{ time: '08:00', emergencies: 2 }, { time: '10:00', emergencies: 2 }, { time: '12:00', emergencies: 4 }, { time: '14:00', emergencies: 3 }, { time: '16:00', emergencies: 5 }, { time: '18:00', emergencies: 4 }],
};

export function getHospitalById(id: HospitalId) {
  return hospitals.find((hospital) => hospital.id === id)!;
}
