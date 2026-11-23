"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// useState that survives leaving a screen and coming back within the same browser tab session.
// Screens unmount when you navigate away, so plain useState loses filters, search text and the open tab.
// Values live in sessionStorage (this tab only, cleared when it closes). Use it only for UI state such as
// filters and tabs, never for personal data.
//
// The saved value is read after mount, not during render, so server and client render the same first frame.
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function useViewState<T>(key: string, initial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = `scoreview:view:${key}`;
  const [value, setValue] = useState<T>(initial);
  // The save effect's first run happens in the same commit as the restore, before the restored value has
  // rendered, so it would write the default back over the saved value. Skip that one run.
  const skipFirstSave = useRef(true);

  useIsoLayoutEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // Storage blocked or unreadable: keep the default.
    }
  }, [storageKey]);

  useEffect(() => {
    if (skipFirstSave.current) {
      skipFirstSave.current = false;
      return;
    }
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      // Storage blocked (private mode): the filter just resets, as before.
    }
  }, [storageKey, value]);

  return [value, setValue];
}

/**
 * Open another screen already filtered: writes the target screen's saved view state, then navigates.
 * Keys are the useViewState keys of that screen, e.g. { "TimeAndLeaveView:requestFilter": "PENDING" }.
 */
export function presetViewState(presets: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  for (const [key, value] of Object.entries(presets)) {
    try {
      window.sessionStorage.setItem(`scoreview:view:${key}`, JSON.stringify(value));
    } catch {
      // Storage blocked: the screen opens unfiltered.
    }
  }
}
