import React, { useState } from 'react';
import { firebaseService, AuthUser } from '../services/firebaseService';
import { adminService } from '../services/adminService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  onAdminLogin?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, onAdminLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Secret Admin check - completely invisible to regular users
    if (adminService.isAdminCredentials(email, password)) {
      setLoading(true);
      adminService.setAdminLoggedIn(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bondhu-admin-login'));
      }
      setTimeout(() => {
        if (onAdminLogin) {
          onAdminLogin();
        }
        setLoading(false);
        onClose();
      }, 200);
      return;
    }

    if (!email.trim() || !password.trim()) {
      setError('অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড দিন।');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('অনুগ্রহ করে আপনার পুরো নাম দিন।');
        return;
      }
      if (password.length < 6) {
        setError('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
        return;
      }
      if (password !== confirmPassword) {
        setError('পাসওয়ার্ড দুটি মেলেনি। আবার চেক করুন।');
        return;
      }
    }

    setLoading(true);
    try {
      let user: AuthUser;
      if (mode === 'signup') {
        user = await firebaseService.signUp(email, password, name);
      } else {
        user = await firebaseService.signIn(email, password);
      }
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await firebaseService.signInWithGoogle(name || 'Google User', email);
      onSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'গুগল দিয়ে প্রবেশ ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - 100% normal user facing */}
        <div className="imo-blue p-5 text-white flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <img 
              src="/icon-192.png" 
              alt="Bondhu Logo" 
              className="w-11 h-11 rounded-2xl bg-white p-0.5 object-contain shadow-md shrink-0" 
            />
            <div>
              <h3 className="text-xl font-bold">
                {mode === 'login' ? 'অ্যাকাউন্টে লগইন করুন' : 'নতুন অ্যাকাউন্ট তৈরি করুন'}
              </h3>
              <p className="text-xs text-blue-100 mt-0.5">
                বন্ধু অ্যাপে যুক্ত হয়ে প্রোফাইল সেভ রাখুন
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Tab Toggle - Only Login & Signup */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 p-1 m-3 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            লগইন (Sign In)
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === 'signup' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            সাইন আপ (Sign Up)
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 overflow-y-auto scroll-container flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl flex items-center gap-2">
              <i className="fas fa-exclamation-circle text-red-500 shrink-0"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">আপনার পুরো নাম</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="যেমন: তানভীর আহমেদ"
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                  <i className="fas fa-user absolute left-3 top-3 text-gray-400 text-xs"></i>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                ইমেইল ঠিকানা বা ইউজারনেম
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@example.com"
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
                <i className="fas fa-envelope absolute left-3 top-3 text-gray-400 text-xs"></i>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">পাসওয়ার্ড</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="পাসওয়ার্ড লিখুন"
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
                <i className="fas fa-lock absolute left-3 top-3 text-gray-400 text-xs"></i>
              </div>
            </div>

            {mode === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">পাসওয়ার্ড নিশ্চিত করুন</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="পুনরায় পাসওয়ার্ড লিখুন"
                    className="w-full text-xs bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-9 pr-3 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                    required
                  />
                  <i className="fas fa-shield-alt absolute left-3 top-3 text-gray-400 text-xs"></i>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white text-xs font-bold py-3 rounded-xl shadow-md hover:opacity-90 active:scale-98 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer imo-blue"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>প্রক্রিয়াধীন...</span>
                </>
              ) : (
                <>
                  <i className={`fas ${mode === 'login' ? 'fa-sign-in-alt' : 'fa-user-plus'}`}></i>
                  <span>
                    {mode === 'login' ? 'লগইন করুন' : 'অ্যাকাউন্ট তৈরি করুন'}
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="flex items-center my-4">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-3 text-[11px] text-gray-400 font-medium">অথবা</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Google Sign In */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-gray-300 text-gray-700 text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs hover:bg-gray-50 active:scale-98 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <i className="fab fa-google text-red-500 text-sm"></i>
            <span>গুগল দিয়ে প্রবেশ করুন (Google)</span>
          </button>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center text-[11px] text-gray-400">
          <span>লগইন ছাড়াও আপনি সবসময় গেস্ট হিসেবে অ্যাপ চালাতে পারবেন।</span>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
