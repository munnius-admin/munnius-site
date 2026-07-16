from __future__ import annotations

import argparse
import re
from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DRAFTS = ROOT / "blog" / "drafts"

START_DATE = date(2026, 7, 6)
CADENCE_DAYS = 2


TOPICS = [
    {
        "slug": "diagnostico-ai-transformation-saas",
        "title": "Diagnostico de AI Transformation para SaaS: como separar hype de oportunidade real",
        "short": "Diagnostico de AI Transformation",
        "description": "Como diagnosticar oportunidades reais de IA em SaaS B2B sem cair em automacoes soltas, hype ou projetos sem dono.",
        "category": "AI Transformation",
        "breadcrumb": "Diagnostico de IA",
        "keyword": "diagnostico de AI Transformation",
        "intent": "entender onde a IA pode gerar impacto operacional antes de escolher ferramenta",
        "problem": "a empresa quer usar IA, mas ainda nao sabe qual gargalo merece investimento",
        "framework": "mapa de processos, matriz de oportunidades, impacto esperado, esforco, risco, dados disponiveis e dono de negocio",
        "cta": "Se sua operacao SaaS esta cheia de ideias de IA, comece pelo diagnostico. Ele evita dispersao e transforma conversa em prioridade.",
    },
    {
        "slug": "roadmap-ia-saas-90-dias",
        "title": "Roadmap de IA para SaaS em 90 dias: do primeiro caso de uso ao piloto com indicador",
        "short": "Roadmap de IA em 90 dias",
        "description": "Um roteiro de 90 dias para priorizar, testar e medir casos de uso de IA em SaaS B2B com governanca leve.",
        "category": "AI Transformation",
        "breadcrumb": "Roadmap de IA",
        "keyword": "roadmap de IA para SaaS",
        "intent": "sair de ideias soltas e montar um plano de execucao com primeiro piloto mensuravel",
        "problem": "o time abre muitas frentes e nenhuma chega a virar mudanca de rotina",
        "framework": "30 dias de diagnostico, 30 dias de piloto controlado e 30 dias de medicao, ajuste e decisao de escala",
        "cta": "Um roadmap bom nao promete revolucao. Ele cria foco, evidencia e uma decisao clara sobre o que escalar.",
    },
    {
        "slug": "ia-gestao-projetos-riscos-dependencias",
        "title": "IA na gestao de projetos: como antecipar riscos e dependencias antes do atraso aparecer",
        "short": "IA para riscos de projeto",
        "description": "Como usar IA na gestao de projetos para resumir contexto, identificar riscos e antecipar dependencias em implantacoes SaaS.",
        "category": "IA aplicada",
        "breadcrumb": "IA em projetos",
        "keyword": "IA na gestao de projetos",
        "intent": "usar IA para melhorar previsibilidade sem perder governanca humana",
        "problem": "o atraso so aparece quando ja virou cobranca do cliente ou comite executivo",
        "framework": "atas estruturadas, classificacao de bloqueios, sinais de risco, donos, prazos e plano de resposta",
        "cta": "A IA ajuda muito quando o processo ja sabe o que procurar: risco, dependencia, decisao e proximo passo.",
    },
    {
        "slug": "playbook-implantacao-saas-enterprise",
        "title": "Playbook de implantacao SaaS enterprise: o que precisa estar padronizado antes de escalar",
        "short": "Playbook SaaS enterprise",
        "description": "O que incluir em um playbook de implantacao SaaS enterprise para reduzir improviso, retrabalho e desalinhamento.",
        "category": "Implantacao SaaS",
        "breadcrumb": "Playbook enterprise",
        "keyword": "playbook de implantacao SaaS",
        "intent": "padronizar a operacao sem transformar relacionamento com cliente em script rigido",
        "problem": "cada implantacao depende de pessoas especificas e a escala fica cara demais",
        "framework": "jornada, marcos, criterios de avanco, handoffs, templates, ritos, riscos recorrentes e criterios de aceite",
        "cta": "Playbook bom nao engessa. Ele protege o time para personalizar onde importa.",
    },
    {
        "slug": "onboarding-saas-change-management",
        "title": "Onboarding SaaS e change management: por que adocao nao nasce no treinamento",
        "short": "Onboarding e change management",
        "description": "Como conectar onboarding SaaS, gestao de mudanca e relacionamento para aumentar adocao real do cliente B2B.",
        "category": "Change Management",
        "breadcrumb": "Adocao SaaS",
        "keyword": "onboarding SaaS e change management",
        "intent": "mostrar que treinamento e so uma parte da mudanca de comportamento do cliente",
        "problem": "o cliente participa do treinamento, mas volta para o processo antigo na semana seguinte",
        "framework": "mapa de impacto, comunicacao, patrocinadores, ritos de reforco, indicadores de uso e plano de sustentacao",
        "cta": "Adoção nasce quando o cliente entende por que mudar, como mudar e quem apoia a mudanca no dia a dia.",
    },
    {
        "slug": "handoff-vendas-cs-implantacao-saas",
        "title": "Handoff entre Vendas, CS e Implantacao: perguntas que evitam uma largada torta",
        "short": "Handoff Vendas, CS e Implantacao",
        "description": "Perguntas para estruturar o handoff entre Vendas, CS e Implantacao SaaS e reduzir expectativa desalinhada.",
        "category": "Operacao SaaS",
        "breadcrumb": "Handoff",
        "keyword": "handoff vendas CS implantacao SaaS",
        "intent": "evitar que a promessa comercial chegue incompleta para quem precisa implantar",
        "problem": "a implantacao descobre tarde restricoes, objetivos e expectativas que ja estavam na venda",
        "framework": "objetivo de negocio, escopo vendido, stakeholders, riscos, integracoes, prazos politicos e criterios de sucesso",
        "cta": "Um bom handoff nao e reuniao de passagem. E transferencia de contexto para proteger a experiencia do cliente.",
    },
    {
        "slug": "implantacao-saas-indicadores-ativacao",
        "title": "Indicadores de implantacao SaaS: como medir ativacao sem olhar apenas prazo de go-live",
        "short": "Indicadores de implantacao SaaS",
        "description": "Quais indicadores acompanhar em implantacao SaaS para medir ativacao, risco, retrabalho, adocao e valor percebido.",
        "category": "Metricas SaaS",
        "breadcrumb": "Indicadores",
        "keyword": "indicadores de implantacao SaaS",
        "intent": "melhorar gestao de implantacao com metricas que orientam decisao",
        "problem": "o time comemora go-live, mas o cliente ainda nao ativou valor de verdade",
        "framework": "tempo de etapa, bloqueios, retrabalho, prontidao, uso inicial, percepcao de valor e pendencias pos go-live",
        "cta": "Medir so prazo cria uma ilusao de sucesso. Ativacao exige olhar qualidade, comportamento e valor.",
    },
    {
        "slug": "teste-homologacao-saas-ia",
        "title": "Teste e homologacao SaaS com IA: como criar cenarios melhores sem aumentar retrabalho",
        "short": "Homologacao SaaS com IA",
        "description": "Como usar IA para estruturar cenarios de teste, massa de dados, riscos e criterio de aceite em homologacao SaaS.",
        "category": "IA aplicada",
        "breadcrumb": "Testes e homologacao",
        "keyword": "teste e homologacao SaaS com IA",
        "intent": "aplicar IA na criacao de cenarios de teste ligados ao processo real do cliente",
        "problem": "a homologacao valida o caminho feliz e deixa excecoes criticas para o fim do projeto",
        "framework": "mapa de processo, regras de negocio, excecoes, massa de dados, evidencias, criterio de aceite e rastreabilidade",
        "cta": "IA em teste vale quando aumenta cobertura de risco, nao quando gera checklist generico.",
    },
    {
        "slug": "governanca-leve-ai-transformation",
        "title": "Governanca leve para AI Transformation: controle suficiente para IA nao virar experimento solto",
        "short": "Governanca leve para IA",
        "description": "Como criar governanca leve para iniciativas de IA em SaaS com donos, criterios, riscos, dados e metricas.",
        "category": "Governanca",
        "breadcrumb": "Governanca de IA",
        "keyword": "governanca de IA em SaaS",
        "intent": "dar estrutura para experimentar IA sem burocratizar a operacao",
        "problem": "cada area testa uma ferramenta diferente e ninguem sabe o que gerou resultado",
        "framework": "intake de ideias, score de priorizacao, politica de dados, criterio de sucesso, owner e revisao de aprendizado",
        "cta": "Governanca leve nao trava inovacao. Ela impede que energia boa vire dispersao.",
    },
    {
        "slug": "automacao-processos-saas-cs-delivery",
        "title": "Automacao de processos em SaaS: onde CS e Delivery ganham escala sem perder proximidade",
        "short": "Automacao em CS e Delivery",
        "description": "Onde automatizar processos de CS e Delivery em SaaS B2B sem transformar relacionamento em atendimento frio.",
        "category": "Automacao",
        "breadcrumb": "CS e Delivery",
        "keyword": "automacao de processos em SaaS",
        "intent": "identificar automacoes de alto impacto em operacoes que dependem de acompanhamento humano",
        "problem": "o time gasta energia com follow-up, status e consolidacao de informacao em vez de decisao",
        "framework": "gatilhos, templates, resumos, alertas, handoffs, escalonamentos e momentos que precisam continuar humanos",
        "cta": "A melhor automacao libera tempo para relacionamento melhor, nao para esconder o cliente atras de fluxo.",
    },
    {
        "slug": "comite-implantacao-saas-executivo",
        "title": "Comite de implantacao SaaS: como transformar reuniao executiva em decisao de verdade",
        "short": "Comite de implantacao",
        "description": "Como estruturar comite de implantacao SaaS com pauta, indicadores, riscos e decisoes que realmente destravam o projeto.",
        "category": "Implantacao SaaS",
        "breadcrumb": "Comite executivo",
        "keyword": "comite de implantacao SaaS",
        "intent": "melhorar ritos executivos em projetos com cliente B2B",
        "problem": "o comite vira apresentacao de status e sai sem decisao sobre o que esta travando",
        "framework": "semana anterior, decisoes pendentes, riscos escalados, dependencia do cliente, mudancas de escopo e compromissos",
        "cta": "Reuniao executiva boa protege foco. Ela existe para decidir, nao para narrar historico.",
    },
    {
        "slug": "mapa-stakeholders-implantacao-saas",
        "title": "Mapa de stakeholders em implantacao SaaS: quem precisa decidir, apoiar e adotar",
        "short": "Mapa de stakeholders SaaS",
        "description": "Como mapear stakeholders em implantacao SaaS para reduzir risco politico, atraso de decisao e baixa adocao.",
        "category": "Change Management",
        "breadcrumb": "Stakeholders",
        "keyword": "mapa de stakeholders implantacao SaaS",
        "intent": "antecipar a dimensao humana da implantacao antes que ela vire bloqueio",
        "problem": "o projeto conhece o sponsor, mas ignora quem opera, influencia, bloqueia ou valida",
        "framework": "sponsor, decisores, usuarios-chave, areas impactadas, detratores, influenciadores e plano de comunicacao",
        "cta": "Implantacao nao falha so por tecnologia. Falha quando pessoas certas entram tarde demais.",
    },
    {
        "slug": "backlog-oportunidades-ia-saas",
        "title": "Backlog de oportunidades de IA para SaaS: como priorizar casos de uso com impacto real",
        "short": "Backlog de oportunidades de IA",
        "description": "Como montar um backlog de oportunidades de IA em SaaS B2B considerando impacto, dados, risco, esforco e adocao.",
        "category": "AI Transformation",
        "breadcrumb": "Backlog de IA",
        "keyword": "backlog de oportunidades de IA",
        "intent": "transformar ideias de IA em fila priorizada e executavel",
        "problem": "existem muitas sugestoes de automacao, mas pouca clareza sobre o primeiro caso de uso",
        "framework": "dor, usuario, frequencia, impacto, dados, risco, esforco, dono, metrica e aprendizagem esperada",
        "cta": "Priorizar IA e escolher onde aprender mais rapido com menor risco operacional.",
    },
    {
        "slug": "documentacao-viva-onboarding-saas",
        "title": "Documentacao viva para onboarding SaaS: como parar de perder conhecimento entre projetos",
        "short": "Documentacao viva SaaS",
        "description": "Como criar documentacao viva para onboarding SaaS com playbooks, decisoes, exemplos, riscos e aprendizado reutilizavel.",
        "category": "Operacao SaaS",
        "breadcrumb": "Documentacao viva",
        "keyword": "documentacao viva onboarding SaaS",
        "intent": "fazer conhecimento operacional virar ativo reutilizavel",
        "problem": "cada implantacao aprende algo, mas o aprendizado nao volta para o playbook",
        "framework": "decisoes, excecoes, exemplos, templates, criterios, owner, frequencia de revisao e link com ritos",
        "cta": "Documentacao viva nao e repositorio bonito. E memoria operacional que reduz retrabalho.",
    },
    {
        "slug": "customer-success-ativacao-saas-b2b",
        "title": "Customer Success e ativacao SaaS B2B: como provar valor antes do cliente perder tracao",
        "short": "CS e ativacao SaaS",
        "description": "Como conectar Customer Success, onboarding e indicadores de ativacao para o cliente perceber valor cedo no SaaS B2B.",
        "category": "Customer Success",
        "breadcrumb": "Ativacao",
        "keyword": "ativacao SaaS B2B",
        "intent": "aproximar CS da implantacao para reduzir risco de baixa adocao",
        "problem": "o cliente entra em producao, mas nao entende claramente qual valor foi ativado",
        "framework": "objetivo de negocio, marco de valor, evento de ativacao, uso inicial, feedback e plano de evolucao",
        "cta": "Ativacao e o momento em que a promessa comercial vira evidencia para o cliente.",
    },
    {
        "slug": "implantacao-erp-saas-dados-integracoes",
        "title": "Implantacao SaaS com ERP: como tratar dados e integracoes antes da reta final",
        "short": "SaaS, ERP e integracoes",
        "description": "Como antecipar riscos de dados e integracoes ERP em implantacao SaaS para reduzir atraso, retrabalho e surpresa.",
        "category": "ERP e integracoes",
        "breadcrumb": "ERP",
        "keyword": "implantacao SaaS com ERP",
        "intent": "antecipar dependencias tecnicas que costumam travar projetos B2B",
        "problem": "dados, acessos e regras de integracao aparecem tarde e mudam o cronograma",
        "framework": "pre-requisitos, mapa de campos, regras fiscais, ambiente, massa de teste, responsaveis e janela de validacao",
        "cta": "Integracao boa comeca antes do primeiro teste. Ela comeca quando a dependencia fica visivel.",
    },
    {
        "slug": "gestao-mudanca-software-b2b",
        "title": "Gestao de mudanca em software B2B: como reduzir resistencia sem discurso generico",
        "short": "Gestao de mudanca B2B",
        "description": "Como conduzir gestao de mudanca em software B2B com comunicacao, patrocinio, rotina e indicadores de adocao.",
        "category": "Change Management",
        "breadcrumb": "Mudanca B2B",
        "keyword": "gestao de mudanca software B2B",
        "intent": "mostrar como transformar implantacao tecnica em mudanca de comportamento",
        "problem": "a empresa comunica a mudanca uma vez e espera que usuarios adotem sozinhos",
        "framework": "impacto por persona, mensagens-chave, patrocinio, treinamento contextual, reforco e medicao de uso",
        "cta": "Mudanca sustentada precisa de cadencia. Uma apresentacao inicial raramente muda rotina.",
    },
    {
        "slug": "ia-reunioes-implantacao-saas",
        "title": "IA em reunioes de implantacao SaaS: como transformar conversa em decisao rastreavel",
        "short": "IA em reunioes SaaS",
        "description": "Como usar IA para resumir reunioes de implantacao SaaS, extrair decisoes, pendencias, riscos e proximas acoes.",
        "category": "IA aplicada",
        "breadcrumb": "Reunioes com IA",
        "keyword": "IA em reunioes de implantacao",
        "intent": "melhorar rastreabilidade de decisoes sem aumentar burocracia",
        "problem": "a reuniao parece produtiva, mas decisoes se perdem antes do proximo checkpoint",
        "framework": "resumo executivo, decisoes, pendencias, riscos, donos, prazos, divergencias e perguntas abertas",
        "cta": "A IA nao substitui a decisao. Ela ajuda a deixar claro o que foi decidido e o que ainda esta aberto.",
    },
    {
        "slug": "onboarding-high-touch-vs-tech-touch",
        "title": "Onboarding high-touch vs tech-touch: como escolher o modelo certo para cada cliente",
        "short": "High-touch vs tech-touch",
        "description": "Como decidir entre onboarding high-touch, low-touch e tech-touch em SaaS B2B sem perder qualidade de ativacao.",
        "category": "Onboarding SaaS",
        "breadcrumb": "Modelos de onboarding",
        "keyword": "onboarding high-touch tech-touch",
        "intent": "ajudar SaaS a segmentar jornada de implantacao por complexidade e valor",
        "problem": "todos os clientes recebem a mesma jornada, mesmo com complexidades completamente diferentes",
        "framework": "segmentacao por ARR, complexidade, integracoes, risco, maturidade, urgencia e potencial de expansao",
        "cta": "Escala nao e tratar todo cliente igual. Escala e saber onde personalizar e onde padronizar.",
    },
    {
        "slug": "modelo-operacional-ai-ops-saas",
        "title": "AI Ops para SaaS B2B: como criar um modelo operacional para IA no dia a dia",
        "short": "AI Ops para SaaS",
        "description": "Como estruturar AI Ops em SaaS B2B com rotinas, donos, indicadores, seguranca, qualidade e melhoria continua.",
        "category": "AI Transformation",
        "breadcrumb": "AI Ops",
        "keyword": "AI Ops para SaaS",
        "intent": "transformar IA em capacidade operacional recorrente, nao projeto pontual",
        "problem": "o piloto funciona uma vez, mas nao entra na rotina da operacao",
        "framework": "catalogo de casos, monitoramento, qualidade, feedback, governanca, seguranca e dono de melhoria continua",
        "cta": "AI Ops e o passo em que a IA deixa de ser novidade e passa a ser rotina gerenciada.",
    },
    {
        "slug": "reduzir-retrabalho-implantacao-saas",
        "title": "Como reduzir retrabalho em implantacao SaaS sem criar mais reunioes",
        "short": "Reduzir retrabalho SaaS",
        "description": "Como reduzir retrabalho em implantacao SaaS atacando causa raiz: escopo, dados, decisao, teste, comunicacao e aceite.",
        "category": "Implantacao SaaS",
        "breadcrumb": "Retrabalho",
        "keyword": "reduzir retrabalho implantacao SaaS",
        "intent": "atacar gargalos estruturais que elevam custo de delivery",
        "problem": "o time trabalha muito, mas repete validacoes, refaz configuracoes e reabre decisoes antigas",
        "framework": "causa raiz, mapa de retrabalho, padroes recorrentes, criterio de entrada, criterio de aceite e licoes aprendidas",
        "cta": "Retrabalho nao se resolve cobrando mais esforco. Resolve-se mudando entrada, decisao e qualidade do processo.",
    },
    {
        "slug": "matriz-maturidade-onboarding-saas",
        "title": "Matriz de maturidade de onboarding SaaS: do improviso ao motor de ativacao",
        "short": "Maturidade de onboarding SaaS",
        "description": "Uma matriz de maturidade para avaliar onboarding SaaS em processos, pessoas, metricas, automacao e experiencia do cliente.",
        "category": "Onboarding SaaS",
        "breadcrumb": "Maturidade",
        "keyword": "maturidade de onboarding SaaS",
        "intent": "dar um caminho evolutivo para operacoes que querem escalar onboarding",
        "problem": "a empresa nao sabe se seu onboarding esta ruim por processo, time, ferramenta ou maturidade do cliente",
        "framework": "cinco niveis: improvisado, padronizado, medido, automatizado e orientado por aprendizado",
        "cta": "Maturidade boa ajuda a escolher o proximo passo, nao a julgar o time.",
    },
    {
        "slug": "briefing-projeto-ia-saas",
        "title": "Briefing para projeto de IA em SaaS: o que preparar antes da primeira conversa",
        "short": "Briefing para projeto de IA",
        "description": "O que preparar antes de uma conversa sobre IA em SaaS: processos, dores, dados, prioridades e restricoes.",
        "category": "Projetos",
        "breadcrumb": "Briefing",
        "keyword": "projeto de IA para SaaS",
        "intent": "ajudar leads a chegarem mais preparados para uma conversa consultiva",
        "problem": "a conversa comeca ampla demais e demora para chegar no problema que importa",
        "framework": "contexto da empresa, jornada do cliente, gargalos, sistemas, dados, prioridades, restricoes e definicao de sucesso",
        "cta": "Um bom briefing acelera o diagnostico e aumenta a chance de sair com uma frente realmente acionavel.",
    },
    {
        "slug": "process-mining-saas-onboarding",
        "title": "Process mining para onboarding SaaS: como enxergar gargalos antes de automatizar",
        "short": "Process mining em onboarding",
        "description": "Como usar a logica de process mining para mapear gargalos, variacoes e retrabalho no onboarding SaaS B2B.",
        "category": "Processos",
        "breadcrumb": "Process mining",
        "keyword": "process mining onboarding SaaS",
        "intent": "mostrar uma abordagem analitica para entender processos antes de automatizar",
        "problem": "a jornada oficial parece organizada, mas a jornada real varia muito entre clientes",
        "framework": "eventos, etapas, tempos, retrabalho, excecoes, handoffs, gargalos e comparacao entre clientes",
        "cta": "Antes de automatizar, descubra como o processo realmente acontece. A verdade costuma estar nos desvios.",
    },
    {
        "slug": "copiloto-implantacao-saas",
        "title": "Copiloto de implantacao SaaS: quais tarefas a IA pode apoiar sem tirar o humano do centro",
        "short": "Copiloto de implantacao",
        "description": "Ideias praticas para usar IA como copiloto de implantacao SaaS em status, riscos, testes, documentacao e comunicacao.",
        "category": "IA aplicada",
        "breadcrumb": "Copiloto SaaS",
        "keyword": "copiloto de implantacao SaaS",
        "intent": "traduzir IA para casos de uso praticos no trabalho de delivery e onboarding",
        "problem": "a equipe quer usar IA, mas nao sabe quais tarefas delegar com seguranca",
        "framework": "resumo de contexto, matriz de riscos, roteiro de reuniao, plano de teste, checklist de go-live e comunicacao executiva",
        "cta": "Copiloto bom aumenta clareza e velocidade. Ele nao remove responsabilidade do gerente ou consultor.",
    },
    {
        "slug": "gestao-expectativa-cliente-saas",
        "title": "Gestao de expectativa em implantacao SaaS: como reduzir ansiedade do cliente",
        "short": "Gestao de expectativa SaaS",
        "description": "Como gerir expectativa do cliente em implantacao SaaS com comunicacao, marcos, riscos, criterios e proximos passos claros.",
        "category": "Relacionamento",
        "breadcrumb": "Expectativa",
        "keyword": "gestao de expectativa implantacao SaaS",
        "intent": "melhorar confianca e relacionamento durante projetos complexos",
        "problem": "o cliente fica ansioso porque nao sabe se o projeto esta evoluindo ou apenas acumulando pendencias",
        "framework": "marcos visiveis, status simples, riscos transparentes, compromissos claros e comunicacao de mudancas",
        "cta": "Ansiedade diminui quando o cliente entende onde esta, o que falta e quem esta cuidando.",
    },
    {
        "slug": "avaliar-prontidao-ia-saas",
        "title": "Prontidao para IA em SaaS: como saber se sua operacao esta pronta para automatizar",
        "short": "Prontidao para IA",
        "description": "Como avaliar prontidao para IA em SaaS considerando processo, dados, governanca, cultura, riscos e capacidade de adocao.",
        "category": "AI Transformation",
        "breadcrumb": "Prontidao para IA",
        "keyword": "prontidao para IA em SaaS",
        "intent": "evitar automatizar antes de existir base operacional minima",
        "problem": "a empresa compra ferramenta antes de organizar dados, processo e responsabilidade",
        "framework": "maturidade de processo, qualidade de dados, seguranca, owners, volume, variabilidade, risco e aderencia do time",
        "cta": "Prontidao nao precisa ser perfeita. Mas precisa ser suficiente para o piloto nao nascer condenado.",
    },
    {
        "slug": "rituais-operacao-saas-b2b",
        "title": "Rituais de operacao SaaS B2B: cadencia minima para alinhar CS, Produto e Delivery",
        "short": "Rituais de operacao SaaS",
        "description": "Quais rituais manter em uma operacao SaaS B2B para alinhar CS, Produto, Delivery, riscos e feedback do cliente.",
        "category": "Operacao SaaS",
        "breadcrumb": "Rituais",
        "keyword": "rituais de operacao SaaS",
        "intent": "criar cadencia de gestao sem excesso de reunioes",
        "problem": "areas conversam tarde demais e o cliente sente desalinhamento entre promessa, produto e entrega",
        "framework": "checkpoint de riscos, revisao de clientes criticos, feedback para produto, metricas de ativacao e retro operacional",
        "cta": "Ritual bom nao ocupa agenda. Ele economiza retrabalho e acelera decisao.",
    },
    {
        "slug": "ia-priorizacao-backlog-produto-cs",
        "title": "IA para priorizar backlog entre Produto e CS: como transformar feedback em decisao",
        "short": "IA para backlog Produto e CS",
        "description": "Como usar IA para organizar feedback de clientes, tickets e reunioes em sinais para priorizacao entre Produto e CS.",
        "category": "IA aplicada",
        "breadcrumb": "Produto e CS",
        "keyword": "IA para priorizacao de backlog",
        "intent": "aproximar voz do cliente, dados e decisao de produto",
        "problem": "feedback chega em canais diferentes e vira pressao subjetiva na priorizacao",
        "framework": "coleta, classificacao, frequencia, impacto, segmento, receita, risco, esforco e decisao documentada",
        "cta": "IA ajuda a organizar sinais. A priorizacao continua sendo uma escolha estrategica.",
    },
    {
        "slug": "plano-go-live-saas-pos-implantacao",
        "title": "Plano de go-live SaaS: o que precisa acontecer antes, durante e depois da virada",
        "short": "Plano de go-live SaaS",
        "description": "Como estruturar plano de go-live SaaS com prontidao, comunicacao, suporte, criterio de aceite e sustentacao pos-implantacao.",
        "category": "Implantacao SaaS",
        "breadcrumb": "Go-live",
        "keyword": "plano de go-live SaaS",
        "intent": "reduzir risco operacional em viradas de projeto e entrada em producao",
        "problem": "o go-live e tratado como data, nao como transicao operacional",
        "framework": "readiness, congelamento, comunicacao, suporte, criterios de rollback, monitoramento e hiper care",
        "cta": "Go-live bom nao termina na virada. Ele termina quando o cliente opera com seguranca.",
    },
    {
        "slug": "apoio-onboarding-saas-quando-faz-sentido",
        "title": "Onboarding SaaS: quando uma visão externa ajuda a organizar a operação",
        "short": "Visão externa em onboarding SaaS",
        "description": "Quando uma visão externa ajuda no onboarding SaaS e como uma leitura inicial prioriza processos, pessoas, IA e automacao.",
        "category": "Projetos",
        "breadcrumb": "Visão externa",
        "keyword": "apoio externo onboarding SaaS",
        "intent": "capturar leads que ja reconhecem problema operacional e buscam apoio externo",
        "problem": "o time sabe que precisa melhorar onboarding, mas esta ocupado demais para redesenhar a operacao",
        "framework": "sinais de contratacao, escopo do diagnostico, entregaveis, criterios de sucesso e primeiros movimentos",
        "cta": "Uma visão externa faz sentido quando o problema ja custa caro em atraso, retrabalho ou perda de confianca.",
    },
    {
        "slug": "transformacao-ia-pessoas-processos-relacionamento",
        "title": "Transformacao com IA em SaaS: por que pessoas, processos e relacionamento vem antes da ferramenta",
        "short": "IA, pessoas e processos",
        "description": "Por que transformacao com IA em SaaS precisa conectar pessoas, processos e relacionamento antes de automatizar.",
        "category": "AI Transformation",
        "breadcrumb": "Transformacao com IA",
        "keyword": "transformacao com IA em SaaS",
        "intent": "posicionar IA como mudanca operacional e humana, nao apenas tecnologia",
        "problem": "a empresa espera que a ferramenta resolva desalinhamento, falta de metodo e baixa adocao",
        "framework": "clareza de problema, rotina, papéis, comunicacao, dados, governanca, casos de uso e mudanca sustentada",
        "cta": "A ferramenta importa. Mas a transformacao acontece quando o time muda a forma de decidir, executar e aprender.",
    },
]


