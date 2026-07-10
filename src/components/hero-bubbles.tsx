"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

type Bubble = {
  size: number;
  left: string;
  bottom: string;
  color: "aqua" | "aquaSoft" | "pink" | "pinkSoft";
  opacity: number;
  duration: number;
  delay: number;
  drift: number;
  rise: number;
};

const BUBBLES: Bubble[] = [
  { size: 260, left: "-6%", bottom: "4%", color: "aquaSoft", opacity: 0.9, duration: 22, delay: 0, drift: 48, rise: 280 },
  { size: 300, left: "70%", bottom: "-14%", color: "pinkSoft", opacity: 0.85, duration: 26, delay: 1.5, drift: -56, rise: 320 },
  { size: 24, left: "78%", bottom: "12%", color: "aqua", opacity: 0.9, duration: 11, delay: 0.4, drift: 30, rise: 360 },
  { size: 14, left: "86%", bottom: "8%", color: "pink", opacity: 0.55, duration: 13, delay: 1.8, drift: -24, rise: 340 },
  { size: 18, left: "12%", bottom: "6%", color: "pink", opacity: 0.5, duration: 14, delay: 2.6, drift: 34, rise: 380 },
  { size: 36, left: "22%", bottom: "0%", color: "aqua", opacity: 0.55, duration: 16, delay: 0.9, drift: -38, rise: 400 },
  { size: 12, left: "48%", bottom: "2%", color: "aquaSoft", opacity: 0.75, duration: 10, delay: 0.2, drift: 20, rise: 320 },
  { size: 20, left: "58%", bottom: "4%", color: "pinkSoft", opacity: 0.55, duration: 12, delay: 3.2, drift: -28, rise: 350 },
  { size: 10, left: "38%", bottom: "10%", color: "pink", opacity: 0.45, duration: 15, delay: 4, drift: 22, rise: 370 },
  { size: 28, left: "4%", bottom: "18%", color: "aquaSoft", opacity: 0.55, duration: 17, delay: 1.1, drift: 36, rise: 300 },
];

const COLOR: Record<Bubble["color"], string> = {
  aqua: "var(--axo-aqua-blob)",
  aquaSoft: "var(--axo-aqua-tint-2)",
  pink: "var(--axo-pink-soft)",
  pinkSoft: "var(--axo-pink-tint-2)",
};

export function HeroBubbles() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const wrappers = root.querySelectorAll<HTMLElement>("[data-bubble]");
    const tweens: gsap.core.Tween[] = [];

    wrappers.forEach((wrapper, i) => {
      const cfg = BUBBLES[i];
      const inner = wrapper.firstElementChild as HTMLElement | null;
      if (!cfg || !inner) return;

      gsap.set(wrapper, { y: 0, x: 0, opacity: cfg.opacity });
      gsap.set(inner, { x: 0 });

      // Outer: float up from the bottom with a soft sideways drift, fade out,
      // then drop back below and loop.
      const floatTween = gsap.to(wrapper, {
        keyframes: [
          {
            y: -cfg.rise * 0.35,
            x: cfg.drift * 0.45,
            duration: cfg.duration * 0.35,
            ease: "sine.out",
          },
          {
            y: -cfg.rise * 0.7,
            x: cfg.drift * -0.25,
            duration: cfg.duration * 0.35,
            ease: "sine.inOut",
          },
          {
            y: -cfg.rise,
            x: cfg.drift,
            opacity: 0,
            duration: cfg.duration * 0.3,
            ease: "sine.in",
          },
        ],
        delay: cfg.delay,
        repeat: -1,
        onRepeat() {
          gsap.set(wrapper, { y: 60, x: 0, opacity: 0 });
          gsap.to(wrapper, {
            opacity: cfg.opacity,
            duration: 1.2,
            ease: "power1.out",
          });
        },
      });

      // Inner: gentle side-to-side wobble so they feel buoyant.
      const wobble = gsap.to(inner, {
        x: 10 + (i % 5) * 2,
        duration: 2.2 + (i % 4) * 0.4,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
        delay: cfg.delay * 0.25,
      });

      tweens.push(floatTween, wobble);
    });

    return () => {
      tweens.forEach((t) => t.kill());
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          data-bubble
          className="absolute"
          style={{
            width: b.size,
            height: b.size,
            left: b.left,
            bottom: b.bottom,
            willChange: "transform, opacity",
          }}
        >
          <div
            className="h-full w-full rounded-full"
            style={{ background: COLOR[b.color] }}
          />
        </div>
      ))}
    </div>
  );
}
