# KlusArts Klusbedrijf — website

Statische website (geen build-tools) voor twee zelfstandige vakmensen die samen
onder één handelsnaam werken. NL is de hoofdtaal; er is ook een volledige Engelse versie onder `/en/` (eigen adressen, zodat Google ze ook indexeert).
Gehost op GitHub Pages (`klusarts.nl`).

## Pagina's

| URL | Inhoud |
|---|---|
| `/` | Hero, diensten (lijst), recent werk, werkwijze, over ons, werkgebied, CTA |
| `/diensten/` | Alle 9 diensten met foto + "Waarom kiezen voor ons" |
| `/projecten/` | Galerij met filters en lightbox (voor/na-paren) |
| `/offerte/` | Contactgegevens + offerteformulier (verstuurt via WhatsApp of e-mail) |
| `/en/...` | Engelse versie van de vier pagina's hierboven (gegenereerd) |
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
src/css/fonts.css Geist (variabel, 100–900), self-hosted (latin + latin-ext)
src/css/style.css Alle stijlen (tokens bovenin :root)
src/js/main.js    Taal, bedrijfsgegevens, menu, reveal, galerij + lightbox, formulier
src/js/cube.js    3D-kubus op de homepage (Three.js uit js/vendor/three, model in models/), 1-op-1 van theskill.live;
                  laadt pas na het tekenen van de pagina, pauzeert buiten beeld
src/js/i18n.js    Vertalingen NL / EN
src/js/business-config.js   Bedrijfsgegevens op één plek
```

## Bedrijfsgegevens

Alles staat in **`src/js/business-config.js`**: naam, telefoon,
WhatsApp, e-mail, KvK/BTW van beide vennoten, werkgebied en regio's. Dit wordt overal op de
site ingevuld (header, footer, over ons, formulier).

Apart bijwerken (zelfde gegevens): het JSON-LD-blok in `src/index.html` (structured data voor
Google) en de `<title>`/`<meta>`-tags in de `<head>` van elke pagina (crawlers zonder
JavaScript zien deze statische tekst).

Publiceer nooit het omzetbelastingnummer (gekoppeld aan het BSN) — alleen het
btw-identificatienummer.


## Bouwen: bron in `src/`, uitvoer in de root (belangrijk)

Wat je **bewerkt** staat in `src/` (leesbaar):

```
src/index.html, src/diensten/, src/projecten/, src/offerte/, src/404.html   Nederlandse pagina's
src/css/*.css, src/js/*.js                                                   stijlen en scripts
content/services.json                                                        teksten van de 11 dienstenpagina's (NL + EN)
content/alt-en.json                                                          Engelse foto-beschrijvingen
```

Daarna draai je:

```bash
python build.py
```

Dat maakt de **uitvoer** in de root: `index.html`, `diensten/`, `projecten/`, `offerte/`, `404.html`,
`css/`, `js/`, `en/**` en `sitemap.xml`. Alles is geminificeerd (HTML, CSS en JS op één regel, met korte
variabelnamen), zodat Ctrl+U geen leesbare kopie van de code geeft. Die uitvoer commit je ook; bewerk
hem nooit met de hand, de volgende build overschrijft hem. Eenmalig nodig: `cd tools && npm install`.

`_config.yml` zorgt dat GitHub Pages `src/`, `tools/`, `content/` en `build.py` niet publiceert.
Let op: de repo zelf is openbaar op GitHub, dus de bron is daar wel te lezen. Wil je dat ook niet:
maak de repository privé (GitHub Pages werkt dan alleen met een betaald plan).

Het script:
* haalt Engelse teksten uit `src/js/i18n.js` (blok `en`) en foto-beschrijvingen uit `content/alt-en.json`
  (nieuwe foto in de galerij? voeg zijn Nederlandse `alt` met de Engelse vertaling toe aan dat bestand);
* zet `<html lang>`, titel, description, Open Graph, canonical en `hreflang` goed en herschrijft links naar `/en/...`;
* onderhoudt de NL/EN-taalwisselaar en het hreflang-blok in de Nederlandse bronpagina's;
* minificeert en zet achter css/js automatisch `?v=<hash>` (cache-versie uit de inhoud, niet meer handmatig);
* schrijft `sitemap.xml` (beide talen met hreflang, lastmod en foto's).
* SEO: zet de teksten van `data-i18n`-elementen en `<title>`/meta uit `src/js/i18n.js` in de HTML (NL en EN), maakt
  de dienstenpagina's `/diensten/<dienst>/` (uit `content/services.json`) en voegt canonical, hreflang, Open Graph,
  Twitter, robots en JSON-LD toe (LocalBusiness, Service, FAQPage, BreadcrumbList, ItemList, CollectionPage, ContactPage).
  Titels en descriptions per pagina wijzig je in `src/js/i18n.js` (`meta.title.*`, `meta.description.*`).

Een nieuwe pagina toevoegen: maak de Nederlandse pagina in `src/` en voeg haar toe aan `PAGES` bovenin `build.py`.
De 404-pagina is één bestand voor beide talen: onder `/en/...` kiest `src/js/main.js` zelf het Engels.

Lokaal bekijken: eerst `python build.py`, dan `python serve.py`.

In `src/js/i18n.js` staat per taal (`nl`, `en`) dezelfde set sleutels. In de HTML staat de NL-tekst met
`data-i18n="sleutel"`. Zet een `*`-teken of andere vaste tekst **buiten** het element met `data-i18n`.

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

## Google Search Console

`google13e23eb162e0ddbc.html` in de hoofdmap is het verificatiebestand van Search Console: laat het staan (anders raakt de site ontkoppeld).
