# Munnius Social Assistant

Extensão Chrome Manifest V3 para acompanhar a operação manual no Instagram Web.

## O que a versão 0.4 faz

- abre um painel lateral persistente no Instagram;
- autentica com a mesma conta do Munnius Social;
- carrega as clínicas do espaço compartilhado;
- identifica o `@` da conta conectada em cada guia e associa automaticamente a clínica cadastrada;
- mantém clínica, automação, sessão e contadores separados por guia, inclusive em várias janelas;
- inicia e encerra uma sessão por clínica, exigindo uma seleção válida;
- separa o botão de automação da sessão: todos os lançamentos manuais continuam disponíveis com a automação desligada;
- detecta visitas a perfis, curtidas por botão ou duplo clique, comentários e Directs enviados em página ou modal;
- mantém um botão manual independente em cada contador quando o Instagram não oferece contexto confiável;
- transforma o primeiro Direct detectado em **Lead mapeado**, ligado ao `@` quando disponível;
- não soma novamente o Direct de uma conversa que já foi mapeada;
- avança o mesmo `@` para **Conversando** ao reconhecer uma mensagem não lida ou, como contingência, ao detectar o segundo envio naquela conversa;
- reconstrói o histórico mínimo a partir dos Directs e Leads sincronizados para manter a deduplicação após recarregar a extensão;
- avança o mesmo `@` para **Conversando** e **Telefone captado**, sem duplicar o lead;
- permite registrar resposta ou telefone mesmo sem Direct anterior, para cobrir exceções;
- identifica possíveis telefones com ou sem DDD visíveis no Direct e abre uma revisão;
- mostra nome, `@` editável, temperatura, procedimento, checklist BANT e resumo das respostas no painel;
- salva o telefone ou envia a mensagem pronta para a Hunter mesmo com o checklist vazio;
- mantém contador, saldo diário do cronômetro e uma lista acionável dos leads da sessão;
- permite avançar os cards da clínica selecionada pelo próprio painel lateral;
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
como não lida; o `@` permanece editável e os botões manuais continuam disponíveis porque
inferir o autor de cada mensagem apenas pelo HTML pode gerar falsos positivos.

Nenhum texto completo de conversa é armazenado. A busca de telefone ocorre somente na
área visível do Direct, e o número só é gravado após confirmação.

Em uso com várias janelas, cada Instagram deve permanecer em sua própria guia e o painel
lateral deve estar aberto nessa guia. A automação só pode ser ativada quando o `@` conectado
corresponder ao Instagram cadastrado na clínica; caso contrário, o painel informa a divergência.
