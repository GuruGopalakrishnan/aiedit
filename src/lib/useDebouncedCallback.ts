import { useCallback, useEffect, useRef } from "react";

/** Delays invoking `fn` until `delayMs` have passed since the last call — used to avoid autosaving on every slider tick / keystroke. */
export function useDebouncedCallback<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number) {
  const fnRef = useRef(fn);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the ref pointing at the latest `fn` without mutating it during render.
  useEffect(() => {
    fnRef.current = fn;
  });

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return useCallback(
    (...args: Args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fnRef.current(...args), delayMs);
    },
    [delayMs]
  );
}