BODY_TEMPLATE = """{title}

{keyword_intro} Em muitas empresas SaaS, a discussao sobre IA, onboarding ou implantacao comeca pela ferramenta. O caminho mais produtivo e outro: entender o problema operacional, nomear os donos, organizar o processo e so depois escolher onde tecnologia acelera.

Este artigo parte de uma visao pratica: {intent}. A ideia nao e criar mais uma camada de burocracia, mas dar clareza para uma operacao que precisa crescer sem depender de improviso.

## O problema que costuma aparecer

O sintoma mais comum e simples de reconhecer: {problem}. No dia a dia, isso parece uma mistura de reunioes longas, mensagens espalhadas, pendencias sem dono e cliente pedindo previsibilidade.

Quando esse padrao se repete, a empresa perde margem, energia e confianca. O time ate trabalha muito, mas trabalha sobre ruido. O cliente recebe atualizacoes, mas nem sempre recebe seguranca. E a lideranca enxerga status, mas nem sempre enxerga risco real.

## O que precisa ser diagnosticado

Antes de propor solucao, eu olharia para cinco dimensoes:

1. **Jornada real:** como o processo acontece de verdade, nao como ele aparece na apresentacao.
2. **Pontos de decisao:** onde o fluxo espera aprovacao, informacao, validacao ou alinhamento.
3. **Riscos recorrentes:** quais bloqueios aparecem em varios clientes, projetos ou areas.
4. **Dados e evidencias:** que informacoes existem, onde estao e se alguem confia nelas.
5. **Relacionamento:** como cliente, CS, Produto, Delivery e lideranca compartilham contexto.

Esse diagnostico evita dois erros caros: automatizar bagunca e criar playbook que ninguem usa.

## Estrutura recomendada

Um bom primeiro desenho deveria incluir {framework}. Isso cria uma base concreta para decidir o que vira rotina, o que vira template, o que precisa de conversa humana e o que pode receber IA ou automacao.

O ponto mais importante e separar sintoma de causa. Se o problema e atraso, talvez a causa nao seja falta de cobranca. Pode ser handoff ruim, criterio de aceite vago, regra de negocio descoberta tarde ou stakeholder decisor ausente.

## Onde a IA entra bem

A IA entra bem quando existe contexto suficiente para orientar a resposta. Ela pode resumir historico, comparar cenarios, sugerir perguntas, organizar riscos, transformar reuniao em plano de acao e apontar padroes que passariam despercebidos.

Mas IA nao resolve falta de dono. Tambem nao resolve ausencia de criterio. Se a empresa nao sabe quem decide, qual metrica importa e qual risco e aceitavel, a IA apenas produz mais texto em cima da mesma confusao.

O uso mais forte costuma estar em tres frentes:

- **Leitura operacional:** transformar conversas, tickets e atas em sinais de risco.
- **Padronizacao inteligente:** gerar templates, checklists e roteiros adaptados ao contexto.
- **Apoio a decisao:** comparar opcoes, explicitar trade-offs e organizar proximos passos.

## Como medir se funcionou

Sem metrica, qualquer iniciativa de IA vira opiniao. Para esse tema, eu acompanharia indicadores como:

- reducao de retrabalho;
- tempo para destravar dependencia;
- qualidade do handoff;
- velocidade de decisao;
- clareza percebida pelo cliente;
- uso real do processo pelo time;
- quantidade de excecoes recorrentes transformadas em playbook.

O objetivo nao e medir tudo. E escolher poucos sinais que mostrem se a operacao ficou mais previsivel.

## Um primeiro movimento pratico

Escolha um recorte pequeno: uma etapa de onboarding, um tipo de cliente, uma reuniao recorrente ou um fluxo de implantacao. Mapeie o estado atual, liste dores, identifique donos e defina um caso de uso de IA com risco controlado.

Depois rode um piloto curto. Duas ou tres semanas ja costumam revelar se a melhoria faz sentido, quais dados faltam e que comportamento precisa mudar.

## Perguntas para levar para a sua operacao

- Onde hoje o cliente sente mais falta de previsibilidade?
- Qual decisao demora mais do que deveria?
- Que informacao vive espalhada em mensagem, planilha ou reuniao?
- Qual etapa depende de memoria de pessoas especificas?
- Onde a IA poderia reduzir ruido sem tirar proximidade humana?
- Que metrica provaria que a mudanca gerou valor?

## Fechamento

{cta} O caminho mais forte para SaaS B2B nao e usar IA por moda. E usar IA para fortalecer metodo, relacionamento e execucao.

Quando processo, pessoas e tecnologia caminham juntos, a operacao deixa de apenas entregar tarefas e passa a construir confianca.
"""


