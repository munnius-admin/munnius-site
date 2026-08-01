# Munnius Social — fundação do MVP

## Direção de produto da operação manual

O aplicativo funciona como dois produtos leves no mesmo fluxo:

1. **contador de rotina**, com sessões agregadas por clínica;
2. **mini CRM de pré-qualificação**, com o mínimo necessário para uma closer continuar o atendimento.

O dashboard inicia ou retoma uma sessão diretamente em cada clínica. O CRM é um Kanban
horizontal com `Mapeados → Conversando → Perdidos → Com a Hunter → Agendados →
Desfecho`. A data de follow-up continua disponível dentro do card, mas não cria uma etapa
separada: o lead permanece em Conversando. Cada Direct pode guardar um `@` e avançar no mesmo registro para
respondido e telefone captado. O `@` continua opcional para que exceções e trabalho em
ritmo rápido não fiquem bloqueados. Ao captar o telefone, o lead pode ser entregue à
Hunter/closer imediatamente.
O agendamento é feito pela Hunter; a social seller apenas registra no app o retorno de
agendamento, comparecimento ou ausência.

A passagem registra procedimento, temperatura e oito pontos de pré-qualificação,
agrupados em BANT: momento/investimento, autoridade de decisão, necessidade e tempo.
Cada grupo oferece uma pergunta conversacional pronta para copiar e um resumo curto da
resposta dada pelo lead. O checklist é um
guia, não uma trava: nenhum item é obrigatório para salvar o telefone ou enviar para a
Hunter. A mensagem de WhatsApp inclui apenas o contexto realmente apurado; quando não
há checklist preenchido, entrega os dados mínimos do lead sem inventar informações.

Um Direct mapeado sem evolução vence em sete dias. Directs sem `@` ficam em lotes
agregados e datados por clínica/sessão. Quando uma resposta também chega sem `@`, uma
unidade sai do lote mapeado mais antigo (FIFO) e entra em um lote anônimo de Conversando,
com novo prazo próprio de quatorze dias. Lotes criados em datas diferentes mantêm
vencimentos independentes. Quando o perfil é identificado, o sistema consome primeiro o
lote anônimo compatível e passa a exibir apenas o card nominal. Assim o volume é
auditável sem criar centenas de cards vazios. Lotes anônimos expirados não inflam o total
visual da coluna Perdidos; aparecem apenas como movimentação agregada no período. A atividade seguinte atualiza a data de referência; leads sem
evolução são movidos para Perdidos quando o aplicativo é aberto. A fila da Hunter fica
agrupada por responsável, com atalhos para cobrar agendamento e registrar comparecimento.

A aba Sessão funciona como uma ronda diária das clínicas, agrupada por prioridade
calculada a partir da faixa mensal informada no cadastro: A (30 min), B (20 min) e C
(15 min). O cronômetro é regressivo e avisa quando é hora de seguir, sem encerrar a
sessão à força. Ao sair da seção Sessão, ele pausa; ao retornar, continua do saldo
restante. Encerrar e reabrir a mesma clínica no mesmo dia desconta o tempo já trabalhado
do limite diário, em vez de começar novamente do zero. Cada linha consolida tempo e os
cinco contadores de todas as sessões do dia: curtidas, comentários, Directs, respostas e
telefones. Novos follows não fazem parte da operação nem dos relatórios. As metas de telefones e agendamentos são
globais, configuráveis por período e nunca vinculadas individualmente a uma clínica.
A Home separa o estoque atual do CRM dos acontecimentos do período. Os relatórios usam
duas leituras conectadas: ações executadas no período (incluindo telefone captado) e o
Status atual de Social Selling da Fila de oportunidades. Cada etapa da fila exibe no
mesmo bloco o saldo atual, quantos cards avançaram no período e o percentual de passagem.
Perdidos permanece apenas no Kanban; no relatório aparece discretamente somente o volume
que expirou dentro do período. A data real do agendamento não substitui a data em que a
confirmação foi registrada.

A imagem compartilhável do relatório é gerada sob demanda, com altura adaptável para
incluir todas as clínicas, identidade discreta, ações, qualificados, agendamentos e comparecimentos;
nenhuma imagem é armazenada.

Identidade nunca faz parte do estado operacional compartilhado. Nome, e-mail e papel são
obtidos da conta autenticada a cada abertura, evitando que cache ou dados de
demonstração apareçam para outro usuário.

## Decisões

- Custo inicial: R$ 0 com GitHub Pages, Cloudflare Free e Supabase Free.
- Interface: PWA mobile-first, funcionando também no desktop.
- Relatórios: o PNG é uma captura local do próprio card renderizado, usando `html2canvas` 1.4.1 vendorizado sob licença MIT, sem API paga.
- Cadastro público: inexistente. Usuários entram somente por convite.
- Papéis: `admin` gerencia usuários; `social_seller` gerencia toda a operação; `manager`
  visualiza dados, usa filtros e exporta relatórios sem qualquer permissão de escrita.
  O bloqueio do Gestor existe tanto na interface quanto nas políticas RLS do banco.
- Administração da plataforma: `platform_admins` concede ao Gabriel uma área própria para
  criar organizações e permitir, pausar ou reativar acessos. Esse privilégio não mistura
  dados operacionais: o RLS continua exigindo vínculo ativo com a organização para ler
  clínicas, sessões, leads e relatórios.
- Extensão Chrome: MV3 em `social-extension`, com painel lateral compacto, captura de
  eventos, fila offline, controles manuais independentes e card completo de BANT por `@`;
  não executa ações no Instagram.
