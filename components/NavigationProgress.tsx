'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

NProgress.configure({ showSpinner: false, trickleSpeed: 200, minimum: 0.08 });

export default function NavigationProgress() {
  const pathname = usePathname();

  // Stop bar when navigation completes
  useEffect(() => {
    NProgress.done();
  }, [pathname]);

  // Start bar on any internal link click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        NProgress.start();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
