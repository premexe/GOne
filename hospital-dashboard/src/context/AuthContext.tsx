import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';
import { authService } from '../services/auth';
import type { Hospital } from '../types';

interface AuthContextValue {
  currentHospital: Hospital | null;
  login: (email: string, password: string) => Promise<Hospital>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [currentHospital, setCurrentHospital] = useState<Hospital | null>(() => authService.getSession());

  const value = useMemo<AuthContextValue>(() => ({
    currentHospital,
    async login(email, password) {
      const hospital = await authService.login(email, password);
      setCurrentHospital(hospital);
      return hospital;
    },
    logout() {
      authService.logout();
      setCurrentHospital(null);
    },
  }), [currentHospital]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
