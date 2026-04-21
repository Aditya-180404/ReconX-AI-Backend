import { useState, useEffect } from 'react';
import { Settings, Key, Bell, Shield, Users, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="glass p-6 rounded-2xl space-y-5">
      <h2 className="text-sm font-bold text-white flex items-center gap-2">
        <Icon size={16} className="text-[var(--color-neon-green)]" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Field({ label, id, type = 'text', value, onChange, hint, placeholder, ...props }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        {...props}
        className="w-full bg-[#0a120a] border border-[#0d230d] rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-[var(--color-neon-green)] transition-all font-mono"
      />
      {hint && <p className="text-[10px] text-[var(--color-text-muted)] font-mono">{hint}</p>}
    </div>
  );
}

function Toggle({ label, desc, defaultChecked = false }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {desc && <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{desc}</p>}
      </div>
      <label className="relative inline-flex cursor-pointer">
        <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
        <div className="w-10 h-5 bg-[#0d230d] border border-[#0d230d] rounded-full peer peer-checked:bg-[var(--color-neon-green)] transition-all"></div>
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5 shadow-sm"></div>
      </label>
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState({ username: '', email: '' });
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [status, setStatus] = useState({ msg: '', type: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authService.getProfile().then(res => {
      setProfile({ username: res.data.username, email: res.data.email });
    }).catch(() => {});
  }, []);

  const handleUpdateProfile = async () => {
    setLoading(true);
    setStatus({ msg: '', type: '' });
    try {
      const res = await authService.updateProfile(profile);
      setStatus({ msg: res.data.message, type: 'success' });
    } catch (err) {
      setStatus({ msg: err.response?.data?.error || 'Failed to update profile', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setStatus({ msg: 'New passwords do not match', type: 'error' });
      return;
    }
    setLoading(true);
    setStatus({ msg: '', type: '' });
    try {
      const res = await authService.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword
      });
      setStatus({ msg: res.data.message, type: 'success' });
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setStatus({ msg: err.response?.data?.error || 'Failed to update password', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <Settings className="text-[var(--color-neon-green)]" size={26} />
          Platform Settings
        </h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage your account, AI keys and notification preferences.</p>
      </div>

      <AnimatePresence>
        {status.msg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border flex items-center gap-3 text-sm font-mono ${
              status.type === 'success' 
                ? 'bg-green-500/10 border-green-500/30 text-[var(--color-neon-green)]' 
                : 'bg-red-500/10 border-red-500/30 text-[#ff3860]'
            }`}
          >
            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            {status.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <Section title="Account" icon={Users}>
        <div className="space-y-4">
          <Field 
            label="Username" 
            value={profile.username} 
            onChange={e => setProfile({...profile, username: e.target.value})}
          />
          <Field 
            label="Email" 
            type="email" 
            value={profile.email} 
            onChange={e => setProfile({...profile, email: e.target.value})}
          />
          <button 
            onClick={handleUpdateProfile}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-mono font-bold bg-[var(--color-neon-green)]/10 border border-[var(--color-neon-green)]/40 text-[var(--color-neon-green)] rounded-lg hover:bg-[var(--color-neon-green)] hover:text-black transition-all disabled:opacity-50 shadow-neon-green/10"
          >
            {loading && status.type === '' ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Section>

      <Section title="Change Password" icon={Key}>
        <div className="space-y-4">
          <Field 
            label="Current Password" 
            type="password" 
            value={pwdForm.currentPassword}
            onChange={e => setPwdForm({...pwdForm, currentPassword: e.target.value})}
          />
          <Field 
            label="New Password" 
            type="password" 
            value={pwdForm.newPassword}
            onChange={e => setPwdForm({...pwdForm, newPassword: e.target.value})}
          />
          <Field 
            label="Confirm Password" 
            type="password" 
            value={pwdForm.confirmPassword}
            onChange={e => setPwdForm({...pwdForm, confirmPassword: e.target.value})}
          />
          <button 
            onClick={handleChangePassword}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-mono font-bold bg-[var(--color-neon-green)]/10 border border-[var(--color-neon-green)]/40 text-[var(--color-neon-green)] rounded-lg hover:bg-[var(--color-neon-green)] hover:text-black transition-all disabled:opacity-50 shadow-neon-green/10"
          >
             Update Password
          </button>
        </div>
      </Section>

      <Section title="API Keys" icon={Globe}>
        <Field label="Gemini API Key" type="password" hint="Used for autonomous scanning and AI report generation." placeholder="••••••••••••••••" />
        <Field label="ReconX Platform API Token" value="rx_live_••••••••••••••••" hint="Use this token to call the ReconX API from external tools." readOnly />
        <button className="px-5 py-2.5 text-xs font-mono font-bold bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg hover:border-[var(--color-neon-green)]/50 hover:text-white transition-all">
          Regenerate Token
        </button>
      </Section>

      <Section title="Notifications" icon={Bell}>
        <Toggle label="Email on Scan Complete"       desc="Get a summary email when any scan finishes."      defaultChecked={true} />
        <Toggle label="Critical Finding Alerts"       desc="Immediate notification for Critical/High findings." defaultChecked={true} />
        <Toggle label="Weekly Security Digest"        desc="Weekly roll-up of your overall security posture."  />
        <Toggle label="Dark Web Leak Monitoring"      desc="Alert when credentials appear in breach databases." defaultChecked={false} />
      </Section>

      <Section title="Security" icon={Shield}>
        <Toggle label="Two-Factor Authentication"    desc="Require TOTP code on every login."                  defaultChecked={false} />
        <Toggle label="Login Throttling"             desc="Lock account after 5 failed login attempts."         defaultChecked={true} />
      </Section>

      <div className="pt-4 border-t border-[var(--color-border)] text-center">
        <button className="text-[10px] font-mono uppercase tracking-widest text-[#ff3860] hover:underline opacity-70 hover:opacity-100 transition-opacity">
          Delete Account &amp; All Data
        </button>
      </div>
    </div>
  );
}
