/* The dashboard's styles. Every class is gd- prefixed and scoped under .gd-app, so nothing in
   app/globals.css can reach in (and nothing here can reach the app — see the .field collision
   recorded in the landing page's history). The palette is black, white and grey: the three
   chart series are three weights of grey rather than three hues. */
export const dashboardStyles = `
.gd-app {
  --gd-ink: #1b1b1f;
  --gd-muted: #57575f;
  --gd-line: rgb(22 22 26 / 14%);
  --gd-grid: rgb(22 22 26 / 16%);
  --gd-rim: rgb(255 255 255 / 58%);
  --gd-edge-light: rgb(255 255 255 / 88%);
  --gd-edge-shade: rgb(22 22 26 / 16%);
  --gd-gloss: rgb(255 255 255 / 48%);
  --gd-frame: rgb(238 238 242 / 26%);
  --gd-rail: rgb(236 236 241 / 52%);
  --gd-card: rgb(246 246 249 / 50%);
  --gd-card-light: rgb(255 255 255 / 38%);
  --gd-raised: rgb(255 255 255 / 84%);
  --gd-inner: rgb(255 255 255 / 40%);
  --gd-surface: #f2f2f5;
  --gd-track: rgb(22 22 26 / 13%);
  --gd-primary: #1b1b1f;
  --gd-primary-ink: #fafafa;
  --gd-pick: #ffffff;
  --gd-pick-ink: #1b1b1f;
  --gd-coral: #3f3f46;
  --gd-teal: #71717a;
  --gd-ochre: #a1a1aa;
  --gd-graph-ink: #18181b;
  --gd-focus: #18181b;
  --gd-dark-shadow: 22 22 26;
  inline-size: 100%;
  min-inline-size: 0;
  position: relative;
  isolation: isolate;
  min-block-size: 100svh;
  background: #8c8c93;
  color: var(--gd-ink);
  color-scheme: light;
  font-family: var(--font-archivo), ui-sans-serif, system-ui, sans-serif;
  font-size: 13px;
  font-weight: 550;
  font-variant-numeric: tabular-nums;
}
.gd-app[data-theme="dark"] .gd-score strong { color: hsl(var(--gd-score-h, 0) 68% 66%); }
.gd-app[data-theme="dark"] {
  --gd-ink: #f4f4f5;
  --gd-muted: #b4b4bd;
  --gd-line: rgb(228 228 231 / 18%);
  --gd-grid: rgb(228 228 231 / 18%);
  --gd-rim: rgb(236 236 240 / 22%);
  --gd-edge-light: rgb(244 244 248 / 30%);
  --gd-edge-shade: rgb(5 5 7 / 34%);
  --gd-gloss: rgb(240 240 245 / 10%);
  --gd-frame: rgb(32 32 36 / 54%);
  --gd-rail: rgb(34 34 39 / 60%);
  --gd-card: rgb(38 38 43 / 56%);
  --gd-card-light: rgb(96 96 104 / 26%);
  --gd-raised: rgb(70 70 78 / 80%);
  --gd-inner: rgb(62 62 70 / 48%);
  --gd-surface: #2c2c31;
  --gd-track: rgb(228 228 231 / 16%);
  --gd-primary: #ededf0;
  --gd-primary-ink: #1b1b1f;
  --gd-pick: #f2f2f5;
  --gd-pick-ink: #1b1b1f;
  --gd-coral: #d4d4d8;
  --gd-teal: #a1a1aa;
  --gd-ochre: #71717a;
  --gd-graph-ink: #e4e4e7;
  --gd-focus: #f4f4f5;
  --gd-dark-shadow: 4 4 6;
  background: #35353a;
  color-scheme: dark;
}
.gd-app *, .gd-app *::before, .gd-app *::after { box-sizing: border-box; }
.gd-app :where(button, input, select) { color: inherit; font: inherit; }
.gd-app :where(button, a, input, select):focus-visible { outline: 2px solid var(--gd-focus); outline-offset: 3px; }
.gd-app a { color: inherit; text-decoration: none; }
.gd-app button { cursor: pointer; }
.gd-app :where(h1, h2, h3, p, figure) { margin: 0; }
.gd-app svg { flex: none; }
.gd-sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

.gd-background, .gd-app::before { position: fixed; z-index: -2; inset: 0; inline-size: 100%; block-size: 100%; pointer-events: none; }
.gd-background { object-fit: cover; object-position: center 60%; filter: grayscale(1) brightness(.86) contrast(1.02); }
.gd-app::before {
  content: "";
  z-index: -1;
  background: linear-gradient(116deg, rgb(24 24 28 / 34%), transparent 43%, rgb(70 70 78 / 22%) 76%, transparent 100%),
    linear-gradient(0deg, rgb(20 20 24 / 32%), transparent 58%);
}
.gd-app[data-theme="dark"] .gd-background { filter: grayscale(1) brightness(.48) contrast(1.05); }

.gd-surround { inline-size: min(calc(100% - 100px), 1380px); margin-inline: auto; padding-block: 24px 8px; }
.gd-top, .gd-dock {
  border: 1px solid var(--gd-rim);
  background: linear-gradient(165deg, var(--gd-gloss), transparent 32% 73%, var(--gd-gloss)), var(--gd-rail);
  box-shadow: inset 1px 1px 1px var(--gd-edge-light), inset -1px -1px 1px var(--gd-edge-shade),
    inset 0 -2px 5px var(--gd-gloss), 0 7px 20px rgb(var(--gd-dark-shadow) / 17%);
  backdrop-filter: blur(15px) saturate(1.15);
  -webkit-backdrop-filter: blur(15px) saturate(1.15);
}
.gd-top { position: relative; z-index: 30; display: grid; grid-template-columns: auto minmax(150px, 1fr) auto; align-items: center; gap: 12px; min-block-size: 60px; border-radius: 999px; padding: 6px 9px 6px 13px; }
.gd-brand { display: flex; align-items: center; gap: 10px; min-inline-size: 0; padding-inline-start: 3px; }
.gd-logo { inline-size: 35px; block-size: 35px; display: grid; place-items: center; border-radius: 50%; background: var(--gd-primary); color: var(--gd-primary-ink); box-shadow: inset 0 0 0 1px var(--gd-gloss), 0 2px 7px rgb(var(--gd-dark-shadow) / 12%); }
.gd-logo svg { width: 21px; height: 21px; }
.gd-brand strong { display: block; font-size: 12px; letter-spacing: .17em; line-height: 1.1; font-weight: 850; text-transform: uppercase; }
.gd-brand small { display: block; margin-block-start: 3px; font-size: 10px; color: var(--gd-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-inline-size: 190px; }
.gd-ask { position: relative; display: flex; align-items: center; gap: 10px; min-block-size: 43px; max-inline-size: 100%; border: 1px solid var(--gd-line); border-radius: 999px; background: var(--gd-inner); box-shadow: inset 0 1px 0 var(--gd-gloss); padding: 4px 13px 4px 9px; text-align: start; }
.gd-ask:hover, .gd-icon-button:hover { background: var(--gd-raised); }
.gd-orb { flex: none; inline-size: 25px; block-size: 25px; border-radius: 50%; background: radial-gradient(ellipse at 32% 24%, #ffffff 5%, #d4d4d8 28%, transparent 58%), radial-gradient(ellipse at 67% 54%, #a1a1aa, #52525b 55%, #27272a 79%); box-shadow: inset 0 0 0 .75px rgb(255 255 255 / 70%), 0 0 0 3px rgb(22 22 26 / 8%), 0 2px 8px rgb(22 22 26 / 28%); }
.gd-prompt { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 12px; font-weight: 750; animation: gd-prompt-in .74s steps(28, end) both; }
@keyframes gd-prompt-in { from { clip-path: inset(0 100% 0 0); } }
.gd-ask-search { margin-inline-start: auto; width: 15px; height: 15px; color: var(--gd-muted); }
.gd-top-actions { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
.gd-top-actions > * { flex: none; }
.gd-chip, .gd-new { white-space: nowrap; }
.gd-open { min-block-size: 38px; padding: 0 14px; white-space: nowrap; }
.gd-icon-button { position: relative; min-inline-size: 44px; min-block-size: 44px; display: inline-grid; place-items: center; border-radius: 999px; border: 1px solid var(--gd-line); padding: 0; background: var(--gd-inner); }
.gd-icon-button svg { width: 17px; height: 17px; stroke-width: 1.75; }
.gd-notices { background: var(--gd-raised); }
.gd-notices i { position: absolute; block-size: 6px; inline-size: 6px; inset: 9px 9px auto auto; border-radius: 50%; background: var(--gd-ink); box-shadow: 0 0 0 2px var(--gd-surface); }

.gd-stage-wrap { position: relative; margin-block: 11px 0; }
.gd-stage {
  color: var(--gd-ink);
  border: 1px solid var(--gd-rim);
  border-radius: 34px;
  background: linear-gradient(148deg, var(--gd-gloss), transparent 19% 77%, color-mix(in srgb, var(--gd-gloss) 48%, transparent)), var(--gd-frame);
  box-shadow: inset 1px 1px 1px var(--gd-edge-light), inset -1px -1px 1px var(--gd-edge-shade), inset 0 0 7px var(--gd-gloss),
    0 1px 3px rgb(var(--gd-dark-shadow) / 17%), 0 22px 72px rgb(var(--gd-dark-shadow) / 22%);
  backdrop-filter: blur(var(--gd-panel-frost, 12px)) saturate(1.1);
  -webkit-backdrop-filter: blur(var(--gd-panel-frost, 12px)) saturate(1.1);
}
.gd-stage-scroll { block-size: max(605px, min(865px, calc(100svh - 165px))); overflow: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: var(--gd-line) transparent; border-radius: inherit; padding: clamp(19px, 2.15vw, 35px) clamp(25px, 3.2vw, 49px) 41px; }
.gd-view-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px 22px; margin-block-end: 19px; }
.gd-view-head h1 { font-size: clamp(29px, 3.35vw, 49px); font-weight: 760; line-height: 1.03; letter-spacing: -.062em; }
.gd-view-head p { color: var(--gd-muted); font-size: 13px; margin-block-start: 8px; }
.gd-view-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
.gd-period { display: inline-flex; align-items: center; padding: 3px; border-radius: 999px; border: 1px solid var(--gd-rim); background: var(--gd-inner); box-shadow: inset 0 1px 0 var(--gd-gloss); }
.gd-period button { min-block-size: 35px; min-inline-size: 56px; border: 0; border-radius: 999px; background: transparent; padding: 0 11px; font-size: 11px; font-weight: 750; white-space: nowrap; }
.gd-period button[aria-pressed="true"] { background: var(--gd-primary); color: var(--gd-primary-ink); }
.gd-period button[aria-pressed="false"]:hover { background: var(--gd-inner); }

.gd-primary, .gd-secondary { display: inline-flex; justify-content: center; align-items: center; gap: 7px; min-block-size: 40px; padding: 7px 12px; font-size: 11.5px; font-weight: 790; line-height: 1.2; border-radius: 999px; border: 1px solid transparent; }
.gd-app .gd-primary { background: var(--gd-primary); color: var(--gd-primary-ink); }
.gd-app .gd-secondary { background: var(--gd-raised); border-color: var(--gd-rim); color: var(--gd-ink); }
.gd-primary:hover { filter: brightness(1.3); }
.gd-secondary:hover { background: var(--gd-surface); }
.gd-primary svg, .gd-secondary svg { width: 14px; height: 14px; }
.gd-export { white-space: nowrap; }
.gd-content { min-inline-size: 0; }
.gd-analytics, .gd-command-grid, .gd-command-side, .gd-summary, .gd-metric-grid, .gd-analytics-grid { display: grid; gap: 12px; }
.gd-command-grid { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr) minmax(0, 1.05fr); align-items: stretch; }
.gd-command-side { grid-column: 1; align-content: start; }
.gd-command-grid > .gd-activity { grid-column: 2 / -1; }
.gd-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; padding: 6px; }
.gd-analytics-grid { grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr); }
.gd-metric-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.gd-panel, .gd-metric, .gd-summary { min-inline-size: 0; border: 1px solid var(--gd-rim); border-radius: 20px; background: linear-gradient(144deg, var(--gd-card-light), transparent 66%), var(--gd-card); box-shadow: inset 0 1px 1px var(--gd-edge-light), inset 0 -1px 1px var(--gd-edge-shade), 0 6px 18px rgb(var(--gd-dark-shadow) / 9%); }
.gd-summary { border-radius: 20px; background: var(--gd-inner); }
.gd-summary .gd-metric { border-radius: 15px; }
.gd-panel { padding: 15px 16px; }
.gd-panel-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 7px 12px; margin-block-end: 12px; }
.gd-panel-head h2 { font-size: 14px; font-weight: 810; letter-spacing: -.024em; }
.gd-panel-head p { font-size: 11px; color: var(--gd-muted); margin-block-start: 3px; }
.gd-metric { display: flex; flex-direction: column; justify-content: space-between; min-block-size: 112px; padding: 11px 12px; }
/* Emphasis without colour: the tile that matters is inverted. */
.gd-metric[data-tone="teal"] { --gd-muted: #d4d4d8; color: var(--gd-primary-ink); border-color: var(--gd-rim); background: linear-gradient(145deg, #3f3f46, #1b1b1f); box-shadow: inset 0 1px 2px rgb(255 255 255 / 18%), 0 6px 14px rgb(var(--gd-dark-shadow) / 20%); }
.gd-app[data-theme="dark"] .gd-metric[data-tone="teal"] { --gd-muted: #4b4b53; color: #1b1b1f; background: linear-gradient(145deg, #f4f4f5, #c9c9cf); }
.gd-metric[data-tone="coral"] { border-color: var(--gd-rim); }
.gd-metric-head { display: flex; justify-content: space-between; align-items: center; gap: 4px; min-inline-size: 0; font-size: 11px; font-weight: 740; }
.gd-metric-icon, .gd-list-icon { display: grid; place-items: center; flex: none; color: inherit; inline-size: 28px; block-size: 28px; border-radius: 10px; background: var(--gd-inner); box-shadow: inset 0 1px 0 var(--gd-gloss); }
.gd-metric-icon svg, .gd-list-icon svg { width: 14px; height: 14px; }
.gd-metric[data-tone="teal"] .gd-metric-icon { background: rgb(255 255 255 / 16%); }
.gd-metric-value { display: block; font-size: clamp(22px, 2.35vw, 35px); line-height: 1.05; margin-block: 3px 7px; letter-spacing: -.052em; font-weight: 815; }
.gd-summary .gd-metric-value { font-size: clamp(20px, 2vw, 31px); }
.gd-metric-caption { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: var(--gd-muted); font-size: 10px; font-weight: 680; min-block-size: 13px; }

.gd-balance .gd-panel-head { align-items: center; margin-block-end: 9px; }
.gd-unit { border-radius: 6px; padding: 4px 6px; background: var(--gd-raised); font-size: 10px; font-weight: 810; max-inline-size: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.gd-balance-number { font-size: clamp(28px, 3.85vw, 57px); font-weight: 820; letter-spacing: -.077em; line-height: 1.02; }
.gd-balance-change { margin-block-start: 7px; color: var(--gd-muted); font-size: 10px; font-weight: 680; line-height: 1.5; }
.gd-balance-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-block: 13px 12px; }
.gd-streams { display: flex; border-radius: 12px; background: var(--gd-inner); padding: 8px 2px; }
.gd-streams div { flex: 1; min-inline-size: 0; padding: 0 7px; }
.gd-streams div + div { border-inline-start: 1px solid var(--gd-line); }
.gd-streams span, .gd-streams strong { display: block; }
.gd-streams span { font-size: 9px; color: var(--gd-muted); }
.gd-streams strong { font-size: 11px; font-weight: 810; margin-block-start: 4px; }
.gd-capacity .gd-panel-head, .gd-approvals .gd-panel-head { margin-block-end: 10px; }
.gd-capacity-track, .gd-mix-track { display: block; height: 7px; border-radius: 999px; overflow: hidden; background: var(--gd-track); }
.gd-capacity-track .gd-fill { display: block; block-size: 100%; border-radius: inherit; background: var(--gd-graph-ink); transform-origin: left center; }
.gd-capacity-label { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 4px; color: var(--gd-muted); font-size: 10px; margin-top: 8px; }
.gd-capacity-label strong { color: var(--gd-ink); }
.gd-approval-content { display: flex; align-items: center; gap: 9px; min-inline-size: 0; }
.gd-approval-content .gd-list-icon { inline-size: 37px; block-size: 37px; }
.gd-approval-content div { flex: 1; min-inline-size: 0; }
.gd-approval-content strong, .gd-approval-content small { display: block; }
.gd-approval-content strong { font-size: 12px; font-weight: 810; }
.gd-approval-content small { margin-top: 4px; font-size: 10px; color: var(--gd-muted); }

.gd-table-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; max-inline-size: 100%; }
.gd-search, .gd-filter { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--gd-line); border-radius: 10px; background: var(--gd-inner); min-block-size: 35px; padding: 0 8px; }
.gd-search svg, .gd-filter svg { width: 13px; height: 13px; color: var(--gd-muted); }
.gd-search input { width: 105px; flex: 1; min-inline-size: 0; border: 0; background: transparent; min-block-size: 33px; }
.gd-search input::placeholder { color: var(--gd-muted); opacity: 1; }
.gd-search input, .gd-filter select { font-size: 11px; }
.gd-filter select { border: 0; background: transparent; padding: 5px 0; min-inline-size: 0; }
.gd-filter select option { color: var(--gd-ink); background: var(--gd-surface); }
.gd-search:focus-within, .gd-filter:focus-within { outline: 2px solid var(--gd-focus); }
.gd-app .gd-search input:focus-visible, .gd-app .gd-filter select:focus-visible { outline: none; }
.gd-table-scroll { max-inline-size: 100%; overflow: auto; scrollbar-width: thin; }
.gd-table-scroll table { inline-size: 100%; border-spacing: 0; text-align: start; }
.gd-table-scroll th, .gd-table-scroll td { padding: 9px 10px; text-align: start; }
.gd-table-scroll th { background: var(--gd-inner); font-size: 10px; color: var(--gd-muted); font-weight: 800; }
.gd-table-scroll th:first-child { border-radius: 8px 0 0 8px; }
.gd-table-scroll th:last-child { border-radius: 0 8px 8px 0; }
.gd-table-scroll td { white-space: nowrap; font-size: 11px; }
.gd-table-scroll td:first-child { font-weight: 750; }
.gd-cell-wide { max-inline-size: 460px; overflow: hidden; text-overflow: ellipsis; }
.gd-table-scroll tr + tr td { border-top: 1px solid var(--gd-line); }
.gd-status { --gd-status-color: var(--gd-graph-ink); display: inline-flex; align-items: center; gap: 5px; padding: 4px 6px; border-radius: 999px; font-size: 10px; font-weight: 790; background: color-mix(in srgb, var(--gd-status-color) 11%, var(--gd-inner)); color: var(--gd-status-color); white-space: nowrap; }
.gd-status[data-state="teal"] { --gd-status-color: var(--gd-teal); }
.gd-status[data-state="coral"] { --gd-status-color: var(--gd-coral); }
.gd-status i { inline-size: 5px; block-size: 5px; border-radius: 50%; background: currentColor; }
.gd-empty { padding: 12px 3px; color: var(--gd-muted); font-size: 12px; }
.gd-blank { display: grid; justify-items: start; gap: 12px; max-inline-size: 60ch; padding: 48px 0 8px; }
.gd-blank h2 { font-size: clamp(22px, 2.4vw, 32px); font-weight: 790; letter-spacing: -.04em; }
.gd-blank p { color: var(--gd-muted); font-size: 14px; line-height: 1.6; }

.gd-app [data-tone="ink"] { --gd-series: var(--gd-graph-ink); }
.gd-app [data-tone="coral"] { --gd-series: var(--gd-coral); }
.gd-app [data-tone="teal"] { --gd-series: var(--gd-teal); }
.gd-app [data-tone="ochre"] { --gd-series: var(--gd-ochre); }
.gd-legend { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; color: var(--gd-muted); }
.gd-legend span, .gd-device-list button span:first-child { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 740; }
.gd-legend i, .gd-device-list button span:first-child i { inline-size: 7px; block-size: 7px; border-radius: 50%; background: var(--gd-series); }
.gd-stack-meta { display: flex; justify-content: space-between; align-items: center; height: 20px; gap: 4px; }
.gd-chart-readout { font-size: 10px; font-weight: 830; white-space: nowrap; }
.gd-stack-plot { display: grid; grid-template-columns: repeat(var(--gd-series-count), minmax(0, 1fr)); gap: 4px; block-size: 194px; margin-top: 5px; }
.gd-command-chart .gd-stack-plot { block-size: 141px; }
.gd-stack-column { display: flex; flex-direction: column; align-items: center; min-inline-size: 0; border: 0; border-radius: 8px; background: transparent; padding: 3px 0 0; }
.gd-stack-column:is(:focus-visible, :hover, [aria-pressed="true"]) { background: var(--gd-inner); }
.gd-stack-track { display: flex; justify-content: center; align-items: end; flex: 1; inline-size: 100%; border-bottom: 1px solid var(--gd-line); }
.gd-stack-bar { display: flex; flex-direction: column; transform-origin: center bottom; inline-size: min(65%, 40px); min-inline-size: 6px; border-radius: 6px 6px 3px 3px; overflow: hidden; }
.gd-stack-bar i { display: block; flex-basis: 0; background: var(--gd-series); min-block-size: 2px; }
.gd-stack-bar i:first-child { background: repeating-linear-gradient(138deg, var(--gd-series) 0 4px, color-mix(in srgb, var(--gd-series) 70%, white) 4px 6px); }
.gd-stack-label { font-size: 9px; color: var(--gd-muted); margin-top: 7px; white-space: nowrap; }
.gd-revenue-main { display: grid; grid-template-columns: 38px minmax(0, 1fr); }
.gd-chart-y { display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; color: var(--gd-muted); }
.gd-line-plot { position: relative; min-inline-size: 0; block-size: 208px; }
.gd-line-plot svg { display: block; width: 100%; height: 100%; overflow: visible; }
.gd-grid-line { stroke: var(--gd-grid); stroke-dasharray: 3 4; vector-effect: non-scaling-stroke; }
.gd-chart-path { fill: none; stroke: var(--gd-series); stroke-width: 2.5; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.gd-line-cursor { stroke: var(--gd-muted); stroke-dasharray: 2 4; vector-effect: non-scaling-stroke; }
.gd-chart-zones { position: absolute; inset: 0; display: flex; align-items: stretch; }
.gd-chart-zones button { flex: 1; min-inline-size: 0; border: 0; background: transparent; padding: 0; border-radius: 2px; }
.gd-line-tooltip { pointer-events: none; position: absolute; top: 6px; left: clamp(70px, var(--gd-tooltip-x), calc(100% - 70px)); translate: -50% 0; display: grid; gap: 2px; min-inline-size: 132px; padding: 7px 8px; background: var(--gd-surface); border: 1px solid var(--gd-line); border-radius: 9px; font-size: 10px; box-shadow: 0 4px 10px rgb(var(--gd-dark-shadow) / 15%); }
.gd-line-tooltip span { display: flex; justify-content: space-between; gap: 10px; }
.gd-chart-axis { display: flex; justify-content: space-between; margin: 9px 0 0 38px; font-size: 9px; color: var(--gd-muted); }
.gd-device { display: grid; gap: 8px; justify-items: stretch; }
.gd-device-ring { position: relative; inline-size: min(100%, 150px); aspect-ratio: 1; justify-self: center; }
.gd-device-ring svg { display: block; inline-size: 100%; block-size: 100%; }
.gd-device-segment { stroke: var(--gd-series); transition: opacity .2s ease; }
.gd-device-segment[data-muted="true"] { opacity: .29; }
.gd-device-total { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; pointer-events: none; }
.gd-device-total strong { font-size: 23px; line-height: 1.05; letter-spacing: -.05em; font-weight: 850; }
.gd-device-total > span { font-size: 10px; margin-top: 5px; color: var(--gd-muted); text-transform: capitalize; }
.gd-device-list { display: grid; gap: 2px; }
.gd-device-list button { display: grid; grid-template-columns: 86px minmax(0, 1fr) 34px; gap: 7px; align-items: center; min-block-size: 32px; text-align: start; background: transparent; border: 0; border-radius: 8px; padding: 3px 6px; text-transform: capitalize; }
.gd-device-list button:is(:hover, [aria-pressed="true"]) { background: var(--gd-inner); }
.gd-device-list button strong { text-align: end; font-weight: 850; font-size: 11px; }
.gd-mix-track { height: 4px; }
.gd-mix-track .gd-fill { display: block; block-size: 100%; border-radius: inherit; background: var(--gd-series); transform-origin: left center; }

.gd-lanes { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; align-items: start; }
.gd-lanes[data-filtered="true"] { grid-template-columns: minmax(0, 1fr); }
.gd-lane { min-inline-size: 0; border: 1px solid var(--gd-line); background: var(--gd-inner); padding: 7px; border-radius: 14px; }
.gd-lane header { display: flex; align-items: center; gap: 5px; padding: 3px 4px 8px; }
.gd-lane header i { display: inline-grid; place-items: center; border-radius: 7px; width: 23px; height: 23px; color: var(--gd-series); background: color-mix(in srgb, var(--gd-series) 13%, transparent); }
.gd-lane header svg { width: 13px; height: 13px; }
.gd-lane header h3 { min-inline-size: 0; font-size: 11px; font-weight: 840; }
.gd-lane header span { margin-inline-start: auto; color: var(--gd-muted); font-size: 10px; }
.gd-work-item { display: grid; gap: 5px; width: 100%; text-align: start; border-radius: 11px; padding: 9px; border: 1px solid var(--gd-rim); background: var(--gd-card); box-shadow: inset 0 1px 0 var(--gd-gloss); }
.gd-work-item + .gd-work-item { margin-top: 6px; }
.gd-work-item:hover { background: var(--gd-raised); }
.gd-work-titlerow, .gd-work-meta { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
.gd-work-titlerow strong { font-size: 11.5px; font-weight: 820; overflow: hidden; text-overflow: ellipsis; }
.gd-work-detail { font-size: 10.5px; line-height: 1.42; color: var(--gd-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.gd-work-meta { font-size: 9.5px; font-weight: 750; margin-top: 2px; color: var(--gd-muted); }

.gd-dock { position: absolute; z-index: 3; display: flex; align-items: center; gap: 3px; padding: 4px; border-radius: 999px; }
.gd-dock-side { flex-direction: column; left: -24px; top: clamp(66px, 16vh, 153px); }
.gd-dock-bottom { left: 50%; bottom: -24px; translate: -50% 0; }
.gd-dock a { z-index: 1; position: relative; display: flex; gap: 6px; justify-content: center; align-items: center; min-inline-size: 44px; min-block-size: 44px; padding: 0 13px; border-radius: 999px; font-size: 11px; font-weight: 800; white-space: nowrap; }
.gd-dock-side a { padding: 0; }
.gd-dock a svg { width: 16px; height: 16px; stroke-width: 1.9; }
.gd-dock a[aria-current="page"] { color: var(--gd-pick-ink); }
.gd-dock a:not([aria-current="page"]):hover { background: var(--gd-inner); }
.gd-dock-indicator { position: absolute; inset: 0 auto auto 0; pointer-events: none; visibility: hidden; border-radius: 999px; background: var(--gd-pick); box-shadow: inset 0 1px 0 white, 0 2px 7px rgb(var(--gd-dark-shadow) / 16%); }
.gd-dock-indicator[data-ready="true"] { visibility: visible; transition: transform .36s cubic-bezier(.24, .89, .26, 1), width .36s cubic-bezier(.24, .89, .26, 1), height .36s cubic-bezier(.24, .89, .26, 1); }
.gd-dock-side .gd-dock-text, .gd-dock-short { display: none; }
.gd-dock-tip { display: none; position: absolute; left: calc(100% + 7px); z-index: 1; pointer-events: none; color: var(--gd-ink); background: var(--gd-surface); padding: 6px 9px; border: 1px solid var(--gd-rim); border-radius: 7px; box-shadow: 0 3px 8px rgb(var(--gd-dark-shadow) / 17%); }
.gd-dock-side a:is(:hover, :focus-visible) .gd-dock-tip { display: inline; }
.gd-footer { padding: 33px 3px 1px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.gd-footer > * { border-radius: 999px; padding: 5px 8px; color: var(--gd-ink); font-size: 10px; font-weight: 740; background: var(--gd-raised); min-block-size: 24px; display: flex; align-items: center; gap: 4px; }
.gd-footer a:hover { text-decoration: underline; }
.gd-footer a svg { width: 10px; height: 10px; }

.gd-dialog { max-inline-size: min(calc(100% - 26px), 485px); inline-size: 100%; border-radius: 23px; border: 1px solid var(--gd-rim); color: var(--gd-ink); padding: 0; background: var(--gd-surface); box-shadow: 0 20px 80px rgb(var(--gd-dark-shadow) / 38%); }
.gd-dialog::backdrop { background: rgb(18 18 22 / 46%); backdrop-filter: blur(5px); }
.gd-dialog-inner { padding: 18px; }
.gd-dialog-inner > header { display: flex; gap: 10px; align-items: center; justify-content: space-between; margin-bottom: 13px; }
.gd-dialog-inner h2 { font-size: 24px; font-weight: 830; letter-spacing: -.045em; }
.gd-command-input { inline-size: 100%; padding-inline: 10px; margin-bottom: 8px; min-block-size: 44px; }
.gd-command-input input { min-block-size: 42px; font-size: 14px; width: 100%; }
.gd-quick-list { display: grid; gap: 5px; }
.gd-quick-list button { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px; text-align: start; border: 1px solid var(--gd-line); border-radius: 10px; background: var(--gd-inner); }
.gd-quick-list button:hover { background: var(--gd-raised); }
.gd-quick-list button svg { width: 16px; height: 16px; color: var(--gd-muted); }
.gd-quick-list button div { flex: 1; min-inline-size: 0; }
.gd-quick-list strong, .gd-quick-list small { display: block; }
.gd-quick-list small { color: var(--gd-muted); margin-top: 2px; font-size: 11px; }
.gd-work-dialog-description { margin: 12px 0; line-height: 1.55; }
.gd-work-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 0 0 13px; }
.gd-work-facts div { border: 1px solid var(--gd-line); border-radius: 9px; padding: 8px; min-inline-size: 0; }
.gd-work-facts dt { font-size: 11px; color: var(--gd-muted); }
.gd-work-facts dd { margin: 4px 0 0; font-weight: 790; overflow: hidden; text-overflow: ellipsis; }


/* The graph, the key beside it, and the work underneath — the app's own parts, in this page's
   clothes. The canvas draws itself in the palette components/graph-palette.ts hands it, so all
   these rules dress is what sits around it. */
.gd-graph-panel { display: flex; flex-direction: column; gap: 11px; }
.gd-graph-head { margin-block-end: 0; align-items: center; }
.gd-graph-note { color: var(--gd-muted); font-size: 11.5px; font-weight: 650; margin-block-start: 2px; max-inline-size: 52ch; }
.gd-nets { display: inline-flex; padding: 3px; gap: 2px; border-radius: 999px; border: 1px solid var(--gd-rim); background: var(--gd-rail); }
.gd-nets button { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; border: 0; background: transparent; color: var(--gd-muted); font: inherit; font-size: 11.5px; font-weight: 780; cursor: pointer; }
.gd-nets button[aria-pressed="true"] { background: var(--gd-primary); color: var(--gd-primary-ink); }
.gd-nets button:disabled { opacity: .45; cursor: not-allowed; }
.gd-nets-count { padding: 1px 6px; border-radius: 999px; background: var(--gd-track); color: var(--gd-ink); font-size: 10.5px; }
.gd-nets button[aria-pressed="true"] .gd-nets-count { background: rgb(255 255 255 / 22%); color: var(--gd-primary-ink); }

.gd-key { display: flex; flex-wrap: wrap; gap: 4px 14px; padding: 9px 11px; border-radius: 14px; border: 1px solid var(--gd-rim); background: var(--gd-inner); }
.gd-key-item { display: inline-flex; align-items: center; gap: 7px; padding: 3px 5px; border: 0; background: transparent; color: var(--gd-ink); font: inherit; font-size: 11.5px; font-weight: 700; border-radius: 8px; }
.gd-key-btn { cursor: pointer; }
.gd-key-btn:hover, .gd-key-btn[aria-pressed="true"] { background: var(--gd-raised); }
/* Pointing at one name dims the others, so the eye is sent to the shape being described. */
.gd-key:hover .gd-key-item { opacity: .45; }
.gd-key:hover .gd-key-item:hover, .gd-key .gd-key-btn[aria-pressed="true"] { opacity: 1; }
.gd-key svg { flex: none; }

.gd-canvas { position: relative; min-block-size: 0; block-size: clamp(300px, 46vh, 460px); border-radius: 16px; border: 1px solid var(--gd-rim); background: var(--gd-inner); overflow: hidden; }
.gd-particles { position: absolute; inset: 0; inline-size: 100%; block-size: 100%; pointer-events: none; }
.gd-graph-foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; color: var(--gd-muted); font-size: 11.5px; font-weight: 650; }

.gd-net-block { display: grid; gap: 14px; margin-block-end: 14px; }
.gd-leads { display: grid; gap: 14px; }
.gd-pick { border-color: var(--gd-ink); box-shadow: inset 0 1px 1px var(--gd-edge-light), 0 8px 22px rgb(var(--gd-dark-shadow) / 12%); }
.gd-pick-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.gd-flag { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; background: var(--gd-primary); color: var(--gd-primary-ink); font-size: 10.5px; font-weight: 800; letter-spacing: .01em; }
.gd-pick-who { display: flex; align-items: center; gap: 11px; margin-block: 12px 10px; }
.gd-face { display: grid; place-items: center; inline-size: 44px; block-size: 44px; flex: none; border-radius: 999px; background: var(--gd-primary); color: var(--gd-primary-ink); font-size: 13px; font-weight: 820; }
.gd-who { display: grid; min-inline-size: 0; }
.gd-who strong { font-size: 17px; font-weight: 820; letter-spacing: -.02em; }
.gd-who small { color: var(--gd-muted); font-size: 11.5px; font-weight: 650; }
.gd-score { display: inline-flex; align-items: baseline; gap: 1px; flex: none; }
.gd-score strong { font-size: 22px; font-weight: 840; letter-spacing: -.03em; color: hsl(var(--gd-score-h, 0) 64% 32%); }
.gd-score small { color: var(--gd-muted); font-size: 11px; font-weight: 700; }

.gd-reason { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin-block-start: 7px; font-size: 12.5px; font-weight: 620; line-height: 1.45; }
.gd-reason-k { display: inline-flex; align-items: center; gap: 6px; inline-size: 74px; flex: none; color: var(--gd-muted); font-weight: 760; }
.gd-reason-k svg { inline-size: 14px; block-size: 14px; }
.gd-reason b { font-weight: 820; }
.gd-pick-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-block-start: 15px; }

.gd-rest-list { display: grid; gap: 2px; }
.gd-rest-list li { display: grid; grid-template-columns: 22px auto minmax(9rem, auto) minmax(0, 1fr) auto auto; align-items: center; gap: 11px; padding: 10px 8px; border-radius: 12px; border-block-start: 1px solid var(--gd-line); }
.gd-rest-list li:first-child { border-block-start: 0; }
.gd-rest-list .gd-face { inline-size: 34px; block-size: 34px; font-size: 11px; }
.gd-rank { color: var(--gd-muted); font-size: 11.5px; font-weight: 760; text-align: center; }
.gd-rest-why { color: var(--gd-muted); font-size: 11.5px; font-weight: 620; line-height: 1.4; }
.gd-rest-do { min-block-size: 32px; padding: 5px 12px; }
/* The row the graph was clicked on, named down here. */
.gd-leads .is-picked { background: var(--gd-raised); box-shadow: 0 0 0 2px var(--gd-focus); }


/* The header's chips, and what they open. The panels inside come from the app, so they bring
   their own clothes with them; this is the frame around them. */
.gd-chip-seat { position: relative; }
.gd-chip { display: inline-flex; align-items: center; gap: 7px; min-block-size: 40px; padding: 7px 13px; border-radius: 999px; border: 1px solid var(--gd-rim); background: var(--gd-raised); color: var(--gd-ink); font: inherit; font-size: 11.5px; font-weight: 780; cursor: pointer; }
.gd-chip:hover { background: var(--gd-surface); }
.gd-chip svg { inline-size: 14px; block-size: 14px; }
.gd-live { inline-size: 8px; block-size: 8px; border-radius: 999px; background: #807BA6; }
.gd-live[data-live="yes"] { background: #17914F; }
.gd-pop-catch { position: fixed; inset: 0; z-index: 30; }
.gd-pop { position: absolute; inset-inline-end: 0; inset-block-start: calc(100% + 10px); z-index: 40; max-inline-size: calc(100vw - 32px); padding: 15px; border-radius: 18px; border: 1px solid var(--gd-rim); background: var(--gd-raised); color: #1b1b1f; backdrop-filter: blur(var(--gd-panel-frost)); box-shadow: 0 16px 40px rgb(var(--gd-dark-shadow) / 22%); }
.gd-new:disabled { opacity: .5; cursor: not-allowed; }
.gd-toast { position: fixed; inset-block-end: calc(84px + env(safe-area-inset-bottom)); inset-inline: 0; z-index: 60; inline-size: fit-content; max-inline-size: calc(100% - 32px); margin-inline: auto; padding: 10px 16px; border-radius: 999px; background: var(--gd-primary); color: var(--gd-primary-ink); font-size: 12px; font-weight: 740; box-shadow: 0 10px 30px rgb(var(--gd-dark-shadow) / 26%); }

@media (max-width: 1060px) {
  .gd-surround { inline-size: calc(100% - 74px); }
  .gd-stage-scroll { padding-inline: 29px; }
  .gd-command-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .gd-command-grid > .gd-command-chart { grid-column: 1; }
  .gd-command-side { grid-column: 2; }
  .gd-command-grid > .gd-activity { grid-column: 1 / -1; }
  .gd-lanes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .gd-rest-list li { grid-template-columns: 20px auto minmax(0, 1fr) auto; grid-template-areas: "rank face who score" "why why why do"; }
  .gd-rest-list .gd-rank { grid-area: rank; }
  .gd-rest-list .gd-face { grid-area: face; }
  .gd-rest-list .gd-who { grid-area: who; }
  .gd-rest-list .gd-score { grid-area: score; justify-self: end; }
  .gd-rest-why { grid-area: why; }
  .gd-rest-do { grid-area: do; justify-self: start; }
  .gd-surround { padding-top: 11px; padding-bottom: calc(73px + env(safe-area-inset-bottom)); inline-size: calc(100% - 24px); }
  .gd-top { grid-template-columns: minmax(0, 1fr) auto; padding: 7px 9px; gap: 6px 12px; border-radius: 21px; }
  .gd-ask { grid-area: 2 / 1 / 3 / -1; min-block-size: 41px; }
  .gd-top-actions { grid-area: 1 / 2; }
  .gd-open { display: none; }
  .gd-top-actions .gd-icon-button { width: 41px; min-inline-size: 41px; min-block-size: 41px; }
  .gd-stage { border-radius: 23px; }
  .gd-stage-scroll { block-size: auto; padding: 15px 13px 17px; overflow: visible; }
  .gd-view-head { align-items: flex-start; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .gd-view-actions { justify-content: flex-start; }
  .gd-command-grid, .gd-analytics-grid { grid-template-columns: minmax(0, 1fr); }
  .gd-command-side, .gd-command-grid > .gd-activity { grid-column: 1; }
  .gd-metric-grid, .gd-lanes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .gd-dock-side { display: none; }
  .gd-dock-bottom { position: fixed; inset: auto 11px calc(9px + env(safe-area-inset-bottom)); translate: none; justify-content: space-between; }
  .gd-dock-bottom a { flex: 1; flex-direction: column; gap: 2px; padding: 3px 5px; min-block-size: 47px; line-height: 1.2; font-size: 9.5px; }
  .gd-dock-bottom a svg { width: 15px; height: 15px; }
  .gd-dock-bottom .gd-dock-text { display: none; }
  .gd-dock-bottom .gd-dock-short { display: inline; }
  .gd-footer { padding-top: 9px; flex-direction: column; align-items: flex-start; }
}
@media (max-width: 420px) {
  .gd-panel { padding: 12px; }
  .gd-metric { padding: 9px; }
  .gd-summary { gap: 5px; padding: 5px; }
  .gd-chart-axis span:nth-child(even) { visibility: hidden; }
  .gd-metric-grid, .gd-lanes { grid-template-columns: 1fr; }
  .gd-table-scroll table { min-inline-size: 278px; }
  .gd-work-facts { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .gd-app *, .gd-app *::before, .gd-app *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
@media (prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active) {
  .gd-top, .gd-stage, .gd-dock, .gd-panel, .gd-metric, .gd-summary { background: var(--gd-surface); backdrop-filter: none; -webkit-backdrop-filter: none; }
}
@media (forced-colors: active) {
  .gd-app { --gd-ink: CanvasText; --gd-muted: CanvasText; --gd-focus: Highlight; --gd-coral: CanvasText; --gd-teal: Highlight; --gd-graph-ink: CanvasText; --gd-surface: Canvas; }
  .gd-app :is(.gd-metric, .gd-panel, .gd-lane, .gd-dock, button, .gd-stage) { border: 1px solid CanvasText; }
  .gd-dock a[aria-current="page"] { border: 2px solid Highlight; }
}
`;
