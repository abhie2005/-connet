"use client";
// Logos, loaded once each and shared by the graph and the profile card.
import { useEffect, useState } from "react";
import { logoUrl, MIN_LOGO_PX } from "@/lib/logo";

type Entry = HTMLImageElement | "loading" | "none";
const cache = new Map<string, Entry>();
const waiting = new Map<string, Set<() => void>>();

/** The logo for a domain if it has arrived, else null. The first call starts the download. */
export function logoFor(domain: string | null): HTMLImageElement | null {
  if (!domain || typeof Image === "undefined") return null;
  const have = cache.get(domain);
  if (have) return typeof have === "string" ? null : have;
  cache.set(domain, "loading");
  const img = new Image();
  img.decoding = "async";
  const done = (ok: boolean) => {
    cache.set(domain, ok ? img : "none");
    waiting.get(domain)?.forEach((tell) => tell());
    waiting.delete(domain);
  };
  img.onload = () => done(img.naturalWidth >= MIN_LOGO_PX);
  img.onerror = () => done(false);
  img.src = logoUrl(domain);
  return null;
}

/** For React: the logo's address once it is known to be a real one, else null. */
export function useLogo(domain: string | null): string | null {
  const [, tick] = useState(0);
  useEffect(() => {
    if (!domain || logoFor(domain) || cache.get(domain) === "none") return;
    const tell = () => tick((n) => n + 1);
    const set = waiting.get(domain) || new Set();
    set.add(tell);
    waiting.set(domain, set);
    return () => {
      set.delete(tell);
    };
  }, [domain]);
  return domain && logoFor(domain) ? logoUrl(domain) : null;
}
