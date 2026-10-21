/**
 * Compatibility facade used by the existing Phase 3 pages. Data access now flows
 * through application services and the selected provider; the page API stays stable.
 */
import { providers } from '../providers';
import { emergencyService } from './emergencyService';
import { hospitalService } from './hospitalService';
import { resourceService } from './resourceService';

export const hospitalApi = hospitalService;
export const dashboardApi = hospitalService;
export const emergencyApi = {
  ...emergencyService,
  assignAmbulance: resourceService.assignAmbulance,
  assignDoctor: resourceService.assignDoctor,
};
export const resourceApi = resourceService;
export const demoApi = providers.demo;
