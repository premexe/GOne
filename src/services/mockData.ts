import { User, EmergencyProfile, MedicalDocument, Hospital, ReadinessScore, SafetyTip } from '../types';

export const INITIAL_USER: User = {
  id: 'u101',
  name: 'Alex Johnson',
  email: 'alex.johnson@lifelink.ai',
  phone: '+1 (555) 234-5678',
  bloodGroup: 'O+',
  dob: '1992-06-15',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
};

export const INITIAL_EMERGENCY_PROFILE: EmergencyProfile = {
  id: 'ep101',
  userId: 'u101',
  allergies: ['Penicillin', 'Peanuts', 'Sulfa Drugs'],
  medications: ['Lisinopril 10mg daily', 'Albuterol Inhaler (PRN)'],
  conditions: ['Mild Asthma', 'Hypertension (Controlled)'],
  emergencyContacts: [
    {
      id: 'c1',
      name: 'Sarah Johnson',
      relation: 'Spouse',
      phone: '+1 (555) 987-6543',
    },
    {
      id: 'c2',
      name: 'Dr. Robert Chen',
      relation: 'Primary Care Physician',
      phone: '+1 (555) 345-6789',
    },
  ],
};

export const SAMPLE_HOSPITALS: Hospital[] = [
  {
    id: 'h1',
    name: 'Palghar General & Trauma Center',
    lat: 19.697,
    lng: 72.766,
    specialties: ['trauma', 'cardiac', 'emergency', 'general', 'pediatrics'],
    bedCapacity: 120,
    availableBeds: 18,
    contact: '+1 (800) 555-0199',
    address: '104 Healthcare Boulevard, City Core',
    rating: 4.8,
  },
  {
    id: 'h2',
    name: 'Metro City Heart & Cardiac Hospital',
    lat: 19.710,
    lng: 72.790,
    specialties: ['cardiac', 'vascular', 'icu', 'emergency'],
    bedCapacity: 85,
    availableBeds: 4,
    contact: '+1 (800) 555-0144',
    address: '45 Cardiac Drive, East District',
    rating: 4.9,
  },
  {
    id: 'h3',
    name: 'St. Jude District Emergency Care',
    lat: 19.680,
    lng: 72.740,
    specialties: ['general', 'orthopedics', 'pediatrics'],
    bedCapacity: 60,
    availableBeds: 22,
    contact: '+1 (800) 555-0177',
    address: '88 St. Jude Way, West Sector',
    rating: 4.5,
  },
  {
    id: 'h4',
    name: 'Apex Pulmonary & Neuroscience Institute',
    lat: 19.725,
    lng: 72.755,
    specialties: ['neurology', 'pulmonology', 'trauma', 'icu'],
    bedCapacity: 150,
    availableBeds: 11,
    contact: '+1 (800) 555-0122',
    address: '12 Apex Heights, North Medical Park',
    rating: 4.7,
  },
];

export const INITIAL_READINESS: ReadinessScore = {
  userId: 'u101',
  score: 82,
  missingFields: ['Recent Lab Document', 'Secondary Emergency Contact Phone'],
  computedAt: new Date().toISOString(),
  history: [
    { date: 'Mon', score: 65 },
    { date: 'Tue', score: 70 },
    { date: 'Wed', score: 70 },
    { date: 'Thu', score: 78 },
    { date: 'Fri', score: 78 },
    { date: 'Sat', score: 82 },
    { date: 'Sun', score: 82 },
  ],
};

