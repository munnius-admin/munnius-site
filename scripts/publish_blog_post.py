from __future__ import annotations

import argparse
import html
import json
import re
from datetime import date, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BLOG_DIR = ROOT / "blog"
DRAFTS_DIR = BLOG_DIR / "drafts"
POSTS_JSON = BLOG_DIR / "posts.json"
SITEMAP = ROOT / "sitemap.xml"
BASE_URL = "https://munnius.com.br"

MONTHS = {
    1: "Jan",
    2: "Fev",
    3: "Mar",
    4: "Abr",
    5: "Mai",
    6: "Jun",
    7: "Jul",
    8: "Ago",
    9: "Set",
    10: "Out",
    11: "Nov",
    12: "Dez",
}


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---\n"):
        raise ValueError("Draft must start with YAML-like front matter delimited by ---")
    _, raw_meta, body = text.split("---", 2)
    meta: dict[str, str] = {}
    for line in raw_meta.splitlines():
        if not line.strip() or ":" not in line:
            continue
        key, value = line.split(":", 1)
        meta[key.strip()] = value.strip().strip('"')
    return meta, body.strip()


def inline_markup(value: str) -> str:
    escaped = html.escape(value)
    return re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)


def markdown_to_html(markdown: str) -> str:
    lines = markdown.splitlines()
    chunks: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if not line:
            i += 1
            continue
        if line.startswith("## "):
            chunks.append(f"<h2>{inline_markup(line[3:].strip())}</h2>")
            i += 1
            continue
        if line.startswith("### "):
            chunks.append(f"<h3>{inline_markup(line[4:].strip())}</h3>")
            i += 1
            continue
        if line.startswith("> "):
            parts = []
            while i < len(lines) and lines[i].startswith("> "):
                parts.append(lines[i][2:].strip())
                i += 1
            chunks.append(f"<blockquote>{inline_markup(' '.join(parts))}</blockquote>")
            continue
        if line.startswith("- "):
            items = []
            while i < len(lines) and lines[i].startswith("- "):
                items.append(f"<li>{inline_markup(lines[i][2:].strip())}</li>")
                i += 1
            chunks.append("<ul>" + "".join(items) + "</ul>")
            continue
        if re.match(r"^\d+\.\s+", line):
            items = []
            while i < len(lines) and re.match(r"^\d+\.\s+", lines[i]):
                item = re.sub(r"^\d+\.\s+", "", lines[i]).strip()
                items.append(f"<li>{inline_markup(item)}</li>")
                i += 1
            chunks.append("<ol>" + "".join(items) + "</ol>")
            continue

        parts = [line.strip()]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(r"^(## |### |> |- |\d+\.\s+)", lines[i]):
            parts.append(lines[i].strip())
            i += 1
        chunks.append(f"<p>{inline_markup(' '.join(parts))}</p>")
    return "\n      ".join(chunks)


def display_date(iso_date: str) -> str:
    parsed = datetime.strptime(iso_date, "%Y-%m-%d").date()
    return f"{parsed.day:02d} {MONTHS[parsed.month]} {parsed.year}"


def post_template(meta: dict[str, str], body_html: str, slug: str, related: list[dict[str, str]]) -> str:
    title = meta["title"]
    description = meta["description"]
    category = meta.get("category", "Insights")
    published = meta["date"]
    read_time = meta.get("readTime", "8 min")
    canonical = f"{BASE_URL}/blog/{slug}"
    breadcrumb = meta.get("breadcrumb", category)
    short_title = meta.get("shortTitle", title)
    json_ld = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "description": description,
        "datePublished": published,
        "dateModified": published,
        "author": {"@type": "Person", "name": "Gabriel Munhoz"},
        "publisher": {"@id": f"{BASE_URL}/#organization"},
        "mainEntityOfPage": canonical,
        "image": f"{BASE_URL}/og-image.png",
        "inLanguage": "pt-BR",
    }
    related_html = "\n".join(
        f'        <article class="blog-card"><span class="blog-cat">Relacionado</span><h4>{html.escape(item["titulo"])}</h4><a href="{html.escape(item["slug"])}" class="blog-link">Ler artigo</a></article>'
        for item in related
    )
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(title)} | Munnius</title>
  <meta name="description" content="{html.escape(description)}" />
  <link rel="canonical" href="{canonical}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:title" content="{html.escape(title)} | Munnius" />
  <meta property="og:description" content="{html.escape(description)}" />
  <meta property="og:image" content="{BASE_URL}/og-image.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{html.escape(short_title)} | Munnius" />
  <meta name="twitter:description" content="{html.escape(description)}" />
  <meta name="twitter:image" content="{BASE_URL}/og-image.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#15384A" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Nunito+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/styles.css" />
  <link rel="stylesheet" href="../assets/mobile-menu.css" />
  <script type="application/ld+json">
{json.dumps(json_ld, ensure_ascii=False, indent=2)}
  </script>
