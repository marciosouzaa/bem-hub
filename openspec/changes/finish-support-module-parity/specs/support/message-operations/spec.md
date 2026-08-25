## Purpose

Define o comportamento operacional de mensagens do Atendimento para texto, midia, reply, reacoes, edicao, exclusao, audio e validacao de tenant/provider.

## ADDED Requirements

### Requirement: Message action availability
O sistema SHALL exibir somente acoes executaveis para cada mensagem e SHALL manter acoes dependentes de contrato server-side indisponiveis ate o backend suportar a operacao com tenant, auditoria e fallback.

#### Scenario: Message menu shows safe actions
- **WHEN** um operador abre o menu de uma mensagem confirmada
- **THEN** o sistema mostra responder, copiar texto quando houver texto e baixar quando houver anexo disponivel

#### Scenario: Unsupported provider action is blocked
- **WHEN** edicao, exclusao remota ou reacao remota nao tiver contrato seguro para o provider do canal
- **THEN** o sistema nao executa a operacao e informa que o recurso ainda nao esta disponivel para aquele canal

### Requirement: Reply parity
O sistema SHALL permitir resposta citada para mensagens de texto e midia ja confirmadas, SHALL persistir a referencia interna e SHALL resolver o identificador externo no servidor.

#### Scenario: Outbound quoted reply
- **WHEN** operador responde uma mensagem existente com texto ou midia
- **THEN** a mensagem enviada e a thread exibem a citacao com autor, trecho ou tipo de midia e referencia ao anexo quando aplicavel

#### Scenario: Inbound quoted reply without resolvable payload
- **WHEN** o provider entrega uma mensagem que parece ser reply mas nao fornece payload suficiente para resolver a mensagem citada
- **THEN** o sistema persiste a mensagem recebida sem quebrar a conversa e registra lacuna de normalizacao para validacao do provider

### Requirement: Media lifecycle
O sistema SHALL suportar envio e recebimento de imagem, video, audio e documento por Storage privado tenant-scoped, com preview, viewer, download autenticado e estados explicitos de falha.

#### Scenario: Outbound media succeeds
- **WHEN** operador envia uma midia permitida dentro do limite de tamanho
- **THEN** o sistema salva o arquivo em Storage privado, cria mensagem com anexo, envia pelo provider e exibe preview ou fallback no historico

#### Scenario: Media upload or delivery fails
- **WHEN** upload, persistencia ou entrega ao provider falha
- **THEN** o sistema marca a tentativa como falha, nao deixa mensagem presa em enviando e permite diagnostico/retry sem duplicar entrega confirmada

#### Scenario: Cross-tenant media access is denied
- **WHEN** usuario de outra organizacao tenta abrir ou baixar anexo
- **THEN** o sistema nega acesso e nao gera URL assinada para o objeto

### Requirement: Message edit and delete policy
O sistema SHALL separar edicao/exclusao local de edicao/exclusao remota e SHALL preservar trilha auditavel para qualquer operacao destrutiva ou corretiva.

#### Scenario: Local delete hides message from default view
- **WHEN** operador autorizado apaga mensagem que nao pode ser removida do WhatsApp
- **THEN** o sistema oculta ou marca a mensagem conforme politica do produto sem apagar auditoria tenant-scoped

#### Scenario: Edit keeps previous value audit
- **WHEN** operador autorizado edita mensagem ainda elegivel conforme regra do canal
- **THEN** o sistema mostra conteudo atualizado e preserva conteudo anterior, autor da edicao e horario para auditoria

### Requirement: Reactions
O sistema SHALL representar reacoes como eventos de mensagem separados, idempotentes e vinculados a mensagem do mesmo atendimento.

#### Scenario: Inbound reaction
- **WHEN** provider entrega reacao para mensagem conhecida
- **THEN** o sistema registra ou atualiza a reacao sem duplicar e exibe o emoji junto da mensagem correta

#### Scenario: Reaction target not found
- **WHEN** provider entrega reacao para mensagem desconhecida ou de outra conversa
- **THEN** o sistema ignora a vinculacao visual e registra diagnostico sem falhar o webhook

### Requirement: Audio recording
O sistema SHALL permitir gravar audio no composer, revisar antes de enviar e tratar o audio como anexo privado normal.

#### Scenario: Operator records and sends audio
- **WHEN** operador grava audio, revisa e confirma envio
- **THEN** o sistema envia a mensagem de audio, exibe player na thread e preserva download autenticado pelo mesmo fluxo de midia

#### Scenario: Recording permission denied
- **WHEN** navegador nega acesso ao microfone
- **THEN** o sistema informa falha de permissao e mantem composer de texto/midia funcional

### Requirement: Provider validation matrix
O sistema SHALL manter uma matriz de smoke para Wuzapi e Evolution separando recursos locais, recursos dependentes de provider e lacunas conhecidas.

#### Scenario: Provider-dependent feature is not validated
- **WHEN** um recurso depende de payload real do provider ainda nao capturado
- **THEN** o recurso permanece marcado como pendente ate existir fixture sanitizada, teste de contrato e smoke real
