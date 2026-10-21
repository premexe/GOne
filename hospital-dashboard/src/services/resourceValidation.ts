import type { AmbulanceInput, BedUpdate, DoctorInput, HospitalRegistrationInput } from '../types';
export function validateBeds(beds: BedUpdate) {
 for (const kind of ["general","icu","emergency"] as const) { if (!beds[kind]) throw new Error("All bed categories are required."); }
 for (const bed of Object.values(beds)) if (!Number.isSafeInteger(bed.total) || !Number.isSafeInteger(bed.occupied) || bed.total < 0 || bed.occupied < 0 || bed.occupied > bed.total) throw new Error('Use whole numbers. Occupied beds cannot exceed capacity.');
}
export function validateDoctor(p: DoctorInput) {
 if (!p.name.trim()) throw new Error('Doctor name is required.');
 if (!['AVAILABLE','BUSY','OFF_DUTY'].includes(p.status)) throw new Error('Choose a valid doctor status.');
}
export function validateAmbulance(p: AmbulanceInput) {
 if (!p.vehicleNumber.trim()) throw new Error('Vehicle number is required.');
 if (!['AVAILABLE','ASSIGNED','EN_ROUTE','TRANSPORTING','UNAVAILABLE','MAINTENANCE','OFFLINE'].includes(p.status)) throw new Error('Choose a valid ambulance status.');
}
export function validateRegistration(p: HospitalRegistrationInput) {
 for (const field of ['hospitalName','licenseNumber','hospitalType','address','city','state','pinCode','emergencyPhone','hospitalEmail','adminName','designation','adminEmail','adminPhone'] as const) if (!p[field].trim()) throw new Error('Complete all required fields.');
 if (![p.adminEmail,p.hospitalEmail].every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))) throw new Error('Enter valid email addresses.');
 if (p.password.length < 8) throw new Error('Use at least 8 characters for the password.');
 if (!/^\d{6}$/.test(p.pinCode)) throw new Error('Enter a six-digit PIN code.');
 if (![p.generalBeds,p.icuBeds,p.emergencyBeds,p.ambulanceCount].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('Capacity must be a non-negative whole number.');
 if ((p.latitude === undefined) !== (p.longitude === undefined)) throw new Error('Enter both latitude and longitude.');
 if (p.latitude !== undefined && (!Number.isFinite(p.latitude) || Math.abs(p.latitude)>90)) throw new Error('Latitude must be between -90 and 90.');
 if (p.longitude !== undefined && (!Number.isFinite(p.longitude) || Math.abs(p.longitude)>180)) throw new Error('Longitude must be between -180 and 180.');
}
