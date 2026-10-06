"use client";

/* ==================================================================
   msui — a small kit of *authentic Microsoft Fluent / Office* chrome
   primitives shared by Excel Studio and Power BI Studio.

   Colors are the real ones:
   · Excel title bar   #217346  ("Colorful" theme green)
   · Power BI title    #F2C811  (Power BI Desktop yellow)
   · Ribbon surface    #f3f2f1, hover #e1dfdd, pressed #d2d0ce
   · Group separators  #d2d0ce · group labels #605e5c
   · Grid accent       #c6e0b4 (selected header), #217346 outline
   · PBI selection     #118DFF · PBI canvas surface #eaeaea
   Font stack matches Office: Segoe UI, fallback system.
   ================================================================== */

import * as React from "react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { X, Check, ChevronDown, ChevronRight, Minus, Square } from "lucide-react";

export const SEGOE =
  '"Segoe UI", "Segoe UI Web (West European)", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", sans-serif';

export const MS = {
  excelGreen: "#217346",
  excelGreenDark: "#1b5e39",
  pbiYellow: "#F2C811",
  pbiYellowDark: "#c8a400",
  surface: "#f3f2f1",
  hover: "#e1dfdd",
  pressed: "#d2d0ce",
  border: "#d2d0ce",
  label: "#605e5c",
  ink: "#252423",
  pbiBlue: "#118DFF",
  pbiSurface: "#eaeaea",
  headerGreen: "#c6e0b4",
  ribbonBg: "#ffffff",
} as const;

/* ================= app window ================= */

