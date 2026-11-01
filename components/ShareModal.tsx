import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName?: string;
  userDisplayName?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  appName = 'Bondhu',
  userDisplayName,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin || window.location.href : 'https://bondhu-app.web.app';
  const shareTitle = `${appName} - ফ্রি চ্যাটিং ও আনলিমিটেড ভিডিও কলિંગ!`;
  const shareText = userDisplayName
    ? `👋 হাই! আমি ${appName}-এ আছি। আমার সাথে চ্যাট ও ভিডিও কল করতে এই লিঙ্কে ক্লিক করুন: `
    : `👋 ${appName}-এ নতুন বন্ধুদের সাথে ফ্রি চ্যাট ও আনলিমিটেড ভিডিও কল করুন! এখনই জয়েন করুন: `;

  const fullShareText = `${shareText} ${currentUrl}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        });
      } catch (err) {
        // User cancelled or share failed silently
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareText)}`;
    window.open(url, '_blank');
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
    window.open(url, '_blank');
  };

  const handleMessengerShare = () => {
    const url = `fb-messenger://share/?link=${encodeURIComponent(currentUrl)}`;
    window.open(url, '_blank');
  };

  const handleTelegramShare = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const handleSmsShare = () => {
    const url = `sms:?body=${encodeURIComponent(fullShareText)}`;
    window.location.href = url;
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}&margin=10`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-sm shadow-inner">
              <i className="fas fa-share-nodes"></i>
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">বন্ধুদের সাথে শেয়ার করুন</h3>
              <p className="text-[11px] text-blue-100">ইনভাইট করে বন্ধুদের সাথে চ্যাট শুরু করুন</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* App Preview Card */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl p-3.5 border border-blue-100 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl imo-blue flex items-center justify-center text-white text-xl shadow-md shrink-0">
              <i className="fas fa-comments"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 text-sm">{appName} Messenger</h4>
              <p className="text-xs text-gray-500 truncate">ফ্রি মেসেজিং ও এইচডি ভিডিও কলিং 🇧🇩</p>
              <span className="inline-block mt-0.5 text-[10px] text-blue-600 font-semibold">
                লাইভ অনলাইন মেম্বারস
              </span>
            </div>
          </div>

          {/* Share Link Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 block">
              অ্যাপের শেয়ার লিঙ্ক:
            </label>
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
              <input 
                type="text" 
                readOnly 
                value={currentUrl} 
                className="bg-transparent text-xs text-gray-600 outline-none w-full truncate font-mono select-all px-1"
              />
              <button 
                onClick={handleCopyLink}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  copied 
                    ? 'bg-emerald-500 text-white shadow-xs' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-95'
                }`}
              >
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                <span>{copied ? 'কপি হয়েছে!' : 'কপি করুন'}</span>
              </button>
            </div>
          </div>

          {/* Social Share Grid */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 block">
              সরাসরি শেয়ার করুন:
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppShare}
                className="flex flex-col items-center gap-1 p-2 rounded-2xl hover:bg-emerald-50 transition-colors group cursor-pointer"
                title="WhatsApp-এ শেয়ার করুন"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform">
                  <i className="fab fa-whatsapp"></i>
                </div>
                <span className="text-[11px] font-medium text-gray-700 group-hover:text-emerald-600">WhatsApp</span>
              </button>

              {/* Facebook */}
              <button
                onClick={handleFacebookShare}
                className="flex flex-col items-center gap-1 p-2 rounded-2xl hover:bg-blue-50 transition-colors group cursor-pointer"
                title="Facebook-এ শেয়ার করুন"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform">
                  <i className="fab fa-facebook-f"></i>
                </div>
                <span className="text-[11px] font-medium text-gray-700 group-hover:text-blue-600">Facebook</span>
              </button>

              {/* Messenger */}
              <button
                onClick={handleMessengerShare}
                className="flex flex-col items-center gap-1 p-2 rounded-2xl hover:bg-indigo-50 transition-colors group cursor-pointer"
                title="Messenger-এ শেয়ার করুন"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00B2FF] via-[#006AFF] to-[#9900FF] text-white flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform">
                  <i className="fab fa-facebook-messenger"></i>
                </div>
                <span className="text-[11px] font-medium text-gray-700 group-hover:text-indigo-600">Messenger</span>
              </button>

              {/* Telegram */}
              <button
                onClick={handleTelegramShare}
                className="flex flex-col items-center gap-1 p-2 rounded-2xl hover:bg-sky-50 transition-colors group cursor-pointer"
                title="Telegram-এ শেয়ার করুন"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#229ED9] text-white flex items-center justify-center text-xl shadow-md group-hover:scale-105 transition-transform">
                  <i className="fab fa-telegram-plane"></i>
                </div>
                <span className="text-[11px] font-medium text-gray-700 group-hover:text-sky-600">Telegram</span>
              </button>
            </div>
          </div>

          {/* Native Phone Share Option (if supported) & SMS */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-sm hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fas fa-arrow-up-from-bracket"></i>
                <span>মোবাইল শেয়ার মেনু</span>
              </button>
            )}

            <button
              onClick={handleSmsShare}
              className={`w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2.5 px-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                !(typeof navigator !== 'undefined' && 'share' in navigator) ? 'col-span-2' : ''
              }`}
            >
              <i className="fas fa-comment-sms text-gray-600"></i>
              <span>SMS পাঠান</span>
            </button>
          </div>

          {/* QR Code Toggle for scanning in-person */}
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setShowQr(!showQr)}
              className="w-full flex items-center justify-between text-xs text-gray-600 font-semibold hover:text-blue-600 transition-colors cursor-pointer py-1"
            >
              <span className="flex items-center gap-2">
                <i className="fas fa-qrcode text-base text-gray-500"></i>
                <span>স্ক্যান করে সরাসরি জয়েন করার QR কোড</span>
              </span>
              <i className={`fas fa-chevron-${showQr ? 'up' : 'down'} text-xs text-gray-400`}></i>
            </button>

            {showQr && (
              <div className="mt-3 p-4 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border border-gray-100 animate-fade-in text-center">
                <img 
                  src={qrCodeUrl} 
                  alt="App QR Code" 
                  className="w-36 h-36 bg-white p-2 rounded-xl shadow-sm border border-gray-200 object-contain"
                />
                <p className="text-[11px] text-gray-500 mt-2">
                  বন্ধু তার ফোনের ক্যামেরা দিয়ে স্ক্যান করলেই সরাসরি অ্যাপে চলে আসবে!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

