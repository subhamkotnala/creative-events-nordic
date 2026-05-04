import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const RegisterVendor: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] shadow-2xl p-12 md:p-20 max-w-2xl w-full text-center space-y-8 animate-in zoom-in duration-500 border border-slate-100">
        <div className="w-24 h-24 bg-sky-50 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldCheck className="w-12 h-12 text-sky-600" strokeWidth={2} />
        </div>
        <h1 className="text-5xl serif leading-tight">Account Active</h1>
        <p className="text-slate-500 text-lg font-light leading-relaxed">
          Your account has already been created. You set your password during sign-up. Please proceed to the login page to access your dashboard.
        </p>
        <button 
          onClick={() => navigate('/login')} 
          className="bg-slate-900 text-white px-12 py-5 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-sky-600 transition-all flex items-center justify-center gap-3 mx-auto"
        >
          Go to Login <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default RegisterVendor;
