'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import { Shield, Menu, X, Download, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from '@/lib/useTranslation';
import type { Language } from '@/lib/translations';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installing, setInstalling] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { t, lang, switchLanguage } = useTranslation();

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        try {
          console.log('[Navbar] calling /api/streak for user', data.user.id);
          const res = await fetch('/api/streak', { method: 'POST' });
          const body = await res.json();
          console.log('[Navbar] /api/streak response', res.status, JSON.stringify(body));
          if (res.ok) {
            const { streak, changed, badges_unlocked, db_error } = body;
            if (db_error) {
              console.error('[Navbar] streak db_error — run migration:', db_error);
            }
            if (changed && streak > 0) {
              toast(`🔥 ${streak} day streak! Keep it up!`, { duration: 4000 });
            }
            if (badges_unlocked?.length) {
              badges_unlocked.forEach((id: string) => {
                const label = id === 'streak_7' ? '7-Day Streak' : '30-Day Streak';
                toast(`🏅 New badge unlocked: ${label}!`, { duration: 5000 });
              });
            }
          } else {
            console.error('[Navbar] /api/streak error response:', JSON.stringify(body));
          }
        } catch (err) {
          console.error('[Navbar] /api/streak fetch failed:', err);
        }
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    setInstalling(true);
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstallPrompt(null);
    setInstalling(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const links = [
    { href: '/', label: t('nav.map') },
    { href: '/learn', label: t('nav.learn') },
    { href: '/dashboard', label: t('nav.community') },
    { href: '/report', label: t('nav.report') },
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="bg-emerald-700 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <Shield className="w-6 h-6" />
            BioGuard
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-emerald-900 text-white'
                    : 'text-emerald-100 hover:bg-emerald-600'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Auth + Language */}
          <div className="hidden md:flex items-center gap-2">
            {installPrompt && (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-500 px-3 py-2 rounded-md transition-colors disabled:opacity-60"
                title="Install BioGuard app"
              >
                <Download className="w-4 h-4" />
                {t('nav.install')}
              </button>
            )}

            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 text-sm text-emerald-100 hover:text-white px-2 py-2 rounded-md hover:bg-emerald-600 transition-colors"
                title="Switch language"
              >
                <Globe className="w-4 h-4" />
                {lang.toUpperCase()}
              </button>
              {langOpen && (
                <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50 min-w-[130px]">
                  {(['en', 'fr'] as Language[]).map((l) => (
                    <button
                      key={l}
                      onClick={() => { switchLanguage(l); setLangOpen(false); }}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${lang === l ? 'font-bold text-emerald-700' : 'text-gray-700'}`}
                    >
                      {l === 'en' ? '🇬🇧 English' : '🇫🇷 Français'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <>
                <Link
                  href="/profile"
                  className="text-sm text-emerald-100 hover:text-white px-3 py-2 rounded-md hover:bg-emerald-600 transition-colors"
                >
                  {t('nav.profile')}
                </Link>
                <button
                  onClick={signOut}
                  className="text-sm bg-emerald-900 hover:bg-emerald-950 px-4 py-2 rounded-md transition-colors"
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-emerald-100 hover:text-white px-3 py-2 rounded-md hover:bg-emerald-600 transition-colors"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  href="/signup"
                  className="text-sm bg-white text-emerald-700 font-semibold px-4 py-2 rounded-md hover:bg-emerald-50 transition-colors"
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-emerald-600 transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-emerald-600 px-4 py-3 space-y-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                isActive(href) ? 'bg-emerald-900' : 'hover:bg-emerald-600'
              }`}
            >
              {label}
            </Link>
          ))}
          <hr className="border-emerald-600 my-2" />
          {installPrompt && (
            <button
              onClick={() => { handleInstall(); setMenuOpen(false); }}
              disabled={installing}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm hover:bg-emerald-600 transition-colors disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              {t('nav.installApp')}
            </button>
          )}
          {/* Mobile language switcher */}
          <div className="flex gap-2 px-3 py-2">
            {(['en', 'fr'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => { switchLanguage(l); setMenuOpen(false); }}
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${lang === l ? 'bg-white text-emerald-700 font-bold border-white' : 'text-emerald-100 border-emerald-500 hover:bg-emerald-600'}`}
              >
                {l === 'en' ? '🇬🇧 EN' : '🇫🇷 FR'}
              </button>
            ))}
          </div>
          {user ? (
            <>
              <Link href="/profile" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm hover:bg-emerald-600">
                {t('nav.profile')}
              </Link>
              <button onClick={signOut} className="block w-full text-left px-3 py-2 rounded-md text-sm hover:bg-emerald-600">
                {t('nav.signOut')}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm hover:bg-emerald-600">
                {t('nav.login')}
              </Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-md text-sm hover:bg-emerald-600">
                {t('nav.signUp')}
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
