## Purpose

Define paridade operacional da inbox de Atendimento com comportamento esperado de mensageiro para nao lidas, fixados, filtros e notificacoes.

## ADDED Requirements

### Requirement: Unread state per operator
O sistema SHALL rastrear leitura por operador e SHALL diferenciar nao lidas reais de mensagens proprias, eventos historicos e sincronizacao.

#### Scenario: Incoming message increments unread
- **WHEN** uma nova mensagem de contato chega em atendimento visivel ao operador
- **THEN** o contador de nao lidas daquele atendimento aumenta para operadores que ainda nao abriram ou marcaram a conversa como lida

#### Scenario: Operator opens conversation
- **WHEN** operador abre atendimento com mensagens nao lidas
- **THEN** o sistema marca como lidas para aquele operador sem afetar leitura de outros operadores

### Requirement: Unread filters and cards
O sistema SHALL permitir filtrar atendimentos nao lidos e SHALL mostrar contador de nao lidas no card da inbox.

#### Scenario: Filter unread conversations
- **WHEN** operador seleciona filtro de mensagens nao lidas
- **THEN** a inbox mostra somente atendimentos com contador maior que zero para aquele operador

#### Scenario: Card shows unread count
- **WHEN** atendimento possui mensagens nao lidas
- **THEN** o card exibe badge com contagem, usando limite visual para valores altos

### Requirement: Mark conversation unread
O sistema SHALL permitir marcar atendimento como nao lido sem criar mensagem falsa e sem alterar status de entrega/leitura do WhatsApp.

#### Scenario: Operator marks conversation unread
- **WHEN** operador usa acao marcar como nao lido
- **THEN** o atendimento volta a aparecer como nao lido para esse operador e conserva mensagens reais intactas

### Requirement: Pin conversations
O sistema SHALL permitir fixar atendimento por operador e SHALL ordenar fixados acima dos nao fixados respeitando filtros ativos.

#### Scenario: Operator pins conversation
- **WHEN** operador fixa atendimento
- **THEN** o card permanece no topo do grupo aplicavel e mostra indicador de fixado

#### Scenario: Operator unpins conversation
- **WHEN** operador remove fixacao
- **THEN** o atendimento volta a seguir ordenacao normal por filtro e atividade

### Requirement: Audible notifications
O sistema SHALL emitir notificacao sonora configuravel somente para novas mensagens elegiveis ao operador.

#### Scenario: Assigned conversation receives incoming message
- **WHEN** atendimento atribuido ao operador atual recebe nova mensagem de contato
- **THEN** o sistema toca som se notificacoes sonoras estiverem habilitadas

#### Scenario: Unassigned new conversation receives incoming message
- **WHEN** novo atendimento sem responsavel recebe mensagem de contato
- **THEN** o sistema toca som para operadores elegiveis do departamento ou da organizacao

#### Scenario: Ineligible event does not play sound
- **WHEN** evento e mensagem propria, sync historico, protocolo, atendimento de outro operador ou atualizacao sem nova mensagem do contato
- **THEN** o sistema nao toca som

### Requirement: Notification preference
O sistema SHALL permitir ao usuario controlar notificacao sonora sem alterar regras globais da organizacao.

#### Scenario: Sound disabled by user
- **WHEN** usuario desativa notificacao sonora
- **THEN** novos eventos elegiveis atualizam badges e lista, mas nao tocam som naquele navegador
