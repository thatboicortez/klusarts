# KlusArts Klusbedrijf — website

Statische website (geen build-tools) voor twee zelfstandige vakmensen die samen
onder één handelsnaam werken. NL is de hoofdtaal, met een taalwisselaar voor EN en RU.
Gehost op GitHub Pages (`klusarts.nl`).

## Pagina's

| URL | Inhoud |
|---|---|
| `/` | Hero, diensten (lijst), recent werk, werkwijze, over ons, werkgebied, CTA |
| `/diensten/` | Alle 9 diensten met foto + "Waarom kiezen voor ons" |
| `/projecten/` | Galerij met filters en lightbox (voor/na-paren) |
| `/offerte/` | Contactgegevens + offerteformulier (verstuurt via WhatsApp of e-mail) |
| `404.html` | Pagina niet gevonden |

## Lokaal bekijken

```bash
python serve.py
```

en open `http://localhost:5173`. Gebruik bewust `serve.py` en niet `python -m http.server`:
die kent `404.html` niet en stuurt `no-store` mee zodat de browser nooit oude CSS/JS toont.

## Ontwerp

Ontwerp en lettertype komen van *theskill.live* ("the vault": bijna-zwart, één wit accent,
Geist, 8px knoppen, 16px kaarten, geen schaduwen). De beweging komt van *Monro*: zachte
ease-out (`cubic-bezier(.16,1,.3,1)`), reveal bij scrollen en vloeiende paginawissels
(`@view-transition`). Zie [DESIGN.md](DESIGN.md).

```
css/fonts.css     Geist (variabel, 100–900), self-hosted; cyrillisch apart voor RU
css/style.css     Alle stijlen (tokens bovenin :root)
js/main.js        Taal, bedrijfsgegevens, menu, reveal, galerij + lightbox, formulier
js/i18n.js        Vertalingen NL / EN / RU
js/business-config.js   Bedrijfsgegevens op één plek
```

## Bedrijfsgegevens

Alles staat in **[js/business-config.js](js/business-config.js)**: naam, telefoon,
WhatsApp, e-mail, KvK/BTW van beide vennoten, werkgebied en regio's. Dit wordt overal op de
site ingevuld (header, footer, over ons, formulier).

Apart bijwerken (zelfde gegevens): het JSON-LD-blok in `index.html` (structured data voor
Google) en de `<title>`/`<meta>`-tags in de `<head>` van elke pagina (crawlers zonder
JavaScript zien deze statische tekst).

Publiceer nooit het omzetbelastingnummer (gekoppeld aan het BSN) — alleen het
btw-identificatienummer.

## Cache

CSS/JS worden geladen met `?v=NN`. Pas je een van die bestanden aan, verhoog dan het
nummer in alle 5 HTML-bestanden, anders blijft de browser de oude versie tonen.

## Teksten en talen

Vertalingen staan in `js/i18n.js` (blokken `nl`, `en`, `ru`; per taal dezelfde sleutels).
In de HTML staat de NL-tekst als fallback; `data-i18n="sleutel"` vervangt die door de
gekozen taal. Zet een `*`-teken of andere vaste tekst **buiten** het element met `data-i18n`,
anders wordt het bij een taalwissel overschreven.

## Foto's

* `images/projecten/NAAM.jpg` — volledige foto (lightbox, dienstenpagina), ± 960×1280.
* `images/projecten/thumbs/NAAM.jpg` — kleine versie (640 px breed) voor het raster.
  Maak die met bv.:

  ```python
  from PIL import Image, ImageOps
  im = ImageOps.exif_transpose(Image.open("images/projecten/NAAM.jpg")).convert("RGB")
  im.resize((640, round(im.height * 640 / im.width))).save("images/projecten/thumbs/NAAM.jpg", quality=76, optimize=True, progressive=True)
  ```

Een gewone foto toevoegen aan de galerij (`projecten/index.html`, binnen `<div class="gallery">`):

```html
<button type="button" class="g-item" data-category="renovatie">
  <img src="/images/projecten/thumbs/NAAM.jpg" data-full="/images/projecten/NAAM.jpg" alt="Korte beschrijving" width="640" height="853" loading="lazy" decoding="async">
  <span class="g-tag" data-i18n="projects.filter.renovatie">Renovatie</span>
</button>
```

Een voor/na-paar (twee slides in de lightbox, naast elkaar in het raster):

```html
<div class="g-item g-item--pair" data-category="renovatie">
  <button type="button" class="g-half"><img src="/images/projecten/thumbs/VOOR.jpg" data-full="/images/projecten/VOOR.jpg" alt="…" width="640" height="853" loading="lazy" decoding="async"><span class="g-label" data-i18n="projects.before">Voor</span></button>
  <button type="button" class="g-half"><img src="/images/projecten/thumbs/NA.jpg" data-full="/images/projecten/NA.jpg" alt="…" width="640" height="853" loading="lazy" decoding="async"><span class="g-label g-label--after" data-i18n="projects.after">Na</span></button>
</div>
```

`data-category` is een van: `schilderwerk`, `renovatie`, `sloopwerk`, `gipsplaten`, `isolatie`,
`restauratie`, `loodgieter`, `kozijnen`, `stukadoor`.

Lightbox: pijlen/toetsen ←/→, swipe (omlaag = sluiten), Esc, terugknop sluit de lightbox.
Zolang hij open is staat de pagina erachter vast (en onbereikbaar via toetsenbord).

## Offerteformulier

Geen server nodig: na validatie opent het formulier een kant-en-klaar bericht in WhatsApp
(of in het e-mailprogramma); de klant verstuurt het zelf. Foto's kunnen niet via `mailto:`
mee, daarom staat er een hint om ze via WhatsApp te sturen. De diensten linken naar
`/offerte/?klus=<type>` en kiezen zo het juiste type klus voor.

## Logo en favicon

`images/logo-nav.png` (header/footer), `images/logo-master.png` (hoge resolutie),
`favicon.ico`, `images/favicon-*.png`, `apple-touch-icon.png`, `images/icon-512.png`,
`images/og-cover.jpg` (voorbeeldplaatje bij delen op WhatsApp/social, 1200×630).
