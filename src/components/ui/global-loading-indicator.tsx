'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

function NavyActivityIndicator() {
  return (
    <span className="tl-radial-spinner" role="status" aria-label="Loading">
      {Array.from({ length: 8 }, (_, index) => (
        <span key={index} style={{ transform: `rotate(${index * 45}deg)` }} />
      ))}
    </span>
  );
}

export function GlobalLoadingIndicator() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  const stop = useCallback(() => setVisible(false), []);

  useEffect(() => {
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;

    const begin = () => {
      setVisible(true);
      if (safetyTimer) clearTimeout(safetyTimer);
      // Safety release if a navigation is interrupted or the browser cancels it.
      safetyTimer = setTimeout(() => setVisible(false), 25_000);
    };

    const end = () => {
      if (safetyTimer) clearTimeout(safetyTimer);
      setVisible(false);
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const explicitButton = target?.closest<HTMLElement>('[data-global-loading="true"]');
      if (explicitButton) {
        begin();
        return;
      }

      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download') || anchor.getAttribute('aria-disabled') === 'true') return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname && url.search === window.location.search) return;
      begin();
    };

    const onSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement | null;
      if (form?.matches('[data-global-loading="true"]')) begin();
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('submit', onSubmit, true);
    window.addEventListener('tourledger:loading-start', begin);
    window.addEventListener('tourledger:loading-end', end);
    window.addEventListener('pageshow', end);

    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('submit', onSubmit, true);
      window.removeEventListener('tourledger:loading-start', begin);
      window.removeEventListener('tourledger:loading-end', end);
      window.removeEventListener('pageshow', end);
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="tl-loading-overlay" role="status" aria-live="polite" aria-label="Loading page">
      <NavyActivityIndicator />
    </div>
  );
}
