import React, { useState } from 'react';
import { X, ShieldAlert, Ban, AlertTriangle, Check } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';

interface SafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBlockUser: () => void;
  onReportUser: (reason: string) => void;
  isDarkMode?: boolean;
}

export const SafetyModal: React.FC<SafetyModalProps> = ({
  isOpen,
  onClose,
  onBlockUser,
  onReportUser,
}) => {
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleReport = (reason: string) => {
    liquidAudio.playRippleSound();
    onReportUser(reason);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1500);
  };

  const handleBlock = () => {
    liquidAudio.playRippleSound();
    onBlockUser();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-[36px] p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] border border-slate-200/90 bg-white text-slate-800 text-center transition-all">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-widest font-english">
            <ShieldAlert className="w-4 h-4" />
            <span>Safety & Moderation</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center border transition-all bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h4 className="text-sm font-bold uppercase tracking-wider font-english">Report Received</h4>
            <p className="text-xs text-slate-500 font-medium">
              Thank you for keeping the Kobutor environment safe and respectful.
            </p>
          </div>
        ) : (
          <div className="py-4 space-y-4 text-left">
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Kobutor is a safe, anonymous space. If anyone violates kindness or safety, you can block or report them immediately.
            </p>

            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-english">Quick Report:</span>
              {['Inappropriate speech or behavior', 'Harassment or disrespect', 'Spam / commercial solicitation', 'Underage concerns'].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReport(reason)}
                  className="w-full p-3 rounded-2xl border border-slate-100 hover:bg-rose-50 hover:border-rose-200 text-xs font-semibold text-left text-slate-700 flex items-center gap-2.5 transition-all shadow-xs"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>{reason}</span>
                </button>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={handleBlock}
                className="w-full py-3.5 px-5 rounded-3xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <Ban className="w-4 h-4" />
                <span>Block User (Never Match Again)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
