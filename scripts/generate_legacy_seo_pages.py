from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import publish_blog_post as pub


ACCENTS = {
    "Automacao": "Automa\u00e7\u00e3o",
    "automacao": "automa\u00e7\u00e3o",
    "automacoes": "automa\u00e7\u00f5es",
    "Operacao": "Opera\u00e7\u00e3o",
    "operacao": "opera\u00e7\u00e3o",
    "operacoes": "opera\u00e7\u00f5es",
    "implantacao": "implanta\u00e7\u00e3o",
    "Implantacao": "Implanta\u00e7\u00e3o",
    "execucao": "execu\u00e7\u00e3o",
    "Execucao": "Execu\u00e7\u00e3o",
    "diagnostico": "diagn\u00f3stico",
    "Diagnostico": "Diagn\u00f3stico",
    "servicos": "servi\u00e7os",
    "Servicos": "Servi\u00e7os",
    "relacao": "rela\u00e7\u00e3o",
    "Relacao": "Rela\u00e7\u00e3o",
    "gestao": "gest\u00e3o",
    "Gestao": "Gest\u00e3o",
    "mudanca": "mudan\u00e7a",
    "Mudanca": "Mudan\u00e7a",
    "informacao": "informa\u00e7\u00e3o",
    "informacoes": "informa\u00e7\u00f5es",
    "decisao": "decis\u00e3o",
    "decisoes": "decis\u00f5es",
    "aprovacao": "aprova\u00e7\u00e3o",
    "aprovacoes": "aprova\u00e7\u00f5es",
    "Aprovacao": "Aprova\u00e7\u00e3o",
    "qualificacao": "qualifica\u00e7\u00e3o",
    "Captacao": "Capta\u00e7\u00e3o",
    "captacao": "capta\u00e7\u00e3o",
    "Retencao": "Reten\u00e7\u00e3o",
    "retencao": "reten\u00e7\u00e3o",
    "adocao": "ado\u00e7\u00e3o",
    "satisfacao": "satisfa\u00e7\u00e3o",
    "consistencia": "consist\u00eancia",
    "confianca": "confian\u00e7a",
    "Politica": "Pol\u00edtica",
    "politica": "pol\u00edtica",
    "Eficiencia": "Efici\u00eancia",
    "eficiencia": "efici\u00eancia",
    "visivel": "vis\u00edvel",
    "critica": "cr\u00edtica",
    "critico": "cr\u00edtico",
    "proximos": "pr\u00f3ximos",
    "proximo": "pr\u00f3ximo",
    "historico": "hist\u00f3rico",
    "generico": "gen\u00e9rico",
    "minimo": "m\u00ednimo",
    "util": "\u00fatil",
    "duvida": "d\u00favida",
    "duvidas": "d\u00favidas",
    "criterio": "crit\u00e9rio",
    "criterios": "crit\u00e9rios",
    "reuniao": "reuni\u00e3o",
    "reunioes": "reuni\u00f5es",
    "padrao": "padr\u00e3o",
    "padroes": "padr\u00f5es",
    "unico": "\u00fanico",
    "area": "\u00e1rea",
    "areas": "\u00e1reas",
    "cenario": "cen\u00e1rio",
    "cenarios": "cen\u00e1rios",
    "Cenarios": "Cen\u00e1rios",
    "memoria": "mem\u00f3ria",
    "rapido": "r\u00e1pido",
    "rapida": "r\u00e1pida",
    "Rapido": "R\u00e1pido",
    "tensao": "tens\u00e3o",
    "solucao": "solu\u00e7\u00e3o",
    "atualizacao": "atualiza\u00e7\u00e3o",
    "frequencia": "frequ\u00eancia",
    "logica": "l\u00f3gica",
    "pratico": "pr\u00e1tico",
    "praticas": "pr\u00e1ticas",
    "propria": "pr\u00f3pria",
    "Formulario": "Formul\u00e1rio",
    "formulario": "formul\u00e1rio",
    "necessario": "necess\u00e1rio",
    "necessarios": "necess\u00e1rios",
    "remocao": "remo\u00e7\u00e3o",
    "solicitacoes": "solicita\u00e7\u00f5es",
}


