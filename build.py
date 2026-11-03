#!/usr/bin/env python3
"""
Bouwt de site: Engelse pagina's + geminificeerde bestanden.

BRON (met de hand bewerken, leesbaar):
    src/index.html, src/diensten/, src/projecten/, src/offerte/, src/404.html   (Nederlandse pagina's)
    src/css/*.css, src/js/*.js                                                   (stijlen en scripts)
    js/vendor/three, models/, images/, fonts/                                    (staan al op de juiste plek)
UITVOER (wordt hier gegenereerd en gecommit - NIET met de hand bewerken):
    index.html, diensten/, projecten/, offerte/, 404.html, en/**, css/*.css, js/*.js, sitemap.xml
    Alles is geminificeerd (HTML, CSS, JS), zodat Ctrl+U geen leesbare kopie van de code oplevert.
    De versie-aanduiding ?v=<hash> achter css/js wordt automatisch uit de inhoud berekend.

Wat dit script doet
  * Engelse teksten komen uit src/js/i18n.js (blok `en`); foto-beschrijvingen (alt) uit content/alt-en.json
  * zet <html lang>, <title>, meta description, Open Graph, canonical en hreflang goed
  * herschrijft interne links naar /en/...
  * onderhoudt de taalwisselaar (NL | EN) en het hreflang-blok in de Nederlandse bronpagina's
  * minificeert alles via tools/minify.mjs (Node; eenmalig `npm install` in de map tools/)
  * schrijft sitemap.xml met beide talen

Gebruik:  python build.py     (na ELKE wijziging in src/ of content/)
"""
import hashlib
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = "https://klusarts.nl"
NAME = "KlusArts Klusbedrijf"

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


SRC = "src"


def read(rel):
    with open(os.path.join(ROOT, rel), encoding="utf-8") as f:
        return f.read()


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def load_i18n():
    """Leest de blokken nl/en uit js/i18n.js (regels van de vorm  "sleutel": "tekst",)."""
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
EN = I18N["en"]


def en_title(page):
    return EN["meta.title." + page].replace("[Bedrijfsnaam]", NAME).replace("[Company Name]", NAME)


def en_desc(page):
    return EN["meta.description." + page].replace("[Bedrijfsnaam]", NAME).replace("[Company Name]", NAME)


def esc(s):
    return html.escape(s, quote=False)


def attr(s):
    return html.escape(s, quote=True)


# ---------------------------------------------------------------- taalwisselaar + hreflang
LANG_RE = re.compile(r'<div class="lang( lang--wide)?" role="group" aria-label="[^"]*">.*?</div>', re.S)


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


HREFLANG_RE = re.compile(r"<!-- hreflang -->.*?<!-- /hreflang -->", re.S)


def sync_dutch_page(rel, nl_path, text):
    """Houdt taalwisselaar en hreflang van de Nederlandse bron actueel."""
    text = LANG_RE.sub(lambda m: lang_switch(m.group(1) or "", nl_path, "nl", "Taal"), text)
    if nl_path is not None and HREFLANG_RE.search(text):
        text = HREFLANG_RE.sub(lambda m: hreflang_block(nl_path), text)
    elif nl_path is not None:
        text = re.sub(r'(<link rel="canonical" href="[^"]*">)', lambda m: m.group(1) + "\n" + hreflang_block(nl_path), text, count=1)
    return text


# ---------------------------------------------------------------- Engelse pagina
def tag_sub(text, fn):
    return re.sub(r"<[a-zA-Z][^<>]*>", fn, text)


def set_attr(tag, name, value):
    new = f'{name}="{attr(value)}"'
    if re.search(rf'\s{name}="[^"]*"', tag):
        return re.sub(rf'(\s){name}="[^"]*"', lambda m: m.group(1) + new, tag, count=1)
    return tag[:-1] + " " + new + ">"


