import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axios';
import { BookOpen, AlertCircle, Loader2, Eye, EyeOff, Mail, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';

// ── All helper components defined OUTSIDE to prevent remounting ──────────────

function Card({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 bg-gradient-to-br from-primary/10 to-transparent">
      <div className="w-full max-w-md p-8 glass-panel rounded-2xl animate-slide-in">
        <div className="flex justify-center mb-6">
          <div className="p-3 bg-primary rounded-xl shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-extrabold text-center text-foreground mb-2">CodeGurukul</h2>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center gap-2 text-sm border border-red-100">
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{error}</span>
    </div>
  );
}

function EyeBtn({ show, toggle }) {
  return (
    <button
      type="button"
      onClick={toggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
    >
      {show ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep]           = useState(1);   // 1=email, 2=otp, 3=newpwd, 4=done
  const [email, setEmail]         = useState('');
  const [otp, setOtp]             = useState(['', '', '', '', '', '']);
  const [tempToken, setTempToken] = useState(null);
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [resendIn, setResendIn]   = useState(0);
  const resendTimer               = useRef(null);

  // Fixed OTP refs — defined once via useRef
  const otpRef0 = useRef(null);
  const otpRef1 = useRef(null);
  const otpRef2 = useRef(null);
  const otpRef3 = useRef(null);
  const otpRef4 = useRef(null);
  const otpRef5 = useRef(null);
  const otpRefs = [otpRef0, otpRef1, otpRef2, otpRef3, otpRef4, otpRef5];

  const handleOtpChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs[idx + 1].current?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const startResendTimer = () => {
    clearInterval(resendTimer.current);
    setResendIn(60);
    resendTimer.current = setInterval(() => {
      setResendIn(prev => {
        if (prev <= 1) { clearInterval(resendTimer.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Send OTP
  const requestOtp = async (e) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setStep(2);
      startResendTimer();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const verifyOtp = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) { setError('Please enter all 6 digits.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { email, otpCode });
      setTempToken(res.data.tempToken);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const resetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, newPassword: password, tempToken });
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = (toStep) => { setError(''); setStep(toStep); };

  // ── STEP 1: Email ─────────────────────────────────────────────────────────
  if (step === 1) return (
    <Card>
      <p className="text-center text-gray-500 mb-8">Reset your password</p>
      <ErrorBox error={error} />
      <form onSubmit={requestOtp} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@mit.edu.in"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
        </button>
      </form>
      <button onClick={() => navigate('/login')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mt-4 transition-colors">
        <ArrowLeft size={14} /> Back to Login
      </button>
    </Card>
  );

  // ── STEP 2: OTP ───────────────────────────────────────────────────────────
  if (step === 2) return (
    <Card>
      <p className="text-center text-gray-500 mb-1">Enter the 6-digit OTP</p>
      <p className="text-center text-xs text-gray-400 mb-6">
        Sent to <strong>{email}</strong> — valid for 10 minutes
      </p>
      <ErrorBox error={error} />
      <form onSubmit={verifyOtp} className="space-y-6">
        <div className="flex justify-center gap-2">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={otpRefs[idx]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(idx, e.target.value)}
              onKeyDown={e => handleOtpKeyDown(idx, e)}
              className="w-11 h-12 text-center text-xl font-bold border-2 rounded-lg outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30 border-gray-300"
            />
          ))}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-70"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><KeyRound size={16} /> Verify OTP</>}
        </button>
        <p className="text-center text-sm text-gray-500">
          {resendIn > 0 ? (
            <span>Resend OTP in <strong>{resendIn}s</strong></span>
          ) : (
            <button type="button" onClick={requestOtp} className="text-primary font-medium hover:underline">
              Resend OTP
            </button>
          )}
        </p>
      </form>
      <button onClick={() => goBack(1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mt-4 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>
    </Card>
  );

  // ── STEP 3: New Password ──────────────────────────────────────────────────
  if (step === 3) return (
    <Card>
      <p className="text-center text-gray-500 mb-8">Set your new password</p>
      <ErrorBox error={error} />
      <form onSubmit={resetPassword} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              required
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full px-4 py-2 pr-11 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
            />
            <EyeBtn show={showPwd} toggle={() => setShowPwd(v => !v)} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <div className="relative">
            <input
              type={showConf ? 'text' : 'password'}
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter new password"
              className={`w-full px-4 py-2 pr-11 border rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all ${
                confirm && password !== confirm ? 'border-red-400 focus:border-red-400' : 'border-gray-300 focus:border-primary'
              }`}
            />
            <EyeBtn show={showConf} toggle={() => setShowConf(v => !v)} />
          </div>
          {confirm && password !== confirm && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading || Boolean(confirm && password !== confirm)}
          className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
        </button>
      </form>
      <button onClick={() => goBack(2)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary mt-4 transition-colors">
        <ArrowLeft size={14} /> Back
      </button>
    </Card>
  );

  // ── STEP 4: Success ───────────────────────────────────────────────────────
  return (
    <Card>
      <div className="text-center py-4">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Password Updated!</h3>
        <p className="text-gray-500 text-sm mb-6">
          Your password has been reset successfully.<br />
          A confirmation email with your new credentials has been sent to <strong>{email}</strong>.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow-md transition-all"
        >
          Back to Login
        </button>
      </div>
    </Card>
  );
}
