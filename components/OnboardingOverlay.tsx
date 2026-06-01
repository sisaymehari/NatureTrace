'use client';

import { useEffect, useState } from 'react';
import { TreePine, Camera, Sparkles, MapPin } from 'lucide-react';

const STEPS = [
  {
    icon: Camera,
    bg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-300',
    number: '01',
    title: 'Spot it',
    description: 'Take a photo of wildlife, plants, or environmental threats.',
  },
  {
    icon: Sparkles,
    bg: 'bg-blue-500/20',
    iconColor: 'text-blue-300',
    number: '02',
    title: 'Report it',
    description: 'AI identifies the species and captures your GPS location.',
  },
  {
    icon: MapPin,
    bg: 'bg-amber-500/20',
    iconColor: 'text-amber-300',
    number: '03',
    title: 'Protect it',
    description: 'Your report alerts conservationists on the live community map.',
  },
];

const STORAGE_KEY = 'naturetrace_onboarded';

function lsGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('skip') === '1') return;
    } catch {}

    if (!lsGet(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 80);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    const wrote = lsSet(STORAGE_KEY, 'true');
    setFading(true);
    setTimeout(() => {
      if (wrote) {
        setVisible(false);
      } else {
        window.location.href = '/?skip=1';
      }
    }, 360);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto"
      style={{
        transition: 'opacity 360ms ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* Fixed backgrounds */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-green-900 pointer-events-none" />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/*
       * Scrollable content column.
       * min-height: 100dvh accounts for Android Chrome's collapsing address bar.
       * flex-col with flex-1 on the middle section pushes the CTA to the bottom,
       * so it's always visible without needing position:sticky.
       */}
      <div
        className="relative z-10 flex flex-col px-4 pt-3 pb-6 max-w-2xl mx-auto w-full"
        style={{ minHeight: '100dvh' }}
      >
        {/* ── Top bar: skip link ── */}
        <div className="flex justify-end mb-3">
          <a
            href="/?skip=1"
            onClick={(e) => { e.preventDefault(); dismiss(); }}
            className="text-white/50 hover:text-white/80 text-sm font-medium touch-manipulation"
          >
            Skip intro →
          </a>
        </div>

        {/* ── Main content — flex-1 pushes CTA down ── */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-emerald-400/20">
              <TreePine className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
            <span className="text-3xl sm:text-4xl font-bold text-white tracking-tight">NatureTrace</span>
          </div>

          {/* Tagline */}
          <p className="text-emerald-300 text-sm sm:text-lg font-medium mb-6 tracking-wide">
            Every tree. Every threat. Every citizen.
          </p>

          {/* Step cards
              Mobile (< sm): compact horizontal row per step
              Desktop (sm+): original 3-column grid              */}
          <div className="w-full mb-6">
            {/* Mobile compact list */}
            <div className="flex flex-col gap-2.5 sm:hidden">
              {STEPS.map(({ icon: Icon, bg, iconColor, number, title, description }) => (
                <div
                  key={number}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 border border-white/10 text-left"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <div className={`w-9 h-9 flex-shrink-0 ${bg} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-white/35 uppercase tracking-widest leading-none mb-0.5">
                      Step {number}
                    </p>
                    <p className="text-white font-semibold text-sm leading-tight">{title}</p>
                    <p className="text-white/50 text-xs leading-snug mt-0.5 line-clamp-1">{description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop full grid */}
            <div className="hidden sm:grid sm:grid-cols-3 gap-4 text-left">
              {STEPS.map(({ icon: Icon, bg, iconColor, number, title, description }) => (
                <div
                  key={number}
                  className="rounded-2xl p-5 border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <div className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-1">
                    Step {number}
                  </p>
                  <h3 className="text-white font-bold text-xl mb-2">{title}</h3>
                  <p className="text-white/55 text-sm leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA — always at bottom of column ── */}
        <div className="text-center">
          <button
            onClick={dismiss}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 active:scale-95 text-white font-bold px-12 py-4 rounded-full text-base shadow-lg transition-all duration-150 touch-manipulation"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}
