from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DRAFTS = ROOT / "blog" / "drafts"

TOPICS = [
    ("checklist-cenarios-teste-ia", "Checklist de cenários de teste com IA para implantação SaaS", "Checklist de testes com IA", "Um checklist prático para usar IA na criação de cenários de teste em onboarding, implantação SaaS e homologação.", "IA aplicada", "Checklist de testes", "cenários de teste com IA", "homologação", "testes chegam tarde e cobrem só o caminho feliz", "matriz de cenários, riscos, massa de dados e critérios de aceite"),
    ("ia-gestao-projetos-sem-perder-controle", "Como usar IA na gestão de projetos sem perder controle da implantação", "IA na gestão de projetos", "Veja como aplicar IA na gestão de projetos sem perder governança, contexto e clareza sobre riscos de implantação.", "IA aplicada", "IA em projetos", "IA na gestão de projetos", "governança", "a ferramenta acelera tarefas, mas o time perde clareza sobre dono, prazo e risco", "resumos executivos, atas, riscos, pendências e planos de ação"),
    ("onboarding-saas-b2b-escala", "O que um onboarding SaaS B2B precisa ter para escalar sem virar improviso", "Onboarding SaaS B2B", "Entenda os elementos de um onboarding SaaS B2B escalável: marcos, playbooks, handoffs, indicadores e relacionamento.", "Onboarding SaaS", "Onboarding escalável", "onboarding SaaS B2B", "onboarding", "cada cliente entra por uma jornada diferente e o time depende de memória", "marcos, playbooks, cadências, owners e comunicação clara"),
    ("playbook-onboarding-saas", "Playbook de onboarding SaaS: estrutura mínima para reduzir retrabalho", "Playbook de onboarding", "Um modelo prático de playbook de onboarding SaaS para reduzir retrabalho, alinhar times e melhorar ativação de clientes.", "Onboarding SaaS", "Playbook", "playbook de onboarding SaaS", "ativação", "o conhecimento fica na cabeça de poucas pessoas", "etapas, templates, critérios de avanço e riscos recorrentes"),
    ("implantacao-saas-marcos-riscos-dependencias", "Implantação SaaS: como organizar marcos, riscos e dependências do cliente", "Implantação SaaS", "Como organizar uma implantação SaaS com marcos claros, riscos visíveis, dependências do cliente e cadência de acompanhamento.", "Implantação SaaS", "Marcos e riscos", "implantação SaaS", "delivery", "o cronograma parece vivo, mas ninguém sabe o que está realmente bloqueado", "marcos, dependências, riscos, responsáveis e decisões executivas"),
    ("go-live-saas-criterios-aceite", "Go-live SaaS sem susto: critérios de aceite antes de colocar cliente em produção", "Go-live SaaS", "Critérios de aceite para reduzir surpresa no go-live SaaS e garantir prontidão técnica, operacional e de adoção.", "Implantação SaaS", "Go-live", "go-live SaaS", "homologação", "o projeto chega ao fim com validações subjetivas", "checklist de prontidão, donos, evidências e plano de contingência"),
    ("change-management-implantacao-saas", "Change management em implantação SaaS: como fazer cliente adotar de verdade", "Change management SaaS", "Como conduzir change management em implantação SaaS para transformar treinamento em adoção real do cliente.", "Change Management", "Adoção", "change management em implantação", "adoção", "o processo foi entregue, mas as pessoas continuam usando o fluxo antigo", "comunicação, treinamento, ritos, reforço e métricas de adoção"),
    ("adocao-software-b2b-treinamento-nao-resolve", "Adoção de software B2B: por que treinamento sozinho não resolve", "Adoção de software B2B", "Por que adoção de software B2B exige comunicação, contexto, rotina e gestão de mudança além de treinamentos.", "Change Management", "Adoção B2B", "adoção de software B2B", "clientes", "o treinamento acontece, mas o comportamento não muda", "comunicação recorrente, suporte, ritos e indicadores de uso"),
    ("alinhar-cs-produto-delivery-implantacao", "Como alinhar CS, Produto e Delivery durante uma implantação SaaS", "CS, Produto e Delivery", "Um guia para alinhar CS, Produto e Delivery em implantações SaaS com menos handoff frágil e mais clareza de decisão.", "Operação SaaS", "Alinhamento", "processos de customer success", "operação", "cada área enxerga uma parte do problema e o cliente sente o atrito", "rituais, matriz de decisão, handoffs e gestão de pendências"),
    ("indicadores-onboarding-saas", "Indicadores de onboarding SaaS: o que medir além do prazo de implantação", "Indicadores de onboarding", "Indicadores de onboarding SaaS para medir ativação, adoção, retrabalho, risco e percepção de valor do cliente.", "Onboarding SaaS", "Indicadores", "indicadores de onboarding SaaS", "métricas", "o time mede prazo, mas não mede qualidade de ativação", "métricas de avanço, adoção, bloqueios, retrabalho e valor percebido"),
    ("integracao-erp-saas-riscos-cedo", "Integração ERP em implantação SaaS: riscos que precisam aparecer cedo", "Integração ERP SaaS", "Principais riscos de integração ERP em implantação SaaS e como antecipar dependências antes do go-live.", "ERP e integrações", "Integrações", "integração ERP SaaS", "integração", "dependências técnicas aparecem tarde e viram crise de cronograma", "pré-requisitos, responsáveis, testes, dados e evidências"),
    ("homologacao-erp-regra-fiscal", "Homologação ERP: como evitar que regra fiscal apareça só no fim do projeto", "Homologação ERP", "Como estruturar homologação ERP para capturar regras fiscais, exceções e validações críticas antes da reta final.", "ERP e integrações", "Homologação ERP", "homologação ERP", "fiscal", "a regra fiscal aparece no fim e muda escopo, prazo e confiança", "matriz de testes, regras, exceções, massa de dados e aceite"),
    ("ia-atas-reunioes-planos-acao", "IA para atas de reunião: como transformar conversa em plano de ação de implantação", "IA para atas", "Use IA para transformar reuniões de implantação em decisões, pendências, riscos e planos de ação claros.", "IA aplicada", "Atas com IA", "IA para atas de reunião", "gestão de projetos", "reuniões geram anotações longas, mas poucas decisões rastreáveis", "resumo executivo, responsáveis, prazos, riscos e follow-ups"),
    ("kickoff-implantacao-saas", "Kickoff de implantação SaaS: perguntas que evitam desalinhamento com o cliente", "Kickoff SaaS", "Perguntas essenciais para um kickoff de implantação SaaS que alinha expectativa, dono, escopo e riscos desde o início.", "Implantação SaaS", "Kickoff", "kickoff implantação SaaS", "cliente", "o projeto começa simpático, mas sem alinhamento real de expectativa", "perguntas, decisões, donos, riscos e próximos passos"),
    ("matriz-riscos-onboarding", "Matriz de riscos para onboarding SaaS: como priorizar o que pode travar o cliente", "Matriz de riscos", "Como criar uma matriz de riscos para onboarding SaaS e priorizar bloqueios que afetam ativação e go-live.", "Onboarding SaaS", "Riscos", "matriz de riscos onboarding", "risco", "o time sabe que existem riscos, mas não sabe qual atacar primeiro", "probabilidade, impacto, dono, gatilho e plano de resposta"),
    ("automacao-follow-up-cliente-saas", "Automação de follow-up em implantação SaaS: onde ajuda e onde atrapalha", "Follow-up com automação", "Como automatizar follow-ups de implantação SaaS sem perder contexto, relacionamento e responsabilidade.", "IA aplicada", "Follow-up", "automação de follow-up", "relacionamento", "o time cobra pendências manualmente e perde histórico", "mensagens, gatilhos, contexto, exceções e escalonamento humano"),
    ("customer-success-onboarding", "Customer Success e onboarding: como conectar promessa comercial com ativação real", "CS e onboarding", "Como CS pode conectar promessa comercial, implantação e adoção para melhorar ativação no SaaS B2B.", "Operação SaaS", "CS e ativação", "customer success onboarding", "CS", "a venda promete valor, mas o onboarding não traduz isso em marcos", "handoff comercial, objetivos do cliente, marcos e indicadores de sucesso"),
    ("gestao-mudanca-clientes-enterprise", "Gestão de mudança em clientes enterprise: o que muda na implantação SaaS", "Mudança enterprise", "O que considerar em gestão de mudança para clientes enterprise durante implantação SaaS, integrações e adoção.", "Change Management", "Enterprise", "gestão de mudança enterprise", "enterprise", "muitos stakeholders participam, mas poucos mudam a rotina", "mapa de impacto, comunicação, patrocinadores, treinamento e sustentação"),
    ("templates-status-report-saas", "Status report para implantação SaaS: o que mostrar para diretoria e cliente", "Status report SaaS", "Modelo de status report para implantação SaaS com avanço, riscos, decisões, dependências e próximos marcos.", "Implantação SaaS", "Status report", "status report implantação", "governança", "o status vira texto bonito e não ajuda ninguém a decidir", "semáforo, progresso, bloqueios, decisões, riscos e próximos passos"),
    ("rituais-implantacao-saas", "Rituais de implantação SaaS: cadência mínima para não perder o controle", "Rituais de implantação", "Quais rituais manter em uma implantação SaaS para reduzir ruído, acelerar decisão e criar previsibilidade.", "Implantação SaaS", "Rituais", "rituais implantação SaaS", "cadência", "o time alterna entre silêncio e reunião demais", "daily enxuta, checkpoint, comitê, revisão de risco e retro"),
    ("ia-backlog-automacoes", "Backlog de automações com IA: como priorizar o que realmente vale testar", "Backlog de IA", "Como montar um backlog de automações com IA considerando impacto, risco, esforço, dono e maturidade do processo.", "IA aplicada", "Backlog de IA", "backlog de automações com IA", "priorização", "aparecem muitas ideias de IA e nenhuma vira resultado sustentado", "score de impacto, esforço, risco, dados e dono"),
    ("documentacao-viva-implantacao", "Documentação viva em implantação SaaS: como parar de criar PDFs que ninguém usa", "Documentação viva", "Como criar documentação viva para implantação SaaS com playbooks, decisões, aprendizados e uso prático no dia a dia.", "Operação SaaS", "Documentação", "documentação implantação SaaS", "processos", "documentos são criados no começo e abandonados até o go-live", "base viva, dono, atualização, exemplos e conexão com ritos"),
    ("hand-off-comercial-implantacao", "Handoff comercial para implantação: perguntas que protegem o onboarding", "Handoff comercial", "Como estruturar o handoff comercial para implantação SaaS e evitar desalinhamento logo no começo do onboarding.", "Onboarding SaaS", "Handoff", "handoff comercial implantação", "vendas", "o cliente chega com expectativas que o time de implantação não recebeu", "objetivos, escopo vendido, restrições, stakeholders e riscos"),
    ("maturidade-onboarding-saas", "Maturidade de onboarding SaaS: sinais de que sua operação ainda depende de heróis", "Maturidade onboarding", "Sinais de baixa maturidade no onboarding SaaS e como evoluir para playbooks, métricas e automação com contexto.", "Onboarding SaaS", "Maturidade", "maturidade onboarding SaaS", "escala", "a operação funciona porque pessoas específicas salvam o projeto", "níveis de maturidade, sintomas, riscos e plano de evolução"),
    ("ia-resumo-chamados-riscos", "IA para resumir chamados e encontrar riscos de implantação antes da reunião", "IA em chamados", "Como usar IA para resumir chamados, detectar padrões e antecipar riscos em projetos de implantação SaaS.", "IA aplicada", "Chamados", "IA para chamados", "suporte", "informações críticas ficam espalhadas em tickets e conversas", "classificação, padrões, riscos, pendências e perguntas para o cliente"),
    ("plano-30-60-90-onboarding", "Plano 30-60-90 para melhorar onboarding SaaS sem parar a operação", "Plano 30-60-90", "Um plano 30-60-90 para evoluir onboarding SaaS com diagnóstico, playbooks, indicadores e primeiros casos de IA.", "Onboarding SaaS", "Plano 30-60-90", "plano 30 60 90 onboarding", "execução", "a empresa quer melhorar tudo ao mesmo tempo e não sabe por onde começar", "diagnóstico, priorização, pilotos, indicadores e escala"),
    ("erros-implantacao-saas", "Erros comuns em implantação SaaS que parecem pequenos, mas custam caro", "Erros de implantação", "Erros comuns em implantação SaaS que geram retrabalho, desgaste com cliente e atraso de go-live.", "Implantação SaaS", "Erros comuns", "erros implantação SaaS", "retrabalho", "pequenas falhas de alinhamento viram grandes atrasos", "escopo, comunicação, testes, dados, donos e aceites"),
    ("experiencia-cliente-implantacao", "Experiência do cliente na implantação: como reduzir ansiedade durante o onboarding", "Experiência do cliente", "Como melhorar a experiência do cliente durante implantação SaaS com comunicação, marcos visíveis e menos incerteza.", "Onboarding SaaS", "Experiência", "experiência do cliente implantação", "CX", "o cliente não sabe se o projeto está avançando e perde confiança", "visibilidade, cadência, linguagem, próximos passos e gestão de expectativa"),
    ("governanca-leve-saas", "Governança leve para SaaS: controle suficiente sem burocratizar a operação", "Governança leve", "Como criar governança leve para SaaS B2B com ritos, indicadores e decisões sem transformar tudo em burocracia.", "Operação SaaS", "Governança", "governança leve SaaS", "gestão", "a empresa oscila entre improviso e excesso de controle", "mínimo viável de governança, indicadores, papéis e cadência"),
    ("consultoria-ia-saas-quando-contratar", "Consultoria de IA para SaaS: quando faz sentido contratar alguém de fora", "Consultoria de IA para SaaS", "Quando contratar consultoria de IA para SaaS e como saber se o problema é ferramenta, processo, dados ou adoção.", "IA aplicada", "Quando contratar", "consultoria de IA para SaaS", "estratégia", "a empresa quer IA, mas ainda não sabe qual problema vale resolver", "diagnóstico, maturidade, casos de uso, governança e primeiro experimento"),
]


