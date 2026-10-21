import { Eye, EyeOff, HeartPulse, LockKeyhole, Network } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { currentHospital, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (currentHospital) return <Navigate to="/dashboard" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      const destination = (location.state as { from?: string } | null)?.from ?? '/dashboard';
      navigate(destination, { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return <div className="login-page">
    <section className="login-brand-panel">
      <div className="login-brand"><span className="brand__mark"><HeartPulse size={22} /></span><div><strong>LifeLink AI+</strong><small>Hospital Operations Network</small></div></div>
      <div className="login-hero-copy"><span className="eyebrow eyebrow--light">Connected emergency response</span><h1>Emergency response,<br />connected.</h1><p>One operational portal for authorized LifeLink hospital partners receiving cases allocated by the LifeLink network.</p></div>
      <div className="login-network-note"><Network size={18} /><span><strong>Multi-hospital coordination</strong>Each partner sees only its allocated cases, resources and capacity.</span></div>
    </section>
    <section className="login-form-panel">
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <span className="eyebrow">Authorized partner access</span><h2>Hospital login</h2><p>Sign in to your hospital operational portal.</p>
          {error && <div className="login-error" role="alert">{error}</div>}
          <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="hospital@gmail.com or official email" required /></label>
          <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
          <button className="button button--primary button--full login-submit" disabled={loading}>{loading ? 'Connecting hospitalâ€¦' : 'Sign in'}<LockKeyhole size={15} /></button>
          <small className="login-note">Secured with JWT &middot; Hospital credentials verified against LifeLink database.</small>
          <Link className="text-link" to="/signup">New hospital? Join LifeLink</Link>
        </form>
        
      </div>
    </section>
  </div>;
}

