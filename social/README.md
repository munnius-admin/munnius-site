# Munnius Social

Abra `index.html` por um servidor local. Sem Supabase, qualquer e-mail e senha com seis
caracteres iniciam o modo de demonstração somente em `localhost`; uma publicação sem
configuração permanece bloqueada. Sessões encerradas são mantidas no armazenamento
local do navegador.

Para conectar o Supabase, copie os valores públicos de `config.example.js` para
`config.js`. Nunca coloque a chave `service_role` no frontend.

Consulte `../docs/munnius-social-architecture.md` para arquitetura, RLS e publicação.
