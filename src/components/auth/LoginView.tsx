import React, { useState } from 'react';
import {
  Store,
  Lock,
  Mail,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  HelpCircle,
  ShieldCheck,
  Building,
} from 'lucide-react';
import {
  signInPartner,
  sendPasswordResetEmailToPartner,
} from '../../services/authService';

interface LoginViewProps {
  onSwitchToRegister: () => void;
  onOpenSupport: () => void;
  onOpenAdminModal?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSwitchToRegister,
  onOpenSupport,
  onOpenAdminModal,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetSuccess(null);

    if (!email.trim() || !password) {
      setError('Please provide both your registered email and password.');
      return;
    }

    try {
      setLoading(true);
      await signInPartner(email.trim(), password);
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = err.message || 'Login failed';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email address or password. Please verify your credentials.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please reset your password or try again later.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    try {
      setResetLoading(true);
      setError(null);
      await sendPasswordResetEmailToPartner(forgotEmail.trim());
      setResetSuccess(`Password reset instructions have been sent to ${forgotEmail.trim()}. Please check your inbox.`);
      setShowForgotModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="Dooars Daily Basket Logo"
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-contain shadow-lg shadow-emerald-600/15 bg-white border-2 border-emerald-50 p-1"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="mt-4 text-center text-2xl font-black text-slate-900 tracking-tight">
          Dooars Daily Basket
        </h2>
        <div className="mt-1 flex items-center justify-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Market Partner Portal
          </span>
        </div>
        <p className="mt-2 text-center text-xs text-slate-500 max-w-xs mx-auto">
          Dedicated seller terminal for registered grocery, meat, and fresh food merchants across Dooars.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl border border-slate-200/80 rounded-3xl">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {resetSuccess && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resetSuccess}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Merchant Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="partner@dooarsdailybasket.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-transform active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Store Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Divider */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-3">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <Building className="w-4 h-4 text-emerald-600" />
              <span>Register New Store / Market Partner</span>
            </button>

            <button
              type="button"
              onClick={onOpenSupport}
              className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Need help or onboarding assistance?</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-sm">Reset Password</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter your registered partner email address to receive secure reset instructions.
            </p>

            <form onSubmit={handleSendReset} className="mt-4 space-y-3">
              <input
                type="email"
                required
                placeholder="partner@dooarsdailybasket.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {resetLoading ? 'Sending...' : 'Send Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
