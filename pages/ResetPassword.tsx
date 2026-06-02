import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, Eye, EyeOff, Save, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  
  const [session, setSession] = useState<any>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if the URL hash contains an error from Supabase (e.g. expired link)
    const hash = window.location.hash;
    if (hash.includes('error=') || hash.includes('error_code=')) {
      const params = new URLSearchParams(hash.replace(/^#/, ''));
      const errorDesc = params.get('error_description');
      if (errorDesc) {
        setLinkError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
        setCheckingSession(false);
        return;
      }
    }

    // Listen for the PASSWORD_RECOVERY event — Supabase fires this when the
    // reset link is clicked and the token is valid.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, freshSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSession(freshSession);
        setCheckingSession(false);
      } else if (event === 'SIGNED_IN' && freshSession) {
        // Fallback: already signed in via token exchange
        setSession(freshSession);
        setCheckingSession(false);
      }
    });

    // Also check if a session already exists (e.g. user refreshed the page)
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession) {
        setSession(currentSession);
        setCheckingSession(false);
      } else {
        // No session yet — wait up to 5 seconds for the auth event
        const timeout = setTimeout(() => {
          setCheckingSession(false);
        }, 5000);
        return () => clearTimeout(timeout);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-sky-600 animate-spin mb-4" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Verifying session...</p>
      </div>
    );
  }

  if (linkError) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100 text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl serif text-slate-900 leading-tight">Link Expired</h1>
          <p className="text-sm text-slate-500 leading-relaxed font-light">
            {linkError}. Password reset links are only valid for <strong>1 hour</strong>. Please request a new one.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-sky-600 transition-all font-sans flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Request New Link
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100 text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl serif text-slate-900 leading-tight">Access Denied</h1>
          <p className="text-sm text-slate-500 leading-relaxed font-light">
            You must use the password reset link sent to your email to access this page.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-sky-600 transition-all font-sans"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-[2.5rem] shadow-xl p-8 border border-slate-100 text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
            <CheckCircle2 className="w-8 h-8 text-green-500" strokeWidth={3} />
          </div>
          <h1 className="text-2xl serif text-slate-900 leading-tight">Password Reset Success</h1>
          <p className="text-sm text-slate-500 leading-relaxed font-light">
            Your credentials have been successfully updated. You may now explore and access all features.
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="w-full bg-slate-900 text-white py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-sky-600 transition-all shadow-xl font-sans"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-6">
          <h1 className="text-2xl serif font-medium text-slate-900">Choose New Password</h1>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Reset your credentials safely</p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-600 animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  minLength={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all ${
                    confirmPassword && newPassword !== confirmPassword
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200'
                  }`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                />
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[10px] text-red-500 font-medium ml-1">Passwords don't match</p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest hover:bg-sky-600 transition-all shadow-xl mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <><Save className="w-4 h-4" /> Set New Password</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