- Auditoria: ações volumosas agregadas na sessão; fatos comerciais relevantes são append-only.
- Segurança de prévia: o modo demonstração só funciona em `localhost`; sem Supabase,
  um endereço público não aceita login.

## Stack

O repositório existente é um site estático. O app segue a mesma stack para evitar build,
servidor próprio e mensalidade. A pasta `/social` contém HTML, CSS e JavaScript nativos.
O Supabase entra como autenticação, banco e RLS quando as credenciais públicas forem
adicionadas em `social/config.js`.

A extensão usa somente APIs nativas do Chrome e chamadas REST ao Supabase. Não carrega
JavaScript remoto, não armazena senha e limita o acesso de página a
`https://www.instagram.com/*`. Os eventos seguem para `extension_events` e são
consolidados pelo PWA no mesmo snapshot operacional.

## Modelo de dados

Todas as tabelas operacionais possuem `organization_id`. O RLS valida associação ativa
em `organization_members`; conhecer ou alterar um ID no navegador não libera dados de
outra organização.

- `organizations`, `profiles`, `organization_members`: isolamento e acesso.
- `platform_admins`, `access_invites`: gestão global de organizações e e-mails permitidos.
  Um convite é associado a uma organização antes do primeiro login e é reivindicado pelo
  mesmo e-mail autenticado; o usuário nunca escolhe a própria organização.
- `clinics`: dados da clínica e Hunter vinculada.
- `work_sessions`: contadores consolidados; não há uma linha por curtida.
- `directs` no snapshot compacto: trilha individual enxuta por `@`, com datas de envio,
  resposta e telefone.
- `anonymousDirectBatches` no snapshot: volume sem `@` agregado por clínica/sessão,
  com saldos mapeado, associado e expirado.
- `anonymousConversationBatches` no snapshot: respostas sem `@` agregadas por data,
  clínica e sessão, com prazo individual de quatorze dias.
- `leads`: estado atual do mini CRM.
- `lead_timeline`: histórico curto e datado do lead.
- `follow_ups`, `message_templates`, `hunter_deliveries`: operação diária.
- `audit_events`: fatos relevantes e correções, sem HTML, prints ou conversas completas.
- `organization_snapshots`: estado compacto compartilhado por toda a organização
  durante o MVP, com atualização em tempo real e mesclagem por ID.

## Retenção

Permanentes: clínicas, leads, timeline curta, sessões agregadas, entregas e auditoria
comercial. Temporários no futuro: logs técnicos e eventos brutos da extensão. Relatórios
em imagem devem ser gerados sob demanda, não armazenados.

## Ativação do Supabase gratuito

1. Crie um projeto na região mais próxima disponível.
2. Em Authentication, mantenha e-mail/senha e desative cadastro público.
3. Execute, em ordem, os arquivos de `supabase/migrations` no SQL Editor.
4. Após as migrations `008_platform_admin_and_access.sql` e `010_manager_read_only.sql`, use **Mais → Organizações e
   acessos** no perfil administrador da plataforma para criar organizações e permitir
   usuários. O caminho gratuito recomendado é permitir o e-mail e orientar a pessoa a
   usar **Entrar com Google** com exatamente o mesmo endereço; o primeiro login reivindica
   o convite e cria o vínculo com a organização. A função `admin-access` tenta enviar o
   convite quando há entrega disponível e recua com segurança para o login Google quando
   o provedor de e-mail recusa a entrega. Nunca exponha a `service_role` no navegador.
   O template visual do convite está versionado em `docs/supabase-invite-email-template.html`.
   No projeto gratuito atual, o envio padrão não deve ser tratado como correio de produção
   para endereços externos. Templates personalizados e entrega confiável exigem SMTP
   próprio. Não contrate nem conecte um provedor sem aprovação explícita.
5. Copie URL e chave pública `anon` para `social/config.js`.
6. Adicione `https://social.munnius.com.br` às URLs permitidas de autenticação.
7. Teste dois membros na mesma organização e dois usuários em organizações diferentes.

Fotos de clínicas podem usar o bucket público `clinic-images`, com limite de 2 MB e
políticas por organização previstas em `007_clinic_images.sql`. A migração deve ser
aplicada somente quando o recurso for ativado; imagens contam na franquia gratuita de
Storage e não ocupam o banco PostgreSQL.

As migrations devem permanecer versionadas junto do código e ser aplicadas primeiro
em prévia sempre que houver um ambiente separado.

## Publicação gratuita

O aplicativo está hospedado no Cloudflare Pages, projeto `munnius-social`, com o domínio
personalizado `social.munnius.com.br`. A pasta publicada é `social`; nenhuma função paga,
servidor dedicado ou serviço de build obrigatório faz parte do fluxo.

Para novas versões:

1. valide localmente;
2. registre a alteração na branch de desenvolvimento;
3. envie a branch ao GitHub;
4. publique a pasta `social` no projeto Pages;
5. confira HTTPS, login, sincronização e versão do service worker no domínio final.

O DNS e o domínio já configurados não devem ser recriados a cada publicação.

## Próximos incrementos

1. migrar gradualmente o snapshot compacto para as tabelas normalizadas;
2. convite administrativo por uma Edge Function com allowlist;
3. testes automatizados de concorrência e RLS com duas organizações;
4. validar os seletores da extensão com a conta real da Hiara e ajustar falsos positivos.
