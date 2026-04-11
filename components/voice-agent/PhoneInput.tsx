"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

const COUNTRY_CODES = [
  { code: "+30",  name: "Greece",        flag: "🇬🇷" },
  { code: "+357", name: "Cyprus",        flag: "🇨🇾" },
  { code: "+1",   name: "USA / Canada",  flag: "🇺🇸" },
  { code: "+44",  name: "UK",            flag: "🇬🇧" },
  { code: "+49",  name: "Germany",       flag: "🇩🇪" },
  { code: "+33",  name: "France",        flag: "🇫🇷" },
  { code: "+39",  name: "Italy",         flag: "🇮🇹" },
  { code: "+34",  name: "Spain",         flag: "🇪🇸" },
  { code: "+31",  name: "Netherlands",   flag: "🇳🇱" },
  { code: "+32",  name: "Belgium",       flag: "🇧🇪" },
  { code: "+41",  name: "Switzerland",   flag: "🇨🇭" },
  { code: "+43",  name: "Austria",       flag: "🇦🇹" },
  { code: "+351", name: "Portugal",      flag: "🇵🇹" },
  { code: "+46",  name: "Sweden",        flag: "🇸🇪" },
  { code: "+47",  name: "Norway",        flag: "🇳🇴" },
  { code: "+45",  name: "Denmark",       flag: "🇩🇰" },
  { code: "+358", name: "Finland",       flag: "🇫🇮" },
  { code: "+48",  name: "Poland",        flag: "🇵🇱" },
  { code: "+420", name: "Czech Rep.",    flag: "🇨🇿" },
  { code: "+36",  name: "Hungary",       flag: "🇭🇺" },
  { code: "+40",  name: "Romania",       flag: "🇷🇴" },
  { code: "+359", name: "Bulgaria",      flag: "🇧🇬" },
  { code: "+90",  name: "Turkey",        flag: "🇹🇷" },
  { code: "+7",   name: "Russia",        flag: "🇷🇺" },
  { code: "+380", name: "Ukraine",       flag: "🇺🇦" },
  { code: "+972", name: "Israel",        flag: "🇮🇱" },
  { code: "+971", name: "UAE",           flag: "🇦🇪" },
  { code: "+966", name: "Saudi Arabia",  flag: "🇸🇦" },
  { code: "+961", name: "Lebanon",       flag: "🇱🇧" },
  { code: "+20",  name: "Egypt",         flag: "🇪🇬" },
  { code: "+61",  name: "Australia",     flag: "🇦🇺" },
  { code: "+64",  name: "New Zealand",   flag: "🇳🇿" },
  { code: "+91",  name: "India",         flag: "🇮🇳" },
  { code: "+86",  name: "China",         flag: "🇨🇳" },
  { code: "+81",  name: "Japan",         flag: "🇯🇵" },
  { code: "+82",  name: "South Korea",   flag: "🇰🇷" },
  { code: "+65",  name: "Singapore",     flag: "🇸🇬" },
  { code: "+66",  name: "Thailand",      flag: "🇹🇭" },
  { code: "+27",  name: "South Africa",  flag: "🇿🇦" },
  { code: "+55",  name: "Brazil",        flag: "🇧🇷" },
  { code: "+52",  name: "Mexico",        flag: "🇲🇽" },
  { code: "+54",  name: "Argentina",     flag: "🇦🇷" },
];

function parsePhone(value: string): { dialCode: string; number: string } {
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (value.startsWith(c.code + " ") || value === c.code) {
      return { dialCode: c.code, number: value.slice(c.code.length).trim() };
    }
  }
  // Try without space
  for (const c of sorted) {
    if (value.startsWith(c.code)) {
      return { dialCode: c.code, number: value.slice(c.code.length).trim() };
    }
  }
  return { dialCode: "+30", number: value };
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}

export default function PhoneInput({ value, onChange, placeholder = "210 1234567", error }: Props) {
  const parsed = parsePhone(value);
  const [dialCode, setDialCode] = useState(parsed.dialCode);
  const [number, setNumber]     = useState(parsed.number);
  const [open, setOpen]         = useState(false);
  const [search, setSearch]     = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function selectCode(code: string) {
    setDialCode(code);
    setOpen(false);
    setSearch("");
    onChange(`${code} ${number}`.trim());
  }

  function handleNumber(n: string) {
    setNumber(n);
    onChange(`${dialCode} ${n}`.trim());
  }

  const selected = COUNTRY_CODES.find((c) => c.code === dialCode) ?? COUNTRY_CODES[0];
  const filtered = search
    ? COUNTRY_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search)
      )
    : COUNTRY_CODES;

  const borderClass = error
    ? "border-red-300 focus:border-red-500 focus:ring-red-100"
    : "border-gray-200 focus:border-violet-400 focus:ring-violet-100";

  return (
    <div ref={ref} className="relative flex">
      {/* Dial code button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-2.5 bg-white border border-r-0 rounded-l-xl text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-gray-50 ${borderClass}`}
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span className="text-gray-700 text-xs">{selected.code}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-violet-400"
            />
          </div>
          <div className="overflow-y-auto max-h-52">
            {filtered.map((c) => (
              <button
                key={`${c.code}-${c.name}`}
                type="button"
                onClick={() => selectCode(c.code)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-violet-50 transition-colors text-left ${
                  dialCode === c.code ? "bg-violet-50 text-violet-700" : "text-gray-700"
                }`}
              >
                <span className="text-sm leading-none">{c.flag}</span>
                <span className="flex-1">{c.name}</span>
                <span className="text-gray-400">{c.code}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-gray-400 px-3 py-4 text-center">No results</p>
            )}
          </div>
        </div>
      )}

      {/* Number input */}
      <input
        type="tel"
        value={number}
        onChange={(e) => handleNumber(e.target.value)}
        placeholder={placeholder}
        className={`flex-1 min-w-0 px-3.5 py-2.5 text-sm bg-white border rounded-r-xl outline-none transition-all focus:ring-2 ${borderClass}`}
      />
    </div>
  );
}
