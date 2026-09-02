# Website — allround klusbedrijf

Een statische website (geen build-tools nodig) voor twee zelfstandige
vakmensen (allebei zzp'er) die samen onder één handelsnaam werken als
handyman / allround bouwvakker in Nederland. NL is de hoofdtaal, met een
werkende taalwisselaar voor EN en RU.

De site bestaat uit vier aparte pagina's, elk met een eigen URL:

- `/` — home (Hero, Werkgebied, Over ons)
- `/diensten/` — alle diensten + "Waarom kiezen voor ons"
- `/projecten/` — projectengalerij met filters
- `/offerte/` — "Zo werken wij" + het offerteformulier

## Snel starten

Open `index.html` niet zomaar dubbelklikkend in de browser (sommige browsers
blokkeren dan lokale bestanden). Start in plaats daarvan de meegeleverde
lokale server:

```bash
cd "C:\Users\vovob\OneDrive\Desktop\zzp"
python serve.py
```

en open `http://localhost:5173`.

Gebruik bewust `python serve.py` en niet het kale `python -m http.server`:
die laatste kent `404.html` niet en toont bij een onbestaande pagina zijn
eigen kale foutmelding ("Error response..."). `serve.py` is een minimale
wrapper die lokaal hetzelfde gedrag laat zien als een echte host.

Voor productie: upload de hele inhoud van deze map naar een webhost (elke
gewone hosting met statische bestanden werkt, bijvoorbeeld via cPanel, of een
host als Netlify/Vercel/GitHub Pages). De URL's zoals `/diensten/` werken
overal automatisch, omdat elke map een eigen `index.html` heeft — dit is
standaardgedrag bij vrijwel elke webhost, er is geen extra configuratie
nodig.

## Wat je zelf nog moet invullen

Alles wat nog een placeholder is staat tussen blokhaken, bijvoorbeeld
`[Bedrijfsnaam]`. Er is precies **één bestand** waar de bedrijfsgegevens
worden beheerd:

**[js/business-config.js](js/business-config.js)**

Vul hier in: bedrijfsnaam (gedeelde handelsnaam), telefoonnummer,
WhatsApp-nummer, e-mailadres, werkgebied/regio's, en de naam + KvK-nummer +
BTW-nummer van **beide** vennoten apart (`team1Name`/`team1Kvk`/`team1Btw` en
`team2Name`/`team2Kvk`/`team2Btw` — jullie hebben immers ieder een eigen
zzp-registratie onder de gedeelde naam). Deze gegevens worden automatisch
overal op de site ingevuld (navigatie, footer, "Over ons" op de homepage).
Zodra `phoneHref` / `whatsappNumber` / `email` een echte waarde hebben (geen
`[...]` meer), worden de bijbehorende knoppen automatisch klikbaar (tel:,
wa.me, mailto:).

Daarnaast, apart bijwerken (zelfde gegevens, voor Google's structured data —
staat alleen op de homepage):

- **[index.html](index.html)**, het `<script type="application/ld+json">`
  blok in de `<head>` (LocalBusiness/schema.org gegevens voor zoekmachines).
- De `<meta>`-tags in de `<head>` van elk van de vier pagina's (title,
  description, Open Graph) — deze vullen zich ook automatisch met de juiste
  bedrijfsnaam via JavaScript, maar de statische tekst in de HTML is wat
  crawlers zonder JavaScript zien.
