import React, { useState, useRef, useEffect } from 'react';
import { X, Send } from 'lucide-react';
import { ChatMessage } from '../types';
import { liquidAudio } from '../lib/audioSynth';

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  myRole: 'A' | 'B';
  onSendMessage: (text: string) => void;
  isDarkMode?: boolean;
}

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  isOpen,
  onClose,
  messages,
  myRole,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    liquidAudio.playRippleSound();
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex flex-col justify-end md:items-end md:p-6 animate-fade-in">
      {/* Compact Chat Sheet (Mobile: 38% bottom sheet | Desktop: 32% right floating panel) */}
      <div className="pointer-events-auto relative w-full md:w-88 h-[38vh] md:h-[55vh] max-h-[44vh] md:max-h-[65vh] rounded-t-3xl md:rounded-3xl shadow-[0_-10px_35px_rgba(0,0,0,0.15)] md:shadow-2xl backdrop-blur-2xl flex flex-col justify-between overflow-hidden border border-slate-200/90 bg-white/95 text-slate-800 transition-all duration-300">
        {/* Minimal Chat Header */}
        <div className="px-5 py-3 border-b flex items-center justify-between border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="text-sm">💬</span>
            <h4 className="text-xs font-bold tracking-tight text-slate-800">
              Chat
            </h4>
          </div>

          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center border transition-all border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-none">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-2">
              <span className="text-xl mb-1 opacity-60">🕊️</span>
              <p className="text-xs text-slate-500 font-medium">Say hello to your match...</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderRole === myRole;
              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] px-3.5 py-2 rounded-2xl text-xs backdrop-blur-md shadow-xs leading-relaxed font-medium ${
                      isMe
                        ? 'bg-slate-900 text-white rounded-br-xs font-semibold'
                        : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/80'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t border-slate-100 bg-slate-50/90"
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border rounded-full px-3.5 py-2 text-xs placeholder-slate-400 focus:outline-none focus:border-slate-800 transition-all font-medium bg-white border-slate-200 text-slate-800"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 transition-all shadow-xs active:scale-95 flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5 stroke-[2.2]" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
