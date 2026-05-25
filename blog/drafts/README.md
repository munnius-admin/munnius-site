# Fila de posts Munnius

Use esta pasta como fila de publicação do blog.

Fluxo recomendado:

1. Crie um arquivo `.md` com data e slug no nome, por exemplo `2026-05-25-checklist-cenarios-teste-ia.md`.
2. Preencha o front matter no topo do arquivo.
3. Revise ou edite o conteúdo se quiser antes da data de publicação.
4. O GitHub Actions roda diariamente e publica o primeiro rascunho agendado com `date` menor ou igual ao dia atual.
5. Se quiser pausar um post específico, use `status: paused` ou `status: skip`.

Campos obrigatórios:

```md
---
title: "Título do post"
shortTitle: "Título curto para redes"
description: "Meta description com até 155 caracteres."
date: 2026-05-25
category: "IA aplicada"
readTime: "9 min"
breadcrumb: "Nome curto"
---
```

O script gera automaticamente:

- HTML do post;
- entrada no `blog/posts.json`;
- entrada no `sitemap.xml`;
- canonical;
- Open Graph;
- Twitter Card;
- JSON-LD `BlogPosting`;
- CTA para contato.
