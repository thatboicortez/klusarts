# Design system

Gebaseerd op *theskill.live* (stijl, lettertype, architectuur, mobiel gedrag) met de beweging
van *Monro*. De code staat in `css/style.css`; de tokens bovenin `:root`.

## Wereld

"The vault": bijna-zwart staal, één wit accent, echte werkfoto's (geen stockfoto's, geen
banners bovenaan de pagina's). Alles is vlak en tonaal: diepte komt uit een trap van
grijswaarden en haarlijnranden, nooit uit schaduwen.

## Kleur

```
--bg       #0e0e0e   pagina
--bg-deep  #050505   footer, lightbox
--card     #131313   kaarten
--card-2   #1d1d1d   velden, randen
--card-3   #242424   secundaire knoppen
--border-2 #333333   hover/nadruk-rand
--text     #ffffff   tekst en het enige "luide" accent (primaire knop, actieve filter/taal)
--muted    #b0b0b0 / --muted-2 #878787 / --muted-3 #666666
--danger   #ff7878   alleen formulierfouten
```

Geen decoratieve kleur. Kleur in de foto's draagt de pagina.

## Type

Eén familie: **Geist** (variabel 100–900, self-hosted, latin + latin-ext + cyrillic).
Hiërarchie door maat, gewicht en letterspatiëring:

* Display `clamp(36px, 7.2vw, 72px)` / 700 / -0.04em (hero), `clamp(32px, 6vw, 64px)` (paginatitels)
* Headline `clamp(24px, 4vw, 36px)` / 700 / -1px (sectietitels)
* Card title 17px / 700 / +2px / hoofdletters (stappen)
* Body 16px (15px mobiel), label 14px / 500

## Vorm en layout

* Knoppen 8px (44px hoog, 52px "lg"), kaarten 16px, CTA-blok 20px.
* Container `min(100% - 80px, 1360px)`; 32px marge onder 768px.
* Header vast, 72px (64px onder 900px). Mobiel menu schuift van rechts in met gestaffelde links.
* Breakpoints: 1080 (3→2 kolommen), 900 (menu, 1 kolom), 767 (telefoon).

## Beweging (Monro)

* Eén ease: `cubic-bezier(.16, 1, .3, 1)`; reveal 0.9s, `translateY(20px)`, gestaffeld (70 ms per kind).
* Hover: `translateY(-2px)` + achtergrond een stap lichter; foto's zoomen 4–5 % (alleen met hover-apparaat).
* Paginawissel: `@view-transition { navigation: auto }`, header heeft een eigen naam zodat hij niet knippert.
* Filter: tegels faden gestaffeld in. Lightbox: foto glijdt 40px en faadt bij wisselen.
* `prefers-reduced-motion`: alles direct.

## Componenten

* **Lightbox** — pijlen (op telefoon onderin, duimvriendelijk), teller, onderschrift = categorie + alt,
  swipe, omlaag-vegen sluit, preloading van buren, focus-trap, achtergrond `inert`,
  scroll-lock via `position: fixed` (werkt ook op iOS), terugknop sluit de lightbox.
* **Filters** — plakken onder de header, horizontaal scrollbaar op telefoon, `#categorie` in de URL.
* **Formulier** — velden 50px hoog, 16px tekst (geen iOS-zoom), validatie per veld, twee verzendknoppen.
