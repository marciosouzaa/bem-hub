## Purpose

Define roteamento de Atendimento por departamentos/equipes, departamento padrao por canal e vinculo com assistente IA padrao para futura triagem assistida.

## ADDED Requirements

### Requirement: Department registry
O sistema SHALL permitir que administradores mantenham departamentos por organizacao, com nome, status ativo e assistente IA padrao opcional.

#### Scenario: Admin creates department
- **WHEN** administrador cria departamento
- **THEN** o departamento fica disponivel somente na organizacao atual e pode ser usado por canais e atendimentos

#### Scenario: Member cannot manage departments
- **WHEN** membro sem permissao administrativa tenta criar, editar ou arquivar departamento
- **THEN** o sistema nega a operacao no servidor

### Requirement: Every support conversation has department
O sistema SHALL garantir que todo atendimento novo tenha departamento definido antes de aparecer como operacional.

#### Scenario: Contact starts conversation through channel with default department
- **WHEN** contato inicia atendimento por canal que possui departamento padrao ativo
- **THEN** o atendimento e criado ja vinculado ao departamento padrao do canal

#### Scenario: No active default department exists
- **WHEN** contato inicia atendimento por canal sem departamento padrao ativo
- **THEN** o sistema coloca atendimento em estado de roteamento pendente visivel para administradores e nao envia resposta automatica

### Requirement: Channel default department
O sistema SHALL permitir definir departamento padrao por canal de atendimento e SHALL impedir vinculo com departamento de outra organizacao.

#### Scenario: Admin sets channel default department
- **WHEN** administrador escolhe departamento padrao para um canal
- **THEN** novos atendimentos daquele canal herdam o departamento ate nova configuracao

#### Scenario: Cross-tenant department assignment is rejected
- **WHEN** requisicao tenta vincular canal ou atendimento a departamento de outra organizacao
- **THEN** o sistema rejeita a operacao no servidor

### Requirement: Department assignment and transfer
O sistema SHALL permitir transferir atendimento entre departamentos mantendo auditoria e respeitando visibilidade por organizacao.

#### Scenario: Operator transfers conversation
- **WHEN** operador autorizado muda departamento do atendimento
- **THEN** o sistema registra evento de transferencia e atualiza filtros, cards e elegibilidade de notificacao

### Requirement: Department assistant default
O sistema SHALL permitir vincular assistente IA padrao ao departamento para uso futuro em rascunhos ou triagem inicial, sem ativar envio automatico.

#### Scenario: Department has default assistant
- **WHEN** atendimento novo entra em departamento com assistente padrao
- **THEN** o atendimento carrega referencia de assistente elegivel para futura triagem ou rascunho

#### Scenario: Automatic send remains disabled
- **WHEN** atendimento sem operador recebe mensagem inicial e possui assistente padrao
- **THEN** o sistema nao envia resposta automatica sem funcionalidade explicita e validada de automacao

### Requirement: Department-aware inbox
O sistema SHALL permitir filtrar e notificar atendimentos por departamento sem vazar atendimentos entre organizacoes.

#### Scenario: Operator filters by department
- **WHEN** operador filtra inbox por departamento
- **THEN** o sistema mostra somente atendimentos daquele departamento dentro da organizacao atual
