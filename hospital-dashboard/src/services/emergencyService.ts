import { providers } from '../providers';
import type { EmergencyStatus, HospitalId } from '../types';

function sortOperational<T extends { priority: { score: number }; createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => b.priority.score - a.priority.score || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export const emergencyService = {
  getNew: providers.emergency.getNew.bind(providers.emergency),
  getOngoing: providers.emergency.getOngoing.bind(providers.emergency),
  getCompleted: providers.emergency.getCompleted.bind(providers.emergency),
  getById: providers.emergency.getById.bind(providers.emergency),
  accept: providers.emergency.accept.bind(providers.emergency),
  reject: providers.emergency.reject.bind(providers.emergency),
  updateStatus(id: string, hospitalId: HospitalId, status: EmergencyStatus) {
    return providers.emergency.updateStatus(id, hospitalId, status);
  },
  async getActive(hospitalId: HospitalId) {
    const [newCases, ongoingCases] = await Promise.all([
      providers.emergency.getNew(hospitalId),
      providers.emergency.getOngoing(hospitalId),
    ]);
    return sortOperational([...newCases, ...ongoingCases]);
  },
  /** Phase 5 can call this from polling, SSE or WebSocket invalidation without changing pages. */
  async refresh(hospitalId: HospitalId) {
    const [newCases, ongoingCases] = await Promise.all([
      providers.emergency.getNew(hospitalId),
      providers.emergency.getOngoing(hospitalId),
    ]);
    return { newCases, ongoingCases };
  },
};
