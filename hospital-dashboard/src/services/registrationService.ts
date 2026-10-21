import {providers} from '../providers';
import type {HospitalRegistrationInput} from '../types';
import {validateRegistration} from './resourceValidation';
export const registrationService = { async register(payload: HospitalRegistrationInput) { validateRegistration(payload); return providers.auth.register(payload); } };
