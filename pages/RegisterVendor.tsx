
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Vendor } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { ShieldCheck, Eye, EyeOff, Lock, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react';

interface RegisterVendorProps {
  vendors: Vendor[];
  onUpdateVendor: (v: Vendor) => void;
}

const RegisterVendor: React.FC<RegisterVendorProps> = ({ vendors, onUpdateVendor }) => {
  const { id } = useParams();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const vendor = vendors.find(v => v.id === id);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!vendor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl serif mb-4">Link Expired</h1>
          <p className="text-slate-500 font-light mb-8">This registration link is no longer valid or the vendor record was not found.</p>
          <button onClick={() => navigate('/')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest">Return Home</button>
        </div>
      </div>
    );
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    
    if (vendor.password && password === vendor.password) {
      setError("New password cannot be the same as the generated password.");
      return;
    }
    
    onUpdateVendor({
      ...vendor,
      password,
      passwordSet: true
    });
    
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-[3rem] shadow-2xl p-12 md:p-20 max-w-2xl w-full text-center space-y-8 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-12 h-12 text-green-500" strokeWidth={3} />
          </div>
          <h1 className="text-5xl serif leading-tight">Registration Complete</h1>
          <p className="text-slate-500 text-lg font-light leading-relaxed">
            Your credentials for <span className="text-slate-900 font-medium">{vendor.email}</span> have been secured. You can now access your vendor dashboard and manage your services.
          </p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="bg-slate-900 text-white px-12 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-sky-600 transition-all flex items-center justify-center gap-3 mx-auto"
          >
            Enter Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-20">
      <div className="max-w-md w-full space-y-12">
        <div className="text-center space-y-4">
          <div className="p-4 bg-sky-600 text-white rounded-3xl shadow-2xl shadow-sky-100 inline-block mb-4">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-4xl serif">Activate Account</h1>
          <p className="text-slate-500 font-light">Set a secure password for your vendor identity at Creative Events.</p>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-700 animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-xs font-bold uppercase tracking-wide">{error}</p>
            </div>
          )}

          <div className="mb-10 pb-6 border-b border-slate-50">
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-2">Vendor User ID</p>
            <p className="text-lg font-medium text-slate-900">{vendor.email}</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  required 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-12 py-4 text-sm outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="w-full bg-slate-900 text-white font-bold py-5 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-slate-100 hover:bg-sky-600 transition-all mt-4"
            >
              Secure My Account
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Managed by Creative Events Nordic AB
        </p>
      </div>
    </div>
  );
};

export default RegisterVendor;
