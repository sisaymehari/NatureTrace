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

export default function OnboardingOverlay() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      // Small delay so the page content renders first — avoids a flash of just the overlay
      const t = setTimeout(() => setVisible(true), 80);
      return () => clearTimeout(t);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setFading(true);
    setTimeout(() => setVisible(false), 550);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        transition: 'opacity 550ms ease',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-green-900" />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-green-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Content */}
      <div
        className="relative z-10 max-w-2xl w-full text-center"
        style={{
          transition: 'opacity 550ms ease, transform 550ms ease',
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

        {/* Step cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
          {STEPS.map(({ icon: Icon, bg, iconColor, number, title, description }) => (
            <div
              key={number}
              className="rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-colors"
              style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(8px)' }}
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

        {/* CTA */}
        <button
          onClick={dismiss}
          className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold px-12 py-3.5 rounded-full text-base shadow-lg shadow-emerald-500/30 transition-all duration-150 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5"
        >
          Get Started
        </button>

        <div className="mt-5">
          <button
            onClick={dismiss}
            className="text-white/35 hover:text-white/60 text-sm transition-colors"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  );
}