/** The top strip: colored title bar with QAT, centered file name and (optional) search. */
export function MsTitleBar({
  color, logo, title, qat, search, right, searchItems,
}: {
  color: string; logo: React.ReactNode; title: string;
  qat?: React.ReactNode; search?: React.ReactNode; right?: React.ReactNode;
  searchItems?: { label: string; hint?: string; run: () => void }[];
}) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const matches = q.trim()
    ? (searchItems ?? []).filter((it) => it.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
    : (searchItems ?? []).slice(0, 6);

  return (
    <div className="relative flex items-center gap-2 px-2.5 py-1" style={{ background: color, minHeight: 44 }}>
      <div className="flex items-center gap-2" style={{ color: "#fff" }}>
        {logo}
        <div className="hidden items-center gap-0.5 md:flex">{qat}</div>
        <span
          className="pointer-events-none hidden whitespace-nowrap text-[13px] font-semibold md:block"
          style={{ textShadow: "0 1px 1px rgba(0,0,0,0.18)" }}
          aria-hidden
        >
          {title}
        </span>
      </div>
      {search && (
        <div ref={boxRef} className="absolute left-1/2 top-1/2 hidden w-[340px] -translate-x-1/2 -translate-y-1/2 lg:block xl:w-[420px]">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches[0]) { matches[0].run(); setOpen(false); setQ(""); }
                if (e.key === "Escape") { setOpen(false); setQ(""); }
              }}
              placeholder={typeof search === "string" ? search : "Search"}
              className="h-[28px] w-full rounded-[4px] border border-black/10 bg-white px-3 text-[12.5px] text-[#252423] shadow-sm outline-none placeholder:text-[#605e5c] focus:border-white focus:ring-2 focus:ring-white/70"
              aria-label="Search ribbon commands"
            />
            {open && matches.length > 0 && (
              <div className="absolute left-0 right-0 top-[32px] z-50 overflow-hidden rounded-[4px] border border-[#e1dfdd] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
                {matches.map((it, i) => (
                  <button
                    key={`${it.label}-${i}`}
                    className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-[12.5px] text-[#252423] hover:bg-[#f3f2f1]"
                    onMouseDown={(e) => { e.preventDefault(); it.run(); setOpen(false); setQ(""); }}
                  >
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    {it.hint && <span className="shrink-0 text-[10.5px] text-[#605e5c]">{it.hint}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div className="ml-auto flex items-center gap-1.5">{right}</div>
    </div>
  );
}

/** Fake (but honest) window glyphs used inside the title bar right corner. */
export function MsWindowGlyphs({ onCollapse, collapsed }: { onCollapse?: () => void; collapsed?: boolean }) {
  return (
    <div className="hidden items-center gap-0.5 text-white sm:flex" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.15))" }}>
      <button title="Minimize the ribbon" className="rounded-[3px] p-[5px] hover:bg-white/20" onClick={onCollapse}>
        <Minus className="h-3 w-3" />
      </button>
      <button title={collapsed ? "Expand the ribbon" : "Collapse the ribbon"} className="rounded-[3px] p-[4px] hover:bg-white/20" onClick={onCollapse}>
        <Square className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

/** Office AutoSave-style pill switch (label left of the pill). */
export function MsAutoSave({ on, onToggle, dark }: { on: boolean; onToggle: () => void; dark?: boolean }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[11.5px] font-medium hover:bg-white/15"
      style={{ color: dark ? MS.ink : "#fff" }}
      title="AutoSave — continuously saves your workbook in this browser"
    >
      AutoSave
      <span
        className="relative inline-flex h-[14px] w-[30px] items-center rounded-full border transition-colors"
        style={{
          background: on ? (dark ? MS.pbiYellow : "#fff") : "rgba(255,255,255,0.25)",
          borderColor: dark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.8)",
        }}
        aria-hidden
      >
        <span
          className="absolute h-[10px] w-[10px] rounded-full transition-all"
          style={{
            left: on ? 17 : 3,
            background: on ? (dark ? MS.ink : MS.excelGreen) : "#fff",
          }}
        />
      </span>
    </button>
  );
}

export function MsQatBtn({ title, onClick, disabled, children, dark }: {
  title: string; onClick?: () => void; disabled?: boolean; children: React.ReactNode; dark?: boolean;
}) {
  return (
    <TooltipProvider delayDuration={400}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            disabled={disabled}
            className={`rounded-[3px] p-[5px] transition-colors disabled:opacity-40 ${dark ? "hover:bg-black/10" : "hover:bg-white/20"}`}
            style={{ color: dark ? MS.ink : "#fff" }}
            aria-label={title}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px]">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ================= ribbon ================= */

export function RibbonTabs<T extends string>({
  tabs, active, onChange, accent, right, menuBtn,
}: {
  tabs: readonly (readonly [T, string])[];
  active: T; onChange: (t: T) => void; accent: string;
  right?: React.ReactNode;
  menuBtn?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-stretch gap-0 border-b border-[#d2d0ce] px-1.5" style={{ background: MS.surface }} role="tablist">
      {menuBtn && (
        <button
          onClick={menuBtn.onClick}
          className="mr-1 px-3 text-[12.5px] font-semibold text-[#252423] hover:bg-[#e1dfdd]"
          aria-label={menuBtn.label}
        >
          File
        </button>
      )}
      {tabs.map(([id, label]) => {
        const on = active === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(id)}
            className="relative px-3.5 pb-[7px] pt-[7px] text-[12.5px] transition-colors first:rounded-t-[4px]"
            style={{
              background: on ? "#ffffff" : "transparent",
              color: "#252423",
              fontWeight: on ? 600 : 400,
            }}
            onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "#ebebea"; }}
            onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}
          >
            {label}
            {on && <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: accent }} />}
          </button>
        );
      })}
      <div className="ml-auto flex items-center pr-1">{right}</div>
    </div>
  );
}

export function RibbonBody({ children, collapsed }: { children: React.ReactNode; collapsed?: boolean }) {
  if (collapsed) return null;
  return (
    <div className="flex flex-wrap items-stretch gap-0 px-1.5 py-1.5" style={{ background: MS.surface }}>
      {children}
    </div>
  );
}

