import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { EmergencyDetails } from './pages/EmergencyDetails';
import { Login } from './pages/Login';
import { NewEmergencies } from './pages/NewEmergencies';
import { OngoingCases } from './pages/OngoingCases';
import { HospitalRegistration } from './pages/HospitalRegistration';
import { Resources } from './pages/Resources';
import { CompletedCases } from './pages/CompletedCases';

export default function App() {
  return <Routes>
    <Route path="/signup" element={<HospitalRegistration />} />
    <Route path="/login" element={<Login />} />
    <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
      <Route index element={<Navigate to="/dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route path="new-emergencies" element={<NewEmergencies />} />
      <Route path="ongoing-cases" element={<OngoingCases />} />
      <Route path="completed-cases" element={<CompletedCases />} />
      <Route path="cases/:id" element={<EmergencyDetails />} />
      <Route path="emergencies/:id" element={<EmergencyDetails />} />
      <Route path="resources" element={<Resources />} />
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}
