import React, { useState } from 'react';
import { X, Copy, Check, MessageSquare, Send, Share2, Sparkles } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';

interface InviteShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteCode: string;
  isDarkMode?: boolean;
}

export const InviteShareModal: React.FC<InviteShareModalProps> = ({
  isOpen,
  onClose,
  inviteCode,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = window.location.origin + window.location.pathname;
  const shareLink = `${appUrl}?room=${inviteCode}`;
  const shareText = `🕊️ Meet me on Kobutor — an anonymous real-human connection with living liquid pigeons. Join my private door: ${shareLink}`;

  const handleCopy = () => {
    liquidAudio.playRippleSound();
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareViaWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const shareViaFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`, '_blank');
  };

  const shareViaSMS = () => {
    window.open(`sms:?body=${encodeURIComponent(shareText)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-[36px] p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] border border-slate-200/90 bg-white text-slate-800 text-center transition-all">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-700 uppercase tracking-widest font-english">
            <Share2 className="w-4 h-4" />
            <span>Invite Companion</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center border transition-all bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-cyan-100/70 border border-cyan-200/80 flex items-center justify-center text-2xl shadow-xs mb-3">
            🕊️
          </div>
          <h3 className="text-xl font-bold tracking-[-0.02em] font-english">
            OPEN A LIQUID DOOR
          </h3>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            Share this link to connect with someone directly
          </p>

          <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-slate-700 truncate max-w-[190px]">
              {shareLink}
            </span>
            <button
              onClick={handleCopy}
              className="p-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all bg-slate-900 text-white hover:bg-slate-800 font-english"
            >
              {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Quick Sharing Channels */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          <button
            onClick={shareViaWhatsApp}
            className="p-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-[11px] font-bold uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all font-english"
          >
            <Send className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={shareViaFacebook}
            className="p-3 rounded-2xl border border-blue-200/80 bg-blue-50/70 hover:bg-blue-100/70 text-blue-800 text-[11px] font-bold uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all font-english"
          >
            <Share2 className="w-4 h-4 text-blue-600" />
            <span>Facebook</span>
          </button>

          <button
            onClick={shareViaSMS}
            className="p-3 rounded-2xl border border-purple-200/80 bg-purple-50/70 hover:bg-purple-100/70 text-purple-800 text-[11px] font-bold uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all font-english"
          >
            <MessageSquare className="w-4 h-4 text-purple-600" />
            <span>SMS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
