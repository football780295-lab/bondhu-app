import React from 'react';
import { creditService } from '../services/creditService';

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
    creditService.setIsInstalled(true);
    creditService.resetGuestCount();

    // 1. Trigger PWA install if available
    const promptEvent = (window as any).deferredInstallPrompt;
    if (promptEvent) {
      promptEvent.prompt();
      promptEvent.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          creditService.setIsInstalled(true);
          (window as any).deferredInstallPrompt = null;
        }
      }).catch(() => {});
    } else {
      creditService.setIsInstalled(true);
    }

    // 2. Guide user to Sign In as requested by owner
    onDownloadAndLogin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 flex flex-col text-center animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 relative">
          <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md mx-auto flex items-center justify-center text-3xl shadow-lg border border-white/30 mb-3">
            <i className="fas fa-comments text-amber-300"></i>
          </div>
          <h3 className="font-extrabold text-lg leading-tight">
            বেশি কথা বলতে চান?
          </h3>
          <p className="text-xs text-blue-100 mt-1">
            আপনার ফ্রি ট্রায়াল মেসেজ লিমিট শেষ হয়েছে!
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex items-start gap-2.5 text-xs text-gray-700">
              <i className="fas fa-check-circle text-emerald-500 mt-0.5 shrink-0"></i>
              <span><b>আনলিমিটেড চ্যাটিং</b> এবং ফ্রি অডিও-ভিডিও কল</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-gray-700">
              <i className="fas fa-check-circle text-emerald-500 mt-0.5 shrink-0"></i>
              <span>বিজ্ঞাপন দেখে ফ্রি ক্রেডিট বাড়িয়ে নেওয়ার সুযোগ</span>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-gray-700">
              <i className="fas fa-check-circle text-emerald-500 mt-0.5 shrink-0"></i>
              <span>ফোনের হোম স্ক্রিন থেকে দ্রুত ব্যবহারের সুবিধা</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 font-medium">
            কথা চালিয়ে যেতে অনুগ্রহ করে অ্যাপটি ডাউনলোড করুন এবং আপনার অ্যাকাউন্টে সাইন ইন করুন।
          </p>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={handleDownloadClick}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <i className="fas fa-download text-amber-300"></i>
              <span>অ্যাপ ডাউনলোড ও সাইন ইন করুন</span>
            </button>

            <button
              onClick={onClose}
              className="w-full text-xs text-gray-400 hover:text-gray-600 py-1.5 font-medium transition-colors cursor-pointer"
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
