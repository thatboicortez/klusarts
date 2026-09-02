# Design system

<!-- impeccable:design-doc -->

Recorded from the built surface (`index.html`, `css/tokens.css`, `css/style.css`).
Self-authored in-thread: this session's harness has no `impeccable-documenter`
subagent available, so this file substitutes the shipped documenter pass
directly from the built code, per the skill's degraded-mode fallback. Disclosed
here rather than silently.

## World

An architectural materials portfolio, not a contractor template. Near-black
charcoal ground, one locked cold-steel-blue accent, oversized Archivo display
type, sharp 2px corners, thin hairline dividers, real jobsite photography
(currently picsum.photos placeholders, see README). No light mode: the brief
pinned a single dark premium direction.

## Color

```
--bg            #0a0b0d   page ground
--bg-raised     #121417   alternating band sections, form panel
--bg-raised-2   #191c21   nested surfaces (icon chips, footer contact icons)
--bg-raised-3   #21252b   scrollbar thumb
--border        rgba(255,255,255,.09)   hairlines
--border-strong rgba(255,255,255,.17)   inputs, dashed chips, stronger dividers
--text          #f3f4f2   primary text
--text-muted    #a1a7ac   secondary text (8.1:1 on --bg)
--text-faint    #7c8288   tertiary/label text (5.1:1 on --bg, kept >=4.5:1 deliberately)
--accent        #3e6ea3   solid fills (buttons) — white text on this passes AA (5.3:1)
--accent-light  #93b8e4   links, icons, small accents on dark ground (9.6:1)
--accent-dim    rgba(62,110,163,.16)    subtle tints (focus rings, chip fills)
--status-live   #6fbf8b   the one semantic dot (availability status)
```

Color strategy: Restrained (neutrals + one locked accent). One accent used
identically everywhere; never swapped per section.

## Type

Single family for display and body: **Archivo** (self-hosted, weights
400/500/600/700/800/900), chosen for its architectural/signage character and
wide weight range, avoiding the Inter/Fraunces/Playfair/Space-Grotesk default
pool. **JetBrains Mono** (400/500) for numeric/measurement data only: phone
numbers, KvK/BTW, process step numbers, section-band microcopy.

- Display (h1-h4): weight 800, tracking -0.02em, `text-wrap: balance`.
- Hero h1: `clamp(2.75rem, 6.6vw, 5rem)`, max 2 lines by construction (16ch cap).
- Body: 16px base, line-height 1.55, `p { max-width: 65ch }`.

## Shape

Locked sharp system: `--radius: 2px` (buttons, inputs, icon chips),
`--radius-lg: 3px` (unused reserve). No pill shapes except the language
switch and gallery filter pills, which are the one documented exception
(navigation-style controls, not content containers) — kept consistent by
using `border-radius: 999px` only on that one component family.

## Motion

One authored moment: sequenced entrance on scroll (`[data-reveal]` /
`[data-reveal-stagger]`, `IntersectionObserver`, `--ease-out:
cubic-bezier(0.23,1,0.32,1)`, 420ms), used to establish reading order once
per section, not scattered per element. Hover/press feedback uses
`transform: scale()` only (buttons, gallery zoom, service-card icon).
`prefers-reduced-motion: reduce` collapses all of it globally in
`tokens.css`. A JS safety timeout (2.5s) and a `<noscript>` CSS override both
guarantee content is never left permanently invisible if the observer never
fires — this was caught and fixed during the build's own QA pass (see below).

## Components

- **Navbar**: fixed, transparent until scroll (`IntersectionObserver` on a
  1px sentinel, not a scroll listener), blurs to `rgba(10,11,13,.72)` +
  `backdrop-filter: blur(14px)`. 76px tall, single-line at desktop.
- **Services grid**: photo cards in a hairline-separated grid (no drop
  shadows, no rounded card chrome) — 9 items, 3 columns at desktop, each with
  a real photo, not an icon-only tile.
- **Why-us**: checklist rows with a photo, not six identical icon cards —
  deliberately avoids the banned same-size-card scaffold.
- **Projects gallery**: filterable grid + fullscreen lightbox with
  prev/next/escape, one asymmetric tall tile per row of five for rhythm.
- **Process**: 4 numbered steps (01-04); the numbering is justified here
  because it is a real sequence the visitor follows, not decoration.
- **Offerte form**: labeled fields, inline error states, drag-and-drop
  multi-photo preview with per-file removal, `mailto:` fallback submission
  (documented as a TODO for a real backend in README.md).

## Icons

Authored inline as an SVG `<symbol>` sprite in `index.html` (one stroke
weight, 1.6, round caps/joins throughout) rather than a CDN icon font, so the
site has no external runtime dependency for icons.

## Copy voice

Direct, practical Dutch aimed at homeowners and aannemers — short sentences,
no corporate filler, no invented certifications/testimonials/years of
experience/city list (all left as bracketed placeholders per the brief).

## Information architecture (revised)

Originally built as a single scrolling page; revised per user request into
four separate URLs (`/`, `/diensten/`, `/projecten/`, `/offerte/`), each its
own static HTML file with the nav/footer/icon-sprite duplicated identically
(no templating available in a build-tool-free static site). Home keeps only
Hero, Werkgebied and Over ons, by explicit user instruction. Diensten and
Projecten share a compact `.hero.page-header` banner variant (46vh instead
of the homepage's full 100dvh hero) for a consistent but appropriately
smaller inner-page identity. "Waarom kiezen voor ons" merged into
`/diensten/` and "Zo werken wij" merged into `/offerte/` (both are supporting
content for those specific conversion paths) rather than getting their own
thin pages, per the user's chosen "compact" IA option.

Also revised "Over ons" from a solo zzp'er voice to two independent zzp'ers
(`team1`/`team2` in `js/business-config.js`) sharing one trade name, each
with their own KvK/BTW, per user clarification.

## QA performed this build

Functional pass (headless browser): language switch (NL/EN/RU), gallery
filter + lightbox open/close/nav, service detail modal, mobile menu, form
validation (required fields + email format), business-config placeholder
fallback links (`tel:`/`wa.me`/`mailto:` degrade to `#offerte` until real
data is filled in), responsive check at 375px and 1440px (no horizontal
overflow, single-line nav, hero fits the viewport), contrast audit (all text
color pairs recomputed against WCAG AA, `--text-faint` raised from
`#6c7278` to `#7c8288` after it measured 4.05:1 to clear 4.5:1), missing
`alt` text found and fixed on the 9 service-card images, and a real bug
found and fixed: the scroll-reveal system could leave hero content stuck at
`opacity:0` if the entrance observer never fired — fixed with a no-JS
`<noscript>` override plus a JS timeout fallback.

No native design-detector hook was available in this session (static HTML
project, not a hooked harness); the checks above substitute for it against
`impeccable`'s craft-floor and `taste-skill`'s Pre-Flight Check.
