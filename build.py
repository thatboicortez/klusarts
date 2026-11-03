#!/usr/bin/env python3
"""
Bouwt de site: Engelse pagina's, dienstenpagina's, SEO-markup en geminificeerde bestanden.

BRON (met de hand bewerken, leesbaar):
    src/index.html, src/diensten/, src/projecten/, src/offerte/, src/404.html   Nederlandse pagina's
    src/css/*.css, src/js/*.js                                                   stijlen en scripts
    content/services.json                                                        teksten van de dienstenpagina's (NL + EN)
    content/alt-en.json                                                          Engelse foto-beschrijvingen
    js/vendor/three, models/, images/, fonts/                                    (staan al op de juiste plek)
UITVOER (wordt hier gegenereerd en gecommit - NIET met de hand bewerken):
    index.html, diensten/** (ook /diensten/<dienst>/), projecten/, offerte/, 404.html, en/**,
    css/*.css, js/*.js, sitemap.xml
    Alles is geminificeerd (HTML, CSS, JS), zodat Ctrl+U geen leesbare kopie van de code oplevert.
    De versie-aanduiding ?v=<hash> achter css/js wordt automatisch uit de inhoud berekend.

Wat dit script doet
  * zet de teksten van data-i18n-elementen en de <title>/meta uit src/js/i18n.js (NL en EN) in de HTML,
    zodat zoekmachines de juiste, vaste tekst per taal zien
  * maakt de Engelse pagina's (/en/...) en 11 dienstenpagina's per taal (/diensten/<dienst>/)
  * SEO: canonical, hreflang, Open Graph, Twitter, robots, geo-meta en JSON-LD (LocalBusiness, Service,
    FAQPage, BreadcrumbList, ItemList, CollectionPage, ContactPage)
  * onderhoudt de taalwisselaar (NL | EN) en het hreflang-blok in de Nederlandse bronpagina's
  * minificeert alles via tools/minify.mjs (Node; eenmalig `npm install` in de map tools/)
  * schrijft sitemap.xml (beide talen, met hreflang, lastmod en foto's)

Gebruik:  python build.py     (na ELKE wijziging in src/ of content/)
"""
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import tempfile
import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = "src"
SITE = "https://klusarts.nl"
NAME = "KlusArts Klusbedrijf"
BIZ_ID = SITE + "/#business"

# pad (zonder /en) -> (bestand relatief aan src/ en aan de uitvoer, data-page, changefreq, priority)
PAGES = [
    ("/", "index.html", "home", "monthly", "1.0"),
    ("/diensten/", "diensten/index.html", "diensten", "monthly", "0.9"),
    ("/projecten/", "projecten/index.html", "projecten", "weekly", "0.9"),
    ("/offerte/", "offerte/index.html", "offerte", "monthly", "0.9"),
]

# Scripts en stijlen die geminificeerd worden: bron (src/...) -> uitvoer (zelfde pad in de root)
ASSETS = ["css/fonts.css", "css/style.css", "js/business-config.js", "js/i18n.js", "js/main.js", "js/cube.js"]

ARIA_EN = {
    "Hoofdnavigatie": "Main navigation",
    "Mobiele navigatie": "Mobile navigation",
    "Taal": "Language",
    "Filter projecten": "Filter projects",
    "Projectfoto's": "Project photos",
}


# ---------------------------------------------------------------- bestanden
def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def esc(s):
    return html.escape(s, quote=False)


def attr(s):
    return html.escape(s, quote=True)


# ---------------------------------------------------------------- gegevens
def load_i18n():
    """Leest de blokken nl/en uit src/js/i18n.js (regels van de vorm  "sleutel": "tekst",)."""
    src = read("src/js/i18n.js")
    out = {}
    blocks = list(re.finditer(r"^  (nl|en): \{$", src, re.M))
    for i, m in enumerate(blocks):
        end = blocks[i + 1].start() if i + 1 < len(blocks) else len(src)
        d = {}
        for line in re.finditer(r'^\s+"([^"]+)":\s*(".*"),?\s*$', src[m.end():end], re.M):
            d[line.group(1)] = json.loads(line.group(2))
        out[m.group(1)] = d
    return out