</head>
<body>
<header id="site-header">
  <a href="/index.html" class="header-logo" aria-label="Munnius"><img src="../assets/brand/munnius-logo.png" alt="Munnius" /></a>
  <nav aria-label="Navegação principal"><a href="/sobre.html">Sobre</a><a href="/servicos.html">Serviços</a><a href="/blog/index.html">Blog</a></nav>
  <a href="/contato.html" class="header-cta">Agendar diagnóstico</a>
  <button class="menu-toggle" aria-label="Abrir menu"><span></span><span></span><span></span></button>
</header>

<main>
  <section class="post-hero">
    <div class="container">
      <nav class="breadcrumb"><a href="../index.html">Início</a><span>›</span><a href="index.html">Blog</a><span>›</span><span>{html.escape(breadcrumb)}</span></nav>
      <div class="post-meta-top"><span class="blog-cat">{html.escape(category)}</span><span class="post-data">{display_date(published).lower()}</span><span class="post-leitura">{html.escape(read_time)} de leitura</span></div>
      <h1>{html.escape(title)}</h1>
      <div class="post-autor"><img src="../assets/foto_munhoz.jpg" alt="Gabriel Munhoz" /><div><strong>Gabriel Munhoz</strong><span>Consultor · Munnius</span></div></div>
    </div>
  </section>

  <div class="container post-layout">
    <article class="post-content">
      {body_html}
      <div class="post-cta-inline card-dark"><p>Quer aplicar esse raciocínio na sua operação SaaS?</p><a href="../contato.html" class="btn btn-secondary">Falar com Gabriel</a></div>
    </article>
    <aside class="post-sidebar">
      <div class="card sidebar-card"><img src="../assets/foto_munhoz.jpg" alt="Gabriel Munhoz" class="sidebar-foto" /><strong>Gabriel Munhoz</strong><p>Consultor em AI Transformation, onboarding, implantação e automação para SaaS B2B.</p><a href="../contato.html" class="btn btn-primary" style="width:100%;margin-top:12px;">Agendar diagnóstico</a></div>
    </aside>
  </div>

  <section class="section section-light">
    <div class="container">
      <div class="section-header"><div><p class="eyebrow">Continue lendo</p><h2>Artigos relacionados</h2></div></div>
      <div class="blog-grid">
{related_html}
      </div>
    </div>
  </section>
</main>

<footer id="site-footer">
  <div class="footer-top">
    <div class="footer-brand"><a href="/index.html"><img src="../assets/brand/munnius-logo-light.png" alt="Munnius" /></a><p>AI Transformation para SaaS, Onboarding e Implantação.</p></div>
    <div class="footer-links"><div><strong>Site</strong><a href="/sobre.html">Sobre</a><a href="/servicos.html">Serviços</a><a href="/blog/index.html">Blog</a><a href="/contato.html">Contato</a></div><div><strong>Contato</strong><a href="mailto:contato@munnius.com.br">contato@munnius.com.br</a><a href="https://linkedin.com/in/grmunhoz" target="_blank" rel="noreferrer">LinkedIn</a><a href="https://youtube.com/@by.munnius" target="_blank" rel="noreferrer">YouTube</a><a href="https://instagram.com/by.munnius" target="_blank" rel="noreferrer">Instagram</a></div></div>
  </div>
  <div class="footer-bottom"><p>© 2026 Munnius Consultoria. Todos os direitos reservados.</p></div>