/** Ribbon group — thin separators, centered caption on the bottom, Fluent spacing. */
export function RGroup({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className="relative flex flex-col px-2 pb-[18px] pt-0.5"
      style={{ borderRight: last ? undefined : "1px solid #d2d0ce", marginRight: 2 }}
    >
      <div className="flex flex-wrap items-center gap-0.5">{children}</div>
      <span
        className="pointer-events-none absolute bottom-[3px] left-0 right-0 text-center text-[10px]"
        style={{ color: MS.label }}
      >
        {label}
      </span>
    </div>
  );
}

/** Big ribbon button: stacked icon + caption (like Paste, AutoSum…). */
export function RBig({ title, onClick, children, label, chevron, disabled, active, accentIcon }: {
  title: string; onClick: () => void; children: React.ReactNode; label: string;
  chevron?: boolean; disabled?: boolean; active?: boolean; accentIcon?: string;
}) {
  return (
    <MsTip title={title}>
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex h-[62px] w-[58px] flex-col items-center justify-center gap-0.5 rounded-[4px] px-1 transition-colors disabled:opacity-40"
        style={{ background: active ? MS.pressed : "transparent", color: MS.ink }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = MS.hover; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? MS.pressed : "transparent"; }}
      >
        <span className="flex h-6 items-center justify-center" style={accentIcon ? { color: accentIcon } : undefined}>{children}</span>
        <span className="flex items-center gap-0.5 text-[11px] leading-none">
          {label}
          {chevron && <ChevronDown className="h-2.5 w-2.5" style={{ color: MS.label }} />}
        </span>
      </button>
    </MsTip>
  );
}

/** Small ribbon button: inline icon (+ optional text). */
export function RSmall({ title, onClick, children, label, active, disabled, chevron, toggleLook }: {
  title: string; onClick?: () => void; children?: React.ReactNode; label?: string;
  active?: boolean; disabled?: boolean; chevron?: boolean; toggleLook?: boolean;
}) {
  const on = active && toggleLook;
  return (
    <MsTip title={title}>
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex h-[26px] items-center gap-1 rounded-[3px] px-[7px] text-[11.5px] transition-colors disabled:opacity-40"
        style={{
          background: on ? "#dbe6dc" : "transparent",
          color: MS.ink,
          border: on ? "1px solid #b7cbb9" : "1px solid transparent",
        }}
        onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = MS.hover; }}
        onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}
      >
        {children}
        {label && <span className="whitespace-nowrap">{label}</span>}
        {chevron && <ChevronDown className="h-2.5 w-2.5" style={{ color: MS.label }} />}
      </button>
    </MsTip>
  );
}

/** Icon-only tiny button used inside groups (font color split, etc.). */
export function RIco({ title, onClick, children, active, disabled }: {
  title: string; onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean;
}) {
  return (
    <MsTip title={title}>
      <button
        onClick={onClick}
        disabled={disabled}
        className="flex h-[24px] w-[24px] items-center justify-center rounded-[3px] transition-colors disabled:opacity-40"
        style={{ background: active ? MS.pressed : "transparent", color: MS.ink }}
        onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = MS.hover; }}
        onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? MS.pressed : "transparent"; }}
      >
        {children}
      </button>
    </MsTip>
  );
}

export function MSep() {
  return <span className="mx-1.5 h-[22px] w-px self-center" style={{ background: MS.border }} />;
}

/* ================= menus & dialogs ================= */

