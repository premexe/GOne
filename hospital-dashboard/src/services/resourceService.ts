import {validateBeds,validateDoctor,validateAmbulance} from './resourceValidation';
import type {BedUpdate,DoctorInput,AmbulanceInput} from '../types';
import { providers } from '../providers';

const resourceMethods = {
  getResources: providers.resource.getResources.bind(providers.resource),
  updateBeds: providers.resource.updateBeds.bind(providers.resource),
  createDoctor: providers.resource.createDoctor.bind(providers.resource),
  updateDoctor: providers.resource.updateDoctor.bind(providers.resource),
  deleteDoctor: providers.resource.deleteDoctor.bind(providers.resource),
  createAmbulance: providers.resource.createAmbulance.bind(providers.resource),
  updateAmbulance: providers.resource.updateAmbulance.bind(providers.resource),
  deleteAmbulance: providers.resource.deleteAmbulance.bind(providers.resource),

  getAmbulances: providers.resource.getAmbulances.bind(providers.resource),
  getDoctors: providers.resource.getDoctors.bind(providers.resource),
  assignAmbulance: providers.resource.assignAmbulance.bind(providers.resource),
  assignDoctor: providers.resource.assignDoctor.bind(providers.resource),
};

// Session ownership is an early UX guard, never a substitute for backend authorization.
export const resourceService = Object.fromEntries(Object.entries(resourceMethods).map(([name, method]) => [name, async (...args: unknown[]) => {
 const hospitalId = name.startsWith('assign') ? args[1] : args[0];
 if (providers.auth.getSession()?.hospital.id !== hospitalId) throw new Error('Access denied for this hospital.');
 if(name === "updateBeds") validateBeds(args[1] as BedUpdate);
 if(name === "createDoctor" || name === "updateDoctor") validateDoctor(args[name === "createDoctor" ? 1 : 2] as DoctorInput);
 if(name === "createAmbulance" || name === "updateAmbulance") validateAmbulance(args[name === "createAmbulance" ? 1 : 2] as AmbulanceInput);
 const result = await (method as (...args: unknown[]) => Promise<unknown>)(...args);
 if (providers.auth.getSession()?.hospital.id !== hospitalId) throw new Error('Hospital session changed. Please reload.');
 return result;
}])) as typeof resourceMethods;