I18N = load_i18n()
ALT_EN = json.load(open(os.path.join(ROOT, "content", "alt-en.json"), encoding="utf-8"))
SERVICES = json.load(open(os.path.join(ROOT, "content", "services.json"), encoding="utf-8"))["services"]


def load_business():
    src = read("src/js/business-config.js")
    b = {m.group(1): m.group(2) for m in re.finditer(r'^\s+(\w+):\s*"([^"]*)"', src, re.M)}
    m = re.search(r"regions:\s*\[([^\]]*)\]", src)
    b["regions"] = re.findall(r'"([^"]+)"', m.group(1)) if m else []
    return b


BUSINESS = load_business()
CITIES = BUSINESS["regions"]


def tr(lang, key):
    d = I18N[lang]
    return d[key] if key in d else I18N["nl"][key]


def with_name(s):
    return s.replace("[Bedrijfsnaam]", NAME).replace("[Company Name]", NAME)


def parse_gallery():
    """Categorie -> lijst (bestandsnaam, NL-alt) uit de Nederlandse projectenpagina."""
    h = read("src/projecten/index.html")
    cats = {}
    alt_of = {}
    for m in re.finditer(r'<(?:div class="g-item g-item--pair"|button type="button" class="g-item") data-category="([a-z]+)">(.*?)(?=<div class="g-item|<button type="button" class="g-item"|\n    </div>\n  </div>\n</section>)', h, re.S):
        for im in re.finditer(r'<img src="/images/projecten/thumbs/([^"]+)\.jpg"[^>]*? alt="([^"]*)"', m.group(2)):
            cats.setdefault(m.group(1), []).append((im.group(1), html.unescape(im.group(2))))
            alt_of[im.group(1)] = html.unescape(im.group(2))
    return cats, alt_of


# ---------------------------------------------------------------- taalwisselaar + hreflang
LANG_RE = re.compile(r'<div class="lang( lang--wide)?" role="group" aria-label="[^"]*">.*?</div>', re.S)
HREFLANG_RE = re.compile(r"<!-- hreflang -->.*?<!-- /hreflang -->", re.S)


def lang_switch(extra, nl_path, active, label):
    en_path = "/en" + nl_path
    cls = "lang" + extra

    def a(code, href, name):
        on = ' class="is-active" aria-current="true"' if code == active else ""
        return f'<a href="{href}" data-lang="{code}" hreflang="{code}" lang="{code}"{on}>{name}</a>'
    return (f'<div class="{cls}" role="group" aria-label="{label}">\n        '
            f'{a("nl", nl_path, "NL")}\n        {a("en", en_path, "EN")}\n      </div>')


def hreflang_block(nl_path):
    en_path = "/en" + nl_path
    return ("<!-- hreflang -->\n"
            f'<link rel="alternate" hreflang="nl" href="{SITE}{nl_path}">\n'
            f'<link rel="alternate" hreflang="en" href="{SITE}{en_path}">\n'
            f'<link rel="alternate" hreflang="x-default" href="{SITE}{nl_path}">\n'
            "<!-- /hreflang -->")


def sync_switch_and_hreflang(text, nl_path):
    text = LANG_RE.sub(lambda m: lang_switch(m.group(1) or "", nl_path, "nl", "Taal"), text)
    if HREFLANG_RE.search(text):
        text = HREFLANG_RE.sub(lambda m: hreflang_block(nl_path), text)
    else:
        text = re.sub(r'(<link rel="canonical" href="[^"]*">)', lambda m: m.group(1) + "\n" + hreflang_block(nl_path), text, count=1)
    return text


# ---------------------------------------------------------------- tekst per taal
def tag_attr_set(tag, name, value):
    new = f'{name}="{attr(value)}"'
    if re.search(rf'\s{name}="[^"]*"', tag):
        return re.sub(rf'(\s){name}="[^"]*"', lambda m: m.group(1) + new, tag, count=1)
    return tag[:-1] + " " + new + ">"


