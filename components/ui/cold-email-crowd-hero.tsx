"use client";

/* Signal-led outbound hero: a crowd walks past, a buying signal pops over one person, a first
   line is typed, an email flies along an arc, and the reply comes back.
   Ported from the Reachable hero (Open Peeps crowd, CC0, + canvas beams) and changed in three
   ways for this repo: the crowd art is served from /public so it still draws with no network,
   the type comes from the fonts already loaded in app/layout.tsx rather than Google's, and the
   palette is black, white and grey rather than the blue-into-purple the app itself wears. */
import { useEffect, useRef } from "react";
import { animate, stagger } from "motion";

/* Open Peeps (CC0), vendored into public/peeps so a dead venue wifi cannot empty the crowd. */
const PEEPS = Array.from({ length: 20 }, (_, i) => `/peeps/p${String(i + 1).padStart(2, "0")}.svg`);

export type Reach = {
  tag: string;
  tc: "caution" | "route" | "plain";
  signal: string;
  lab: string;
  line: string;
  rtag: string;
  rc: "caution" | "route" | "plain";
  reply: string;
};

/** One person in the crowd. */
interface Peep {
  el: HTMLElement;
  pe: HTMLElement;
  hp: HTMLElement;
  img: HTMLImageElement;
  t: number;
  depth: number;
  w: number;
  h: number;
  dir: number;
  speed: number;
  x: number;
  v: number;
  state: "walk" | "locked" | "read";
  reached: boolean;
  ph: number;
  f: number;
  bob: number;
  px: number;
}

/** One reach in flight: the person it is aimed at, and how far along it is. */
interface Slot {
  tip: HTMLElement;
  box: HTMLElement;
  p: Peep | null;
  d: Reach;
  t0: number;
  st: number;
  ly: number;
  hx: number;
  ty: number;
}

/** The first line being typed. */
interface Compose {
  d: Reach;
  t0: number;
  n: number;
}

/* The market the app already invents for itself (lib/sample/data.ts). No real company is named
   here on purpose: the repo's rule is invented companies everywhere, and a landing page that
   claims a real firm is hiring is a claim we cannot quote a source for. */
const DEFAULT_DATA: Reach[] = [
  { tag: "Hiring", tc: "caution", signal: "Meridian is hiring its first Head of RevOps", lab: "Quoted · Why now", line: "Saw you’re hiring your first RevOps lead —", rtag: "Interested", rc: "route", reply: "Good timing — could you do Thursday at 2pm?" },
  { tag: "Hiring", tc: "caution", signal: "Northlight posted a Director of Instructional Technology", lab: "Quoted · First line", line: "Your new ed-tech lead will be sizing up tools —", rtag: "Question", rc: "plain", reply: "How does it handle handwritten work?" },
  { tag: "Funding", tc: "caution", signal: "Summit Prep raised a $12M Series A", lab: "Quoted · Why now", line: "Fresh Series A, eighteen locations —", rtag: "Referral", rc: "caution", reply: "Please talk to our Head of Academics" },
  { tag: "Hiring", tc: "caution", signal: "Brightpath is hiring 60 tutors near Phoenix", lab: "Quoted · First line", line: "Six new centers in Phoenix —", rtag: "Interested", rc: "route", reply: "Can we see it run on our own worksheets?" },
];

