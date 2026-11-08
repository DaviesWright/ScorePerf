"use client";

import React, { useEffect, useState } from "react";

// Full-screen crossfading background for the sign-in pages. Each client deployment brings its own images:
// put them in public/login-backgrounds/ and list them in public/login-backgrounds/slides.json:
//   { "intervalSeconds": 6, "slides": [ { "src": "/login-backgrounds/hq.jpg", "alt": "Head office" } ] }
// With no slides listed (or the manifest missing) the built-in brand gradients are shown instead.

type Slide = { kind: "image"; src: string; alt: string } | { kind: "gradient"; css: string };

const MANIFEST_URL = "/login-backgrounds/slides.json";
const MAX_SLIDES = 10;
const DEFAULT_INTERVAL = 6;
// Same-site path or https URL only: no javascript:, data: or protocol-relative URLs.
const SAFE_SRC = /^(\/(?!\/)[^\s"'<>]*|https:\/\/[^\s"'<>]+)$/;

const BUILT_IN: Slide[] = [
  { kind: "gradient", css: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 55%, #0ea5e9 100%)" },
  { kind: "gradient", css: "linear-gradient(135deg, #064e3b 0%, #059669 50%, #4338ca 100%)" },
  { kind: "gradient", css: "linear-gradient(135deg, #7c2d12 0%, #ea580c 45%, #4338ca 100%)" },
];

function parseManifest(raw: unknown): { slides: Slide[]; interval: number } | null {
  if (!raw || typeof raw !== "object") return null;
  const { slides, intervalSeconds } = raw as { slides?: unknown; intervalSeconds?: unknown };
  if (!Array.isArray(slides)) return null;
  const images: Slide[] = [];
  for (const s of slides.slice(0, MAX_SLIDES)) {
    const { src, alt } = (s ?? {}) as { src?: unknown; alt?: unknown };
    if (typeof src === "string" && SAFE_SRC.test(src)) {
      images.push({ kind: "image", src, alt: typeof alt === "string" ? alt : "" });
    }
  }
  const seconds = typeof intervalSeconds === "number" && Number.isFinite(intervalSeconds) ? Math.min(30, Math.max(3, intervalSeconds)) : DEFAULT_INTERVAL;
  return { slides: images, interval: seconds };
}

export const LoginBackground: React.FC = () => {
  const [slides, setSlides] = useState<Slide[]>(BUILT_IN);
  const [interval, setIntervalSeconds] = useState(DEFAULT_INTERVAL);
  const [active, setActive] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(MANIFEST_URL, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const parsed = parseManifest(json);
        if (cancelled || !parsed) return;
        setIntervalSeconds(parsed.interval);
        if (parsed.slides.length > 0) {
          setSlides(parsed.slides);
          setActive(0);
        }
      })
      .catch(() => {
        // No manifest or unreadable: keep the built-in gradients.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (slides.length < 2 || reducedMotion) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % slides.length), interval * 1000);
    return () => clearInterval(timer);
  }, [slides, interval, reducedMotion]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", backgroundColor: "#1e1b4b" }}>
      {slides.map((slide, i) => {
        const shown = i === active;
        const common: React.CSSProperties = {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: shown ? 1 : 0,
          transition: reducedMotion ? "none" : "opacity 1.4s ease",
        };
        return slide.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={slide.src} src={slide.src} alt="" style={{ ...common, objectFit: "cover" }} />
        ) : (
          <div key={slide.css} style={{ ...common, background: slide.css }} />
        );
      })}

      {/* Soft scrim so the sign-in card stays readable over bright photos. */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(15,23,42,0.25) 0%, rgba(15,23,42,0.45) 100%)" }} />

      {slides.length > 1 && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "1.25rem", display: "flex", justifyContent: "center", gap: "0.5rem" }}>
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Show background ${i + 1} of ${slides.length}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              style={{
                width: i === active ? "22px" : "8px",
                height: "8px",
                borderRadius: "999px",
                border: "none",
                padding: 0,
                cursor: "pointer",
                backgroundColor: i === active ? "#ffffff" : "rgba(255,255,255,0.5)",
                transition: reducedMotion ? "none" : "background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
