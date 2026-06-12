from __future__ import annotations

import argparse
import json
import re
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
POSTS_JSON = ROOT / "blog" / "posts.json"
BRAND_DIR = ROOT / "assets" / "brand"
OUTPUT_DIR = ROOT / "social" / "instagram"
BASE_URL = "https://munnius.com.br"

COLOR_PRIMARY = "#15384A"
COLOR_PRIMARY_DARK = "#0B2530"
COLOR_PRIMARY_SOFT = "#1F4A5D"
COLOR_ACCENT = "#E0B12C"
COLOR_ACCENT_STRONG = "#F2B21D"
COLOR_BG = "#F6F4EF"
COLOR_CARD = "#FBFAF7"
COLOR_MUTED = "#6B7A80"


def load_font(name: str, size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts") / name,
        Path("/usr/share/fonts/truetype/dejavu") / name,
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


FONT_TITLE = load_font("seguisb.ttf", 74)
FONT_TITLE_SMALL = load_font("seguisb.ttf", 62)
FONT_BODY = load_font("segoeui.ttf", 31)
FONT_BODY_BOLD = load_font("seguisb.ttf", 30)
FONT_LABEL = load_font("seguisb.ttf", 24)
FONT_SMALL = load_font("segoeui.ttf", 24)


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE)
    value = re.sub(r"[\s_]+", "-", value).strip("-")
    return value[:90] or "post"


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        if draw.textbbox((0, 0), test, font=font)[2] <= width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_multiline(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    lines: list[str],
    font: ImageFont.ImageFont,
    fill: str,
    spacing: int,
) -> int:
    x, y = xy
    for line in lines:
        draw.text((x, y), line, font=font, fill=fill)
        box = draw.textbbox((x, y), line, font=font)
        y += (box[3] - box[1]) + spacing
    return y


def read_posts(limit: int | None = None) -> list[dict[str, str]]:
    posts = json.loads(POSTS_JSON.read_text(encoding="utf-8"))
    if not isinstance(posts, list):
        raise ValueError("blog/posts.json precisa ser uma lista.")
    return posts[:limit] if limit else posts


def post_url(post: dict[str, str]) -> str:
    return f"{BASE_URL}/blog/{post['slug']}"


def instagram_subtitle(post: dict[str, str]) -> str:
    title = post.get("titulo", "").lower()
    if "cenários de teste" in title or "cenarios de teste" in title:
        return "Use IA para sair do checklist genérico e criar testes mais próximos da operação real."
    if "gestão de projetos" in title or "gestao de projetos" in title:
        return "IA ajuda, mas só vira valor quando contexto, riscos e governança continuam visíveis."
    if "erp" in title:
        return "Antes de escolher ferramenta, entenda o que precisa virar processo, dado e rotina."
    if "agile" in title:
        return "Agilidade boa não é ritual bonito: é decisão rápida, feedback e entrega que anda."
    if "pmo" in title:
        return "PMO leve organiza prioridades, riscos e cadência sem transformar tudo em burocracia."
    if "onboarding" in title:
        return "Menos improviso, mais cadência: onboarding precisa virar jornada, rito e aprendizado."
    if "implantação" in title or "implantacao" in title:
        return "Implantação boa combina método, relacionamento e clareza sobre o próximo passo."
    excerpt = post.get("excerpt", "")
    return excerpt if len(excerpt) <= 130 else f"{excerpt[:127].rstrip()}..."


