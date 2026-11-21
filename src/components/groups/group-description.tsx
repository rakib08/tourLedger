'use client';

import { useState } from 'react';

export function GroupDescription({ description, fallback }: { description: string | null; fallback: string }) {
  const [expanded, setExpanded] = useState(false);
  const text = description?.trim() || fallback;

  return (
    <div className="mt-2 max-w-2xl">
      <p className={`text-sm leading-6 text-white/75 ${expanded ? 'whitespace-pre-line' : 'line-clamp-3'}`}>
        {text}
      </p>
      {text.length > 110 && (
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          aria-expanded={expanded}
          className="mt-1 inline-flex min-h-9 items-center text-sm font-semibold text-[#e5bb68] underline-offset-4 hover:underline"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
