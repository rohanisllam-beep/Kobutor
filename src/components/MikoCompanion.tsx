import React, { useState } from 'react';
import { Bot, Sparkles, MessageCircle, RefreshCw, X, Lightbulb, ShieldCheck } from 'lucide-react';
import { liquidAudio } from '../lib/audioSynth';

interface MikoCompanionProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSuggestionToChat?: (text: string) => void;
}

export const MikoCompanion: React.FC<MikoCompanionProps> = ({
  isOpen,
  onClose,
  onSendSuggestionToChat,
}) => {
  const [topic, setTopic] = useState<string>(
    '“If you could experience one moment in life again for the first time, what would it be?”'
  );
  const [topicBangla, setTopicBangla] = useState<string>(
    '“জীবনের এমন কোনো স্মৃতি যা তুমি আবার নতুন করে অনুভব করতে চাও?”'
  );
  const [isLoading, setIsLoading] = useState(false);

  const curatedTopics = [
    {
      en: '“What is a small, quiet moment that recently brought you peace?”',
      bn: '“এমন কোনো ছোট মুহূর্ত যা সম্প্রতি তোমাকে গভীর শান্তি দিয়েছে?”',
    },
    {
      en: '“What song feels like home to your soul?”',
      bn: '“কোন গানটা শুনলে মনে হয় তোমার মনের ভেতরের কথা বলা হয়েছে?”',
    },
    {
      en: '“What is a dream or curiosity you rarely tell people about?”',
      bn: '“এমন কোনো স্বপ্ন বা কৌতুহল যা তুমি সহজে কাউকে বলো না?”',
    },
    {
      en: '“If tonight had a weather forecast for your heart, what would it be?”',
      bn: '“আজকের রাতে তোমার মনের আবহাওয়া কেমন?”',
    },
    {
      en: '“What makes you feel truly understood by someone?”',
      bn: '“কারো সাথে কথা বলে কখন মনে হয় যে সে তোমাকে সত্যিই বুঝতে পেরেছে?”',
    },
  ];

  const handleRefreshTopic = async () => {
    liquidAudio.playSubtleBubble();
    setIsLoading(true);

    try {
      // Call server-side Gemini endpoint /api/miko/starter
      const res = await fetch('/api/miko/starter', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.topic && data.topicBangla) {
          setTopic(`“${data.topic}”`);
          setTopicBangla(`“${data.topicBangla}”`);
          setIsLoading(false);
          return;
        }
      }
    } catch {
      // Fallback gracefully
    }

    const randomItem = curatedTopics[Math.floor(Math.random() * curatedTopics.length)];
    setTopic(randomItem.en);
    setTopicBangla(randomItem.bn);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-[36px] p-6 bg-white border border-slate-200/90 text-slate-800 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] flex flex-col justify-between">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {/* Cute Miko AI Avatar */}
            <div className="w-8 h-8 rounded-full bg-cyan-500 p-0.5 flex items-center justify-center shadow-xs">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-cyan-700">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold tracking-wider text-slate-900 uppercase font-english">
                  Miko
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-[9px] text-cyan-800 font-bold uppercase tracking-wider font-english">
                  AI Spark
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Warm conversation companion</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-slate-200 bg-white text-slate-500 hover:text-slate-800 shadow-xs transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Suggestion Card */}
        <div className="my-4 p-4.5 rounded-3xl bg-cyan-50/50 border border-cyan-100/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-800 flex items-center gap-1.5 font-english">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
              Conversation Spark
            </span>
            <button
              onClick={handleRefreshTopic}
              disabled={isLoading}
              className="text-[10px] font-bold uppercase tracking-wider text-cyan-700 hover:text-cyan-900 flex items-center gap-1 transition-all font-english"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Next</span>
            </button>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed font-medium italic font-english">{topic}</p>
          <p className="text-xs text-cyan-900 leading-relaxed font-semibold font-bangla">
            {topicBangla}
          </p>

          {onSendSuggestionToChat && (
            <button
              onClick={() => {
                onSendSuggestionToChat(topic.replace(/“|”/g, ''));
                onClose();
              }}
              className="w-full mt-2 py-3 px-4 rounded-2xl bg-cyan-700 hover:bg-cyan-800 text-xs text-white font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 font-english"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Send Spark to Chat</span>
            </button>
          )}
        </div>

        {/* Safety & Comfort Note */}
        <div className="px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start gap-2.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Miko is an AI spark assistant. Your companion is an anonymous real human.
          </p>
        </div>

        {/* Dismiss */}
        <button
          onClick={onClose}
          className="mt-3.5 w-full py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-xs font-bold uppercase tracking-wider text-white transition-all shadow-xs font-english"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