def set_head(text, title=None, desc=None, url=None, locale=None):
    if title is not None:
        text = re.sub(r"<title>.*?</title>", lambda m: f"<title>{esc(title)}</title>", text, count=1, flags=re.S)
        text = re.sub(r'(<meta property="og:title" content=")[^"]*"', lambda m: m.group(1) + attr(title) + '"', text, count=1)
    if desc is not None:
        text = re.sub(r'(<meta name="description" content=")[^"]*"', lambda m: m.group(1) + attr(desc) + '"', text, count=1)
        text = re.sub(r'(<meta property="og:description" content=")[^"]*"', lambda m: m.group(1) + attr(desc) + '"', text, count=1)
    if url is not None:
        text = re.sub(r'(<meta property="og:url" content=")[^"]*"', lambda m: m.group(1) + url + '"', text, count=1)
        text = re.sub(r'(<link rel="canonical" href=")[^"]*"', lambda m: m.group(1) + url + '"', text, count=1)
    if locale is not None:
        text = re.sub(r'(<meta property="og:locale" content=")[^"]*"', lambda m: m.group(1) + locale + '"', text, count=1)
    return text


def localize(text, lang, page_key=None, nl_path=None, title=None, desc=None):
    """Zet alle data-i18n-teksten in `lang` en (voor EN) links, canonical en hreflang goed.
    Titel/description komen uit i18n (`meta.*.<page_key>`) tenzij `title`/`desc` zijn meegegeven."""
    d = I18N[lang]
    switches = []

    def stash(m):
        switches.append(m.group(1) or "")
        return f"@@LANG{len(switches) - 1}@@"
    text = LANG_RE.sub(stash, text)
    text = HREFLANG_RE.sub("@@HREFLANG@@", text)

    if lang == "en":
        text = text.replace('<html lang="nl">', '<html lang="en">', 1)
        text = re.sub(r'href="/(?=(?:diensten|projecten|offerte)/)', 'href="/en/', text)
        text = text.replace('href="/"', 'href="/en/"')

    if page_key:
        t = title if title is not None else with_name(d["meta.title." + page_key])
        de = desc if desc is not None else with_name(d["meta.description." + page_key])
        url = SITE + (("/en" if lang == "en" else "") + nl_path) if nl_path else None
        text = set_head(text, t, de, url, "en_GB" if lang == "en" else "nl_NL")

    missing = set()

    def text_sub(m):
        key = m.group(3)
        if key not in d:
            missing.add(key)
            return m.group(0)
        return m.group(1) + esc(d[key]) + m.group(5)

    text = re.sub(r'(<(\w+)\b[^<>]*\bdata-i18n="([^"]+)"[^<>]*>)([^<]*)(</\2>)', text_sub, text)

    def attr_sub(m):
        tag = m.group(0)
        for data, target in (("data-i18n-placeholder", "placeholder"), ("data-i18n-aria", "aria-label"), ("data-i18n-alt", "alt")):
            mm = re.search(rf'\b{data}="([^"]+)"', tag)
            if mm:
                if mm.group(1) in d:
                    tag = tag_attr_set(tag, target, d[mm.group(1)])
                else:
                    missing.add(mm.group(1))
        if lang == "en":
            am = re.search(r'(?<![\w-])alt="([^"]+)"', tag)
            if am:
                raw = html.unescape(am.group(1))
                if raw in ALT_EN:
                    tag = tag_attr_set(tag, "alt", ALT_EN[raw])
            lm = re.search(r'\baria-label="([^"]+)"', tag)
            if lm and lm.group(1) in ARIA_EN and "data-i18n-aria" not in tag:
                tag = tag_attr_set(tag, "aria-label", ARIA_EN[lm.group(1)])
        return tag

    text = re.sub(r"<img\b[^<>]*>|<[a-zA-Z][^<>]*\bdata-i18n-(?:placeholder|aria|alt)=[^<>]*>|<[a-zA-Z][^<>]*\baria-label=[^<>]*>", attr_sub, text)

    for i, extra in enumerate(switches):
        text = text.replace(f"@@LANG{i}@@", lang_switch(extra, nl_path or "/", lang, "Language" if lang == "en" else "Taal"))
    text = text.replace("@@HREFLANG@@", hreflang_block(nl_path or "/"))
    if missing:
        raise SystemExit(f"Ontbrekende {lang}-sleutels voor {nl_path}: {sorted(missing)}")
    return text


