export const endpoints = {
  register: "/users/",
  login: "/hospitals/login",
  hospitals: "/hospitals",
  sos: "/sos",
  resources: "/hospitals",
  doctors: "/hospitals/doctors",
  ambulances: "/hospitals/ambulances",
};
export const resourceItemPath = (base: string, id: string) => `${base}/${encodeURIComponent(id)}`;