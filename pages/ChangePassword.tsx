
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Lock, Eye, EyeOff, Save, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

const ChangePassword: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
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
      await api.changePassword(user.id, newPassword);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Failed to update password. Please try again.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-[3rem] shadow-2xl p-12 max-w-lg w-full text-center space-y-6 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10 text-green-500" strokeWidth={3} />
          </div>
          <h1 className="text-3xl serif leading-tight">Password Updated</h1>
          <p className="text-slate-500 font-light">
            Your account credentials have been successfully updated.
          </p>
          <button 
            onClick={() => navigate('/')} 
            className="bg-slate-900 text-white px-10 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-sky-600 transition-all shadow-xl"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full">
        <div className="mb-8 flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-full text-slate-400 hover:text-slate-900 hover:shadow-md transition-all">
                <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl serif">Change Password</h1>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-12 py-4 text-sm outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New secure password"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-slate-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-12 py-4 text-sm outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-100 hover:bg-sky-600 transition-all mt-4 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : <><Save className="w-4 h-4" /> Update Password</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
