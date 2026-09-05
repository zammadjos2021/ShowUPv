import React, { useState } from 'react';
import {
  X,
  LogIn,
  LogOut,
  User,
  Mail,
  Lock,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInAnonymously,
  User as FirebaseUser,
} from '../lib/firebase';
import { sounds } from '../utils/soundEffects';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  onSyncNow?: () => Promise<void>;
  isSyncing?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSyncNow,
  isSyncing = false,
}) => {
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    sounds.playClick();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        sounds.playSuccess();
        setSuccessMsg(`Welcome, ${result.user.displayName || 'User'}!`);
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User voluntarily closed or cancelled the popup - do not log as a harsh failure
        console.info('Google Sign-In popup closed by user.');
        setErrorMsg(
          'Sign-in was cancelled or the popup was closed. If the popup closed automatically due to iframe restrictions, open the app in a new tab or try Guest / Email sign-in below.'
        );
      } else if (err.code === 'auth/popup-blocked') {
        console.warn('Google Sign-In popup was blocked.');
        setErrorMsg(
          'Popup was blocked by your browser or container iframe. Please allow popups, open the app in a new browser tab, or use Email Sign-In.'
        );
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Another popup was triggered or superseded
        console.info('Previous popup request was superseded.');
      } else {
        console.error('Google Sign In Error:', err);
        setErrorMsg(err.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Quick Guest / Anonymous Sign-In
  const handleAnonymousSignIn = async () => {
    sounds.playClick();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await signInAnonymously(auth);
      if (result.user) {
        sounds.playSuccess();
        setSuccessMsg('Signed in as Guest! Cloud Firestore sync is now active.');
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      console.error('Anonymous Sign In Error:', err);
      setErrorMsg(err.message || 'Could not start guest session.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Sign-In / Registration
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playClick();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isRegister) {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        if (name && userCred.user) {
          await updateProfile(userCred.user, { displayName: name });
        }
        sounds.playSuccess();
        setSuccessMsg('Account created successfully! Cloud sync enabled.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        sounds.playSuccess();
        setSuccessMsg('Signed in successfully! Cloud records loaded.');
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setErrorMsg('Invalid email or password. Please verify your credentials.');
      } else if (err.code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Please sign in instead.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Log Out
  const handleLogout = async () => {
    sounds.playClick();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await signOut(auth);
      setSuccessMsg('Successfully logged out.');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      console.error('Sign Out Error:', err);
      setErrorMsg('Failed to sign out. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Top Banner */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#08093d] via-[#0d1052] to-[#121869] text-white flex items-center justify-between border-b border-[#1e257a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/30 border border-cyan-400/40 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {currentUser ? 'Account & Cloud Storage' : 'ShowUp Account Sign In'}
              </h3>
              <p className="text-[11px] text-slate-300">
                {currentUser ? 'Firebase Firestore Synced' : 'Sync your shifts & attendance records'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Status Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {currentUser ? (
            /* Logged-In User Profile Card */
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/50 rounded-2xl border border-indigo-100 flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-md">
                    <div className="w-full h-full rounded-full overflow-hidden bg-[#08093d] flex items-center justify-center text-white font-bold text-lg">
                      {currentUser.photoURL ? (
                        <img
                          src={currentUser.photoURL}
                          alt={currentUser.displayName || 'User'}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span>
                          {(currentUser.displayName || currentUser.email || 'U')
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white">
                    <ShieldCheck className="w-3 h-3" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {currentUser.displayName || 'ShowUp User'}
                  </h4>
                  <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {currentUser.email || 'Google Account'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Cloud Connected
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      UID: {currentUser.uid.slice(0, 6)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Cloud Sync Status & Manual Sync */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Cloud className="w-4 h-4 text-indigo-600" />
                    Firestore Cloud Synchronization
                  </span>
                  <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Your daily attendance records, clock-in times, and settings are automatically backed up to Google Firestore cloud database.
                </p>

                {onSyncNow && (
                  <button
                    type="button"
                    onClick={async () => {
                      sounds.playClick();
                      try {
                        await onSyncNow();
                        sounds.playSuccess();
                        setSuccessMsg('Records synchronized with Firestore successfully!');
                      } catch {
                        setErrorMsg('Sync failed. Please check network connection.');
                      }
                    }}
                    disabled={isSyncing}
                    className="w-full mt-2 py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Syncing to Cloud...' : 'Sync Records Now'}</span>
                  </button>
                )}
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4 text-rose-600" />
                <span>{isLoading ? 'Signing Out...' : 'Sign Out / Log Out'}</span>
              </button>
            </div>
          ) : (
            /* Logged-Out: Sign In Options */
            <div className="space-y-4">
              {/* Value Proposition Highlights */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 rounded-xl border border-indigo-100 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Why Sign In?</span>
                </div>
                <ul className="text-[11px] text-slate-600 space-y-1 pl-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Secure cloud storage via Google Firebase Firestore</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Sync attendance logs across phone and computer</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Never lose your DTR history even if cache is cleared</span>
                  </li>
                </ul>
              </div>

              {/* Tab Switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setAuthMode('google');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'google'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>Google Sign-In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    sounds.playClick();
                    setAuthMode('email');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    authMode === 'email'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span>Email &amp; Password</span>
                </button>
              </div>

              {authMode === 'google' ? (
                /* Primary Google Sign-In Button */
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-slate-400 font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-3 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
                  >
                    {/* Google SVG Icon */}
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>{isLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
                  </button>

                  <p className="text-[11px] text-center text-slate-500">
                    One-click login using your Google account with Firebase Authentication.
                  </p>

                  {/* Fallback Option: Instant Guest / Cloud Sync */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <p className="text-[11px] text-slate-400 text-center font-medium">
                      Trouble with popup or testing in preview?
                    </p>
                    <button
                      type="button"
                      onClick={handleAnonymousSignIn}
                      disabled={isLoading}
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Continue as Guest (Instant Cloud Sync)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Email / Password Form */
                <form onSubmit={handleEmailAuth} className="space-y-3 pt-1">
                  {isRegister && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Full Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Alex Morgan"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>
                      {isLoading
                        ? 'Processing...'
                        : isRegister
                        ? 'Create Account & Enable Cloud'
                        : 'Sign In to Account'}
                    </span>
                  </button>

                  <div className="text-center pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        sounds.playClick();
                        setIsRegister(!isRegister);
                        setErrorMsg(null);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                    >
                      {isRegister
                        ? 'Already have an account? Sign in here'
                        : "Don't have an account yet? Register now"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Protected by Firebase Security
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