# ---------------------------------------------------------------- JSON-LD
def abs_url(path, lang):
    return SITE + ("/en" if lang == "en" else "") + path


def business_node(lang):
    services = []
    for s in SERVICES:
        services.append({
            "@type": "Offer",
            "itemOffered": {"@type": "Service", "name": s[lang]["name"], "url": abs_url(f"/diensten/{s['slug']}/", lang)},
        })
    area = [{"@type": "City", "name": c} for c in CITIES] + [{"@type": "AdministrativeArea", "name": "Zeeland"}]
    desc = with_name(tr(lang, "meta.description.home"))
    node = {
        "@type": ["HomeAndConstructionBusiness", "LocalBusiness"],
        "@id": BIZ_ID,
        "name": NAME,
        "alternateName": "KlusArts",
        "url": SITE + "/",
        "description": desc,
        "logo": {"@type": "ImageObject", "url": SITE + "/images/icon-512.png", "width": 512, "height": 512},
        "image": SITE + "/images/og-cover.jpg",
        "telephone": BUSINESS.get("phoneHref", ""),
        "email": BUSINESS.get("email", ""),
        "address": {"@type": "PostalAddress", "addressRegion": "Zeeland", "addressCountry": "NL"},
        "areaServed": area,
        "knowsAbout": [s[lang]["name"] for s in SERVICES],
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "Diensten" if lang == "nl" else "Services", "itemListElement": services},
        "contactPoint": {"@type": "ContactPoint", "contactType": "customer service", "telephone": BUSINESS.get("phoneHref", ""), "email": BUSINESS.get("email", "")},
        "identifier": [
            {"@type": "PropertyValue", "name": "KvK", "value": BUSINESS.get("team1Kvk", "")},
            {"@type": "PropertyValue", "name": "KvK", "value": BUSINESS.get("team2Kvk", "")},
        ],
    }
    return node


def breadcrumb_node(items):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(items)]}


