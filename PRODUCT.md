# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS. No build tools, no framework. User chose this explicitly (over Next.js/React) for easy hosting on a standard cheap webhost and low ongoing maintenance for a one-person business.

## Users

Primary users are Dutch homeowners (particulieren), landlords/tenants needing repairs, small businesses, and aannemers/bouwbedrijven who need to outsource a klus. They land on the site to quickly judge whether this vakman is trustworthy and skilled enough, see what he actually does, look at proof of past work, and request a quote (offerte) with minimal friction. Business/B2B visitors (aannemers) want to quickly confirm allround capability and reliability for subcontracting.

## Product Purpose

A marketing/lead-generation website for a Dutch ZZP (zelfstandige zonder personeel) working as an allround handyman / bouwvakker. The site's job is to convert a visitor into an offerte-aanvraag (quote request) by projecting professionalism, precision, reliability and craftsmanship, and by making the services and past work legible at a glance.

## Positioning

A single allround vakman who covers the full range from demolition to finishing (sloop, isolatie, stukadoren, gipsplaten, kozijnen, deuren, schilderwerk, loodgieterwerk, restauratie) - so a client does not need to hire multiple specialists for a renovation. Positioned as premium/professional, explicitly not as a cheap generic "klusjesman" template site.

## Operating Context

Client acquisition happens primarily through the offerte-aanvraag form (with photo upload) and via WhatsApp/phone. Site must work well on mobile since most private clients will find and contact via phone. No booking/payment system; the offerte flow is just a lead form, real submission handling is out of scope for the initial build (form should be wired to be easy to connect to a backend/mailto/service later, clearly marked).

## Capabilities and Constraints

- No real business facts are available yet: no company/trade name, no KvK number, no BTW number, no address, no phone number, no email, no real work regions/cities, no real project photos, no testimonials, no certifications, no years-of-experience figure. All of these must be clearly marked, easily-replaceable placeholders, ideally centralized so the user can fill them in from one place later.
- User explicitly forbids inventing any of the above as if real.
- Primary language is Dutch (natural, non-corporate tone). A language switcher UI for NL / EN / RU must exist, but only Dutch content needs to be fully written out for this build (EN/RU are structurally present but can be marked as a follow-up / minimal viable translation).
- Services to present as distinct offerings: gevel schilderen, sloopwerk, gevelisolatie, gipsplaten & wanden, kozijnen plaatsen, deuren plaatsen, stukadoorswerk, loodgieterswerk, restauratie & renovatie.
- SEO must be built in: titles, meta description, semantic HTML, heading hierarchy, Open Graph, favicon, sitemap.xml, robots.txt, LocalBusiness schema.org structured data (with placeholder business facts).
- Fully responsive, mobile-first, sticky/blurring navbar, mobile hamburger menu, fullscreen project lightbox, contact form with multi-photo upload, WhatsApp CTA.

## Brand Commitments

- No confirmed business name yet. Use `[Bedrijfsnaam]` as a single, centralized placeholder token so the user can find/replace it in one place.
- Accent color: user chose "koud staalblauw" (cool steel blue) explicitly over warm construction-orange, to keep the premium/architectural feel and avoid a cheap "bouwmarkt" look.
- Dark, premium visual direction requested explicitly: near-black background, dark grey, white text, single restrained accent color, generous whitespace, large confident typography, real (placeholder-for-now) construction/renovation photography, smooth restrained motion. Explicitly not a cheap construction-company template look.

## Evidence on Hand

None. No real photos, testimonials, certifications, years of experience, KvK/BTW numbers, address, phone, email, or city list were provided. All such content must ship as clearly-marked placeholders (e.g. `[TELEFOONNUMMER]`, `[KVK-NUMMER]`) that are trivial to find and replace, not invented realistic-looking data.

## Product Principles

1. Trust and craftsmanship are communicated through restraint and precision (typography, spacing, photography), never through invented social proof or decoration.
2. Every path on the site should lead toward one clear action: an offerte-aanvraag. No competing/duplicate CTAs with the same intent.
3. Placeholder business facts (name, contact, KvK/BTW, regions) live in as few, clearly-marked places as possible so the real owner can fill them in without hunting through the codebase.
4. Dutch copy must read like a real independent Dutch vakman wrote it, not a translated corporate brochure.
5. Mobile experience is treated as the primary experience, not an afterthought of the desktop design.

## Accessibility & Inclusion

No specific accessibility requirement was stated beyond general professionalism. Build to standard WCAG AA practice (contrast, focus states, semantic HTML, alt text) as baseline craft, not a special request.