TOPICS = [topic for topic in TOPICS if topic["slug"] != "rituais-operacao-saas-b2b"]

PT_REPLACEMENTS = {
    "diagnostico": "diagnóstico",
    "Diagnostico": "Diagnóstico",
    "operacao": "operação",
    "Operacao": "Operação",
    "operacoes": "operações",
    "implantacao": "implantação",
    "Implantacao": "Implantação",
    "automacao": "automação",
    "Automacao": "Automação",
    "automacoes": "automações",
    "gestao": "gestão",
    "Gestao": "Gestão",
    "mudanca": "mudança",
    "Mudanca": "Mudança",
    "adocao": "adoção",
    "Adocao": "Adoção",
    "decisao": "decisão",
    "decisoes": "decisões",
    "acao": "ação",
    "acoes": "ações",
    "proximo": "próximo",
    "proximos": "próximos",
    "relacao": "relação",
    "Relacao": "Relação",
    "reuniao": "reunião",
    "reunioes": "reuniões",
    "criterio": "critério",
    "criterios": "critérios",
    "usuario": "usuário",
    "usuarios": "usuários",
    "necessario": "necessário",
    "necessarios": "necessários",
    "previsivel": "previsível",
    "visivel": "visível",
    "informacao": "informação",
    "informacoes": "informações",
    "validacao": "validação",
    "validacoes": "validações",
    "excecao": "exceção",
    "excecoes": "exceções",
    "classificacao": "classificação",
    "priorizacao": "priorização",
    "Priorizacao": "Priorização",
    "comunicacao": "comunicação",
    "transicao": "transição",
    "producao": "produção",
    "seguranca": "segurança",
    "confianca": "confiança",
    "experiencia": "experiência",
    "pratica": "prática",
    "pratico": "prático",
    "tecnica": "técnica",
    "tecnico": "técnico",
    "politico": "político",
    "critica": "crítica",
    "critico": "crítico",
    "minimo": "mínimo",
    "maximo": "máximo",
    "evidencia": "evidência",
    "evidencias": "evidências",
    "hipotese": "hipótese",
    "hipoteses": "hipóteses",
    "metrica": "métrica",
    "metricas": "métricas",
    "estrategica": "estratégica",
    "estrategico": "estratégico",
    "generico": "genérico",
    "generica": "genérica",
    "sistemico": "sistêmico",
    "sistemica": "sistêmica",
    "historico": "histórico",
    "possivel": "possível",
    "disponiveis": "disponíveis",
    "tambem": "também",
    "ate": "até",
    "so": "só",
    "ja": "já",
    "nao": "não",
}


