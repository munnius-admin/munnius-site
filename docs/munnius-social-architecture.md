# Munnius Social — fundação do MVP

## Direção de produto da operação manual

O aplicativo funciona como dois produtos leves no mesmo fluxo:

1. **contador de rotina**, com sessões agregadas por clínica;
2. **mini CRM de pré-qualificação**, com o mínimo necessário para uma closer continuar o atendimento.

O dashboard inicia ou retoma uma sessão diretamente em cada clínica. O funil apresenta
`Directs enviados → Conversando → Em follow-up → Perdidos → Encaminhados → Agendados → Compareceram`. Direct é
uma métrica agregada; o cadastro individual nasce quando a pessoa responde, evitando
duplicidade manual. Ao captar o telefone, o lead é qualificado e entregue à Hunter/closer.
O agendamento é feito pela Hunter; a social seller apenas registra no app o retorno de
agendamento, comparecimento ou ausência.

A passagem registra procedimento, temperatura e oito pontos de pré-qualificação,
agrupados em BANT: momento/investimento, autoridade de decisão, necessidade e tempo.
Cada grupo oferece uma pergunta conversacional pronta para copiar. O telefone e o envio
para a Hunter ficam bloqueados até os oito pontos serem concluídos. O WhatsApp recebe
uma mensagem comemorativa com o BANT organizado para que a abordagem não seja repetida.

A aba Sessão também funciona como uma ronda diária das clínicas, agrupada por prioridade
calculada a partir da faixa mensal informada no cadastro: A (30 min), B (20 min) e C
(15 min). O cronômetro é regressivo e avisa quando é hora de seguir, sem encerrar a
sessão à força. Cada linha consolida tempo e ações de todas as sessões do dia. A
imagem compartilhável do relatório é gerada sob demanda em formato 4:5, com identidade
discreta, ações, qualificados, agendamentos, comparecimentos e destaques por clínica;
nenhuma imagem é armazenada.

Identidade nunca faz parte do estado operacional compartilhado. Nome, e-mail e papel são
obtidos da conta autenticada a cada abertura, evitando que cache ou dados de
demonstração apareçam para outro usuário.

## Decisões

- Custo inicial: R$ 0 com GitHub Pages, Cloudflare Free e Supabase Free.
- Interface: PWA mobile-first, funcionando também no desktop.
- Cadastro público: inexistente. Usuários entram somente por convite.
- Papéis: `admin` gerencia usuários; `social_seller` gerencia toda a operação.
- Extensão Chrome: fundação MV3 em `social-extension`, com painel lateral, captura
  de eventos e fila offline; não executa ações no Instagram.
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
- `clinics`: dados da clínica e Hunter vinculada.
- `work_sessions`: contadores consolidados; não há uma linha por curtida.
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
4. Crie a primeira organização e convide usuários usando uma função administrativa
   server-side ou o painel do Supabase. Nunca exponha a `service_role`.
5. Copie URL e chave pública `anon` para `social/config.js`.
6. Adicione `https://social.munnius.com.br` às URLs permitidas de autenticação.
7. Teste dois membros na mesma organização e dois usuários em organizações diferentes.

As migrations devem permanecer versionadas junto do código e ser aplicadas primeiro
em prévia sempre que houver um ambiente separado.

## Subdomínio no Cloudflare

### Opção indicada para validar sem custo

1. Publique a branch somente em um ambiente de prévia ou faça merge após revisão.
2. No GitHub Pages, configure a origem da branch escolhida.
3. No Cloudflare DNS, crie um `CNAME`:
   - Nome: `social`
   - Destino: `munnius-admin.github.io`
   - Proxy: inicialmente `DNS only`
4. Adicione `social.munnius.com.br` como domínio personalizado no GitHub Pages.
5. Aguarde o certificado HTTPS ficar ativo; depois avalie ativar o proxy.

Como este repositório já usa `munnius.com.br` no Pages, um subdomínio isolado pode exigir
um repositório Pages próprio para não disputar o arquivo `CNAME`. Antes de mudar DNS,
confirme a estratégia: manter `/social` neste repositório ou mover a pasta para um novo
repositório `munnius-social`. Nenhuma alteração de DNS foi feita nesta entrega.

## Próximos incrementos

1. migrar gradualmente o snapshot compacto para as tabelas normalizadas;
2. convite administrativo por uma Edge Function com allowlist;
3. testes automatizados de concorrência e RLS com duas organizações;
4. extensão Chrome consumindo as mesmas tabelas e políticas.