BODY_TEMPLATE = """{intro}

## Por que esse tema importa agora

Em SaaS B2B, {context}. Quando esse ponto não está claro, a equipe até trabalha muito, mas o cliente sente pouca previsibilidade. O resultado costuma ser atraso, retrabalho, reuniões reativas e perda de confiança na implantação.

O papel da gestão não é criar mais controle por controle. É transformar o problema em leitura operacional: onde está o gargalo, quem decide, qual dado falta, qual risco precisa subir e qual próximo movimento destrava valor.

## O sintoma mais comum

O sintoma aparece quando {pain}. No começo parece pequeno, mas ele cria ruído em cadeia: CS cobra uma coisa, Delivery espera outra, Produto recebe contexto incompleto e o cliente não sabe exatamente o que precisa fazer.

Esse é o tipo de problema em que IA pode ajudar, mas só depois de o processo estar minimamente entendido. Sem contexto, a IA apenas acelera a confusão.

## Como estruturar na prática

1. Mapeie a jornada real, não a jornada ideal.
2. Liste os pontos de decisão e os responsáveis.
3. Separe sintomas de causas.
4. Defina o que precisa virar rotina, template ou automação.
5. Meça o avanço com poucos indicadores que orientem decisão.

Essa estrutura simples já muda a conversa. Em vez de discutir percepção, o time passa a discutir evidência, risco, prioridade e próximo passo.

## Onde a IA entra bem

A IA entra bem para acelerar {ai_use}. Ela também ajuda a transformar histórico disperso em perguntas melhores para o cliente, hipóteses de risco e listas de validação.

O cuidado é não tratar IA como substituta de relacionamento. Em onboarding e implantação, confiança ainda nasce de clareza, cadência, escuta e responsabilidade bem distribuída.

## Perguntas que eu faria em um diagnóstico

- Qual etapa mais atrasa hoje?
- O cliente entende exatamente o que precisa fazer?
- Quais dependências aparecem tarde demais?
- Que informação vive espalhada em reunião, ticket ou planilha?
- O que poderia ser padronizado sem perder personalização?
- Qual métrica mostraria que a mudança funcionou?

## Primeiro movimento recomendado

Comece com um recorte pequeno. Escolha um fluxo, um tipo de cliente ou uma etapa crítica. Documente o estado atual, desenhe a rotina desejada e escolha um caso de IA ou automação com impacto claro.

O objetivo não é parecer avançado. É reduzir ruído, ganhar previsibilidade e criar um método que o time consiga sustentar.

## Conclusão

{closing} Para SaaS B2B, o ganho real aparece quando tecnologia, processo e relacionamento caminham juntos. A IA é poderosa, mas só vira transformação quando entra em uma operação com dono, critério e cadência.
"""


