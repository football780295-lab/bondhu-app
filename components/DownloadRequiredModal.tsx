import React from 'react';
import { adminService } from '../services/adminService';

interface DownloadRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadAndLogin: () => void;
}

const DownloadRequiredModal: React.FC<DownloadRequiredModalProps> = ({
  isOpen,
  onClose,
  onDownloadAndLogin
}) => {
  if (!isOpen) return null;

  const handleDownloadClick = () => {
    adminService.recordInstall({ source: '3-Message Trial Limit Download' });
    onClose();
    // Directly triggers the native download / install prompt
    onDownloadAndLogin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col text-center animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="imo-blue text-white p-5 relative">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center text-2xl shadow-md border border-white/30 mb-2">
            <i className="fas fa-comments text-amber-300"></i>
          </div>
          <h3 className="font-extrabold text-base leading-tight">
            বেশি কথা বলতে চান?
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            আপনার ফ্রি ৩টি ট্রায়াল মেসেজ শেষ হয়েছে!
          </p>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 text-left space-y-2 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <i className="fas fa-check-circle text-emerald-500 shrink-0"></i>
              <span><b>আনলিমিটেড চ্যাটিং</b> ও ফ্রি কলিং সুবিধা</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fas fa-check-circle text-emerald-500 shrink-0"></i>
              <span>প্লে-স্টোর ছাড়াই সরাসরি ফোনে ১-ক্লিকে ইনস্টল</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="fas fa-check-circle text-emerald-500 shrink-0"></i>
              <span>হোম স্ক্রিন থেকে যেকোনো সময় এক ক্লিকে খুলুন</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            কথা চালিয়ে যেতে অনুগ্রহ করে নিচের বাটনে চাপ দিয়ে অ্যাপটি আপনার ফোনে ইনস্টল করে নিন।
          </p>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleDownloadClick}
              className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold py-3.5 rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer border border-emerald-400"
            >
              <i className="fas fa-download"></i>
              <span>অ্যাপ ডাউনলোড / ইনস্টল করুন</span>
            </button>

            <button
              onClick={onClose}
              className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 font-medium transition-colors cursor-pointer"
            >
              পরে করবো (Close)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadRequiredModal;