export function MsMenu({ children, align = "right", width }: { children: React.ReactNode; align?: "left" | "right"; width?: number }) {
  return (
    <div
      className="absolute top-full z-40 mt-[3px] rounded-[4px] border border-[#e1dfdd] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.20)]"
      style={{ [align]: 0, minWidth: width ?? 200 } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

export function MsMenuItem({ children, onClick, disabled, check, icon }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; check?: boolean; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2 px-2.5 py-[5px] text-left text-[12.5px] text-[#252423] hover:bg-[#f3f2f1] disabled:opacity-40"
    >
      <span className="flex w-4 shrink-0 justify-center">{check ? <Check className="h-3.5 w-3.5" /> : icon}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

export function MsSep() {
  return <div className="my-1 h-px" style={{ background: "#edebe9" }} />;
}

export function MsTip({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <TooltipProvider delayDuration={350}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="bottom" className="text-[11px]">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Fluent dialog: white sheet, subtle border, title strip with close glyph. */
export function MsDialog({ title, onClose, children, width = 460 }: {
  title: string; onClose: () => void; children: React.ReactNode; width?: number;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[10vh]" onMouseDown={onClose}>
      <div
        className="max-h-[76vh] overflow-auto rounded-[8px] border border-[#e1dfdd] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.30)]"
        style={{ width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[#edebe9] bg-white px-4 py-2.5">
          <p className="text-[13.5px] font-semibold text-[#252423]">{title}</p>
          <button className="rounded-[3px] p-1 text-[#605e5c] hover:bg-[#f3f2f1]" onClick={onClose} aria-label="Close dialog">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

/* ================= office backstage (File) ================= */

export function MsBackstage({ color, items, active, onNavigate, onClose, title, children }: {
  color: string;
  items: readonly (readonly [string, string])[];
  active: string; onNavigate: (id: string) => void; onClose: () => void;
  title: string; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex" onMouseDown={onClose}>
      <div className="flex w-[240px] shrink-0 flex-col pt-2" style={{ background: color }} onMouseDown={(e) => e.stopPropagation()}>
        <button
          className="mx-3 mb-2 flex items-center gap-2 self-start rounded-[4px] px-3 py-1.5 text-[12.5px] text-white hover:bg-white/15"
          onClick={onClose}
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Back
        </button>
        {items.map(([id, label]) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className="px-6 py-2 text-left text-[13px] font-semibold transition-colors"
            style={{ background: active === id ? "rgba(255,255,255,0.16)" : "transparent", color: "#fff" }}
            onMouseEnter={(e) => { if (active !== id) e.currentTarget.style.background = "rgba(255,255,255,0.10)"; }}
            onMouseLeave={(e) => { if (active !== id) e.currentTarget.style.background = "transparent"; }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto bg-white px-8 py-6" onMouseDown={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-[20px] font-semibold text-[#252423]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

/* ================= misc ================= */

/** Segoe-UI-styled select used across both simulators. */
export function MsSelect({ value, onChange, options, title, width, ariaLabel }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
  title?: string; width?: number; ariaLabel?: string;
}) {
  return (
    <select
      value={value}
      title={title}
      aria-label={ariaLabel ?? title}
      onChange={(e) => onChange(e.target.value)}
      className="h-[26px] rounded-[3px] border border-[#d2d0ce] bg-white px-1.5 text-[11.5px] text-[#252423] outline-none hover:border-[#c8c6c4] focus:border-[#217346]"
      style={{ width }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Yellow Power BI logo glyph (drawn, no asset needed). */
export function PbiLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="10" width="4.6" height="11" rx="0.8" fill="#252423" />
      <rect x="9.7" y="3" width="4.6" height="18" rx="0.8" fill="#252423" />
      <rect x="16.4" y="7" width="4.6" height="14" rx="0.8" fill="#252423" />
    </svg>
  );
}

/** Green Excel logo glyph. */
export function ExcelLogo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="2.5" fill="#fff" fillOpacity="0.14" />
      <path d="M13.2 4H6.4C5.6 4 5 4.6 5 5.4v13.2c0 .8.6 1.4 1.4 1.4h6.8V4Z" fill="#fff" />
      <path d="m13.2 12 4-5.6h2.6l-4.3 5.6 4.3 5.6h-2.6l-4-5.6Z" fill="#fff" fillOpacity="0.85" />
      <path d="M8 8.5h2v7H8zM11 8.5h2v7h-2z" fill="#217346" opacity="0.25" />
    </svg>
  );
}