def render_post_card(post: dict[str, str], output: Path) -> None:
    image = Image.new("RGB", (1080, 1080), COLOR_BG)
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle([54, 54, 1026, 1026], radius=48, fill=COLOR_CARD, outline="#E1DDD3", width=2)
    draw.rounded_rectangle([54, 54, 1026, 232], radius=48, fill=COLOR_PRIMARY)
    draw.rectangle([54, 160, 1026, 232], fill=COLOR_PRIMARY)

    logo = Image.open(BRAND_DIR / "munnius-logo-light.png").convert("RGBA")
    logo.thumbnail((315, 86), Image.Resampling.LANCZOS)
    image.paste(logo, ((1080 - logo.width) // 2, 104), logo)

    category = post.get("categoria", "Blog")
    date = post.get("data", "")
    read_time = post.get("readTime", "")
    meta = " \u2022 ".join(part for part in [category, date, read_time] if part).upper()
    meta_box = draw.textbbox((0, 0), meta, font=FONT_LABEL)
    meta_width = min(800, (meta_box[2] - meta_box[0]) + 58)
    meta_x = (1080 - meta_width) // 2
    draw.rounded_rectangle([meta_x, 292, meta_x + meta_width, 350], radius=29, fill="#FFF4D2", outline="#E6C05A")
    draw.text((meta_x + 29, 310), meta, font=FONT_LABEL, fill=COLOR_PRIMARY)

    title = post.get("titulo", "Novo artigo Munnius")
    title_font = FONT_TITLE if len(title) < 68 else FONT_TITLE_SMALL
    title_lines = wrap_text(draw, title, title_font, 840)[:4]
    y = draw_multiline(draw, (120, 410), title_lines, title_font, COLOR_PRIMARY, 18)

    subtitle = instagram_subtitle(post)
    subtitle_lines = wrap_text(draw, subtitle, FONT_BODY, 800)[:3]
    draw_multiline(draw, (120, y + 42), subtitle_lines, FONT_BODY, COLOR_MUTED, 10)

    draw.line([120, 838, 960, 838], fill="#E7E2D8", width=2)
    footer_label = "IA \u2022 onboarding \u2022 implantação SaaS"
    footer_box = draw.textbbox((0, 0), footer_label, font=FONT_SMALL)
    draw.text(((1080 - (footer_box[2] - footer_box[0])) // 2, 858), footer_label, font=FONT_SMALL, fill=COLOR_PRIMARY_SOFT)

    cta = "Leia no blog Munnius"
    cta_box = draw.textbbox((0, 0), cta, font=FONT_BODY_BOLD)
    cta_width = cta_box[2] - cta_box[0] + 64
    cta_x = 120
    draw.rounded_rectangle([cta_x, 918, cta_x + cta_width, 982], radius=32, fill=COLOR_PRIMARY)
    draw.text((cta_x + 32, 935), cta, font=FONT_BODY_BOLD, fill="#FFFFFF")

    url = "munnius.com.br"
    url_box = draw.textbbox((0, 0), url, font=FONT_BODY_BOLD)
    draw.text((960 - (url_box[2] - url_box[0]), 937), url, font=FONT_BODY_BOLD, fill=COLOR_PRIMARY)

    output.parent.mkdir(parents=True, exist_ok=True)
    image.save(output, "PNG", optimize=True)


def caption_for(post: dict[str, str]) -> str:
    title = post.get("titulo", "")
    excerpt = post.get("excerpt", "")
    url = post_url(post)
    return textwrap.dedent(
        f"""\
        {title}

        {excerpt}

        Artigo completo no blog:
        {url}

        #Munnius #SaaS #Onboarding #ImplantacaoSaaS #AITransformation #GestaoDeProjetos #CustomerSuccess #Automacao
        """
    )


def generate(limit: int | None = None, force: bool = False) -> list[Path]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    created: list[Path] = []
    for post in read_posts(limit=limit):
        base_name = Path(post["slug"]).with_suffix("").name
        image_path = OUTPUT_DIR / f"{base_name}.png"
        caption_path = OUTPUT_DIR / f"{base_name}.md"
        if not force and image_path.exists() and caption_path.exists():
            continue
        render_post_card(post, image_path)
        caption_path.write_text(caption_for(post), encoding="utf-8")
        created.extend([image_path, caption_path])
    return created


def main() -> None:
    parser = argparse.ArgumentParser(description="Gera artes e legendas de Instagram a partir dos posts do blog.")
    parser.add_argument("--limit", type=int, default=None, help="Quantidade de posts mais recentes para gerar.")
    parser.add_argument("--force", action="store_true", help="Regenera artes e legendas mesmo quando os arquivos ja existem.")
    args = parser.parse_args()
    files = generate(limit=args.limit, force=args.force)
    print(f"Generated {len(files)} files in {OUTPUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
