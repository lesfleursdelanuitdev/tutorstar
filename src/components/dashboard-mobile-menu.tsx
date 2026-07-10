"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import gsap from "gsap";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

type DashboardMobileMenuProps = {
  draftInvoiceCount?: number;
};

export function DashboardMobileMenu({
  draftInvoiceCount = 0,
}: DashboardMobileMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (!panel || !overlay) return;

    gsap.set(panel, { xPercent: -100 });
    gsap.set(overlay, { opacity: 0, pointerEvents: "none" });
  }, [mounted]);

  useEffect(() => {
    const panel = panelRef.current;
    const overlay = overlayRef.current;
    if (!panel || !overlay) return;

    tlRef.current?.kill();
    const tl = gsap.timeline();
    tlRef.current = tl;

    if (open) {
      document.body.style.overflow = "hidden";
      tl.to(overlay, {
        opacity: 1,
        pointerEvents: "auto",
        duration: 0.35,
        ease: "power2.out",
      }).to(
        panel,
        { xPercent: 0, duration: 0.5, ease: "power3.out" },
        0,
      );
    } else {
      document.body.style.overflow = "";
      tl.to(panel, {
        xPercent: -100,
        duration: 0.42,
        ease: "power3.inOut",
      }).to(
        overlay,
        {
          opacity: 0,
          pointerEvents: "none",
          duration: 0.3,
          ease: "power2.in",
        },
        0.12,
      );
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    return () => {
      tlRef.current?.kill();
      document.body.style.overflow = "";
    };
  }, []);

  const drawer =
    mounted &&
    createPortal(
      <>
        <div
          ref={overlayRef}
          className="fixed inset-0 z-[80] bg-[#0b1b21]/55 backdrop-blur-[2px] lg:hidden"
          aria-hidden={!open}
          onClick={() => setOpen(false)}
        />

        <div
          ref={panelRef}
          className="fixed inset-y-0 left-0 z-[90] w-[230px] overflow-y-auto overflow-x-hidden rounded-r-[28px] shadow-2xl lg:hidden"
          style={{ backgroundColor: "var(--axo-ink)" }}
          role="dialog"
          aria-modal={open}
          aria-label="Navigation menu"
          aria-hidden={!open}
        >
          <div
            className="relative h-full min-h-full"
            style={{ backgroundColor: "var(--axo-ink)" }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 z-10 btn btn-ghost btn-circle btn-sm text-white hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
            <DashboardSidebar
              draftInvoiceCount={draftInvoiceCount}
              className="min-h-full rounded-r-[28px]"
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      </>,
      document.body,
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-square lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="size-6" />
      </button>
      {drawer}
    </>
  );
}
