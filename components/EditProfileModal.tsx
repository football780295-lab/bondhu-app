import React, { useState, useRef } from 'react';
import { AuthUser, firebaseService } from '../services/firebaseService';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
}

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Raihan",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Tanvir",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Siam",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Sakib"
];

// Helper to compress uploaded image down to a lightweight crisp JPEG
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 360;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(img.src);
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, currentUser }) => {
  const [displayName, setDisplayName] = useState(
    currentUser.displayName === 'Guest User' ? '' : currentUser.displayName
  );
  const [photoURL, setPhotoURL] = useState(currentUser.photoURL || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন (JPEG, PNG ইত্যাদি)');
      return;
    }

    setIsUploading(true);
    setErrorMsg('');
    try {
      const compressedDataUrl = await compressImage(file);
      setPhotoURL(compressedDataUrl);
    } catch (err) {
      console.error("Image processing error:", err);
      setErrorMsg('ছবি প্রসেস করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = displayName.trim();

    if (!cleanName) {
      setErrorMsg('অনুগ্রহ করে আপনার নামটি লিখুন');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await firebaseService.updateProfile(cleanName, photoURL);
      setSuccessMsg(`✓ প্রোফাইল সেভ হয়েছে! মেয়েরা এখন আপনাকে "${cleanName.split(' ')[0]}" নামে ডেকে কথা বলবে।`);
      setTimeout(() => {
        setIsSaving(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("Profile save error:", err);
      setErrorMsg(err.message || 'প্রোফাইল সেভ করতে সমস্যা হয়েছে।');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="imo-blue text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fas fa-user-edit text-lg"></i>
            <h3 className="font-bold text-base">প্রোফাইল কাস্টমাইজ করুন</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-sm"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 scroll-container flex-1">
          {/* Avatar Preview & Upload */}
          <div className="flex flex-col items-center text-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              {photoURL ? (
                <img 
                  src={photoURL} 
                  alt="avatar" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 shadow-lg group-hover:opacity-90 transition-opacity" 
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-blue-100 text-blue-600 border-4 border-blue-400 flex items-center justify-center text-3xl font-bold shadow-md">
                  <i className="fas fa-user"></i>
                </div>
              )}
              
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 text-white border-2 border-white flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors">
                <i className={`fas ${isUploading ? 'fa-spinner fa-spin' : 'fa-camera'} text-xs`}></i>
              </div>

              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="hidden" 
              />
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1.5"
            >
              <i className="fas fa-cloud-upload-alt text-sm"></i>
              <span>{photoURL ? 'ছবি পরিবর্তন করুন (গ্যালারি থেকে)' : 'নিজের ছবি আপলোড করুন'}</span>
            </button>
            <p className="text-[10px] text-gray-400 mt-0.5">গ্যালারি বা ক্যামেরা থেকে ছবি বেছে নিন</p>
          </div>

          {/* Preset Avatars Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              অথবা রেডিমেড ছবি পছন্দ করুন:
            </label>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scroll-container">
              {AVATAR_PRESETS.map((preset, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setPhotoURL(preset)}
                  className={`w-12 h-12 rounded-full shrink-0 border-2 transition-all p-0.5 ${
                    photoURL === preset ? 'border-blue-600 scale-105 shadow-md' : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <img src={preset} alt="preset" className="w-full h-full rounded-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Form Input for Name */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                আপনার নাম (Display Name) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="যেমন: তানভীর, সিয়াম, সাকিব..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white text-gray-800 transition-colors font-medium"
                  required
                />
                <i className="fas fa-id-badge absolute left-3 top-3 text-gray-400 text-sm"></i>
              </div>
              <p className="text-[11px] text-blue-600 mt-1.5 flex items-start gap-1">
                <i className="fas fa-info-circle text-[10px] mt-0.5 shrink-0"></i>
                <span>মেসেজে মেয়েরা আপনাকে সরাসরি এই নামে ডেকে কথা বলবে।</span>
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
                <i className="fas fa-exclamation-circle shrink-0"></i>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-2 font-medium animate-fadeIn">
                <i className="fas fa-check-circle text-base shrink-0"></i>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Save Button */}
            <button
              type="submit"
              disabled={isSaving || isUploading}
              className="w-full imo-blue text-white font-bold py-3 rounded-xl shadow-md hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>সংরক্ষণ হচ্ছে...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i>
                  <span>প্রোফাইল সেভ করুন</span>
                </>
              )}
            </button>
          </form>

          {/* Account status note */}
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100 text-center">
            {currentUser.isGuest ? (
              <p className="text-[11px] text-gray-500">
                💡 আপনি গেস্ট হিসেবে আছেন। সাইন আপ করলে আপনার প্রোফাইল ও কথোপকথন আজীবনের জন্য সুরক্ষিত থাকবে।
              </p>
            ) : (
              <p className="text-[11px] text-green-600 font-medium">
                ✓ আপনার ভেরিফাইড অ্যাকাউন্টে এটি সেভ থাকবে।
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