def frontmatter(item: tuple[str, ...], publish_date: date) -> str:
    slug, title, short_title, description, category, breadcrumb, *_ = item
    return f"""---
title: "{title}"
shortTitle: "{short_title}"
description: "{description}"
date: {publish_date.isoformat()}
category: "{category}"
readTime: "8 min"
breadcrumb: "{breadcrumb}"
---
"""


def body(item: tuple[str, ...]) -> str:
    slug, title, short_title, description, category, breadcrumb, keyword, context, pain, ai_use = item
    intro = f"{title} é um tema cada vez mais importante para empresas SaaS que querem crescer sem transformar implantação em improviso. O ponto central não é adicionar mais uma ferramenta, mas criar método para que pessoas, processo, dados e tecnologia trabalhem na mesma direção."
    closing = f"{keyword.capitalize()} não deveria ser tratado como iniciativa isolada."
    return BODY_TEMPLATE.format(intro=intro, context=context, pain=pain, ai_use=ai_use, closing=closing)


def main() -> None:
    DRAFTS.mkdir(parents=True, exist_ok=True)
    start = date(2026, 5, 25)
    for index, item in enumerate(TOPICS):
        slug = item[0]
        publish_date = start + timedelta(days=index)
        path = DRAFTS / f"{publish_date.isoformat()}-{slug}.md"
        path.write_text(frontmatter(item, publish_date) + "\n" + body(item) + "\n", encoding="utf-8")
    print(f"Generated {len(TOPICS)} scheduled drafts in {DRAFTS}")


if __name__ == "__main__":
    main()