def faq_node(pairs):
    return {"@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in pairs]}


def jsonld(nodes):
    data = {"@context": "https://schema.org", "@graph": nodes}
    return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "</script>"


def home_label(lang):
    return "Home"


def page_graph(kind, lang, path, title, desc, extra=None):
    """Bouwt de JSON-LD-knopen voor een pagina. kind: home|diensten|projecten|offerte|service."""
    url = abs_url(path, lang)
    nodes = [business_node(lang)]
    crumbs = [("Home", abs_url("/", lang))]
    if kind == "home":
        nodes.append({"@type": "WebSite", "@id": SITE + "/#website", "url": SITE + "/", "name": NAME, "inLanguage": lang, "publisher": {"@id": BIZ_ID}})
        faq = [(tr(lang, f"faq.{i}.q"), tr(lang, f"faq.{i}.a")) for i in range(1, 6)]
        nodes.append(faq_node(faq))
        nodes.append({"@type": "WebPage", "@id": url + "#webpage", "url": url, "name": title, "description": desc, "inLanguage": lang, "isPartOf": {"@id": SITE + "/#website"}, "about": {"@id": BIZ_ID}})
        return nodes
    if kind == "diensten":
        crumbs.append((tr(lang, "nav.diensten"), url))
        items = [{"@type": "ListItem", "position": i + 1, "name": s[lang]["name"], "url": abs_url(f"/diensten/{s['slug']}/", lang)} for i, s in enumerate(SERVICES)]
        nodes.append({"@type": "CollectionPage", "@id": url + "#webpage", "url": url, "name": title, "description": desc, "inLanguage": lang, "about": {"@id": BIZ_ID},
                      "mainEntity": {"@type": "ItemList", "itemListElement": items}})
    elif kind == "projecten":
        crumbs.append((tr(lang, "nav.projecten"), url))
        imgs = []
        for name, alt in (extra or [])[:40]:
            imgs.append({"@type": "ImageObject", "contentUrl": f"{SITE}/images/projecten/{name}.jpg", "thumbnailUrl": f"{SITE}/images/projecten/thumbs/{name}.jpg",
                         "caption": ALT_EN.get(alt, alt) if lang == "en" else alt})
        nodes.append({"@type": ["CollectionPage", "ImageGallery"], "@id": url + "#webpage", "url": url, "name": title, "description": desc, "inLanguage": lang,
                      "about": {"@id": BIZ_ID}, "image": imgs})
    elif kind == "offerte":
        crumbs.append((tr(lang, "nav.contact"), url))
        nodes.append({"@type": "ContactPage", "@id": url + "#webpage", "url": url, "name": title, "description": desc, "inLanguage": lang, "about": {"@id": BIZ_ID}})
    elif kind == "service":
        s = extra
        crumbs.append((tr(lang, "nav.diensten"), abs_url("/diensten/", lang)))
        crumbs.append((s[lang]["name"], url))
        nodes.append({
            "@type": "Service", "@id": url + "#service", "name": s[lang]["h1"], "serviceType": s[lang]["name"], "description": desc, "url": url,
            "inLanguage": lang, "provider": {"@id": BIZ_ID},
            "areaServed": [{"@type": "City", "name": c} for c in CITIES] + [{"@type": "AdministrativeArea", "name": "Zeeland"}],
            "image": f"{SITE}/images/projecten/{s['photo']}.jpg",
        })
        nodes.append(faq_node(s[lang]["faq"] + [region_faq(s, lang)]))
    nodes.append(breadcrumb_node(crumbs))
    return nodes


# ---------------------------------------------------------------- head: robots, social, geo
def finalize(text, lang, path, kind, jsonld_nodes, image=None, noindex=False):
    """Voegt SEO-meta en JSON-LD toe aan een afgewerkte pagina (alleen in de uitvoer)."""
    text = re.sub(r'\n?<script type="application/ld\+json">.*?</script>', "", text, flags=re.S)
    title = re.search(r"<title>(.*?)</title>", text, re.S).group(1)
    desc = re.search(r'<meta name="description" content="([^"]*)"', text)
    desc = desc.group(1) if desc else ""
    img_url, img_w, img_h = image or (SITE + "/images/og-cover.jpg", 1200, 630)
    robots = "noindex, follow" if noindex else "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
    text = re.sub(r'<meta name="robots" content="[^"]*">', f'<meta name="robots" content="{robots}">', text, count=1)
    # bestaande og:image verwijderen; wordt hieronder opnieuw gezet
    text = re.sub(r'<meta property="og:image"[^>]*>\n?', "", text)
    text = re.sub(r'<meta name="twitter:card"[^>]*>\n?', "", text)
    other = "nl_NL" if lang == "en" else "en_GB"
    block = [
        f'<meta property="og:image" content="{img_url}">',
        f'<meta property="og:image:width" content="{img_w}">',
        f'<meta property="og:image:height" content="{img_h}">',
        f'<meta property="og:image:alt" content="{attr(NAME)}">',
        f'<meta property="og:locale:alternate" content="{other}">',
        '<meta name="twitter:card" content="summary_large_image">',
        f'<meta name="twitter:title" content="{title}">',
        f'<meta name="twitter:description" content="{desc}">',
        f'<meta name="twitter:image" content="{img_url}">',
        '<meta name="author" content="KlusArts Klusbedrijf">',
        '<meta name="geo.region" content="NL-ZE">',
        '<meta name="geo.placename" content="Zeeland">',
    ]
    if jsonld_nodes:
        block.append(jsonld(jsonld_nodes))
    ins = "\n".join(block) + "\n"
    if "<!-- Favicon -->" in text:
        text = text.replace("<!-- Favicon -->", ins + "<!-- Favicon -->", 1)
    else:
        text = text.replace("</head>", ins + "</head>", 1)
    return text


# ---------------------------------------------------------------- dienstenpagina's
SHARED = {
    "nl": {
        "home": "Home", "approach": "Zo pakken wij het aan", "examples": "Voorbeelden van ons werk", "all_projects": "Alle projecten",
        "process": "Zo werken wij", "faq": "Veelgestelde vragen", "others": "Andere diensten", "quote": "Offerte aanvragen", "area_h": "Werkgebied",
        "region_q": "In welke plaatsen voeren jullie {topic} uit?",
        "region_a": "Wij werken in heel Zeeland, onder andere in {cities}. Woont u elders in Zeeland? Neem gerust contact op.",
        "and": "en", "photo_alt": "{name} in Zeeland",
    },
    "en": {
        "home": "Home", "approach": "How we approach it", "examples": "Examples of our work", "all_projects": "All projects",
        "process": "How we work", "faq": "Frequently asked questions", "others": "Other services", "quote": "Request a quote", "area_h": "Service area",
        "region_q": "Where do you carry out {topic}?",
        "region_a": "We work across Zeeland, including {cities}. Live elsewhere in Zeeland? Feel free to get in touch.",
        "and": "and", "photo_alt": "{name} in Zeeland",
    },
}


def city_list(lang):
    sh = SHARED[lang]
    return ", ".join(CITIES[:-1]) + f" {sh['and']} " + CITIES[-1]


def region_faq(s, lang):
    sh = SHARED[lang]
    return (sh["region_q"].format(topic=s[lang]["topic"]), sh["region_a"].format(cities=city_list(lang)))


def service_main(s, lang, gallery, alt_of):
    sh = SHARED[lang]
    v = s[lang]
    prefix = "/en" if lang == "en" else ""
    p = lambda path: prefix + path

    def photo_alt(name):
        a = alt_of.get(name, "")
        return ALT_EN.get(a, a) if lang == "en" else a

    body = "".join(f"\n        <p>{esc(x)}</p>" for x in v["body"])
    points = "".join(f"\n          <li>{esc(x)}</li>" for x in v["points"])
    crumbs = (f'<a href="{p("/")}">{sh["home"]}</a><span aria-hidden="true">/</span>'
              f'<a href="{p("/diensten/")}">{esc(tr(lang, "nav.diensten"))}</a><span aria-hidden="true">/</span>'
              f'<span aria-current="page">{esc(v["name"])}</span>')
    # voorbeelden: tot 4 foto's uit de passende categorie
    pics = gallery.get(s["category"], [])
    seen = []
    for name, alt in pics:
        if name not in seen:
            seen.append(name)
    tiles = "".join(
        f'\n      <a class="tile" href="{p("/projecten/")}#{s["category"]}"><img src="/images/projecten/thumbs/{n}.jpg" alt="{attr(photo_alt(n))}" width="640" height="853" loading="lazy"></a>'
        for n in seen[:4])
    steps = "".join(
        f'\n      <div class="step"><p class="step-num num">0{i}</p><h3 class="card-title">{esc(tr(lang, f"process.{i}.title"))}</h3><p>{esc(tr(lang, f"process.{i}.desc"))}</p></div>'
        for i in range(1, 5))
    faq_pairs = v["faq"] + [region_faq(s, lang)]
    faq = "".join(
        f'\n      <details class="faq-item"><summary><span>{esc(q)}</span></summary><p>{esc(a)}</p></details>' for q, a in faq_pairs)
    others = "".join(
        f'<a href="{p("/diensten/" + o["slug"] + "/")}">{esc(o[lang]["name"])}</a>' for o in SERVICES if o["key"] != s["key"])
    wa = "WhatsApp"
    tile_sec = ""
    if tiles:
        tile_sec = f'''
<section class="section section--flush-top">
  <div class="container">
    <div class="section-head" data-reveal><h2 class="section-title">{esc(sh["examples"])}</h2></div>
    <div class="tiles" data-stagger>{tiles}
    </div>
    <div class="section-foot" data-reveal><a href="{p("/projecten/")}#{s["category"]}" class="btn btn-border btn-arrow">{esc(sh["all_projects"])}</a></div>
  </div>
</section>
'''
    return f'''<main id="main">

<section class="page-head">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb" data-reveal>{crumbs}</nav>
    <h1 class="page-title" data-reveal>{esc(v["h1"])}</h1>
    <p class="page-sub" data-reveal="80">{esc(v["lead"])}</p>
  </div>
</section>

<section class="section section--flush-top">
  <div class="container sp-grid">
    <div class="sp-text" data-reveal>
      <h2>{esc(sh["approach"])}</h2>{body}
      <h2>{esc(v["points_h"])}</h2>
      <ul class="check-list">{points}
      </ul>
      <div class="sp-actions">
        <a href="{p("/offerte/")}?klus={s["option"]}" class="btn btn-white">{esc(sh["quote"])}</a>
        <a href="#" class="btn btn-dark" data-biz-whatsapp target="_blank" rel="noopener"><svg aria-hidden="true"><use href="#icon-chat"/></svg><span>{wa}</span></a>
      </div>
    </div>
    <div class="sp-photo" data-reveal="100"><img src="/images/projecten/{s["photo"]}.jpg" alt="{attr(photo_alt(s["photo"]) or sh["photo_alt"].format(name=v["name"]))}" width="960" height="1280" loading="eager" decoding="async"></div>
  </div>
</section>
{tile_sec}
<section class="section section--flush-top">
  <div class="container">
    <div class="section-head" data-reveal><h2 class="section-title">{esc(sh["process"])}</h2></div>
    <div class="steps" data-stagger>{steps}
    </div>
  </div>
</section>

<section class="section section--flush-top">
  <div class="container">
    <div class="section-head" data-reveal><h2 class="section-title">{esc(sh["faq"])}</h2></div>
    <div class="faq-list" data-reveal="80">{faq}
    </div>
  </div>
</section>

<section class="section section--flush-top">
  <div class="container">
    <div class="section-head" data-reveal><h2 class="section-title">{esc(sh["others"])}</h2></div>
    <div class="related" data-reveal="80">{others}</div>
  </div>
</section>

</main>'''


# ---------------------------------------------------------------- sitemap
def git_date(*paths):
    best = ""
    for p in paths:
        try:
            r = subprocess.run(["git", "log", "-1", "--format=%cs", "--", p], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
            if r.stdout.strip() > best:
                best = r.stdout.strip()
        except Exception:
            pass
    return best or datetime.date.today().isoformat()


def sitemap(entries, gallery_names):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']
    for nl_path, freq, prio, lastmod, images in entries:
        en_path = "/en" + nl_path
        for p in (nl_path, en_path):
            lines += ["  <url>", f"    <loc>{SITE}{p}</loc>", f"    <lastmod>{lastmod}</lastmod>",
                      f'    <xhtml:link rel="alternate" hreflang="nl" href="{SITE}{nl_path}"/>',
                      f'    <xhtml:link rel="alternate" hreflang="en" href="{SITE}{en_path}"/>',
                      f'    <xhtml:link rel="alternate" hreflang="x-default" href="{SITE}{nl_path}"/>',
                      f"    <changefreq>{freq}</changefreq>", f"    <priority>{prio}</priority>"]
            for n in images:
                lines.append(f"    <image:image><image:loc>{SITE}/images/projecten/{n}.jpg</image:loc></image:image>")
            lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------- minify
def sha8(path):
    with open(path, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()[:8]


def run_minify(jobs):
    import sys
    tools = os.path.join(ROOT, "tools")
    if not os.path.isdir(os.path.join(tools, "node_modules")):
        raise SystemExit("Eenmalig nodig: cd tools && npm install   (daarna opnieuw python build.py)")
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
        json.dump(jobs, f)
        manifest = f.name
    try:
        r = subprocess.run(["node", os.path.join(tools, "minify.mjs"), manifest], cwd=tools, capture_output=True, text=True, encoding="utf-8")
        if r.returncode != 0:
            raise SystemExit("Minificeren mislukt:\n" + r.stdout + r.stderr)
    finally:
        os.unlink(manifest)


# ---------------------------------------------------------------- main
def main():
    gallery, alt_of = parse_gallery()
    all_gallery_imgs = []
    for lst in gallery.values():
        for n, a in lst:
            if (n, a) not in all_gallery_imgs:
                all_gallery_imgs.append((n, a))

    pages = {}      # uitvoerpad -> (html, lang, path, kind, nodes, image, noindex)
    sm_entries = []

    # 1. gewone pagina's: Nederlandse bron bijwerken, NL- en EN-uitvoer maken
    shell_nl = None
    for nl_path, rel, page, freq, prio in PAGES:
        text = sync_switch_and_hreflang(read(f"{SRC}/{rel}"), nl_path)
        text = localize(text, "nl", page, nl_path)
        write(f"{SRC}/{rel}", text)
        if page == "diensten":
            shell_nl = text
        for lang in ("nl", "en"):
            body = text if lang == "nl" else localize(text, "en", page, nl_path)
            t = re.search(r"<title>(.*?)</title>", body, re.S).group(1)
            d = re.search(r'<meta name="description" content="([^"]*)"', body).group(1)
            kind = page
            extra = all_gallery_imgs if page == "projecten" else None
            nodes = page_graph(kind, lang, nl_path, html.unescape(t), html.unescape(d), extra)
            out = rel if lang == "nl" else "en/" + rel
            pages[out] = (body, lang, nl_path if lang == "nl" else "/en" + nl_path, kind, nodes, None, False)
        imgs = [n for n, a in all_gallery_imgs][:30] if page == "projecten" else []
        sm_entries.append((nl_path, freq, prio, git_date(f"{SRC}/{rel}", "src/js/i18n.js"), imgs))

    # 2. dienstenpagina's (NL + EN) uit content/services.json
    svc_date = git_date("content/services.json", f"{SRC}/diensten/index.html")
    for s in SERVICES:
        nl_path = f"/diensten/{s['slug']}/"
        photo = (f"{SITE}/images/projecten/{s['photo']}.jpg", 960, 1280)
        for lang in ("nl", "en"):
            v = s[lang]
            base = re.sub(r"<main id=\"main\">.*?</main>", lambda m: service_main(s, lang, gallery, alt_of), shell_nl, count=1, flags=re.S)
            base = sync_switch_and_hreflang(base, nl_path)
            body = base if lang == "nl" else localize(base, "en", None, nl_path)
            url = abs_url(nl_path, lang)
            body = set_head(body, v["title"], v["desc"], url, "en_GB" if lang == "en" else "nl_NL")
            nodes = page_graph("service", lang, nl_path, v["title"], v["desc"], s)
            out = f"diensten/{s['slug']}/index.html" if lang == "nl" else f"en/diensten/{s['slug']}/index.html"
            pages[out] = (body, lang, ("/en" if lang == "en" else "") + nl_path, "service", nodes, photo, False)
        sm_entries.append((nl_path, "monthly", "0.8", svc_date, []))

    # 3. 404 (één bestand voor beide talen)
    nf = read(f"{SRC}/404.html")
    nf = LANG_RE.sub(lambda m: lang_switch(m.group(1) or "", "/", "nl", "Taal"), nf)
    nf = localize(nf, "nl", None, "/")
    write(f"{SRC}/404.html", nf)
    pages["404.html"] = (nf, "nl", "/404.html", "404", [], None, True)

    # 4. css/js minificeren en een inhoudshash als versie bepalen
    run_minify([{"type": "css" if a.endswith(".css") else "js", "in": os.path.join(ROOT, SRC, a), "out": os.path.join(ROOT, a)} for a in ASSETS])
    version = {"/" + a: sha8(os.path.join(ROOT, a)) for a in ASSETS}

    def stamp(text):
        def sub(m):
            url = m.group(2)
            return f'{m.group(1)}{url}?v={version[url]}"' if url in version else m.group(0)
        return re.sub(r'((?:href|src)=")(/(?:css|js)/[\w.-]+)(?:\?v=\w+)?"', sub, text)

    # 5. SEO-markup toevoegen en pagina's minificeren
    tmp = tempfile.mkdtemp(prefix="klusarts-")
    jobs = []
    try:
        for out_rel, (text, lang, path, kind, nodes, image, noindex) in pages.items():
            text = finalize(text, lang, path, kind, nodes, image, noindex)
            tmp_file = os.path.join(tmp, out_rel.replace("/", "__"))
            with open(tmp_file, "w", encoding="utf-8", newline="\n") as f:
                f.write(stamp(text))
            jobs.append({"type": "html", "in": tmp_file, "out": os.path.join(ROOT, out_rel)})
        run_minify(jobs)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    write("sitemap.xml", sitemap(sm_entries, [n for n, a in all_gallery_imgs]))
    print("pagina's:", len(pages), "| diensten:", len(SERVICES) * 2, "| css/js-versies:", ", ".join(f"{k.split('/')[-1]}={v}" for k, v in version.items()))


if __name__ == "__main__":
    main()