</footer>
<script src="../assets/mobile-menu.js"></script>
</body>
</html>
"""


def load_posts() -> list[dict[str, str]]:
    if not POSTS_JSON.exists():
        return []
    return json.loads(POSTS_JSON.read_text(encoding="utf-8"))


def sort_posts(posts: list[dict[str, str]]) -> list[dict[str, str]]:
    def key(post: dict[str, str]) -> datetime:
        value = post.get("data", "")
        for month_number, label in MONTHS.items():
            value = value.replace(label, f"{month_number:02d}")
        try:
            return datetime.strptime(value, "%d %m %Y")
        except ValueError:
            return datetime.min

    return sorted(posts, key=key, reverse=True)


def update_posts_json(meta: dict[str, str], slug: str) -> list[dict[str, str]]:
    posts = [p for p in load_posts() if p.get("slug") != slug]
    posts.insert(
        0,
        {
            "titulo": meta["title"],
            "slug": slug,
            "data": display_date(meta["date"]),
            "categoria": meta.get("category", "Insights"),
            "excerpt": meta["description"],
            "readTime": meta.get("readTime", "8 min"),
        },
    )
    posts = sort_posts(posts)
    POSTS_JSON.write_text(json.dumps(posts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return posts


def update_sitemap(posts: list[dict[str, str]]) -> None:
    static = [
        ("/", "2026-05-24", "weekly", "1.0"),
        ("/blog/", date.today().isoformat(), "weekly", "0.9"),
        ("/sobre.html", "2026-05-24", "monthly", "0.8"),
        ("/servicos.html", "2026-05-24", "monthly", "0.9"),
        ("/contato.html", "2026-05-24", "monthly", "0.6"),
    ]
    urls = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for path, lastmod, changefreq, priority in static:
        urls.append(f"  <url>\n    <loc>{BASE_URL}{path}</loc>\n    <lastmod>{lastmod}</lastmod>\n    <changefreq>{changefreq}</changefreq>\n    <priority>{priority}</priority>\n  </url>")
    for post in posts:
        slug = post["slug"]
        lastmod = slug[:10] if re.match(r"^\d{4}-\d{2}-\d{2}", slug) else date.today().isoformat()
        urls.append(f"  <url>\n    <loc>{BASE_URL}/blog/{slug}</loc>\n    <lastmod>{lastmod}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.85</priority>\n  </url>")
    urls.append("</urlset>\n")
    SITEMAP.write_text("\n".join(urls), encoding="utf-8")


def publish_next(target_date: date, dry_run: bool = False) -> str:
    candidates = []
    for path in sorted(DRAFTS_DIR.glob("*.md")):
        text = path.read_text(encoding="utf-8")
        if not text.startswith("---\n"):
            continue
        meta, body = parse_frontmatter(text)
        if meta.get("status", "").lower() in {"skip", "paused"}:
            continue
        publish_date = datetime.strptime(meta["date"], "%Y-%m-%d").date()
        if publish_date <= target_date:
            candidates.append((publish_date, path, meta, body))
    if not candidates:
        return "No scheduled draft ready to publish."
    _, path, meta, body = candidates[0]
    slug = path.with_suffix(".html").name
    output = BLOG_DIR / slug
    posts_before = load_posts()
    related = [p for p in posts_before if p.get("slug") != slug][:2]
    html_body = markdown_to_html(body)
    rendered = post_template(meta, html_body, slug, related)
    if dry_run:
        return f"Dry run: would publish {slug}"
    output.write_text(rendered, encoding="utf-8")
    posts = update_posts_json(meta, slug)
    update_sitemap(posts)
    path.rename(path.with_suffix(".published.md"))
    return f"Published {slug}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Publish the next scheduled Munnius blog draft.")
    parser.add_argument("--date", default=date.today().isoformat(), help="Publishing date in YYYY-MM-DD format.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    target = datetime.strptime(args.date, "%Y-%m-%d").date()
    print(publish_next(target, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
