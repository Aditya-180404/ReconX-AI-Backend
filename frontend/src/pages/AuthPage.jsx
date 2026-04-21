import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Mail, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

/* ── Password requirement checks ─── */
const REQUIREMENTS = [
  { id: 'length',    label: 'At least 8 characters',           test: (p) => p.length >= 8 },
  { id: 'lower',     label: 'Add lowercase letters (a-z)',      test: (p) => /[a-z]/.test(p) },
  { id: 'upper',     label: 'Add uppercase letters (A-Z)',      test: (p) => /[A-Z]/.test(p) },
  { id: 'number',    label: 'Add numbers (0-9)',                test: (p) => /[0-9]/.test(p) },
  { id: 'special',   label: 'Add special characters (!@#$%^&*)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

function getStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '#333' };
  const passed = REQUIREMENTS.filter(r => r.test(pwd)).length;
  if (passed <= 1) return { score: 1, label: 'WEAK',           color: '#ff3860' };
  if (passed === 2) return { score: 2, label: 'FAIR',           color: '#f97316' };
  if (passed === 3) return { score: 3, label: 'GOOD',           color: '#eab308' };
  if (passed === 4) return { score: 4, label: 'STRONG',         color: '#00ff41' };
                    return { score: 5, label: 'MILITARY GRADE', color: '#00ff41' };
}

/* ── Input Field ─── */
function Field({ id, icon: Icon, label, showToggle, show, onToggle, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
          {label}
        </label>
      )}
      <div className="relative">
        <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        <input
          id={id}
          {...props}
          className="w-full bg-[#0a120a] border border-[#0d230d] rounded-xl py-3 pl-10 pr-10 text-sm text-white placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-neon-green)] transition-all font-mono"
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggle}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-neon-green)] hover:text-white transition-colors"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AuthPage({ type = 'login' }) {
  const isLogin = type === 'login';
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const strength = getStrength(form.password);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      if (strength.score < 3) {
        setError('Password is too weak. Please meet more requirements.'); return;
      }
      if (form.password !== form.confirm) {
        setError('Passwords do not match.'); return;
      }
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await authService.login(form.email, form.password);
        login(res.data.token, res.data.user);
        navigate('/dashboard');
      } else {
        await authService.register(form.username, form.email, form.password);
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4">
      {/* Glow blob */}
      <div className="absolute w-[500px] h-[500px] bg-[var(--color-neon-green)]/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
        style={{
          background: 'rgba(5, 10, 5, 0.85)',
          border: '1px solid #0d2d0d',
          borderRadius: '1.5rem',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 0 40px rgba(0, 255, 65, 0.08)',
          padding: '2rem',
        }}
      >
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-[#0a120a] rounded-2xl mb-4 border border-[#0d2d0d]">
            <ShieldAlert className="text-[var(--color-neon-green)]" size={40} />
          </div>
          <h1 className="text-2xl font-black tracking-widest mb-1">
            ReconX<span className="text-[var(--color-neon-green)]">.AI</span>
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] font-mono">
            {isLogin ? 'SECURE AUTHENTICATION PORTAL' : 'CREATE OPERATOR ACCOUNT'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username - register only */}
          {!isLogin && (
            <Field
              id="username"
              icon={User}
              label="USERNAME"
              type="text"
              placeholder="Your username"
              value={form.username}
              onChange={set('username')}
              required
              autoComplete="username"
            />
          )}

          {/* Email */}
          <Field
            id="email"
            icon={Mail}
            label="EMAIL"
            type="email"
            placeholder="your@email.com"
            value={form.email}
            onChange={set('email')}
            required
            autoComplete="email"
          />

          {/* Password */}
          <Field
            id="password"
            icon={Lock}
            label="PASSWORD"
            type={showPwd ? 'text' : 'password'}
            placeholder="Enter password"
            value={form.password}
            onChange={set('password')}
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            showToggle
            show={showPwd}
            onToggle={() => setShowPwd((v) => !v)}
          />

          {/* Strength meter — register only */}
          <AnimatePresence>
            {!isLogin && form.password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 overflow-hidden"
              >
                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Password Strength</span>
                    <span className="text-[10px] font-mono font-bold" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#0d230d] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: strength.color, boxShadow: `0 0 8px ${strength.color}60` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(strength.score / 5) * 100}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                </div>

                {/* Requirement badges */}
                <div className="flex flex-wrap gap-2">
                  {REQUIREMENTS.map((req) => {
                    const met = req.test(form.password);
                    return (
                      <span
                        key={req.id}
                        className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 rounded-full border transition-all duration-300"
                        style={{
                          color: met ? '#00ff41' : '#f97316',
                          borderColor: met ? 'rgba(0,255,65,0.35)' : 'rgba(249,115,22,0.35)',
                          background: met ? 'rgba(0,255,65,0.08)' : 'rgba(249,115,22,0.08)',
                        }}
                      >
                        {met
                          ? <CheckCircle size={10} />
                          : <span className="text-[10px]">⚠</span>
                        }
                        {req.label}
                      </span>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Confirm Password — register only */}
          {!isLogin && (
            <div className="space-y-1.5">
              <Field
                id="confirm"
                icon={Lock}
                label="CONFIRM PASSWORD"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={set('confirm')}
                required
                autoComplete="new-password"
                showToggle
                show={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
              />
              {/* Match indicator */}
              {form.confirm && (
                <p
                  className="text-[10px] font-mono"
                  style={{ color: form.password === form.confirm ? '#00ff41' : '#ff3860' }}
                >
                  {form.password === form.confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2"
            >
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Submit */}
          <button
            id={isLogin ? 'login-btn' : 'register-btn'}
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 rounded-xl font-bold tracking-widest text-sm flex items-center justify-center gap-2 group transition-all disabled:opacity-50 font-mono"
            style={{
              background: loading ? 'rgba(0,255,65,0.1)' : 'var(--color-neon-green)',
              color: loading ? 'var(--color-neon-green)' : '#000',
              boxShadow: '0 0 20px rgba(0,255,65,0.3)',
            }}
          >
            <ShieldAlert size={16} />
            {loading ? 'PROCESSING…' : isLogin ? 'Sign In' : 'Create Account'}
            {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to={isLogin ? '/register' : '/login'}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-neon-green)] transition-colors font-mono"
          >
            {isLogin ? "No account? → Register operator" : "Already authorised? → Login"}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