def pt(text: str) -> str:
    for plain, accented in ACCENTS.items():
        text = text.replace(plain, accented)
    return text


PAGES = [
    {
        "slug": "controle-rapido-e-preciso-de-entregas-pelo-whatsapp.html",
        "title": "Controle de entregas pelo WhatsApp: visibilidade sem burocracia",
        "shortTitle": "Controle de entregas pelo WhatsApp",
        "description": "Como controlar entregas, pendencias e riscos pelo WhatsApp sem perder historico, dono ou prioridade.",
        "category": "Operacao",
        "breadcrumb": "Controle operacional",
        "body": """
O WhatsApp costuma virar o centro informal da operacao. O cliente cobra, o time confirma, alguem manda print, surge uma excecao e outra pessoa promete resolver. O problema nao e usar WhatsApp. O problema e deixar que ele seja o unico sistema de controle.

## O que precisa ficar visivel

Cada conversa precisa virar uma lista curta de fatos operacionais: qual e a entrega, quem e o dono, qual e o prazo, qual bloqueio existe e qual foi a ultima decisao.

Se isso nao fica claro, o time passa a trabalhar por memoria. Atrasos aparecem tarde, dependencias somem no meio da conversa e o cliente sente que precisa repetir a mesma cobranca.

## Um fluxo simples para comecar

1. **Padronize o pedido:** toda demanda precisa ter contexto, impacto e prazo esperado.
2. **Registre o dono:** nenhuma entrega critica pode ficar sem responsavel explicito.
3. **Separe decisao de conversa:** decisoes precisam sair do chat e entrar em um quadro, planilha ou sistema.
4. **Revise pendencias em cadencia curta:** 15 minutos por dia ja mudam a previsibilidade.
5. **Use IA para resumir, nao para inventar controle:** a IA pode transformar conversas em pendencias, riscos e proximos passos.

## Onde a IA ajuda de verdade

A IA funciona melhor quando existe metodo. Ela pode resumir conversas longas, classificar urgencia, sugerir follow-up e gerar ata de decisao. Mas se nao houver dono, criterio de prioridade e rotina de revisao, ela so acelera o ruido.
""",
    },
    {
        "slug": "automacao-no-whatsapp-que-qualifica-leads-em-menos-de-24h.html",
        "title": "Automacao no WhatsApp para qualificar leads sem perder contexto humano",
        "shortTitle": "Automacao no WhatsApp para leads",
        "description": "Como usar automacao e IA no WhatsApp para qualificar leads, organizar contexto e acelerar resposta sem parecer atendimento generico.",
        "category": "IA aplicada",
        "breadcrumb": "WhatsApp e automacao",
        "body": """
Automatizar WhatsApp nao significa transformar todo contato em robo. Em operacoes B2B, a automacao precisa ajudar a entender contexto mais rapido, separar prioridade e entregar uma primeira resposta util.

## O erro mais comum

Muita empresa comeca criando uma sequencia enorme de perguntas. O lead responde pouco, abandona a conversa ou sente que esta preenchendo formulario dentro do WhatsApp. O melhor caminho e qualificar com poucas perguntas e muito contexto.

## O minimo que precisa ser capturado

- Qual e o cenario atual.
- Qual problema levou a pessoa a procurar ajuda.
- Qual area ou processo esta travando.
- Qual urgencia existe.
- Quem decide ou participa da conversa.

## Como a IA entra

A IA pode classificar a mensagem, resumir o problema, sugerir perguntas complementares e preparar um briefing para a primeira conversa. O ponto e deixar o atendimento mais preparado, nao mais frio.
""",
    },
    {
        "slug": "playbook-atendimento-ia.html",
        "title": "Playbook de atendimento com IA: padronizar sem engessar a relacao com o cliente",
        "shortTitle": "Playbook de atendimento com IA",
        "description": "Como montar um playbook de atendimento com IA para reduzir improviso, preservar relacionamento e melhorar consistencia operacional.",
        "category": "Playbooks",
        "breadcrumb": "Atendimento e IA",
        "body": """
Um bom playbook nao e um script para o time repetir. E um mapa de decisao. Ele mostra como agir quando existe duvida, excecao, risco, mudanca de escopo ou desalinhamento com cliente.

## O que um playbook precisa ter

1. **Cenarios recorrentes:** duvidas, bloqueios, reclamacoes, mudanca de prazo, ausencia de retorno e conflito de expectativa.
2. **Criterios de resposta:** quando responder direto, quando pedir contexto, quando escalar e quando transformar em reuniao.
3. **Modelos uteis:** mensagens, atas, checklists e criterios de aceite.
4. **Dono da decisao:** quem aprova excecoes e quem comunica impacto.
5. **Indicadores:** tempo de resposta, retrabalho, pendencias e satisfacao percebida.

## O papel da IA

A IA pode sugerir respostas, resumir historico e identificar risco em conversas longas. Mas ela precisa ser treinada com boas praticas da propria operacao. Caso contrario, vira texto bonito sem responsabilidade.
""",
    },
    {
        "slug": "como-ia-transforma-processos.html",
        "title": "Como IA transforma processos quando existe metodo antes da ferramenta",
        "shortTitle": "Como IA transforma processos",
        "description": "Como aplicar IA em processos de implantacao, onboarding e operacao sem cair em automacoes soltas ou promessas genericas.",
        "category": "AI Transformation",
        "breadcrumb": "IA e processos",
        "body": """
IA transforma processos quando ela entra depois de uma boa leitura operacional. Antes de escolher ferramenta, e preciso entender onde existe retrabalho, espera, decisao manual, falta de contexto e risco de comunicacao.

## O processo vem antes da automacao

Automatizar um fluxo confuso costuma deixar o problema mais rapido, nao melhor. O primeiro passo e mapear jornada, donos, entradas, saidas, excecoes e criterios de sucesso.

## Onde buscar oportunidades

- Reunioes que geram ata, mas nao geram acao.
- Follow-ups manuais que dependem de memoria.
- Homologacoes com evidencia espalhada.
- Clientes sem clareza de proximo passo.
- Indicadores que chegam tarde.

## Um bom caso de uso tem dono

Toda automacao precisa responder: qual problema resolve, quem usa, como sera medido e o que acontece quando falha. Sem isso, IA vira experimento solto.
""",
    },
    {
        "slug": "feedback-rapido-para-evitar-erros-e-atrasos-na-pme.html",
        "title": "Feedback rapido: como evitar erros e atrasos antes que virem crise",
        "shortTitle": "Feedback rapido em projetos",
        "description": "Como criar ciclos curtos de feedback para reduzir atraso, retrabalho e desalinhamento em implantacao, onboarding e projetos com cliente.",
        "category": "Gestao de mudanca",
        "breadcrumb": "Feedback e execucao",
        "body": """
Projetos raramente atrasam de uma vez. Eles dao sinais pequenos: retorno que nao vem, duvida que se repete, decisao que fica sem dono, cliente que muda prioridade e teste que ninguem validou.

## Feedback nao e so opiniao

Feedback operacional e informacao para corrigir rota. Ele precisa mostrar o que aconteceu, qual impacto existe e qual decisao precisa ser tomada.

## Cadencias que ajudam

1. **Check-in curto:** o que avancou, o que travou e qual apoio e necessario.
2. **Revisao de risco:** o que pode comprometer prazo, adocao ou qualidade.
3. **Feedback do cliente:** onde houve clareza, atrito ou expectativa desalinhada.
4. **Aprendizado documentado:** o que vira playbook para o proximo ciclo.
""",
    },
    {
        "slug": "fluxo-simples-para-captar-clientes-b2b-em-servicos-locais.html",
        "title": "Fluxo simples para captar clientes B2B com mais contexto e menos improviso",
        "shortTitle": "Fluxo simples para captar clientes B2B",
        "description": "Um modelo simples para organizar entrada de leads B2B, qualificacao, diagnostico e proximo passo sem depender de improviso.",
        "category": "Processos comerciais",
        "breadcrumb": "Captacao B2B",
        "body": """
Captacao B2B nao precisa comecar com uma maquina complexa. Precisa comecar com clareza: quem e o cliente certo, qual problema ele reconhece, qual pergunta abre conversa e qual proximo passo faz sentido.

## O fluxo minimo

- Entrada do lead com origem registrada.
- Perguntas de qualificacao curtas.
- Diagnostico inicial do cenario.
- Hipotese de problema prioritario.
- Proximo passo claro: conversa, material ou encaminhamento.

## IA como apoio

A IA pode resumir mensagens, sugerir perguntas e organizar briefing para uma conversa consultiva. O segredo e manter o relacionamento humano no centro.
""",
    },
    {
        "slug": "aumente-sua-retencao-com-feedback-direto-via-whatsapp.html",
        "title": "Retencao com feedback direto: transforme mensagens em melhoria operacional",
        "shortTitle": "Retencao com feedback direto",
        "description": "Como usar feedback recebido por WhatsApp ou canais diretos para melhorar retencao, adocao e qualidade da operacao.",
        "category": "Customer Success",
        "breadcrumb": "Retencao e feedback",
        "body": """
Feedback direto e uma das fontes mais ricas para melhorar retencao. O problema e que ele costuma ficar espalhado em conversas, reunioes e mensagens sem virar aprendizado operacional.

## O que registrar

Registre motivo, impacto, sentimento do cliente, area responsavel e proximo passo. Isso permite separar reclamacao pontual de padrao sistemico.

## Como transformar feedback em acao

1. Agrupe feedbacks por tema.
2. Identifique riscos de adocao.
3. Transforme padroes em playbook.
4. Feche o ciclo com o cliente.
""",
    },
    {
        "slug": "domine-o-whatsapp-para-transformar-clientes-em-fas-leais.html",
        "title": "WhatsApp no relacionamento com clientes: clareza, cadencia e menos retrabalho",
        "shortTitle": "WhatsApp no relacionamento com clientes",
        "description": "Como usar WhatsApp como canal de relacionamento sem perder controle de pendencias, decisoes e expectativas com clientes B2B.",
        "category": "Relacionamento",
        "breadcrumb": "WhatsApp e clientes",
        "body": """
O WhatsApp aproxima, mas tambem pode baguncar. Para clientes B2B, ele funciona melhor quando existe cadencia, criterio de resposta e fechamento claro de pendencias.

## O que muda a experiencia do cliente

Cliente nao quer apenas resposta rapida. Ele quer seguranca de que a demanda foi entendida, priorizada e acompanhada.

## Boas praticas

- Use mensagens curtas e objetivas.
- Confirme decisoes importantes por escrito.
- Transforme pendencias em lista acompanhavel.
- Defina quando o tema precisa sair do chat para reuniao.
""",
    },
    {
        "slug": "diga-adeus-ao-atraso-sistema-digital-simples-para-aprovar-orcamentos.html",
        "title": "Aprovacao digital simples: reduza atraso quando varias areas precisam decidir",
        "shortTitle": "Aprovacao digital simples",
        "description": "Como organizar aprovacoes, responsaveis e criterios para reduzir atrasos em decisoes operacionais e projetos com cliente.",
        "category": "Processos",
        "breadcrumb": "Aprovacoes",
        "body": """
Atraso em aprovacao quase sempre tem a mesma causa: ninguem sabe exatamente quem decide, qual informacao falta e qual prazo e aceitavel.

## O fluxo precisa mostrar tres coisas

1. Quem solicita.
2. Quem aprova.
3. Qual criterio define aprovacao ou reprovacao.

## Como simplificar

Use formularios, quadros ou automacoes leves para registrar pedido, contexto, impacto e prazo. A tecnologia pode ser simples; o metodo precisa ser claro.
""",
    },
    {
        "slug": "controle-de-estoque-simples-que-evita-perdas-e-falta-de-produtos.html",
        "title": "Controle operacional simples: evite perdas quando o processo depende de memoria",
        "shortTitle": "Controle operacional simples",
        "description": "Um olhar pratico sobre controle operacional, visibilidade e rotina para reduzir perdas, falta de informacao e retrabalho.",
        "category": "Operacao",
        "breadcrumb": "Controle operacional",
        "body": """
Todo controle operacional falha quando depende de memoria. Seja estoque, implantacao, homologacao ou atendimento, a logica e parecida: entrada sem padrao, atualizacao atrasada e decisao sem visibilidade.

## O que qualquer controle precisa ter

- Registro unico da informacao.
- Responsavel claro.
- Frequencia de atualizacao.
- Indicador minimo de risco.
- Criterio para acionar alguem.

## A tecnologia vem depois

Antes de escolher ferramenta, desenhe o processo. A IA pode ajudar a classificar e alertar, mas ela precisa de dados consistentes e rotina de revisao.
""",
    },
    {
        "slug": "como-enfrentar-crises-financeiras-sem-sacrificar-seus-clientes.html",
        "title": "Como enfrentar pressao operacional sem sacrificar relacionamento com clientes",
        "shortTitle": "Pressao operacional e clientes",
        "description": "Como organizar prioridades, comunicacao e riscos quando a operacao esta sob pressao e o cliente precisa continuar seguro.",
        "category": "Gestao",
        "breadcrumb": "Prioridade e cliente",
        "body": """
Quando a operacao esta pressionada, o relacionamento com cliente costuma ser o primeiro a sentir. Atrasos, comunicacao reativa e falta de previsibilidade aumentam tensao.

## O que proteger primeiro

Proteja clareza. Mesmo quando a solucao demora, o cliente precisa entender status, risco, dono e proximo passo.

## Um plano curto

1. Liste compromissos criticos.
2. Separe impacto real de urgencia aparente.
3. Comunique risco cedo.
4. Renegocie escopo com criterio.
5. Documente decisoes.
""",
    },
    {
        "slug": "politica-de-garantia-proteja-seu-servico-e-conquiste-confianca.html",
        "title": "Politica de garantia em servicos: confianca com expectativa clara",
        "shortTitle": "Politica de garantia em servicos",
        "description": "Como definir expectativas, criterios e limites em servicos para reduzir atrito e aumentar confianca com clientes.",
        "category": "Relacionamento",
        "breadcrumb": "Expectativa e confianca",
        "body": """
Garantia em servico nao e apenas promessa comercial. E alinhamento de expectativa. Quanto mais claro o escopo, menor o atrito quando algo muda.

## O que deixar explicito

- O que esta incluso.
- O que depende do cliente.
- Quais criterios definem aceite.
- Como mudancas serao tratadas.
- Qual e o canal de comunicacao.

## Por que isso importa em implantacao

Projetos de implantacao sofrem quando expectativa e responsabilidade nao estao claras. Uma politica simples ajuda a proteger o relacionamento e reduz ruido na execucao.
""",
    },
    {
        "slug": "corte-sua-conta-de-luz-em-pmes-sem-grandes-investimentos.html",
        "title": "Eficiencia operacional sem grandes investimentos: comece pelo desperdicio invisivel",
        "shortTitle": "Eficiencia operacional sem grandes investimentos",
        "description": "Como encontrar desperdicios invisiveis em processos antes de investir em ferramentas, automacoes ou grandes mudancas.",
        "category": "Eficiencia",
        "breadcrumb": "Eficiencia operacional",
        "body": """
Nem toda melhoria comeca com grande investimento. Muitas operacoes perdem energia em retrabalho, espera, reuniao sem decisao, dado duplicado e follow-up manual.

## Onde procurar desperdicio

- Tarefas repetidas sem regra clara.
- Decisoes que voltam toda semana.
- Informacoes copiadas entre sistemas.
- Reunioes que nao geram plano de acao.
- Cliente perguntando status porque nao recebeu contexto.

## O caminho simples

Mapeie o fluxo, escolha um gargalo e crie uma melhoria pequena com metrica. Depois pense em IA ou automacao para escalar o que funcionou.
""",
    },
]