const CSS = `
.rch{
  --base:#f6f6f7;--c1:#d9d9de;--c2:#bfbfc7;--c3:#e8e8ec;--c4:#f0f0f3;
  --ac:24,24,27;--route:rgb(var(--ac));--route2:#000;--tint:#f1f1f4;--rline:#d4d4d9;
  --glass:rgba(255,255,255,.72);--glass-line:rgba(255,255,255,.85);
  --ink:#18181b;--ink2:#3f3f46;--muted:#71717a
}
.rch,.rch *{box-sizing:border-box}
.rch{position:relative;width:100%;height:100vh;min-height:900px;overflow:hidden;background:var(--base);color:var(--ink);font-family:var(--font-archivo),ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.rch a{color:inherit;text-decoration:none}
.rch .bg{position:absolute;inset:0;overflow:hidden;background:var(--base)}
.rch .bg i{position:absolute;border-radius:50%;filter:blur(80px);opacity:.5;will-change:transform}
.rch .b1{left:-14%;top:48%;width:58%;height:84%;background:var(--c1);animation:rch-d1 24s ease-in-out infinite alternate}
.rch .b2{left:24%;top:58%;width:54%;height:76%;background:var(--c2);animation:rch-d2 28s ease-in-out infinite alternate}
.rch .b3{right:-16%;top:42%;width:56%;height:88%;background:var(--c3);animation:rch-d3 26s ease-in-out infinite alternate}
.rch .b4{left:52%;top:52%;width:26%;height:36%;background:var(--c4);animation:rch-d2 20s ease-in-out infinite alternate-reverse}
.rch .dome{position:absolute;left:-28%;right:-28%;top:-52%;height:112%;border-radius:50%;background:radial-gradient(closest-side,#fff 64%,rgba(255,255,255,.86) 78%,rgba(255,255,255,0) 100%)}
/* a held-back vignette, so the crowd settles into the page instead of stopping at its edges */
.rch .vig{position:absolute;inset:0;background:radial-gradient(130% 78% at 50% 34%,rgba(255,255,255,0) 52%,rgba(24,24,27,.07) 100%)}
.rch .grain{position:absolute;inset:0;width:100%;height:100%;opacity:.05}
@keyframes rch-d1{to{transform:translate(9%,-7%) scale(1.08)}}
@keyframes rch-d2{to{transform:translate(-8%,-5%) scale(1.1)}}
@keyframes rch-d3{to{transform:translate(-7%,6%) scale(1.06)}}
.rch .fx{position:absolute;z-index:3;left:0;top:0;width:100%;height:100%;pointer-events:none}
.rch .nav{position:absolute;z-index:10;top:0;left:0;right:0;height:72px}
.rch .nav .in{max-width:1240px;height:100%;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between}
.rch .brand{display:inline-flex;align-items:center;gap:9px;font-size:21px;font-weight:700;letter-spacing:-.02em}
.rch .links{display:flex;gap:34px;font-size:14.5px;color:var(--ink2)}
.rch .links a{opacity:.78;transition:opacity .2s}
.rch .links a:hover{opacity:1}
.rch .acts{display:flex;align-items:center;gap:6px}
.rch .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;padding:0 16px;border-radius:10px;border:1px solid var(--glass-line);background:var(--glass);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 6px 20px -10px rgba(24,24,27,.3);color:var(--ink);font-size:14.5px;font-weight:500;transition:background .2s,transform .35s cubic-bezier(.3,1.6,.5,1),box-shadow .3s}
.rch .btn:hover{background:rgba(255,255,255,.92)}
.rch .btn.ghost{border-color:transparent;background:transparent;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
.rch .btn.ghost:hover{background:rgba(255,255,255,.6)}
.rch .btn.pri{border-color:transparent;background:var(--route);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 10px 24px -10px rgba(24,24,27,.85)}
.rch .btn.pri:hover{background:var(--route2);transform:translateY(-1px);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 16px 30px -10px rgba(24,24,27,.9)}
.rch .hero{position:absolute;z-index:6;left:0;right:0;top:92px;text-align:center;padding:0 24px}
.rch .kick{display:inline-flex;align-items:center;gap:10px;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2)}
.rch .kick i{width:6px;height:6px;border-radius:50%;background:var(--route);box-shadow:0 0 0 4px rgba(24,24,27,.12)}
.rch h1{margin:18px 0 0;font-family:ui-serif,"Iowan Old Style",Georgia,"Times New Roman",serif;font-size:88px;line-height:1.05;letter-spacing:-2.6px;font-weight:400}
.rch h1 .w{display:inline-block}
.rch h1 em{font-style:italic}
.rch .ph{position:relative;white-space:nowrap}
.rch .ph::after{content:"";position:absolute;z-index:-1;left:-.04em;right:-.04em;bottom:.1em;height:.34em;border-radius:.08em;background:var(--rline);transform:scaleX(0);transform-origin:0 50%;opacity:0}
.rch .ph.hit::after{animation:rch-mark 1.8s cubic-bezier(.5,0,.2,1)}
.rch .ph.lit::after{transform:none;opacity:1}
@keyframes rch-mark{0%{transform:scaleX(0);opacity:1}28%{transform:scaleX(1);opacity:1}76%{transform:scaleX(1);opacity:1}100%{transform:scaleX(1);opacity:0}}
.rch .lead{max-width:760px;margin:22px auto 0;font-size:18px;line-height:1.6;color:var(--muted)}
.rch .ctas{display:flex;justify-content:center;gap:10px;margin-top:26px}
.rch .ctas .btn{height:48px;padding:0 22px;border-radius:12px;font-size:15.5px;font-weight:600}
.rch .beacon{position:absolute;z-index:5;left:50%;top:414px;width:60px;height:60px;margin-left:-30px}
.rch .btile{width:100%;height:100%;border-radius:18px;background:var(--route);display:grid;place-items:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 0 0 6px rgba(255,255,255,.65),0 0 0 7px rgba(24,24,27,.1),0 18px 34px -12px rgba(24,24,27,.8)}
.rch .compose{position:absolute;z-index:5;left:50%;top:488px;pointer-events:none}
.rch .cen{position:absolute;left:0;top:0;transform:translateX(-50%);width:max-content}
.rch .cbox{display:flex;align-items:center;gap:8px;height:30px;padding:0 13px 0 5px;border-radius:999px;background:var(--glass);border:1px solid var(--glass-line);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 14px 30px -14px rgba(24,24,27,.45);font-size:13px;white-space:nowrap;transform:scale(0);transform-origin:50% 0}
.rch .cbox .lab{height:20px;padding:0 8px;border-radius:999px;background:var(--tint);color:var(--ink);font:500 11px/20px var(--font-code),ui-monospace,monospace}
.rch .caret{width:1.5px;height:14px;margin-left:-6px;background:var(--route);animation:rch-blink 1s steps(1) infinite}
@keyframes rch-blink{50%{opacity:0}}
.rch .crowd{position:absolute;z-index:2;left:0;right:0;top:540px;height:360px;pointer-events:none}
.rch .pw{position:absolute;left:0}
.rch .pe{width:100%;height:100%;will-change:transform;transform-origin:50% 88%}
.rch .hp{position:relative;width:100%;height:100%}
.rch .pw img{display:block;width:100%;height:100%;transition:filter .45s,transform .5s cubic-bezier(.3,1.6,.5,1)}
.rch .ok{position:absolute;left:64%;top:8%;width:24px;height:24px;border-radius:50%;background:var(--route);box-shadow:0 0 0 2.5px #fff,0 6px 12px -4px rgba(24,24,27,.6);display:grid;place-items:center;transform:scale(0);transition:transform .45s cubic-bezier(.3,1.7,.5,1)}
.rch .ok svg{width:13px;height:13px}
.rch .pw.done .ok{transform:scale(1)}
.rch .tip{position:absolute;z-index:4;left:0;top:0;pointer-events:none;will-change:transform}
.rch .tip .cen{top:auto;bottom:0}
.rch .tbox{position:relative;display:flex;align-items:center;gap:8px;height:36px;padding:0 13px 0 7px;border-radius:12px;background:var(--glass);border:1px solid var(--glass-line);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 18px 40px -16px rgba(24,24,27,.45),0 2px 6px -2px rgba(24,24,27,.14);font-size:13px;font-weight:600;white-space:nowrap;transform:scale(0);transform-origin:50% 100%}
.rch .tbox::after{content:"";position:absolute;left:50%;bottom:-5px;width:9px;height:9px;margin-left:-5px;background:rgba(255,255,255,.88);border-right:1px solid var(--glass-line);border-bottom:1px solid var(--glass-line);transform:rotate(45deg)}
.rch .tbox.reply{font-weight:500}
.rch .tg{display:inline-flex;align-items:center;height:22px;padding:0 7px;border-radius:6px;font-size:12px;font-weight:500}
/* Three weights of grey instead of three hues: the reply that matters is the darkest. */
.rch .tg.caution{color:#3f3f46;background:rgba(24,24,27,.07);box-shadow:inset 0 0 0 1px rgba(24,24,27,.06)}
.rch .tg.route{color:#fff;background:var(--route)}
.rch .tg.plain{color:#71717a;background:rgba(24,24,27,.045)}
@media (max-width:980px){.rch h1{font-size:60px;letter-spacing:-1.6px}.rch .links{display:none}}
@media (max-width:640px){.rch h1{font-size:44px;letter-spacing:-1px}.rch .lead{font-size:16px}.rch .ctas{flex-direction:column;align-items:center}}
@media (prefers-reduced-motion:reduce){.rch *{animation:none!important;transition:none!important}}
`;

