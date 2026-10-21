import { providers } from '../providers';

export const authService = {
  getSession() {
    return providers.auth.getSession()?.hospital ?? null;
  },
  async login(email: string, password: string) {
    const session = await providers.auth.login(email, password);
    return session.hospital;
  },
  logout() {
    providers.auth.logout();
  },
};
