# Munnius Social Assistant

Extensão Chrome Manifest V3 para acompanhar a operação manual no Instagram Web.

## O que esta primeira versão faz

- abre um painel lateral persistente no Instagram;
- autentica com a mesma conta do Munnius Social;
- carrega as clínicas do espaço compartilhado;
- inicia e encerra uma sessão por clínica;
- detecta visitas a perfis, follows, curtidas, comentários e Directs enviados;
- transforma o primeiro Direct detectado em **Lead mapeado** e uma resposta confirmada em **Conversando**;
- identifica possíveis telefones visíveis no Direct e exige confirmação;
- mantém contador e histórico ao vivo;
- grava eventos enxutos no Supabase para posterior consolidação pelo app;
- oferece mensagens rápidas para copiar e personalizar.

Ela não curte, segue, comenta ou envia mensagens automaticamente. A extensão apenas
observa as ações executadas pela usuária no Instagram Web.

## Instalação local

1. Aplique `supabase/migrations/005_extension_events.sql`.
2. Abra `chrome://extensions`.
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação**.
5. Selecione a pasta `social-extension`.
6. Abra o Instagram e clique no ícone da extensão para mostrar o painel lateral.
7. Entre com a mesma conta usada em `social.munnius.com.br`.

## Limites conhecidos

O Instagram altera a estrutura do HTML com frequência. Os detectores usam texto
acessível e contexto, evitando seletores internos frágeis, mas precisam de testes
reais na conta da Hiara. Respostas recebidas permanecem com confirmação manual nesta
fase, pois inferir automaticamente o autor de cada mensagem pode gerar falsos positivos.

Nenhum texto completo de conversa é armazenado. A busca de telefone ocorre somente na
área visível do Direct, e o número só é gravado após confirmação.
