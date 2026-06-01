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
    description: 'Take a photo of wildlife, plants, or environmental threats wherever you are in the UK.',
  },
  {
    icon: Sparkles,
    bg: 'bg-blue-500/20',
    iconColor: 'text-blue-300',
    number: '02',
    title: 'Report it',
    description: 'AI automatically identifies the species and captures your GPS location for accuracy.',
  },
  {
    icon: MapPin,
    bg: 'bg-amber-500/20',
    iconColor: 'text-amber-300',
    number: '03',
    title: 'Protect it',
    description: 'Your report alerts conservationists and appears instantly on the live community map.',
  },
];

const STORAGE_KEY = 'naturetrace_onboarded';

// Safe localStorage wrappers — never throw even in restricted Android contexts
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
    // Hard URL-param bypass — works even when localStorage is unavailable
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
        // localStorage succeeded — just hide the overlay in place
        setVisible(false);
      } else {
        // localStorage unavailable (Android private mode, etc.) — hard navigate
        // with the skip param so the overlay won't reappear
        window.location.href = '/?skip=1';
      }
    }, 380);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        transition: 'opacity 380ms ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-green-900" />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 max-w-2xl w-full text-center"
        style={{
          transition: 'opacity 380ms ease, transform 380ms ease',
          opacity: fading ? 0 : 1,
          transform: fading ? 'translateY(12px)' : 'translateY(0)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/40 ring-4 ring-emerald-400/20">
            <TreePine className="w-8 h-8 text-white" />
          </div>
          <span className="text-4xl font-bold text-white tracking-tight">NatureTrace</span>
        </div>

        {/* Tagline */}
        <p className="text-emerald-300 text-lg font-medium mb-10 tracking-wide">
          Every tree. Every threat. Every citizen.
        </p>

        {/* Step cards — no backdrop-filter to avoid Android GPU stalls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
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

        {/* Primary CTA */}
        <button
          onClick={dismiss}
          className="bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 active:scale-95 text-white font-bold px-12 py-4 rounded-full text-base shadow-lg transition-all duration-150 touch-manipulation"
        >
          Get Started
        </button>

        {/* Skip — <a> href is the hard fallback if JS fails entirely */}
        <div className="mt-5">
          <a
            href="/?skip=1"
            onClick={(e) => { e.preventDefault(); dismiss(); }}
            className="text-white/40 hover:text-white/70 text-sm transition-colors touch-manipulation"
          >
            Skip for now →
          </a>
        </div>
      </div>
    </div>
  );
}
