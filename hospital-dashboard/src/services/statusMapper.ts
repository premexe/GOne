import type { EmergencyStatus, GlobalSosStatus } from '../types';

/** Proposed Phase 5 wire values. Confirm these with the backend before enabling API mode. */
const hospitalStatusToApi: Record<EmergencyStatus, string> = {
  RECEIVED: 'received',
  UNDER_REVIEW: 'under_review',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  AMBULANCE_ASSIGNED: 'ambulance_assigned',
  EN_ROUTE: 'en_route',
  PATIENT_PICKED_UP: 'patient_picked_up',
  ARRIVED: 'arrived',
  COMPLETED: 'completed',
};

export function toApiHospitalStatus(status: EmergencyStatus) {
  return hospitalStatusToApi[status];
}

export const indicativeGlobalStatusForHospitalStatus: Partial<Record<EmergencyStatus, GlobalSosStatus>> = {
  RECEIVED: 'facility_matched',
  UNDER_REVIEW: 'facility_matched',
  ACCEPTED: 'facility_matched',
  AMBULANCE_ASSIGNED: 'dispatched',
  EN_ROUTE: 'en_route',
  PATIENT_PICKED_UP: 'en_route',
  ARRIVED: 'arrived',
  COMPLETED: 'closed',
};