def pt(text: str) -> str:
    for plain, accented in PT_REPLACEMENTS.items():
        text = re.sub(rf"\b{re.escape(plain)}\b", accented, text)
    return text


def frontmatter(topic: dict[str, str], publish_date: date) -> str:
    return f"""---
title: "{pt(topic['title'])}"
shortTitle: "{pt(topic['short'])}"
description: "{pt(topic['description'])}"
date: {publish_date.isoformat()}
category: "{pt(topic['category'])}"
readTime: "11 min"
breadcrumb: "{pt(topic['breadcrumb'])}"
---
"""


def body(topic: dict[str, str]) -> str:
    text = BODY_TEMPLATE.format(
        title=topic["title"],
        keyword_intro=f"O tema **{topic['keyword']}** ganha importancia quando a operacao precisa sair de iniciativas soltas e criar uma forma consistente de evoluir.",
        intent=topic["intent"],
        problem=topic["problem"],
        framework=topic["framework"],
        cta=topic["cta"],
    )
    return pt(text)


def archive_unpublished_existing() -> int:
    archive_dir = DRAFTS / "archive-before-2026-07-series"
    archived = 0
    archive_dir.mkdir(parents=True, exist_ok=True)
    for path in sorted(DRAFTS.glob("*.md")):
        if path.name.endswith(".published.md") or path.name == "README.md":
            continue
        target = archive_dir / path.name
        if target.exists():
            target = archive_dir / f"{path.stem}-archived{path.suffix}"
        path.rename(target)
        archived += 1
    return archived


