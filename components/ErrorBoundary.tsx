import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || 'Unknown error' };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by Bondhu ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetChat = () => {
    try {
      localStorage.removeItem('BONDHU_CHAT_HISTORY_V1');
      localStorage.removeItem('BONDHU_UNREAD_PROFILES_V1');
      sessionStorage.clear();
    } catch (_) {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-[#f0f2f5] p-6 text-center">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-3xl shadow-sm">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-black text-gray-800">একটি সাময়িক সমস্যা হয়েছে</h2>
              <p className="text-xs text-gray-500">
                স্ক্রিন লোড হতে সমস্যা হয়েছে। নিচের বাটনে চাপ দিয়ে পেজটি রিলোড করুন।
              </p>
            </div>

            <div className="w-full space-y-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-98 text-white font-bold text-sm py-3 px-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <i className="fas fa-sync-alt"></i>
                <span>পেজটি রিলোড করুন (Reload)</span>
              </button>

              <button
                onClick={this.handleResetChat}
                className="w-full bg-gray-100 hover:bg-gray-200 active:scale-98 text-gray-700 font-semibold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <i className="fas fa-trash-alt text-gray-400"></i>
                <span>ক্যাশ ক্লিয়ার করে ফ্রেশ শুরু করুন</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
