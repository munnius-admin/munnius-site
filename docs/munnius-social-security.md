# Munnius Social — segurança e confiança

## Princípios do produto

O Munnius Social aplica isolamento por organização, acesso mínimo por função e coleta
restrita aos dados necessários para a operação de social selling. O frontend nunca é a
única barreira de segurança: as regras de acesso também vivem no banco.

## Controles implementados

- **Isolamento multi-tenant:** registros operacionais carregam `organization_id` e são
  protegidos por Row Level Security no PostgreSQL.
- **Permissões por função:** Admin administra organizações e usuários; Social seller
  opera clínicas, sessões, leads e relatórios; Gestor possui visualização e exportação
  sem escrita.
- **Autenticação gerenciada:** sessões, login por senha e identidade Google são tratados
  pelo Supabase Auth. O aplicativo não armazena senhas de usuários ou do Instagram.
- **Transporte protegido:** o produto é servido em HTTPS pelo domínio oficial, com
  hospedagem no Cloudflare Pages e APIs do Supabase.
- **Coleta mínima:** não são armazenados HTML do Instagram, capturas contínuas de tela,
  teclas digitadas ou conversas completas. O histórico comercial é resumido.
- **Auditoria enxuta:** alterações importantes permanecem rastreáveis sem criar uma linha
  permanente para cada ação volumosa.

## Limites e comunicação responsável

Esta arquitetura reduz o risco operacional, mas não substitui governança, revisão de
acessos e políticas internas. O produto não deve exibir selos de certificação nem alegar
conformidade legal formal sem uma avaliação específica. SMTP, integrações externas e
novas categorias de dados só devem ser ativados após revisão de necessidade, custo e
privacidade.
