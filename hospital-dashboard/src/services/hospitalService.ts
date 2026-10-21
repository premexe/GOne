import { providers } from '../providers';

export const hospitalService = {
  getCurrentHospital: providers.hospital.getById.bind(providers.hospital),
  getById: providers.hospital.getById.bind(providers.hospital),
  getStats: providers.hospital.getStats.bind(providers.hospital),
  getActivity: providers.hospital.getActivity.bind(providers.hospital),
};
