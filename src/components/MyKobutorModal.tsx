import React, { useState, useEffect } from 'react';
import { X, Sparkles, Gift, Wand2, RefreshCw, Trophy, Shirt, Check } from 'lucide-react';
import { featherSystem, FeatherState } from '../lib/featherSystem';
import { COSMETIC_CATALOG, CosmeticId } from '../lib/pigeonCosmetics';
import { liquidAudio } from '../lib/audioSynth';

interface MyKobutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const MyKobutorModal: React.FC<MyKobutorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [state, setState] = useState<FeatherState>(featherSystem.getState());
  const [activeTab, setActiveTab] = useState<'useful' | 'wardrobe' | 'earn'>('useful');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mysteryReward, setMysteryReward] = useState<{ name: string; nameBangla: string; icon: string } | null>(null);

  useEffect(() => {
    return featherSystem.subscribe((newState) => {
      setState(newState);
    });
  }, []);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 1. Mystery Feather Box
  const handleOpenMysteryBox = () => {
    liquidAudio.init();
    const res = featherSystem.openMysteryBox();
    if (!res.success) {
      liquidAudio.playSubtleBubble(220);
      showToast(res.message);
      return;
    }

    if (res.reward) {
      setMysteryReward(res.reward);
    }
  };

  // 2. Kobutor Wish
  const handleMakeWish = (type: 'starlight' | 'lantern' | 'twin_flight') => {
    liquidAudio.init();
    const res = featherSystem.makeWish(type);
    if (!res.success) {
      liquidAudio.playSubtleBubble(220);
      showToast(res.message);
      return;
    }
    showToast(`${res.wish?.nameBangla || 'উইশ'} সক্রিয় হয়েছে! 🕊️`);
  };

  // 3. Rematch Pass
  const handleRematchPass = () => {
    liquidAudio.init();
    const res = featherSystem.requestRematch();
    if (!res.success) {
      liquidAudio.playSubtleBubble(220);
      showToast(res.message);
      return;
    }
    showToast('পুনরায় কথা বলার অনুরোধ প্রস্তুত! পরবর্তী কলে ব্যবহারযোগ্য 🔄');
  };

  // 4. Kobutor Challenge Event
  const handleChallengeEvent = () => {
    liquidAudio.init();
    const res = featherSystem.enterChallengeEvent('স্পিড ডুয়েট চ্যালেঞ্জ', 'Speed Duet Challenge');
    if (!res.success) {
      liquidAudio.playSubtleBubble(220);
      showToast(res.message);
      return;
    }
    showToast('চ্যালেঞ্জ ইভেন্টে প্রবেশ করেছেন! বিজয়ে দ্বিগুণ পালক 🎮');
  };

  // 5. Cosmetic Equip / Unlock
  const handleCosmeticAction = (id: CosmeticId) => {
    liquidAudio.init();
    if (state.unlocked.includes(id)) {
      featherSystem.toggleEquip(id);
    } else {
      const res = featherSystem.unlockItem(id);
      if (!res.success) {
        liquidAudio.playSubtleBubble(200);
        showToast(res.message);
      } else {
        showToast(res.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity"
      />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-md max-h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl border bg-white border-slate-200/90 text-slate-800">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🪶</span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                পালক ও উপহার
              </h2>
              <p className="text-[11px] font-medium text-slate-500 font-bangla">
                অর্থপূর্ণ কথোপকথনের মাধ্যমে অর্জিত ফেদার
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Feather Balance */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 shadow-xs">
              <span className="text-sm">🪶</span>
              <span className="text-xs font-black text-amber-700 font-mono">
                {state.balance}
              </span>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 bg-slate-100 transition-all active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-3 flex gap-2 border-b border-slate-100 pb-3">
          <button
            onClick={() => {
              liquidAudio.playSubtleBubble();
              setActiveTab('useful');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-2xl transition-all ${
              activeTab === 'useful'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            কাজের সুবিধা
          </button>
          <button
            onClick={() => {
              liquidAudio.playSubtleBubble();
              setActiveTab('wardrobe');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-2xl transition-all ${
              activeTab === 'wardrobe'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            কবুতর সাজসজ্জা
          </button>
          <button
            onClick={() => {
              liquidAudio.playSubtleBubble();
              setActiveTab('earn');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-2xl transition-all ${
              activeTab === 'earn'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            পালক অর্জন
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="mx-6 mt-3 p-2.5 rounded-2xl bg-slate-900 text-white text-xs font-semibold text-center flex items-center justify-center gap-1.5 shadow-md animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-none">
          {activeTab === 'useful' ? (
            <div className="space-y-3">
              {/* 1. Mystery Feather Box Card */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-amber-200 flex items-center justify-center text-xl shadow-xs">
                      🎁
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 font-bangla">
                        রহস্যময় পালক বাক্স (Mystery Feather Box)
                      </h3>
                      <p className="text-[11px] text-slate-600 font-medium font-bangla mt-0.5">
                        জ্যাকপট পালক, বিশেষ আভা বা আকর্ষণীয় উপহার
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenMysteryBox}
                    disabled={state.balance < 25}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 shrink-0"
                  >
                    <span>25</span>
                    <span>🪶</span>
                  </button>
                </div>

                {mysteryReward && (
                  <div className="mt-3 p-2.5 rounded-2xl bg-white/90 border border-amber-300 flex items-center gap-2 animate-fade-in">
                    <span className="text-lg">{mysteryReward.icon}</span>
                    <span className="text-xs font-bold text-slate-800 font-bangla">
                      {mysteryReward.nameBangla}
                    </span>
                  </div>
                )}
              </div>

              {/* 2. Kobutor Wish */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200/90 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-cyan-200 flex items-center justify-center text-xl shadow-xs">
                      🌠
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 font-bangla">
                        কবুতর উইশ (Kobutor Wish)
                      </h3>
                      <p className="text-[11px] text-slate-600 font-medium font-bangla mt-0.5">
                        দুজনের স্ক্রিনে একসাথে বিশেষ যৌথ অ্যানিমেশন ও সুর
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleMakeWish('starlight')}
                    disabled={state.balance < 20}
                    className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 shrink-0"
                  >
                    <span>20</span>
                    <span>🪶</span>
                  </button>
                </div>
              </div>

              {/* 3. Rematch Pass */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/90 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-purple-200 flex items-center justify-center text-xl shadow-xs">
                      🔄
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 font-bangla">
                        পুনরায় কথা বলার অনুরোধ (Rematch)
                      </h3>
                      <p className="text-[11px] text-slate-600 font-medium font-bangla mt-0.5">
                        কল শেষে পূর্ববর্তী সঙ্গীর সাথে পুনরায় কথা বলতে আমন্ত্রণ
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleRematchPass}
                    disabled={state.balance < 15}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 shrink-0"
                  >
                    <span>15</span>
                    <span>🪶</span>
                  </button>
                </div>
              </div>

              {/* 4. Kobutor Challenge Event */}
              <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/90 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-xl shadow-xs">
                      🎮
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 font-bangla">
                        কবুতর চ্যালেঞ্জ ইভেন্ট (Challenge Event)
                      </h3>
                      <p className="text-[11px] text-slate-600 font-medium font-bangla mt-0.5">
                        উত্তেজনাপূর্ণ দুইজনের মিনি-গেম ইভেন্ট; বিজয়ে দ্বিগুণ পালক
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleChallengeEvent}
                    disabled={state.balance < 15}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-all active:scale-95 shrink-0"
                  >
                    <span>15</span>
                    <span>🪶</span>
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'wardrobe' ? (
            <div className="grid grid-cols-2 gap-2.5">
              {COSMETIC_CATALOG.map((item) => {
                const isUnlocked = state.unlocked.includes(item.id);
                const isEquipped = state.equipped.includes(item.id);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleCosmeticAction(item.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isEquipped
                        ? 'bg-cyan-50/80 border-cyan-400 shadow-xs'
                        : isUnlocked
                        ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{item.icon}</span>
                      {isEquipped && (
                        <div className="w-5 h-5 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="mt-2">
                      <h4 className="text-xs font-bold text-slate-900 font-bangla">
                        {item.nameBangla}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-english">{item.name}</p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                      {isEquipped ? (
                        <span className="text-cyan-700 font-bangla">ব্যবহৃত হচ্ছে</span>
                      ) : isUnlocked ? (
                        <span className="text-slate-600 font-bangla">ব্যবহার করুন</span>
                      ) : (
                        <span className="text-amber-700 font-mono flex items-center gap-1">
                          <span>{item.price}</span>
                          <span>🪶</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 font-medium font-bangla">
                সহজেই পালক অর্জনের উপায়:
              </p>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 font-bangla">
                    <span>🎁</span>
                    <span>স্বাগতম উপহার (Welcome Gift)</span>
                  </div>
                  <p className="text-[10px] text-amber-800 font-bangla mt-0.5">
                    প্রথমবার অ্যাপে প্রবেশের সাথে সাথেই উপহার
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-amber-700">+50 🪶</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-bangla">
                    <span>🕊️</span>
                    <span>প্রথম সফল সংযোগ (First Connection)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bangla mt-0.5">
                    প্রথমবার কারো সাথে কথা বলা সম্পন্ন হলে
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-emerald-600">+50 🪶</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-bangla">
                    <span>☀️</span>
                    <span>দৈনিক প্রথম কথা (Daily Connection)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bangla mt-0.5">
                    প্রতিদিনের প্রথম নতুন মানুষের সাথে আলাপ
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-emerald-600">+25 🪶</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 font-bangla">
                    <span>🎮</span>
                    <span>সারপ্রাইজ বা গেম সম্পন্ন (Surprise & Games)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bangla mt-0.5">
                    কলের ভেতর মজাদার প্রশ্ন বা গেম খেলে
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-emerald-600">+20 🪶</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