def build_english(src_text, nl_path, page):
    t = src_text
    # taalwisselaars tijdelijk vervangen, zodat ze niet door de link-herschrijving gaan
    switches = []
    def stash(m):
        switches.append(m.group(1) or "")
        return f"@@LANG{len(switches) - 1}@@"
    t = LANG_RE.sub(stash, t)
    t = HREFLANG_RE.sub("@@HREFLANG@@", t)

    t = t.replace('<html lang="nl">', '<html lang="en">', 1)

    # <head>
    en_path = "/en" + nl_path
    t = re.sub(r"<title>.*?</title>", lambda m: f"<title>{esc(en_title(page))}</title>", t, count=1, flags=re.S)
    t = re.sub(r'(<meta name="description" content=")[^"]*"', lambda m: m.group(1) + attr(en_desc(page)) + '"', t, count=1)
    t = re.sub(r'(<meta property="og:title" content=")[^"]*"', lambda m: m.group(1) + attr(en_title(page)) + '"', t, count=1)
    t = re.sub(r'(<meta property="og:description" content=")[^"]*"', lambda m: m.group(1) + attr(en_desc(page)) + '"', t, count=1)
    t = re.sub(r'(<meta property="og:url" content=")[^"]*"', lambda m: m.group(1) + SITE + en_path + '"', t, count=1)
    t = re.sub(r'(<meta property="og:locale" content=")[^"]*"', lambda m: m.group(1) + 'en_GB"', t, count=1)
    t = re.sub(r'(<link rel="canonical" href=")[^"]*"', lambda m: m.group(1) + SITE + en_path + '"', t, count=1)
    # JSON-LD (alleen op de homepage)
    t = re.sub(r'("description": ")[^"]*"', lambda m: m.group(1) + json.dumps(en_desc(page), ensure_ascii=False)[1:-1] + '"', t, count=1)
    t = t.replace(f'"url": "{SITE}/"', f'"url": "{SITE}/en/",\n  "inLanguage": "en"', 1)

    # interne links naar /en/...
    t = re.sub(r'href="/(?=(?:diensten|projecten|offerte)/)', 'href="/en/', t)
    t = t.replace('href="/"', 'href="/en/"')

    # teksten uit i18n.js
    missing = set()

    def text_sub(m):
        open_tag, name, key, inner, close = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        if key not in EN:
            missing.add(key)
            return m.group(0)
        return open_tag + esc(EN[key]) + close

    t = re.sub(r'(<(\w+)\b[^<>]*\bdata-i18n="([^"]+)"[^<>]*>)([^<]*)(</\2>)', text_sub, t)

    def attr_sub(m):
        tag = m.group(0)
        for data, target in (("data-i18n-placeholder", "placeholder"), ("data-i18n-aria", "aria-label"), ("data-i18n-alt", "alt")):
            mm = re.search(rf'\b{data}="([^"]+)"', tag)
            if mm:
                if mm.group(1) in EN:
                    tag = set_attr(tag, target, EN[mm.group(1)])
                else:
                    missing.add(mm.group(1))
        # vaste (niet-vertaalde) foto-beschrijvingen en aria-labels
        am = re.search(r'\balt="([^"]+)"', tag)
        if am:
            raw = html.unescape(am.group(1))
            if raw in ALT_EN:
                tag = set_attr(tag, "alt", ALT_EN[raw])
        lm = re.search(r'\baria-label="([^"]+)"', tag)
        if lm and lm.group(1) in ARIA_EN and "data-i18n-aria" not in tag:
            tag = set_attr(tag, "aria-label", ARIA_EN[lm.group(1)])
        return tag

    t = re.sub(r"<img\b[^<>]*>|<[a-zA-Z][^<>]*\bdata-i18n-(?:placeholder|aria|alt)=[^<>]*>|<[a-zA-Z][^<>]*\baria-label=[^<>]*>", attr_sub, t)

    # taalwisselaar en hreflang terugzetten
    for i, extra in enumerate(switches):
        t = t.replace(f"@@LANG{i}@@", lang_switch(extra, nl_path, "en", "Language"))
    t = t.replace("@@HREFLANG@@", hreflang_block(nl_path))

    if missing:
        raise SystemExit(f"Ontbrekende Engelse sleutels voor {nl_path}: {sorted(missing)}")
    return t


def sitemap():
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for nl_path, _, _, freq, prio in PAGES:
        en_path = "/en" + nl_path
        for p in (nl_path, en_path):
            lines += [
                "  <url>",
                f"    <loc>{SITE}{p}</loc>",
                f'    <xhtml:link rel="alternate" hreflang="nl" href="{SITE}{nl_path}"/>',
                f'    <xhtml:link rel="alternate" hreflang="en" href="{SITE}{en_path}"/>',
                f"    <changefreq>{freq}</changefreq>",
                f"    <priority>{prio}</priority>",
                "  </url>",
            ]
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


def sha8(path):
    with open(path, "rb") as f:
        return hashlib.sha1(f.read()).hexdigest()[:8]


def run_minify(jobs):
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


def main():
    # 1. bronpagina's bijwerken (wisselaar, hreflang) en Engelse varianten maken
    pages = {}  # uitvoerpad -> html (nog niet geminificeerd)
    for nl_path, rel, page, _, _ in PAGES:
        nl_text = sync_dutch_page(rel, nl_path, read(f"{SRC}/{rel}"))
        write(f"{SRC}/{rel}", nl_text)
        pages[rel] = nl_text
        pages["en/" + rel] = build_english(nl_text, nl_path, page)
    nf = read(f"{SRC}/404.html")
    nf = LANG_RE.sub(lambda m: lang_switch(m.group(1) or "", "/", "nl", "Taal"), nf)
    write(f"{SRC}/404.html", nf)
    pages["404.html"] = nf

    # 2. css/js minificeren en een inhoudshash als versie bepalen
    run_minify([{"type": "css" if a.endswith(".css") else "js", "in": os.path.join(ROOT, SRC, a), "out": os.path.join(ROOT, a)} for a in ASSETS])
    version = {"/" + a: sha8(os.path.join(ROOT, a)) for a in ASSETS}

    def stamp(text):
        def sub(m):
            url = m.group(2)
            return f'{m.group(1)}{url}?v={version[url]}"' if url in version else m.group(0)
        return re.sub(r'((?:href|src)=")(/(?:css|js)/[\w.-]+)(?:\?v=\w+)?"', sub, text)

    # 3. pagina's minificeren
    tmp = tempfile.mkdtemp(prefix="klusarts-")
    jobs = []
    try:
        for out_rel, text in pages.items():
            tmp_file = os.path.join(tmp, out_rel.replace("/", "__"))
            with open(tmp_file, "w", encoding="utf-8", newline="\n") as f:
                f.write(stamp(text))
            jobs.append({"type": "html", "in": tmp_file, "out": os.path.join(ROOT, out_rel)})
        run_minify(jobs)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    write("sitemap.xml", sitemap())
    for out_rel in pages:
        print("ok", out_rel)
    print("ok css/js (versie-hash:", ", ".join(f"{k.split('/')[-1]}={v}" for k, v in version.items()) + ")")


if __name__ == "__main__":
    main()
