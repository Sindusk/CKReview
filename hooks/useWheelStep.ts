"use client";

// hooks/useWheelStep.ts
//
// Mouse wheel over a closed <select> (or any element) steps its choice:
// down = next, up = previous. Returns a callback ref, so it attaches
// whenever the element mounts (a dialog's select appears only when it
// opens). The listener is non-passive so the wheel doesn't also scroll the
// dialog behind it; React's onWheel can't preventDefault.

import { useCallback, useRef } from "react";

export function useWheelStep<T extends HTMLElement>(step: (dir: 1 | -1) => void): (el: T | null) => void {
  const stepRef = useRef(step);
  stepRef.current = step;
  const detach = useRef<(() => void) | null>(null);
  return useCallback((el: T | null) => {
    detach.current?.();
    detach.current = null;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      stepRef.current(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    detach.current = () => el.removeEventListener("wheel", onWheel);
  }, []);
}
