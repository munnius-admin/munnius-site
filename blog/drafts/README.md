# Fila de posts Munnius

Esta pasta é a fila editorial do blog. O GitHub Actions roda todos os dias e publica o primeiro rascunho com `date` menor ou igual ao dia atual.

## Cadência atual

- 1 post publicado manualmente no início da série.
- 30 posts programados de 2 em 2 dias.
- A série atual começa em `2026-07-06`.

## Como adicionar um post

Crie um arquivo `.md` com data e slug no nome:

```md
2026-07-08-roadmap-ia-saas-90-dias.md
```

Use este front matter:

```md
---
title: "Título do post"
shortTitle: "Título curto"
description: "Meta description com até 155 caracteres."
date: 2026-07-08
category: "AI Transformation"
readTime: "11 min"
breadcrumb: "Nome curto"
---
```

## O que o script publica

O `scripts/publish_blog_post.py` gera automaticamente:

- HTML do post;
- entrada no `blog/posts.json`;
- entrada no `sitemap.xml`;
- canonical;
- Open Graph;
- Twitter Card;
- JSON-LD `BlogPosting`;
- CTA para contato.

Para pausar um post específico, use `status: paused` ou `status: skip` no front matter.
