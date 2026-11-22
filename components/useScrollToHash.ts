"use client";

import { useEffect } from "react";

/**
 * Links like /conditions#wind can't rely on the browser's own jump: the page
 * content only renders after sign-in is confirmed, and the sections above the
 * target keep settling for a moment (charts measure themselves, panels fade in).
 * Once `ready`, scroll to the target, re-align it a few times while the layout
 * settles (stopping as soon as the user scrolls on their own), and flash it.
 */
export function useScrollToHash(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    const timers: number[] = [];
    let userMoved = false;
    const stop = () => (userMoved = true);

    const align = () => {
      if (userMoved) return;
      const el = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
      el?.scrollIntoView({ behavior: "auto", block: "start" });
    };

    const go = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      userMoved = false;
      for (const ms of [60, 250, 600, 1100, 1800]) timers.push(window.setTimeout(align, ms));
      timers.push(
        window.setTimeout(() => {
          el.classList.remove("is-targeted");
          void el.offsetWidth; // restart the flash animation
          el.classList.add("is-targeted");
          timers.push(window.setTimeout(() => el.classList.remove("is-targeted"), 2200));
        }, 600),
      );
    };

    go();
    window.addEventListener("hashchange", go);
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    window.addEventListener("keydown", stop);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("hashchange", go);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", stop);
    };
  }, [ready]);
}