def generate(start: date, cadence_days: int, archive_existing: bool) -> tuple[int, int]:
    DRAFTS.mkdir(parents=True, exist_ok=True)
    archived = archive_unpublished_existing() if archive_existing else 0
    for index, topic in enumerate(TOPICS):
        publish_date = start + timedelta(days=index * cadence_days)
        path = DRAFTS / f"{publish_date.isoformat()}-{topic['slug']}.md"
        path.write_text(frontmatter(topic, publish_date) + "\n" + body(topic) + "\n", encoding="utf-8")
    return archived, len(TOPICS)


def main() -> None:
    parser = argparse.ArgumentParser(description="Gera a proxima fila editorial do blog Munnius.")
    parser.add_argument("--start", default=START_DATE.isoformat(), help="Data do primeiro post em YYYY-MM-DD.")
    parser.add_argument("--cadence-days", type=int, default=CADENCE_DAYS, help="Intervalo entre posts.")
    parser.add_argument("--archive-existing", action="store_true", help="Arquiva drafts ainda nao publicados antes de gerar a nova fila.")
    args = parser.parse_args()
    start = date.fromisoformat(args.start)
    archived, created = generate(start, args.cadence_days, args.archive_existing)
    print(f"Archived {archived} unpublished drafts.")
    print(f"Generated {created} drafts from {start.isoformat()} every {args.cadence_days} days.")


if __name__ == "__main__":
    main()
