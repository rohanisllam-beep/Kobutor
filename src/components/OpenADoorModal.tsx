import React, { useState } from 'react';
import { X, DoorOpen, Copy, Check, ArrowRight, Sparkles } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';

interface OpenADoorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterDoor: (code: string) => void;
  isDarkMode?: boolean;
}

export const OpenADoorModal: React.FC<OpenADoorModalProps> = ({
  isOpen,
  onClose,
  onEnterDoor,
}) => {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [generatedCode, setGeneratedCode] = useState(() => {
    return 'KOB' + Math.random().toString(36).substring(2, 4).toUpperCase();
  });
  const [inputCode, setInputCode] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    liquidAudio.playSubtleBubble();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateSubmit = () => {
    liquidAudio.playRippleSound();
    onEnterDoor(generatedCode);
    onClose();
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    liquidAudio.playRippleSound();
    onEnterDoor(inputCode.trim().toUpperCase());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-[36px] p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] border border-slate-200/90 bg-white text-slate-800 text-center transition-all">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-700 uppercase tracking-widest font-english">
            <DoorOpen className="w-4 h-4" />
            <span>Private Room Portal</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center border transition-all bg-white border-slate-200 text-slate-500 hover:text-slate-800 shadow-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Create / Join Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-2xl my-4">
          <button
            type="button"
            onClick={() => {
              liquidAudio.playSubtleBubble();
              setTab('create');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all font-english ${
              tab === 'create'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            CREATE ROOM
          </button>
          <button
            type="button"
            onClick={() => {
              liquidAudio.playSubtleBubble();
              setTab('join');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all font-english ${
              tab === 'join'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            JOIN ROOM
          </button>
        </div>

        {tab === 'create' ? (
          <div className="space-y-4">
            <div className="p-4.5 rounded-2xl bg-cyan-50/60 border border-cyan-200">
              <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-700 font-english">
                YOUR ROOM CODE
              </span>
              <div className="text-2xl font-black font-mono tracking-widest text-slate-900 my-1.5">
                {generatedCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-cyan-300 text-xs font-bold text-cyan-800 shadow-xs active:scale-95 font-english"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'COPIED!' : 'COPY CODE'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Share this code with your friend. When you enter, the liquid portal will connect you both in real-time.
            </p>

            <button
              onClick={handleCreateSubmit}
              className="w-full py-3.5 px-6 rounded-3xl font-extrabold text-xs tracking-[0.12em] uppercase flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-slate-900 text-white shadow-md hover:bg-slate-800 font-english"
            >
              <DoorOpen className="w-4 h-4" />
              <span>START & ENTER ROOM</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div className="my-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-english">
                ENTER FRIEND'S CODE
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="e.g. KOB7X"
                maxLength={8}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center text-lg font-mono tracking-widest uppercase font-black focus:outline-none focus:border-cyan-500 text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={!inputCode.trim()}
              className="w-full py-3.5 px-6 rounded-3xl font-extrabold text-xs tracking-[0.12em] uppercase flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-40 hover:scale-[1.02] active:scale-95 bg-slate-900 text-white shadow-md hover:bg-slate-800 font-english"
            >
              <DoorOpen className="w-4 h-4" />
              <span>JOIN PRIVATE ROOM</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
