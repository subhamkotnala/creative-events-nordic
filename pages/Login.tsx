import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../supabaseClient';
import { ShieldCheck, Loader2, AlertCircle, ArrowRight, User, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromRaw = (location.state as any)?.from;
  const from: string = typeof fromRaw === 'string' ? fromRaw : (fromRaw?.pathname || '/');

  // Tab state
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Forgot Password state
  const [showForgotForm, setShowForgotForm] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Sign Up state
  const [username, setUsername] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirm, setSignUpConfirm] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  // --- SIGN IN ---
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setIsSigningIn(true);
    try {
      const user = await login(signInEmail, signInPassword);
      let destination = from;
      if (!destination || destination === '/' || destination === '/login') {
        if (user?.role === 'ADMIN') destination = '/admin';
        else if (user?.role === 'VENDOR') destination = '/dashboard';
        else destination = '/';
      }
      navigate(destination, { replace: true });
    } catch (err: any) {
      setSignInError(err.message || 'Invalid credentials. Please try again.');
      setIsSigningIn(false);
    }
  };

  // --- FORGOT PASSWORD ---
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setIsSendingReset(true);
    
    try {
      const trimmedEmail = forgotEmail.trim().toLowerCase();
      
      // Step 1: Check in the profiles table if email exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', trimmedEmail)
        .limit(1);

      if (profileError) {
        throw new Error(profileError.message || 'Error verifying account email.');
      }

      if (!profileData || profileData.length === 0) {
        throw new Error('No user account with this email exists. Please switch to the Sign Up tab and create a new account.');
      }

      // Step 2: Request reset link from Supabase Auth
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/#/reset-password`
      });

      if (resetError) {
        throw resetError;
      }

      setForgotSuccess('A password reset link has been successfully sent to your email. Please check your inbox and click "Verify Me" in that email to proceed.');
      setForgotEmail('');
    } catch (err: any) {
      setForgotError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSendingReset(false);
    }
  };

  // --- SIGN UP ---
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpError(null);

    if (!username.trim()) { setSignUpError('Username is required.'); return; }
    if (username.trim().length < 3) { setSignUpError('Username must be at least 3 characters.'); return; }
    if (!signUpEmail.trim()) { setSignUpError('Email is required.'); return; }
    if (signUpPassword.length < 6) { setSignUpError('Password must be at least 6 characters.'); return; }
    if (signUpPassword !== signUpConfirm) { setSignUpError('Passwords do not match.'); return; }

    setIsSigningUp(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signUpEmail.trim(),
        password: signUpPassword,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Sign up failed. Please try again.');

      const profileId = crypto.randomUUID();
      const { error: profileError } = await supabase.from('profiles').insert({
        id: profileId,
        auth_id: authData.user.id,
        email: signUpEmail.trim().toLowerCase(),
        business_name: username.trim(),
        role: 'USER',
        joined_at: new Date().toISOString(),
      });

      if (profileError) {
        console.warn('Profile insert warning:', profileError.message);
      }

      setSignUpSuccess(true);
    } catch (err: any) {
      console.error('Sign up failed:', err);
      setSignUpError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSigningUp(false);
    }
  };

  if (signUpSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center animate-in fade-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl serif text-slate-900 mb-2">Account Created!</h1>
          <p className="text-sm text-slate-500 font-light leading-relaxed mb-6">
            A confirmation email has been sent to{' '}
            <span className="font-semibold text-slate-700">{signUpEmail}</span>.
            Please verify your email, then sign in.
          </p>
          <button
            onClick={() => {
              setSignUpSuccess(false);
              setActiveTab('signin');
              setSignInEmail(signUpEmail);
            }}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-sky-600 transition-all"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full animate-in fade-in zoom-in duration-300">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-slate-900 text-white rounded-2xl mb-4 shadow-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl serif font-medium text-slate-900">Creative Events</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Your Nordic Event Marketplace</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
          <button
            onClick={() => { setActiveTab('signin'); setSignInError(null); setShowForgotForm(false); setForgotError(null); setForgotSuccess(null); }}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
              activeTab === 'signin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setActiveTab('signup'); setSignUpError(null); setShowForgotForm(false); setForgotError(null); setForgotSuccess(null); }}
            className={`flex-1 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${
              activeTab === 'signup'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-100">

          {/* ======= SIGN IN TAB ======= */}
          {activeTab === 'signin' && (
            <>
              {showForgotForm ? (
                <>
                  <div className="mb-6 animate-in fade-in">
                    <h2 className="text-xl serif text-slate-900">Reset Password</h2>
                    <p className="text-xs text-slate-400 mt-1">Enter your email address to receive a secure reset link</p>
                  </div>

                  {forgotError && (
                    <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in animate-duration-200">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                      <div className="space-y-2 flex-grow">
                        <p className="text-xs font-semibold leading-relaxed">{forgotError}</p>
                        {forgotError.includes('Sign Up') && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('signup');
                              setShowForgotForm(false);
                              setSignUpEmail(forgotEmail);
                              setForgotError(null);
                            }}
                            className="text-xs font-bold text-sky-600 underline hover:text-sky-700 flex items-center gap-1 mt-1 transition-colors"
                          >
                            Go to Sign Up <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {forgotSuccess && (
                    <div className="mb-5 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-start gap-3 text-green-700 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-500" />
                      <p className="text-xs font-medium leading-relaxed">{forgotSuccess}</p>
                    </div>
                  )}

                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                          type="email"
                          required
                          value={forgotEmail}
                          onChange={e => { setForgotEmail(e.target.value); setForgotError(null); }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                          placeholder="name@example.com"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSendingReset}
                        className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-sky-600 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSendingReset ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>Send Reset Link <Mail className="w-4 h-4" /></>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotForm(false);
                          setForgotError(null);
                          setForgotSuccess(null);
                        }}
                        className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all text-center font-sans mt-0.5"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl serif text-slate-900">Welcome Back</h2>
                    <p className="text-xs text-slate-400 mt-1">Sign in to your existing account</p>
                  </div>

                  {signInError && (
                    <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <p className="text-xs font-medium leading-relaxed">{signInError}</p>
                    </div>
                  )}

                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                          type="email"
                          required
                          value={signInEmail}
                          onChange={e => { setSignInEmail(e.target.value); setSignInError(null); }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-slate-950 focus:border-transparent outline-none transition-all"
                          placeholder="name@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input
                          type={showSignInPassword ? 'text' : 'password'}
                          required
                          value={signInPassword}
                          onChange={e => { setSignInPassword(e.target.value); setSignInError(null); }}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-slate-950 focus:border-transparent outline-none transition-all"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(p => !p)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                        >
                          {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowForgotForm(true);
                          setForgotEmail(signInEmail);
                          setForgotError(null);
                          setForgotSuccess(null);
                        }}
                        className="text-[11px] font-bold text-sky-600 hover:text-sky-700 transition-colors focus:outline-none"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isSigningIn}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-sky-600 hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSigningIn ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Sign In <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </form>
                </>
              )}
            </>
          )}

          {/* ======= SIGN UP TAB ======= */}
          {activeTab === 'signup' && (
            <>
              <div className="mb-6">
                <h2 className="text-xl serif text-slate-900">Create Account</h2>
                <p className="text-xs text-slate-400 mt-1">Join as a user to explore &amp; chat with vendors</p>
              </div>

              {signUpError && (
                <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-medium leading-relaxed">{signUpError}</p>
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Username */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={e => { setUsername(e.target.value); setSignUpError(null); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                      placeholder="e.g. johndoe"
                      minLength={3}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="email"
                      required
                      value={signUpEmail}
                      onChange={e => { setSignUpEmail(e.target.value); setSignUpError(null); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type={showSignUpPassword ? 'text' : 'password'}
                      required
                      value={signUpPassword}
                      onChange={e => { setSignUpPassword(e.target.value); setSignUpError(null); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                      placeholder="Min. 6 characters"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignUpPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                    >
                      {showSignUpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="password"
                      required
                      value={signUpConfirm}
                      onChange={e => { setSignUpConfirm(e.target.value); setSignUpError(null); }}
                      className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all ${
                        signUpConfirm && signUpPassword !== signUpConfirm
                          ? 'border-red-300 bg-red-50'
                          : 'border-slate-200'
                      }`}
                      placeholder="Repeat your password"
                    />
                  </div>
                  {signUpConfirm && signUpPassword !== signUpConfirm && (
                    <p className="text-[10px] text-red-500 font-medium ml-1">Passwords don't match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSigningUp}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-sky-600 hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningUp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-slate-400 mt-5">
                Want to list your business?{' '}
                <Link to="/join" className="font-bold text-sky-600 hover:text-sky-700 transition-colors">
                  Join as Vendor
                </Link>
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default Login;
