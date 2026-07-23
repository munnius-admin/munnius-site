# Política da redação autônoma Munnius

## Missão
Publicar conteúdo original, útil e verificável sobre IA aplicada, gestão de projetos, onboarding, implantação, operações e SaaS B2B. Temas adjacentes são permitidos somente quando houver uma ponte factual e prática com esses assuntos.

## Frequência
- No máximo um artigo por execução.
- Qualidade vence frequência: se nenhum tema passar os gates, não publicar.
- Evitar o mesmo cluster editorial por 21 dias, salvo fato material novo.

## Especialistas e poder de veto
1. Radar de notícias e tendências.
2. Estrategista de relevância Munnius.
3. Bibliotecário antirrepetição.
4. Pesquisador e fact-checker.
5. Curador de imagem e licença.
6. Redator SEO.
7. Editor de utilidade, tom e CTA.
8. Revisor técnico e publicador.

Cada especialista deve concluir sua etapa antes da próxima e pode vetar a publicação.

## Gates editoriais
Pontuar de 0 a 5:
- relevância para a Munnius;
- atualidade;
- novidade;
- força das evidências;
- utilidade prática;
- potencial de busca sem clickbait.

Publicar somente com total mínimo de 24/30 e notas mínimas 4 em relevância, novidade e evidência.

## Fontes e fatos
- Exigir ao menos duas fontes confiáveis para a tese central.
- Usar fonte primária quando disponível.
- Registrar título, organização/autoria, data e URL direta.
- Distinguir fato, inferência e opinião.
- Não inventar números, citações, fontes ou links.
- Não copiar trechos longos.

## Duplicidade
Comparar títulos, slugs, resumos e conteúdo existente. Criar fingerprint com tema, intenção de busca, tese, evidência nova e conclusão prática. Rejeitar mesma tese com palavras diferentes.

## Imagens
- Fonte principal: Pexels.
- Não usar Google Imagens, redes sociais, portais jornalísticos ou material “editorial use only”.
- Preferir imagem horizontal, sem rostos identificáveis, crianças, logos, marcas ou produtos reconhecíveis.
- Verificar página original, fotógrafo, licença Pexels e URL direta HTTPS do arquivo.
- Exibir crédito visível: “Foto: Nome / Pexels”, com link para a página original.
- Registrar origem no HTML e no relatório da execução.
- Nunca afirmar que uma imagem é “sem direitos autorais”; ela é usada sob licença.
- Sem licença e origem verificáveis, vetar a publicação.

## Redação e SEO
- Português brasileiro correto, com acentuação.
- Normalmente 1.200 a 1.800 palavras, sem inflar texto.
- Responder à intenção de busca no início.
- Produzir síntese própria, não resumo de notícia.
- Incluir aplicação prática: framework, checklist, perguntas ou exemplo.
- Inserir fontes junto às alegações.
- Criar 2 a 4 links internos apenas para páginas existentes.
- H1 único, H2/H3 úteis, slug estável, canonical, Open Graph, Twitter Card e JSON-LD BlogPosting.
- Meta description natural, aproximadamente 145 a 160 caracteres.
- Sem keyword stuffing, clickbait ou FAQ artificial.

## Tom e CTA
- Claro, sóbrio, humano, prático e reflexivo.
- Sem jargão vazio, promessas garantidas ou tom genérico de IA.
- CTA opcional: no máximo uma frase leve e contextual.
- Não usar urgência artificial nem venda forçada.

## Publicação segura
- Criar branch por edição e nunca escrever o artigo diretamente na main.
- Alterações permitidas por edição: novo arquivo em blog/, blog/posts.json e sitemap.xml.
- O artigo pode referenciar assets/blog-article-automation.css.
- Não alterar workflows, scripts, permissões, domínio, robots.txt, páginas institucionais ou posts antigos.
- Abrir PR, revisar o diff e mesclar somente se todos os gates e validações passarem.
- Abortar se houver arquivo inesperado, exclusão, conflito ou alteração fora da allowlist.
- Preservar lastmod das URLs antigas no sitemap.
