import { useEffect, useState } from 'react';

export function downloadText(filename: string, text: string, mime = 'text/plain'): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Load data asynchronously; reloads whenever a dependency changes. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[]): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let live = true;
    fn().then((v) => live && setValue(v));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- callers pass their own deps
  }, deps);
  return value;
}

export function percent(x: number | null): string {
  return x === null ? '–' : `${Math.round(x * 100)}%`;
}

const FENCE = /```[^\n]*\n[\s\S]*?```/g;

/** One-line preview of a question for tables; code blocks become "[code]". */
export function questionPreview(text: string, max = 90): string {
  const flat = text.replace(FENCE, ' [code] ').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