- `robots.txt` en `sitemap.xml`: vervang `https://www.uw-domein.nl/` door je
  echte domein (op alle vier de URL's in sitemap.xml).

## 3D-model in de hero (homepage)

Rechts naast de hero-tekst op de homepage draait en zweeft een 3D-object
(`models/hammer.glb`), getoond via de library
[`@google/model-viewer`](https://modelviewer.dev/) (zelf gehost in
`js/vendor/model-viewer.min.js`, alleen geladen op schermen ≥900px om geen
databundel te verspillen op telefoons).

**Belangrijk: deze vendor-file staat bewust vast op versie 3.5.0, niet de
nieuwste 4.x.** Versie 4.3.1 bevat een bug in de ingebouwde AR-module
(`onUpdateScene`) die een `TypeError` gooit bij elke wijziging van de
`orientation`-property, wat de continue rotatie-animatie in `js/main.js`
(functie `initHero3D`) volledig blokkeert. Bijwerken naar een nieuwere versie
moet eerst opnieuw getest worden op exact dit gedrag (open de browserconsole
en controleer op herhaalde errors met "onUpdateScene" erin) voordat je 'm
live zet.

Het 3D-model vervangen: zet het nieuwe `.glb`-bestand in `models/` en pas het
`src`-pad aan in `index.html` (zoek naar `id="heroModel"`). De draai- en
zweefanimatie zelf staat in `js/main.js` (`initHero3D`); de drie rotatiegetallen
in de `orientation`-string zijn niet gewoon X/Y/Z - zie de comment daar voor
de uitleg welk getal welke as is.

## Cache tijdens lokaal ontwikkelen

Alle CSS/JS-bestanden worden geladen met een `?v=9`-achtergrondje aan het
eind van de URL (bv. `style.css?v=9`). Pas je een van deze bestanden aan,
verhoog dan dat nummer overal (in alle 5 HTML-bestanden en in de
scriptinjectie in `js/main.js`) - anders kan de browser een oude, gecachete
versie blijven tonen ook al staat de nieuwe code al op schijf.

## Projectenfoto's

`images/projecten/` bevat 41 geselecteerde en geoptimaliseerde foto's uit het
door jou aangeleverde archief (101 foto's), verdeeld over de galerijfilters.
De galerij toont nu een bewuste selectie in plaats van het hele archief — de
overige foto's staan niet in het project, maar in het originele zip-bestand
op je Bureaublad als je later meer wilt toevoegen (zelfde werkwijze als
hieronder).

Er zijn ook drie filters bijgekomen die er eerst niet waren, omdat het
archief daar echt materiaal voor bevatte: **Loodgieterswerk**,
**Kozijnen & deuren** en **Stukadoorswerk** (naast de bestaande Schilderwerk,
Renovatie, Sloopwerk, Gipsplaten, Isolatie, Restauratie).

## Voor/Na-paren toevoegen (projectengalerij)

In `projecten/index.html` staan twee voorbeeld-paren (met placeholder-foto's)
die laten zien hoe een "Voor/Na"-kaart in de galerij eruitziet. Zo'n paar
neemt binnen de galerij de ruimte van twee gewone tegels in en toont, bij
klikken, beide foto's naast elkaar in de lightbox met het label "Voor" /
"Na" eronder.

Nieuw paar toevoegen: kopieer dit blokje ergens tussen de andere
`.gallery-item`'s in `<div class="gallery-grid">`, en vul je eigen foto's en
categorie in:

```html
<div class="gallery-item gallery-item--pair" data-category="renovatie">
  <div class="pair-half">
    <img src="PAD/NAAR/voor-foto.jpg" alt="Situatie voor de klus" loading="lazy">
    <span class="pair-label" data-i18n="projects.before">Voor</span>
  </div>
  <div class="pair-half">
    <img src="PAD/NAAR/na-foto.jpg" alt="Resultaat na de klus" loading="lazy">
    <span class="pair-label pair-label--after" data-i18n="projects.after">Na</span>
  </div>
</div>
```

`data-category` moet een van de bestaande filterwaarden zijn (`schilderwerk`,
`renovatie`, `sloopwerk`, `gipsplaten`, `isolatie`, `restauratie`) zodat het
paar meedoet met de filterknoppen bovenaan.

## Logo

Het logo staat in `images/logo-nav.png` (het beeldmerk zelf, gebruikt links
bovenin de navigatie en in de footer op elke pagina) en `images/logo-master.png`
(hogere resolutie, transparante achtergrond, voor eventueel later gebruik).
Wil je het logo vervangen? Zet het nieuwe bestand op dezelfde plek onder
dezelfde naam, of pas het `src`-pad aan op de 10 plekken (2 per pagina x 5
pagina's) waar `images/logo-nav.png` voorkomt.

De originele aangeleverde `logo.png` (met witte achtergrond) stond in de
hoofdmap; de witte achtergrond is eraf gehaald zodat het logo goed op de
donkere navigatiebalk staat. Dat originele bestand kun je verwijderen zodra
je tevreden bent met het resultaat, of laten staan als back-up.

Het favicon (het icoontje in het browsertabblad) is op dezelfde manier van
het logo gemaakt: `favicon.ico`, `images/favicon-16.png`,
`images/favicon-32.png`, `apple-touch-icon.png` (voor het beginscherm op
iPhone/iPad) en `images/icon-512.png` (voor Android/PWA). Wil je die
opnieuw genereren vanaf een ander logo, vervang dan `images/logo-master.png`
en genereer de afgeleide formaten opnieuw (16/32/48/180/512px, gecentreerd
op een vierkant canvas).

## Foto's vervangen

Alle foto's zijn tijdelijke plaatsvervangers via picsum.photos (willekeurige
stockfoto's, geen echte bouwfoto's). Zoek per pagina naar `picsum.photos` en
vervang de `src` door je eigen foto's:

- **`index.html`**: hero-achtergrond (1920×1280 of groter) en de teamfoto bij
  "Over ons" (verhouding 3:4, vervang ook de tekst `[Foto team — plaats...]`
  eronder door een echte foto van jullie samen op de klus).
- **`diensten/index.html`**: paginabanner bovenaan, 9 dienst-foto's
  (verhouding 4:3) en de foto bij "Waarom kiezen voor ons" (verhouding 4:5).
- **`projecten/index.html`**: paginabanner bovenaan en de 12 projectfoto's in
  de galerij — dit zijn de belangrijkste om te vervangen door echt werk,
  verdeeld over de categorieën Schilderwerk, Renovatie, Sloopwerk,
  Gipsplaten, Isolatie, Restauratie (`data-category` op elk `.gallery-item`).
- **`offerte/index.html`**: paginabanner bovenaan.

Gebruik voor de beste kwaliteit foto's van minimaal 1200px breed, in JPG.

## Werkgebied / regio's

De regio-chips in de sectie "Werkgebied" worden automatisch gegenereerd uit
`BUSINESS.regions` in `js/business-config.js`. Vervang de voorbeeldwaarden
(`"[Regio 1]"`, `"[Regio 2]"`, ...) door je eigen steden/regio's.

## Het offerteformulier

Het formulier valideert de invoer in de browser en opent daarna een
kant-en-klare e-mail (`mailto:`) met de ingevulde gegevens, zodat de site
zonder server/backend al bruikbaar is. Belangrijk: **mailto: kan geen
bijlagen versturen**, dus de geüploade foto's worden nu alleen als voorbeeld
getoond in het formulier, niet automatisch meegestuurd.

Voor een professionelere oplossing die ook echt e-mails verstuurt (met
foto's) raden we aan het formulier te koppelen aan een service als
[Formspree](https://formspree.io) of [Netlify Forms](https://www.netlify.com/platform/core/forms/),
of aan een eigen backend-endpoint. De relevante code staat in
[js/main.js](js/main.js), functie `initForm()` — de `TODO`-comment daar
wijst de plek aan.

## Talen (NL / EN / RU)

Alle vertalingen staan in **[js/i18n.js](js/i18n.js)**, per taal in een eigen
blok (`nl`, `en`, `ru`). Nieuwe of aangepaste tekst pas je daar aan op de
bijbehorende sleutel (bijvoorbeeld `"hero.title"`). De HTML zelf hoeft niet
aangepast te worden zolang je de bestaande `data-i18n="..."` sleutels
gebruikt.

## Structuur

```
index.html              Home: Hero, Werkgebied, Over ons
diensten/index.html      Diensten + Waarom kiezen voor ons
projecten/index.html      Projectengalerij met filters + lightbox
offerte/index.html         Zo werken wij + offerteformulier
404.html                    Pagina-niet-gevonden
css/
  tokens.css             Design tokens (kleuren, type, radius, motion)
  style.css               Layout en componenten
  fonts.css                Zelf-gehoste @font-face's
fonts/                   Archivo + JetBrains Mono (woff2, zelf gehost)
js/
  business-config.js      ÉÉN plek voor alle bedrijfsgegevens
  i18n.js                  Vertalingen NL / EN / RU
  main.js                   Navigatie, taalwisselaar, galerij, formulier, animaties
favicon.svg, site.webmanifest, robots.txt, sitemap.xml
DESIGN.md                Vastgelegd visueel systeem van deze build
```

Elke pagina heeft dezelfde navigatiebalk, footer en icon-sprite hardcoded in
de HTML (geen gedeelde template-engine op een statische site). Pas je de
navigatie of footer aan? Doe het dan identiek in alle vijf de bestanden
hierboven.

### 404-pagina activeren op je host

`404.html` staat klaar in de hoofdmap, maar elke host pikt "toon deze pagina
bij een onbestaande URL" anders op:

- **Netlify / GitHub Pages / Cloudflare Pages**: werkt automatisch, geen
  configuratie nodig.
- **Apache (bijv. gewone cPanel-hosting)**: zet dit in een `.htaccess` in de
  hoofdmap: `ErrorDocument 404 /404.html`
- **Nginx**: voeg in de server-configuratie toe: `error_page 404 /404.html;`

## SEO

- Zoekwoorden (handyman Nederland, allround klusbedrijf, gevel schilderen,
  gevelisolatie, sloopwerk, gipsplaten, kozijnen plaatsen, deuren plaatsen,
  stukadoor, loodgieter, restauratie) zitten natuurlijk verwerkt in de
  Nederlandse teksten, niet opgestapeld.
- `LocalBusiness`/`HomeAndConstructionBusiness` structured data staat al in
  de `<head>` — vul de placeholders in zodra je de echte gegevens hebt.
- Voeg zodra je een domein hebt een echte Open Graph-afbeelding toe
  (`og:image` in `index.html`, bijvoorbeeld 1200×630px) en zet die ook als
  bestand op de server.
