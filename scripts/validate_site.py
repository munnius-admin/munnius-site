from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MOJIBAKE = re.compile(
    "\u00c3|\u00c2|\u00e2\u20ac\u00a2|\u00e2\u2020|\u00e2\u0153|"
    "\u00e2\u20ac|\u00e2\u0152|\ufffd|gest\\?o|diagn\\?stico|Servi\\?os|"
    "implanta\\?\\?|implanta o|automa o|Gest\\?o|mudan\\?a"
)


class PageAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self.in_title = False
        self.h1 = 0
        self.meta: dict[str, str] = {}
        self.links: list[dict[str, str]] = []
        self.missing_alt: list[str] = []
        self.jsonld: list[str] = []
        self.in_jsonld = False
        self.buffer: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = {k: v or "" for k, v in attrs}
        if tag == "title":
            self.in_title = True
        if tag == "h1":
            self.h1 += 1
        if tag == "meta":
            key = data.get("name") or data.get("property")
            if key:
                self.meta[key] = data.get("content", "")
        if tag == "link":
            self.links.append(data)
        if tag == "img" and not data.get("alt") and data.get("aria-hidden") != "true":
            self.missing_alt.append(data.get("src", ""))
        if tag == "script" and data.get("type") == "application/ld+json":
            self.in_jsonld = True
            self.buffer = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False
        if tag == "script" and self.in_jsonld:
            self.in_jsonld = False
            self.jsonld.append("".join(self.buffer))

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title += data
        if self.in_jsonld:
            self.buffer.append(data)


def html_pages() -> list[Path]:
    return [
        ROOT / "index.html",
        ROOT / "sobre.html",
        ROOT / "servicos.html",
        ROOT / "contato.html",
        ROOT / "blog" / "index.html",
    ] + [
        path
        for path in sorted((ROOT / "blog").glob("*.html"))
        if path.name != "index.html"
    ]


def validate_mojibake() -> list[str]:
    issues: list[str] = []
    for pattern in ["*.html", "*.json", "*.js", "*.css", "*.xml", "*.svg", "*.webmanifest", "*.md"]:
        for path in ROOT.rglob(pattern):
            text = path.read_text(encoding="utf-8")
            for number, line in enumerate(text.splitlines(), start=1):
                if MOJIBAKE.search(line):
                    issues.append(f"{path.relative_to(ROOT)}:{number}: possible mojibake")
    return issues


def validate_pages() -> list[str]:
    issues: list[str] = []
    for page in html_pages():
        audit = PageAudit()
        audit.feed(page.read_text(encoding="utf-8"))
        rel = page.relative_to(ROOT)
        if not audit.title.strip():
            issues.append(f"{rel}: missing title")
        if not audit.meta.get("description"):
            issues.append(f"{rel}: missing meta description")
        if not any(link.get("rel") == "canonical" for link in audit.links):
            issues.append(f"{rel}: missing canonical")
        if not audit.meta.get("og:title") or not audit.meta.get("og:image"):
            issues.append(f"{rel}: missing Open Graph data")
        if audit.h1 != 1:
            issues.append(f"{rel}: expected one h1, found {audit.h1}")
        if audit.missing_alt:
            issues.append(f"{rel}: images missing alt: {', '.join(audit.missing_alt)}")
        if not audit.jsonld:
            issues.append(f"{rel}: missing JSON-LD")
        for block in audit.jsonld:
            try:
                json.loads(block)
            except json.JSONDecodeError as exc:
                issues.append(f"{rel}: invalid JSON-LD: {exc}")
    return issues


def validate_json() -> list[str]:
    issues: list[str] = []
    for path in [ROOT / "blog" / "posts.json", ROOT / "blog" / "editorial-calendar.json", ROOT / "site.webmanifest"]:
        try:
            json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            issues.append(f"{path.relative_to(ROOT)}: invalid JSON: {exc}")
    return issues


def main() -> None:
    issues = validate_mojibake() + validate_pages() + validate_json()
    if issues:
        print("\n".join(issues))
        raise SystemExit(1)
    print("Site validation passed.")


if __name__ == "__main__":
    main()
