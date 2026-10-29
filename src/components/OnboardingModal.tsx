import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles, User, Heart, MessageCircle, Smile, HelpCircle } from 'lucide-react';
import { ConnectionType, Gender, MoodType, UserPreferences } from '../types';
import { liquidAudio } from '../lib/audioSynth';

interface OnboardingModalProps {
  initialPrefs?: UserPreferences;
  onComplete: (prefs: UserPreferences) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialPrefs,
  onComplete,
  onCancel,
}) => {
  const [step, setStep] = useState<number>(1);
  const [gender, setGender] = useState<Gender>(initialPrefs?.gender || 'male');
  const [lookingFor, setLookingFor] = useState<Gender>(initialPrefs?.lookingFor || 'female');
  const [connectionType, setConnectionType] = useState<ConnectionType>(
    initialPrefs?.connectionType || 'Someone to Talk To'
  );
  const [mood, setMood] = useState<MoodType>(initialPrefs?.mood || 'Calm');
  const [interests, setInterests] = useState<string[]>(
    initialPrefs?.interests || ['Music', 'Deep Talks']
  );
  const [conversationStyle, setConversationStyle] = useState<'casual' | 'deep' | 'playful' | 'quiet'>(
    initialPrefs?.conversationStyle || 'casual'
  );

  const connectionOptions: ConnectionType[] = [
    'Someone to Talk To',
    'New Friend',
    'Someone Who Understands',
    'Someone to Listen',
    'Someone Funny',
    'Deep Conversation',
    'Just Company',
    'Play Together',
  ];

  const moodOptions: MoodType[] = [
    'Happy',
    'Calm',
    'Lonely',
    'Bored',
    'Emotional',
    'Energetic',
    'Curious',
    'Tired',
  ];

  const interestOptions = [
    'Music',
    'Late Night Thoughts',
    'Movies & Art',
    'Deep Talks',
    'Philosophy',
    'Humor & Memes',
    'Gaming',
    'Poetry & Books',
  ];

  const handleGenderSelect = (selectedGender: Gender) => {
    setGender(selectedGender);
    // Core matchmaking defaults to opposite gender
    setLookingFor(selectedGender === 'male' ? 'female' : 'male');
    liquidAudio.playSubtleBubble();
  };

  const toggleInterest = (item: string) => {
    if (interests.includes(item)) {
      setInterests(interests.filter((i) => i !== item));
    } else {
      setInterests([...interests, item]);
    }
    liquidAudio.playSubtleBubble();
  };

  const handleNext = () => {
    liquidAudio.playSubtleBubble();
    if (step < 4) {
      setStep(step + 1);
    } else {
      onComplete({
        gender,
        lookingFor,
        connectionType,
        mood,
        interests,
        conversationStyle,
        availability: 'now',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-[36px] p-6 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.15)] border border-slate-200/90 bg-white text-slate-800 flex flex-col justify-between min-h-[500px] transition-all duration-300">
        {/* Step Header */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? 'w-7 bg-slate-900'
                      : i < step
                      ? 'w-3 bg-cyan-400'
                      : 'w-3 bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onCancel}
              className="text-xs text-slate-400 hover:text-slate-700 font-bold uppercase tracking-wider font-english"
            >
              Cancel
            </button>
          </div>

          {/* STEP 1: GENDER IDENTITY & OPPOSITE GENDER PREFERENCE */}
          {step === 1 && (
            <div className="space-y-4.5 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold tracking-[-0.02em] text-slate-900 font-english">WHO ARE YOU?</h3>
                <p className="text-xs text-slate-500 font-semibold mt-1">Select your identity for authentic matching</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleGenderSelect('male')}
                  className={`p-4 rounded-3xl border text-center transition-all flex flex-col items-center gap-2 ${
                    gender === 'male'
                      ? 'bg-cyan-50 border-cyan-500 text-slate-950 font-bold shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold'
                  }`}
                >
                  <User className="w-5 h-5 text-cyan-600 stroke-[2.2]" />
                  <span className="text-sm font-bold font-english">Male</span>
                </button>

                <button
                  onClick={() => handleGenderSelect('female')}
                  className={`p-4 rounded-3xl border text-center transition-all flex flex-col items-center gap-2 ${
                    gender === 'female'
                      ? 'bg-purple-50 border-purple-500 text-slate-950 font-bold shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold'
                  }`}
                >
                  <User className="w-5 h-5 text-purple-600 stroke-[2.2]" />
                  <span className="text-sm font-bold font-english">Female</span>
                </button>
              </div>

              <div className="pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-english">
                  LOOKING TO MEET (Opposite Gender)
                </p>
                <div className="mt-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-900 font-bold font-english">
                  <span>
                    {gender === 'male' ? 'Female Companion' : 'Male Companion'}
                  </span>
                  <Check className="w-4 h-4 text-cyan-600 stroke-[3]" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONNECTION INTENTION */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold tracking-[-0.02em] font-english">
                  CONNECTION INTENTION
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Choose what feels right for this moment</p>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto scrollbar-none pr-1">
                {connectionOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setConnectionType(opt);
                      liquidAudio.playSubtleBubble();
                    }}
                    className={`p-3 rounded-2xl border text-left text-xs transition-all leading-tight font-medium ${
                      connectionType === opt
                        ? 'bg-slate-900 text-white border-slate-900 font-bold shadow-xs'
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: MOOD STATE */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold tracking-[-0.02em] font-english">
                  CURRENT MOOD
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Matches complementary emotional resonance</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {moodOptions.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setMood(m);
                      liquidAudio.playSubtleBubble();
                    }}
                    className={`p-3.5 rounded-2xl border text-center text-xs font-semibold transition-all ${
                      mood === m
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: PRIVATE SIGNALS & INTERESTS */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h3 className="text-xl font-bold tracking-[-0.02em] font-english">
                  PRIVATE SIGNALS
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Never publicly revealed; used solely by the matching engine
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-english">Interests</span>
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-[130px] overflow-y-auto scrollbar-none">
                  {interestOptions.map((item) => {
                    const isSelected = interests.includes(item);
                    return (
                      <button
                        key={item}
                        onClick={() => toggleInterest(item)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-english">
                  Conversation Style
                </span>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(['casual', 'deep', 'playful', 'quiet'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setConversationStyle(style)}
                      className={`p-2.5 rounded-2xl border text-xs capitalize text-center font-semibold transition-all ${
                        conversationStyle === style
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-100 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-4">
          <button
            onClick={handleNext}
            className="w-full py-3.5 px-6 rounded-3xl font-bold text-xs tracking-[0.12em] uppercase flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.02] active:scale-95 bg-slate-900 text-white shadow-md hover:bg-slate-800 font-english"
          >
            <span>{step === 4 ? 'Complete & Find Kobutor' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      </div>
    </div>
  );
};
