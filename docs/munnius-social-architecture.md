# Munnius Social — fundação do MVP

## Decisões

- Custo inicial: R$ 0 com GitHub Pages, Cloudflare Free e Supabase Free.
- Interface: PWA mobile-first, funcionando também no desktop.
- Cadastro público: inexistente. Usuários entram somente por convite.
- Papéis: `admin` gerencia usuários; `social_seller` gerencia toda a operação.
- Extensão Chrome: fora desta fase, mas o campo `source` já aceita `chrome_extension`.
- Auditoria: ações volumosas agregadas na sessão; fatos comerciais relevantes são append-only.

## Stack

O repositório existente é um site estático. O app segue a mesma stack para evitar build,
servidor próprio e mensalidade. A pasta `/social` contém HTML, CSS e JavaScript nativos.
O Supabase entra como autenticação, banco e RLS quando as credenciais públicas forem
adicionadas em `social/config.js`.

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

## Retenção

Permanentes: clínicas, leads, timeline curta, sessões agregadas, entregas e auditoria
comercial. Temporários no futuro: logs técnicos e eventos brutos da extensão. Relatórios
em imagem devem ser gerados sob demanda, não armazenados.

## Ativação do Supabase gratuito

1. Crie um projeto na região mais próxima disponível.
2. Em Authentication, mantenha e-mail/senha e desative cadastro público.
3. Execute `supabase/migrations/001_munnius_social_foundation.sql` no SQL Editor.
4. Crie a primeira organização e convide usuários usando uma função administrativa
   server-side ou o painel do Supabase. Nunca exponha a `service_role`.
5. Copie URL e chave pública `anon` para `social/config.js`.
6. Adicione `https://social.munnius.com.br` às URLs permitidas de autenticação.
7. Teste com dois usuários em organizações diferentes antes de inserir dados reais.

O arquivo SQL não é executado automaticamente. Isso evita alterar o projeto Supabase
aberto sem uma confirmação explícita.

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

1. CRUD real de clínicas, leads, follow-ups e mensagens via Supabase.
2. convite administrativo por uma Edge Function com allowlist.
3. relatório renderizado em PNG no próprio navegador.
4. testes de RLS e fluxo de recuperação de senha.
5. extensão Chrome consumindo as mesmas tabelas e políticas.
