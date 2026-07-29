# Munnius Social Assistant

Extensão Chrome Manifest V3 para acompanhar a operação manual no Instagram Web.

## O que esta primeira versão faz

- abre um painel lateral persistente no Instagram;
- autentica com a mesma conta do Munnius Social;
- carrega as clínicas do espaço compartilhado;
- inicia e encerra uma sessão por clínica;
- detecta visitas a perfis, follows, curtidas, comentários e Directs enviados;
- transforma cada Direct detectado em **Lead mapeado**, ligado ao `@` quando disponível;
- avança o mesmo `@` para **Conversando** e **Telefone captado**, sem duplicar o lead;
- permite registrar resposta ou telefone mesmo sem Direct anterior, para cobrir exceções;
- identifica possíveis telefones visíveis no Direct e abre uma revisão;
- mostra temperatura, procedimento e checklist BANT opcional no painel;
- salva o telefone ou envia a mensagem pronta para a Hunter mesmo com o checklist vazio;
- mantém contador, saldo diário do cronômetro e histórico por `@` ao vivo;
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
reais na conta da Hiara. A extensão tenta reconhecer a abertura de uma conversa marcada
como não lida; os botões manuais de avanço continuam disponíveis porque inferir o autor
de cada mensagem apenas pelo HTML pode gerar falsos positivos.

Nenhum texto completo de conversa é armazenado. A busca de telefone ocorre somente na
área visível do Direct, e o número só é gravado após confirmação.