def write_policy() -> None:
    content = """<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Politica de privacidade | Munnius</title>
  <meta name="description" content="Politica de privacidade da Munnius: como dados de contato sao usados para responder solicitacoes e diagnosticos." />
  <link rel="canonical" href="https://munnius.com.br/politicas.html" />
  <meta property="og:title" content="Politica de privacidade | Munnius" />
  <meta property="og:description" content="Como a Munnius trata dados enviados pelo formulario de contato." />
  <meta property="og:image" content="https://munnius.com.br/og-image.png" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="theme-color" content="#15384A" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Nunito+Sans:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="assets/styles.css" />
  <link rel="stylesheet" href="assets/mobile-menu.css" />
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"WebPage","name":"Politica de privacidade","url":"https://munnius.com.br/politicas.html","inLanguage":"pt-BR","publisher":{"@id":"https://munnius.com.br/#organization"}}</script>
</head>
<body>
<header id="site-header"><a href="/index.html" class="header-logo" aria-label="Munnius"><img src="assets/brand/munnius-logo.png" alt="Munnius" /></a><nav aria-label="Navegacao principal"><a href="/sobre.html">Sobre</a><a href="/servicos.html">Servicos</a><a href="/blog/index.html">Blog</a></nav><a href="/contato.html" class="header-cta">Agendar diagnostico</a><button class="menu-toggle" aria-label="Abrir menu"><span></span><span></span><span></span></button></header>
<main><section class="section"><div class="container narrow-content"><p class="eyebrow">Privacidade</p><h1>Politica de privacidade</h1><p>A Munnius usa os dados enviados pelo formulario apenas para responder solicitacoes, preparar diagnosticos e manter contato sobre a conversa iniciada pelo visitante.</p><h2>Dados coletados</h2><p>Podem ser coletados nome, empresa, e-mail, telefone, cargo e mensagem enviada voluntariamente pelo formulario de contato.</p><h2>Uso das informacoes</h2><p>As informacoes sao usadas para entender o cenario apresentado, responder a solicitacao e registrar contexto comercial ou consultivo relacionado a Munnius.</p><h2>Compartilhamento</h2><p>A Munnius nao vende dados pessoais. Informacoes podem transitar por servicos necessarios ao funcionamento do formulario e hospedagem do site.</p><h2>Contato</h2><p>Para solicitar ajuste ou remocao de dados, envie um e-mail para <a href="mailto:contato@munnius.com.br">contato@munnius.com.br</a>.</p></div></section></main>
<footer id="site-footer"><div class="footer-top"><div class="footer-brand"><a href="/index.html"><img src="assets/brand/munnius-logo-light.png" alt="Munnius" /></a><p>AI Transformation para SaaS, Onboarding e Implantacao.</p></div><div class="footer-links"><div><strong>Site</strong><a href="/sobre.html">Sobre</a><a href="/servicos.html">Servicos</a><a href="/blog/index.html">Blog</a><a href="/contato.html">Contato</a></div><div><strong>Contato</strong><a href="mailto:contato@munnius.com.br">contato@munnius.com.br</a><a href="https://linkedin.com/in/grmunhoz" target="_blank" rel="noreferrer">LinkedIn</a><a href="https://youtube.com/@by.munnius" target="_blank" rel="noreferrer">YouTube</a><a href="https://instagram.com/by.munnius" target="_blank" rel="noreferrer">Instagram</a></div></div></div><div class="footer-bottom"><p>(c) 2026 Munnius Consultoria. Todos os direitos reservados.</p></div></footer><script src="assets/mobile-menu.js"></script>
</body></html>
"""
    (pub.ROOT / "politicas.html").write_text(content, encoding="utf-8")


def main() -> None:
    related = pub.load_posts()[:2]
    for page in PAGES:
        meta = {
            "title": pt(page["title"]),
            "shortTitle": pt(page["shortTitle"]),
            "description": pt(page["description"]),
            "category": pt(page["category"]),
            "breadcrumb": pt(page["breadcrumb"]),
            "date": "2026-06-10",
            "readTime": "6 min",
        }
        rendered = pub.post_template(meta, pub.markdown_to_html(pt(page["body"])), page["slug"], related)
        (pub.BLOG_DIR / page["slug"]).write_text(rendered, encoding="utf-8")
    write_policy()
    pub.update_sitemap(pub.load_posts())


if __name__ == "__main__":
    main()