/** The app's own mark, in one colour. */
function Mark({ size = 27, tone = "#fff" }: { size?: number; tone?: string }) {
  return (
    <svg width={size} height={(size * 31) / 27} viewBox="0 0 40 40" aria-hidden="true" style={{ display: "block" }}>
      <path d="M25.3 12.6A9.8 9.8 0 1 0 25.3 27.4" fill="none" stroke={tone} strokeWidth="4" strokeLinecap="round" />
      <circle cx="28.5" cy="20" r="3.1" fill={tone} fillOpacity="0.72" />
    </svg>
  );
}

function BrandMark() {
  return (
    <svg width="25" height="25" viewBox="0 0 40 40" aria-hidden="true" style={{ display: "block" }}>
      <rect width="40" height="40" rx="10" fill="#18181b" />
      <path d="M25.3 12.6A9.8 9.8 0 1 0 25.3 27.4" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="28.5" cy="20" r="3.1" fill="#fff" fillOpacity="0.72" />
    </svg>
  );
}

export interface ColdEmailCrowdHeroProps {
  brand?: string;
  data?: Reach[];
  className?: string;
  /** Where the two calls to action go. */
  appHref?: string;
}

export function ColdEmailCrowdHero({ brand = "Connet", data = DEFAULT_DATA, className = "", appHref = "/" }: ColdEmailCrowdHeroProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current!;
    const $ = (s: string) => root.querySelector(s) as HTMLElement;
    const frozen = !!navigator.webdriver || matchMedia("(prefers-reduced-motion: reduce)").matches;
    const A: typeof animate | null = frozen ? null : animate;
    let seed = frozen ? 11 : (Math.random() * 1e9) | 0;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

    const fx = $(".fx") as unknown as HTMLCanvasElement;
    const g = fx.getContext("2d")!;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let W = root.clientWidth, H = root.clientHeight;
    const size = () => {
      W = root.clientWidth;
      H = root.clientHeight;
      fx.width = W * dpr;
      fx.height = H * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(root);

    /* the accent comes from the theme, so the beams match the background */
    const AC = getComputedStyle(root).getPropertyValue("--ac").trim() || "24,24,27";
    const COL = `rgb(${AC})`;
    const al = (o: number) => `rgba(${AC},${o})`;
    const BY = 444, TOP = 540, BH = 360;

    /* the crowd: people nobody has a reason to email stay faded; farther away = lighter */
    const crowd = $(".crowd");
    const P: Peep[] = [];
    crowd.innerHTML = "";
    const fade = (p: Peep) => `blur(${Math.max(0, (74 - p.t) * 0.045).toFixed(2)}px) contrast(${(0.36 + 0.3 * p.depth).toFixed(2)}) brightness(${(1 / (0.68 + 0.15 * p.depth)).toFixed(2)})`;
    function place(p: Peep, anywhere: boolean) {
      p.t = 31 + rnd() * 54;
      p.depth = (p.t - 31) / 54;
      p.w = 146 + (p.t - 31.8) * 2.62;
      p.h = p.w * 1.35;
      p.dir = rnd() < 0.5 ? 1 : -1;
      p.speed = 108 / (12 + rnd() * 26);
      p.x = anywhere ? -4 + rnd() * 108 : p.dir > 0 ? -10 : 110;
      p.v = 1;
      p.state = "walk";
      p.reached = false;
      p.ph = rnd() * 6.283;
      p.f = 1.5 + p.speed * 0.22;
      p.bob = 0;
      p.px = (p.x / 100) * W;
      p.el.className = "pw";
      p.el.style.cssText = `top:${p.t.toFixed(2)}%;width:${p.w.toFixed(1)}px;height:${p.h.toFixed(1)}px;z-index:${p.t | 0}`;
      p.img.src = PEEPS[(rnd() * PEEPS.length) | 0];
      p.img.style.filter = fade(p);
      p.img.style.transform = `scaleX(${p.dir})`;
    }
    for (let i = 0; i < 42; i++) {
      const el = document.createElement("div");
      el.innerHTML = '<div class="pe"><div class="hp"><img alt="" draggable="false" decoding="async"><i class="ok"><svg viewBox="0 0 24 24"><path fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></svg></i></div></div>';
      crowd.appendChild(el);
      const p: Peep = {
        el,
        pe: el.firstChild as HTMLElement,
        hp: el.firstChild!.firstChild as HTMLElement,
        img: el.querySelector("img")!,
        t: 0, depth: 0, w: 0, h: 0, dir: 1, speed: 0, x: 0, v: 1,
        state: "walk", reached: false, ph: 0, f: 0, bob: 0, px: 0,
      };
      place(p, true);
      P.push(p);
    }
    const head = (p: Peep) => [p.px, TOP + (BH * p.t) / 100 - p.h / 2 + p.h * 0.3 + p.bob];

    /* three reaches can be in the air at once */
    const S: Slot[] = [0, 1, 2].map(() => {
      const tip = document.createElement("div");
      tip.className = "tip";
      tip.innerHTML = '<div class="cen"><div class="tbox"></div></div>';
      root.appendChild(tip);
      return { tip, box: tip.querySelector(".tbox") as HTMLElement, p: null, d: data[0], t0: 0, st: 0, ly: 0, hx: 0, ty: 0 };
    });
    const btile = $(".btile"), cbox = $(".cbox"), clab = $(".cbox .lab"), ctxt = $(".cbox .txt");
    let comp: Compose | null = null;
    const pop = (el: HTMLElement, on: boolean) => {
      if (A) A(el, { scale: on ? [0, 1] : [1, 0], opacity: on ? [0, 1] : [1, 0] }, on ? { type: "spring", stiffness: 420, damping: 22 } : { duration: 0.2 });
      else {
        el.style.transform = `scale(${on ? 1 : 0})`;
        el.style.opacity = on ? "1" : "0";
      }
    };
    const flip = (s: Slot) => {
      const d = s.d;
      const set = () => {
        s.box.className = "tbox reply";
        s.box.innerHTML = `<span class="tg ${d.rc}">${d.rtag}</span>“${d.reply}”`;
      };
      if (A)
        A(s.box, { rotateX: [0, 90] }, { duration: 0.14, ease: "easeIn" }).then(() => {
          set();
          A(s.box, { rotateX: [-90, 0] }, { type: "spring", stiffness: 480, damping: 20 });
        });
      else set();
    };
    const hop = (p: Peep) => {
      if (A) A(p.hp, { y: [0, -26, 0], scale: [1, 1.06, 1] }, { duration: 0.6, ease: [0.3, 0, 0.3, 1] });
    };
    const bump = (k: number) => {
      if (A) A(btile, { scale: [1, k, 1] }, { duration: 0.45, ease: [0.3, 0, 0.2, 1] });
    };
    const hit = (c: string) => {
      if (frozen) return;
      const e = $("." + c);
      e.classList.remove("hit");
      void e.offsetWidth;
      e.classList.add("hit");
    };

    let side = 1, di = 0, nextAt = 0.6;
    function pick() {
      const act = S.filter((s) => s.p).map((s) => s.p!.px), cx = W / 2;
      const ok = (p: Peep) => {
        if (p.state !== "walk" || p.reached || p.t < 47) return false;
        const f = p.px + ((p.dir * p.speed) / 100) * W * 2.4;
        return p.px > W * 0.13 && p.px < W * 0.87 && f > W * 0.1 && f < W * 0.9 && Math.abs(p.px - cx) > 120 && act.every((a) => Math.abs(a - p.px) > 400);
      };
      let c = P.filter(ok);
      const pref = c.filter((p) => (p.px - cx) * side > 0);
      if (pref.length) c = pref;
      if (!c.length) return null;
      side = -side;
      return c[(rnd() * c.length) | 0];
    }
    function start(now: number) {
      const s = S.find((s) => !s.p);
      if (!s) {
        nextAt = now + 0.2;
        return;
      }
      const p = pick();
      if (!p) {
        nextAt = now + 0.3;
        return;
      }
      s.p = p;
      s.d = data[di++ % data.length];
      s.t0 = now;
      s.st = 0;
      s.ly = 0;
      nextAt = now + 2.4;
      p.state = "locked";
      p.el.style.zIndex = "200";
      p.img.style.filter = "none";
      p.img.style.transform = `scaleX(${p.dir}) scale(1.07)`;
    }
    const envelope = (x: number, y: number, rot: number, sc: number) => {
      g.save();
      g.translate(x, y);
      g.rotate(rot);
      g.scale(sc, sc);
      g.globalAlpha = 1;
      g.setLineDash([]);
      g.shadowColor = al(0.55);
      g.shadowBlur = 16;
      g.fillStyle = "#fff";
      g.strokeStyle = COL;
      g.lineWidth = 2;
      g.lineJoin = "round";
      g.beginPath();
      g.roundRect(-15, -10.5, 30, 21, 4);
      g.fill();
      g.shadowBlur = 0;
      g.stroke();
      g.beginPath();
      g.moveTo(-12.5, -7.5);
      g.lineTo(0, 2.5);
      g.lineTo(12.5, -7.5);
      g.stroke();
      g.restore();
    };

    function drawReach(s: Slot, a: number, now: number, hx: number, hy: number) {
      const p = s.p;
      if (!p) return;
      const P0 = [W / 2, BY], P1 = [(P0[0] + hx) / 2, Math.min(BY, hy) - (26 + Math.abs(hx - P0[0]) * 0.07)];
      const B = (u: number) => {
        const v = 1 - u;
        return [v * v * P0[0] + 2 * v * u * P1[0] + u * u * hx, v * v * P0[1] + 2 * v * u * P1[1] + u * u * hy];
      };
      const seg = (u0: number, u1: number, n: number) => {
        g.beginPath();
        for (let i = 0; i <= n; i++) {
          const q = B(u0 + ((u1 - u0) * i) / n);
          if (i) g.lineTo(q[0], q[1]);
          else g.moveTo(q[0], q[1]);
        }
        g.stroke();
      };
      g.strokeStyle = COL;
      g.lineCap = "round";
      if (a < 3.75) {
        const R = p.w * 0.27, k = Math.min(1, a / 0.5), e = 1 - Math.pow(1 - k, 3);
        g.save();
        g.translate(hx, hy);
        g.rotate(now * 1.2);
        g.globalAlpha = 0.9 * k;
        g.lineWidth = 2;
        g.setLineDash([R * 0.5, R * 0.285]);
        g.beginPath();
        g.arc(0, 0, R * (2.2 - 1.2 * e), 0, 6.2832);
        g.stroke();
        g.restore();
      }
      if (a < 6.2) {
        g.save();
        g.lineWidth = 1.2;
        if (a < 3.75) {
          g.globalAlpha = 0.55;
          g.setLineDash([3, 6]);
          g.lineDashOffset = -now * 24;
          seg(0, Math.min(1, a / 0.6), 28);
        } else {
          g.globalAlpha = 0.35 * Math.min(1, (6.2 - a) / 0.4);
          seg(0, 1, 28);
        }
        g.restore();
      }
      if (a >= 2.9 && a < 3.75) {
        const u = ease((a - 2.9) / 0.85);
        g.save();
        g.shadowColor = al(0.8);
        g.shadowBlur = 14;
        for (let i = 0; i < 14; i++) {
          const u1 = u - (0.46 * i) / 14, u0 = u - (0.46 * (i + 1)) / 14;
          if (u1 <= 0) break;
          const f = 1 - i / 14;
          g.globalAlpha = f * 0.22;
          g.lineWidth = 16 * f;
          seg(Math.max(0, u0), u1, 3);
          g.globalAlpha = f * 0.95;
          g.lineWidth = 6 * f + 1;
          seg(Math.max(0, u0), u1, 3);
        }
        g.restore();
        const q = B(u), q2 = B(Math.min(1, u + 0.02)), dx = q2[0] - q[0];
        envelope(q[0], q[1], Math.atan2(q2[1] - q[1], Math.abs(dx) || 1e-6) * (dx >= 0 ? 1 : -1) * 0.6, Math.min(1, (a - 2.9) / 0.15));
      }
      if (a >= 3.75 && a < 4.4) {
        const k = (a - 3.75) / 0.65, e = 1 - Math.pow(1 - k, 3);
        g.save();
        g.globalAlpha = 1 - k;
        g.lineWidth = 2.5;
        g.beginPath();
        g.arc(hx, hy, p.w * 0.2 + e * p.w * 0.32, 0, 6.2832);
        g.stroke();
        g.lineWidth = 2;
        for (let i = 0; i < 10; i++) {
          const an = (i / 10) * 6.2832 + s.t0, r0 = p.w * 0.3 + e * p.w * 0.22, r1 = r0 + 12 * (1 - k);
          g.beginPath();
          g.moveTo(hx + Math.cos(an) * r0, hy + Math.sin(an) * r0);
          g.lineTo(hx + Math.cos(an) * r1, hy + Math.sin(an) * r1);
          g.stroke();
        }
        g.restore();
      }
      if (a >= 5.3 && a < 6) {
        const u = 1 - ease((a - 5.3) / 0.7);
        g.save();
        for (let i = 0; i < 8; i++) {
          const u0 = u + (0.22 * i) / 8, u1 = u + (0.22 * (i + 1)) / 8;
          if (u0 >= 1) break;
          g.globalAlpha = (1 - i / 8) * 0.7;
          g.lineWidth = 3 * (1 - i / 10);
          seg(u0, Math.min(1, u1), 3);
        }
        const q = B(u);
        g.globalAlpha = 1;
        g.shadowColor = al(0.8);
        g.shadowBlur = 12;
        g.fillStyle = COL;
        g.beginPath();
        g.arc(q[0], q[1], 6, 0, 6.2832);
        g.fill();
        g.shadowBlur = 0;
        g.fillStyle = "#fff";
        g.beginPath();
        g.arc(q[0], q[1], 2.4, 0, 6.2832);
        g.fill();
        g.restore();
      }
    }

    let mx = 0, tmx = 0;
    const onMove = (e: PointerEvent) => {
      tmx = (e.clientX - root.getBoundingClientRect().left) / W - 0.5;
    };
    addEventListener("pointermove", onMove);
    function tick(now: number, dt: number, draw: boolean) {
      mx += (tmx - mx) * Math.min(1, dt * 4);
      for (const p of P) {
        const tv = p.state === "walk" ? 1 : p.state === "locked" ? 0.45 : 0;
        p.v += (tv - p.v) * Math.min(1, dt * 5);
        p.x += p.dir * p.speed * p.v * dt;
        if ((p.x > 111 || p.x < -11) && p.state === "walk") place(p, false);
        const s = Math.sin(now * Math.PI * p.f + p.ph);
        p.bob = -Math.abs(s) * (1.5 + 2.5 * p.depth) * p.v;
        p.px = (p.x / 100) * W - mx * p.depth * W * 0.02;
        if (draw) p.pe.style.transform = `translate3d(${(p.px - p.w / 2).toFixed(1)}px,${(-p.h / 2 + p.bob).toFixed(1)}px,0) rotate(${(s * 0.7 * p.v).toFixed(2)}deg)`;
      }
      if (now >= nextAt) start(now);
      if (draw) g.clearRect(0, 0, W, H);
      for (const s of S) {
        if (!s.p) continue;
        const a = now - s.t0, p = s.p, d = s.d;
        if (s.st < 1 && a >= 0.9) {
          s.st = 1;
          s.box.className = "tbox";
          s.box.innerHTML = `<span class="tg ${d.tc}">${d.tag}</span>${d.signal}`;
          pop(s.box, true);
        }
        if (s.st < 2 && a >= 1.8) {
          s.st = 2;
          comp = { d, t0: now, n: -1 };
          clab.textContent = d.lab;
          ctxt.textContent = "";
          pop(cbox, true);
        }
        if (s.st < 3 && a >= 2.9) {
          s.st = 3;
          if (comp && comp.d === d) {
            pop(cbox, false);
            comp = null;
          }
          bump(1.16);
          hit("p1");
        }
        if (s.st < 4 && a >= 3.75) {
          s.st = 4;
          p.state = "read";
          p.reached = true;
          p.img.style.filter = `drop-shadow(0 0 14px ${al(0.45)})`;
          hop(p);
        }
        if (s.st < 5 && a >= 4.45) {
          s.st = 5;
          flip(s);
          hit("p2");
        }
        if (s.st < 6 && a >= 6) {
          s.st = 6;
          bump(1.1);
          p.el.classList.add("done");
        }
        if (s.st < 7 && a >= 6.7) {
          s.st = 7;
          pop(s.box, false);
          p.state = "walk";
          p.el.style.zIndex = String(p.t | 0);
          p.img.style.transform = `scaleX(${p.dir})`;
          p.img.style.filter = `drop-shadow(0 0 8px ${al(0.3)})`;
        }
        if (a >= 7.1) {
          s.p = null;
          continue;
        }
        if (draw) {
          const [hx, hy] = head(p);
          s.hx = hx;
          s.ty = hy - p.h * 0.21 - 14;
          let lift = 0;
          for (const o of S) if (o !== s && o.p && o.t0 < s.t0 && Math.abs(o.hx - hx) < 350 && Math.abs(o.ty - s.ty) < 46) lift = -46;
          s.ly += (lift - s.ly) * Math.min(1, dt * 8);
          s.tip.style.transform = `translate(${hx.toFixed(1)}px,${(s.ty + s.ly).toFixed(1)}px)`;
          drawReach(s, a, now, hx, hy);
        }
      }
      if (comp) {
        const L = comp.d.line, n = Math.ceil(Math.min(1, (now - comp.t0) / 0.8) * L.length);
        if (n !== comp.n) {
          comp.n = n;
          ctxt.textContent = L.slice(0, n);
        }
      }
    }

    let raf = 0;
    if (frozen) {
      let i = 0;
      for (; i < 1500; i++) {
        tick(i / 60, 1 / 60, false);
        if (i > 420 && S.filter((s) => s.p).length > 1 && S.some((s) => s.p && i / 60 - s.t0 > 3.32 && i / 60 - s.t0 < 3.4)) break;
      }
      tick(i / 60, 0, true);
      $(".p1").classList.add("lit");
    } else {
      animate(root.querySelectorAll("h1 .w"), { opacity: [0, 1], y: [28, 0], filter: ["blur(10px)", "blur(0px)"] }, { duration: 0.9, ease: [0.2, 0.7, 0.2, 1], delay: stagger(0.08) });
      animate(root.querySelectorAll(".kick,.lead,.ctas"), { opacity: [0, 1], y: [16, 0] }, { duration: 0.8, ease: [0.2, 0.7, 0.2, 1], delay: stagger(0.1, { startDelay: 0.25 }) });
      animate(btile, { scale: [0, 1] }, { type: "spring", stiffness: 300, damping: 16, delay: 0.6 });
      animate(crowd, { opacity: [0, 1] }, { duration: 0.9 });
      let last = performance.now(), now = 0;
      const loop = (ms: number) => {
        const dt = Math.min(0.25, Math.max(0, (ms - last) / 1000));
        last = ms;
        now += dt;
        tick(now, dt, true);
        raf = requestAnimationFrame(loop);
      };
      loop(last);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener("pointermove", onMove);
      S.forEach((s) => s.tip.remove());
      crowd.innerHTML = "";
    };
  }, [data]);

  return (
    <div ref={ref} className={`rch ${className}`}>
      <style>{CSS}</style>
      <div className="bg" aria-hidden="true">
        <i className="b1" />
        <i className="b2" />
        <i className="b3" />
        <i className="b4" />
        <div className="dome" />
        <div className="vig" />
        <svg className="grain">
          <filter id="rch-n">
            <feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves={2} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#rch-n)" />
        </svg>
      </div>
      <header className="nav">
        <div className="in">
          <a className="brand" href={appHref}>
            <BrandMark />
            {brand}
          </a>
          <nav className="links">
            <a href={appHref}>Signals</a>
            <a href={appHref}>Graph</a>
            <a href={appHref}>Approvals</a>
            <a href={appHref}>Pipeline</a>
          </nav>
          <div className="acts">
            <a className="btn ghost" href={appHref}>
              Sign in
            </a>
            <a className="btn pri" href={appHref}>
              Open the app
            </a>
          </div>
        </div>
      </header>
      <main className="hero">
        <span className="kick">
          <i />
          Signal-led outbound
        </span>
        <h1>
          <span className="ph p1">
            <span className="w">Cold</span> <span className="w">emails</span>
          </span>{" "}
          <span className="w">that</span>{" "}
          <span className="ph p2">
            <em>
              <span className="w">get</span> <span className="w">replies.</span>
            </em>
          </span>
        </h1>
        <p className="lead">
          {brand} watches job boards and the news for the moment a company starts buying, proves every fact with a quote from the page it came from, and writes the first line itself. Nothing is sent until you approve it.
        </p>
        <div className="ctas">
          <a className="btn pri" href={appHref}>
            Find my customers
          </a>
          <a className="btn" href={appHref}>
            See how it works
          </a>
        </div>
      </main>
      <div className="crowd" aria-hidden="true" />
      <canvas className="fx" aria-hidden="true" />
      <div className="beacon" aria-hidden="true">
        <div className="btile">
          <Mark />
        </div>
      </div>
      <div className="compose" aria-hidden="true">
        <div className="cen">
          <div className="cbox">
            <span className="lab" />
            <span className="txt" />
            <i className="caret" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ColdEmailCrowdHero;