export const SAMPLE_DOCUMENTS: MedicalDocument[] = [
  {
    id: 'doc-001',
    userId: 'u101',
    title: 'Comprehensive Blood Count & Metabolic Panel',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    docType: 'report',
    uploadedAt: '2026-07-28T10:30:00.000Z',
    aiSummary: {
      overview: 'Normal CBC with slight elevation in fasting glucose. Hemoglobin and platelet counts within optimal reference ranges.',
      allergies: ['Penicillin'],
      medications: ['Lisinopril 10mg daily'],
      conditions: ['Fasting Glucose (Borderline)'],
      keyFindings: [
        'Hemoglobin: 15.2 g/dL (Normal)',
        'WBC: 6.8 x 10^3/uL (Normal)',
        'Fasting Glucose: 104 mg/dL (Slightly Elevated)',
        'Kidney Function (eGFR): >90 (Normal)',
      ],
      confidence: 0.96,
    },
  },
  {
    id: 'doc-002',
    userId: 'u101',
    title: 'Cardiology ECG & Holter Monitor Report',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    docType: 'report',
    uploadedAt: '2026-06-12T14:15:00.000Z',
    aiSummary: {
      overview: 'Sinus rhythm with regular rate. No ST-segment elevation or dangerous arrhythmias detected during 24-hr monitoring.',
      allergies: [],
      medications: ['Lisinopril 10mg'],
      conditions: ['Hypertension'],
      keyFindings: [
        'Heart Rate Average: 72 bpm',
        'Normal Axis & Waveforms',
        'Zero Ectopic Beats Detected',
      ],
      confidence: 0.94,
    },
  },
  {
    id: 'doc-003',
    userId: 'u101',
    title: 'Asthma Maintenance Prescription',
    fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    docType: 'prescription',
    uploadedAt: '2026-05-04T09:00:00.000Z',
    aiSummary: {
      overview: 'Maintenance rescue inhaler prescription issued by Dr. Robert Chen.',
      allergies: ['Penicillin'],
      medications: ['Albuterol Sulfate Inhaler 90mcg (2 puffs q4h PRN)'],
      conditions: ['Mild Intermittent Asthma'],
      keyFindings: [
        'Refills Remaining: 3',
        'Instructions: Use prior to strenuous exercise or at onset of wheezing.',
      ],
      confidence: 0.98,
    },
  },
];

export const SAFETY_TIPS: SafetyTip[] = [
  {
    id: 'tip-1',
    title: 'Why an Emergency Profile Saves Critical Minutes in ER Triage',
    subtitle: 'Paramedics and ER staff use automated NFC & QR profile scans to identify severe allergies before administering medications.',
    category: 'Preparation',
    readTime: '3 min read',
    imageUrl: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=600',
    publishedAt: '2026-08-01',
    content: [
      'In a high-intensity trauma room, paramedics must act within seconds. When patients are unconscious or under acute distress, communicating drug allergies or existing conditions verbally becomes unreliable.',
      'LifeLink AI+ caches your Emergency Wallet profile directly on your device storage. Showing the high-contrast QR code allows first responders to view Penicillin allergies, blood group, and emergency contact numbers without needing cellular signal.',
      'Keep your emergency contacts updated every 3 months, and ensure at least one contact is located within 30 minutes of your primary residence or workplace.',
    ],
  },
  {
    id: 'tip-2',
    title: 'Recognizing Acute Cardiac Symptoms: When to Hold SOS',
    subtitle: 'Chest tightness, sudden shortness of breath, or numbness radiating to the jaw require immediate emergency dispatch.',
    category: 'SOS Guide',
    readTime: '4 min read',
    imageUrl: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600',
    publishedAt: '2026-08-05',
    content: [
      'Cardiovascular emergencies represent the single largest category of time-sensitive hospital admissions.',
      'If you or someone nearby experiences severe pressure in the center of the chest lasting more than a few minutes, pain spreading to the shoulder or arm, or cold sweats, press and hold the LifeLink SOS button immediately.',
      'The AI recommendation engine prioritizes nearby accredited Cath Labs with available ICU beds and alerts emergency responders while you are en-route.',
    ],
  },
  {
    id: 'tip-3',
    title: 'How AI Hospital Matching Works During Trauma Alerts',
    subtitle: 'Not all hospitals have available beds or active trauma surgeons. LifeLink evaluates live capacity before routing.',
    category: 'AI Health',
    readTime: '5 min read',
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600',
    publishedAt: '2026-08-10',
    content: [
      'Standard map GPS apps route patients to the nearest physical building. However, if that facility has zero available ICU beds or lacks specialized cardiac equipment, valuable time is lost transferring the patient.',
      'LifeLink AI+ calculates a multi-factor score: 40% distance/ETA, 35% specialty match (e.g. cardiac vs trauma vs pediatrics), and 25% live bed availability.',
      'This guarantees that emergency responders navigate directly to a facility capable of providing definitive care upon arrival.',
    ],
  },
];
