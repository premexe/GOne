import { isMockMode } from '../config/runtime';
import { apiProviders } from './api/apiProviders';
import { mockProviders } from './mock/mockProviders';

export const providers = isMockMode ? mockProviders : apiProviders;
