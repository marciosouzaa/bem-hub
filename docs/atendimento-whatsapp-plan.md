# Plano de atendimento WhatsApp

Plano focado para transformar a fundacao atual de canais, contatos e atendimento
em um modulo operacional do BEM HUB. A analise consolida padroes funcionais,
arquiteturais e de seguranca pertinentes ao produto. Nao altera a ordem global
do MVP nem incorpora canais e recursos fora do escopo definido.

## Decisao executiva

- Manter um unico dominio interno de atendimento, independente do fornecedor.
- Usar a **Meta WhatsApp Cloud API diretamente** para o canal oficial.
- Validar **Uazapi como primeiro adapter do piloto nao oficial** e **Z-API como
  segundo adapter** no mesmo contrato interno. A escolha usa testes reais do
  responsavel pelo produto e reduz risco de depender de um unico fornecedor.
- Nao usar Evolution API ou WAHA no primeiro corte. Continuam substituiveis por
  adapter, sem contaminar o dominio.
- Entregar primeiro texto de ponta a ponta: conectar numero, receber mensagem,
  criar contato/conversa, assumir, responder e acompanhar entrega.
- Mensagem escrita pelo operador no composer e enviada diretamente por endpoint
  HTTP. Nao passa por rascunho ou aprovacao e nao usa WebSocket para transporte.
- Geracao por IA continua como rascunho com revisao humana. Ela vem depois do
  transporte real e nunca envia sozinha.
- Reformular `/app/support` como console operacional de tres areas e criar um
  modulo minimo de contatos, sem importar a amplitude de suites omnichannel.

## Escopo deste plano

Incluido:

- WhatsApp oficial e nao oficial;
- cadastro e saude das conexoes;
- recebimento e envio de texto;
- fila, atribuicao, leitura, resolucao e reabertura;
- contato criado ou atualizado por mensagem recebida;
- status de entrega e falha;
- rascunho de IA com aprovacao humana;
- fundacao para midia e templates oficiais.

Fora deste corte:

- Instagram, Messenger, Telegram, e-mail e chat web;
- departamentos, filas complexas e matriz granular de permissoes;
- grupos, campanhas, disparo em massa e listas de transmissao;
- bots autonomos, fluxos visuais e respostas automaticas;
- chamadas, video, co-browsing e multiplos atendimentos abertos em paineis;
- importacao, merge e operacoes em massa de contatos;
- sincronizar todo o historico existente no aparelho.

## Diagnostico do BEM HUB atual

A fundacao ja acerta quatro pontos:

- separa `/app/channels` de `/app/support`;
- isola dados por `organization_id` e usa RLS;
- possui contrato inicial de adapter e idempotencia;
- persiste rascunho, aprovacao, rejeicao e escalada sem envio externo.

Ela ainda nao forma um atendimento funcional:

1. O cadastro mistura modalidade com autenticacao. Canal oficial nao conecta por
   QR/PIN; ele usa ativos Meta, credenciais e onboarding proprio. QR ou codigo de
   pareamento pertence ao canal nao oficial.
2. `channel_connections.config` nao deve receber segredos em JSON comum.
3. O status da mensagem mistura revisao humana com entrega ao WhatsApp. Um
   rascunho aprovado nao equivale a uma mensagem enviada ou entregue.
4. A entrada de texto Uazapi já passa por webhook idempotente; envio, retry,
   outbox e auditoria operacional ainda faltam.
5. Identidades externas agora separam telefone, `wa_id`, JID e LID por canal;
   merge e CRUD operacional de contatos ainda faltam.
6. O banco garante uma conversa ativa por contato e canal. Ainda não há leitura
   por operador nem histórico de atribuição.
7. A inbox nao mostra ultima mensagem, horario, nao lidas, responsavel,
   prioridade ou saude do canal.
8. Contatos existem apenas como tabela de apoio; nao ha tela operacional.
9. RLS permite mutacoes amplas para membros. Transicoes importantes devem passar
   por RPCs ou servicos server-side com regras explicitas.

## Aprendizados aplicados ao BEM HUB

A modelagem considera os fluxos completos de atendimento, canais e contatos:
tipos, clientes HTTP, paginas, composer, entidades, servicos de canal, webhooks e
handlers de mensagem. Somente os elementos compativeis com o MVP foram mantidos.

### Ideias que valem trazer para nosso contexto

- Separar fila, meus atendimentos e concluidos.
- Manter ultima mensagem, nao lidas, responsavel, prioridade e canal no resumo da
  conversa.
- Usar uma area central para a conversa e uma lateral recolhivel para contexto
  do contato.
- Tratar recebimento, status de entrega e estado da conexao como eventos
  diferentes.
- Normalizar o payload de cada fornecedor antes de chamar o dominio.
- Deduplicar por conexao e ID externo da mensagem.
- Criar ou atualizar contato e localizar uma conversa ativa dentro do mesmo
  processamento da mensagem recebida.
- Ter acoes explicitas de assumir, transferir, marcar como lida, resolver e
  reabrir.
- Impedir resposta livre quando a capacidade/politica do canal oficial exigir
  template, com explicacao clara no composer.
- Atualizar conversa e status em tempo real.

### Ideias que nao devem ser copiadas

- Uma entidade de canal com todos os campos e regras de todos os provedores.
- `if/else` de Wuzapi, Evolution e Meta espalhado no servico de aplicacao.
- Permissoes, departamentos, bots, funis, grupos e campanhas antes do fluxo
  basico funcionar.
- Deduplicacao apenas em codigo, sem restricao unica no banco.
- Guardar tokens e PINs no codigo ou em configuracao comum.
- Aceitar webhook sem validar challenge, segredo e assinatura quando disponivel.
- Executar efeitos externos longos antes de persistir estado recuperavel.
- Uma unica contagem de nao lidas compartilhada por todos os operadores.
- Handler monolitico que conhece cada formato de mensagem de cada fornecedor.

### Alertas de seguranca a evitar

Credenciais embutidas em codigo ou configuracao comum e verificacao insuficiente
de webhook sao proibidas. Segredos devem ser armazenados fora do payload publico,
rotacionaveis e acessiveis somente por servicos server-side.

## Escolha de APIs externas

### WhatsApp oficial: Meta Cloud API direta

Usar diretamente a API hospedada pela Meta. O adapter `meta_cloud` conhece
Graph API, WABA, `phone_number_id`, tokens, webhooks, templates e estados de
entrega. O restante do BEM HUB conhece apenas eventos e comandos internos.

Onboarding em duas etapas:

1. **Piloto guiado:** admin informa os ativos Meta necessarios e uma credencial
   server-side apropriada. O backend testa permissao, numero e assinatura do
   webhook antes de ativar o canal.
2. **Self-service:** adotar Embedded Signup somente depois de App Review,
   permissoes e requisitos de parceiro/Tech Provider estarem aprovados.

O oficial nao oferece QR de sessao para o cadastro no BEM HUB. A tela deve
mostrar estado dos ativos Meta, webhook e credencial, sem fingir pareamento.

Fontes oficiais:

- [WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/overview)
- [WhatsApp Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Embedded Signup](https://www.postman.com/meta/whatsapp-business-platform/documentation/du6gzjv/embedded-signup)
- [Mensagens e status por webhook](https://www.postman.com/meta/whatsapp-business-platform/folder/o48mro7/messages)
- [Exemplos oficiais com validacao de assinatura](https://github.com/fbsamples/whatsapp-api-examples)

### WhatsApp nao oficial: Uazapi e Z-API no primeiro piloto

Uazapi abre a primeira fatia por ja ter sido testada diretamente. Z-API entra em
seguida no mesmo marco para provar que dominio, inbox e mensagens nao dependem
do payload de um fornecedor. Ambas evitam operar um novo servico stateful no
primeiro deploy do BEM HUB.

Ela so sera aprovada depois de um spike provar:

- criacao e cancelamento de instancia pelo fluxo de parceiro;
- QR e codigo de pareamento dentro do BEM HUB;
- recebimento, envio, entrega, leitura e desconexao;
- estrategia aceitavel de autenticacao do callback;
- idempotencia em retries e ordem dos eventos;
- contrato, LGPD, retencao de midia e custo por instancia;
- comportamento de reconexao e numero banido/bloqueado.

O produto deve exibir aceite explicito: a conexao usa uma sessao WhatsApp Web
nao homologada, pode desconectar e pode sofrer restricao do WhatsApp. Ela nao
pode ser vendida como equivalente operacional ou juridico da API oficial.

Fontes do fornecedor:

- [Introducao e fluxo da Z-API](https://developer.z-api.io/en/quickstart/introduction)
- [Criacao de instancia para parceiros](https://developer.z-api.io/en/partner/create-instance)
- [Eventos de webhook](https://developer.z-api.io/en/webhooks/introduction)
- [Token adicional de conta](https://developer.z-api.io/security/client-token)

### Fallback e opcoes adiadas

| Opcao | Uso no plano | Motivo |
| --- | --- | --- |
| Wuzapi/whatsmeow | Fallback self-hosted | Escopo estreito, HMAC/retry documentados e codigo aberto; exige operar sessoes e banco separadamente. |
| Evolution API/Baileys | Adiada | Boa cobertura, mas adiciona Redis/banco/operacao, amplitude desnecessaria e mudancas recentes de licenca/ativacao a validar. |
| WAHA | Adiada | Multiplas engines e diferencas de contrato aumentam teste e manutencao. |
| Implementacao propria de Baileys/whatsmeow | Rejeitada no MVP | BEM HUB passaria a manter protocolo nao oficial e infraestrutura stateful sem vantagem comercial comprovada. |

A escolha fica encapsulada. Trocar Z-API por Wuzapi deve exigir um novo adapter e
migracao de credenciais, nao mudanca em contatos, conversas ou interface.

## Arquitetura proposta

```text
Meta Cloud / Z-API
        |
        v
webhook publico -> verificacao -> registro idempotente -> normalizador do adapter
                                                        |
                                                        v
                                              servico de atendimento
                                           /          |          \
                                      contato      conversa     mensagem
                                                        |
                                                        v
                                                Supabase Realtime

operador -> endpoint HTTP -> persistencia/idempotencia -> adapter -> fornecedor
                              ^                              |
                              +------ status/retry ----------+
```

O Realtime usa Broadcast privado como sinal de invalidação, não como banco
paralelo. Triggers publicam `support.inbox.changed` no tópico
`org:<organization_id>:support` somente depois da persistência transacional. O
cliente agrupa eventos próximos e consulta novamente as RPCs canônicas.

Regras operacionais:

- uma conexão por sessão/segmento pode alimentar múltiplos consumidores;
- reconexão e retorno de foco sempre reconciliam o estado canônico;
- eventos duplicados ou fora de ordem não podem duplicar mensagens;
- busca/filtro server-side nunca é reconstruído apenas com payload de evento;
- conteúdo, telefone, credenciais e payload bruto não trafegam no Broadcast;
- o cliente recebe somente leitura do tópico privado do próprio tenant.

### Limites de codigo

Criar dominios separados dentro de `src/features`:

```text
src/features/channels/
  contracts.ts
  repository.ts
  service.ts
  providers/meta-cloud/
  providers/z-api/

src/features/contacts/
  contracts.ts
  queries.ts
  actions.ts

src/features/support/
  contracts.ts
  repository.ts
  service.ts
  queries.ts
  actions.ts
```

Contrato minimo do adapter:

```ts
interface WhatsAppChannelAdapter {
  provision(input: ProvisionInput): Promise<ProvisionResult>;
  getPairing?(connection: ConnectionRef): Promise<PairingState>;
  getHealth(connection: ConnectionRef): Promise<ConnectionHealth>;
  verifyWebhook(request: RawWebhookRequest): Promise<VerifiedWebhook>;
  normalizeWebhook(webhook: VerifiedWebhook): Promise<ChannelEvent[]>;
  send(command: SendMessageCommand): Promise<SendResult>;
  disconnect(connection: ConnectionRef): Promise<void>;
}
```

`normalizeWebhook` retorna uma lista, pois um callback pode carregar mensagens e
mudancas de status juntas. Eventos internos iniciais:

- `message.received`;
- `message.sent_by_phone`;
- `message.delivery_updated`;
- `connection.updated`;
- `contact.updated`.

## Modelo de dados

Evoluir as tabelas atuais por migrations pequenas; nao recriar tudo.

### `channel_connections`

Manter identificacao publica da conexao e adicionar:

- `provider`: `meta_cloud`, `z_api` ou futuro adapter;
- `external_instance_id` e `external_account_id`;
- `connection_status`: `draft`, `provisioning`, `awaiting_pairing`,
  `connecting`, `connected`, `degraded`, `disconnected`, `failed`, `disabled`;
- `pairing_method`, nulo para Meta;
- `status_reason`, `last_health_at`, `last_connected_at`,
  `webhook_verified_at` e `credential_updated_at`.

Renomear conceitualmente `kind` para `mode` (`official`/`unofficial`) em uma
migration compativel. `provider` nao e modalidade.

### `channel_credentials`

Nova tabela restrita a servicos server-side:

- `organization_id` e `channel_connection_id`;
- payload criptografado e versao da chave;
- nunca selecionavel pelo cliente;
- sem token em logs, Server Component props ou `config`.

Se criptografia de aplicacao nao estiver pronta, o piloto deve usar referencias
a segredo externo ou adiar o self-service. Nao armazenar token em texto puro.

### `contacts` e `contact_identities`

`contacts` guarda perfil interno: nome, telefone principal, e-mail, observacoes,
tags e timestamps. `contact_identities` guarda identificadores por conexao:

- `organization_id`, `contact_id`, `channel_connection_id`;
- `identity_type`: `phone`, `wa_id`, `remote_jid` ou `lid`;
- `identity_value_normalized`;
- unicidade por organizacao, conexao, tipo e valor.

No primeiro evento, procurar identidades; depois telefone normalizado; por fim
criar contato. Nunca fundir automaticamente dois contatos por nome.

### `support_conversations`

Adicionar:

- `last_message_id`, `last_message_preview` e `last_customer_message_at`;
- `assigned_at`, `resolved_at` e `resolved_by`;
- `version` para concorrencia otimista;
- indice parcial unico para uma conversa ativa por organizacao, contato e canal.

Estados iniciais: `open`, `pending`, `resolved`, `escalated`. A fila e derivada:
`open` sem responsavel. "Meus" e `assigned_to = auth.uid()`.

### `support_conversation_reads`

Leitura por membro, com `last_read_message_id` e `read_at`. Nao zerar um contador
global quando um unico operador abrir a conversa.

### `support_messages`

Separar eixos:

- `review_status`: `not_required`, `draft`, `approved`, `rejected`;
- `delivery_status`: `not_sent`, `queued`, `sending`, `accepted`, `sent`,
  `delivered`, `read`, `failed`;
- `origin`: `customer`, `human`, `ai`, `system`;
- `message_type`: inicialmente `text`, depois midias, template e system;
- `provider_message_id`, `provider_timestamp`, `reply_to_message_id`;
- `error_code`, `error_message`, metadados de midia e proveniencia da IA.

Restricao unica: organizacao + conexao + ID externo. Atualizacoes de entrega
devem respeitar timestamp/ordem, pois callbacks podem chegar fora de ordem.

### Confiabilidade e auditoria

Adicionar:

- `channel_webhook_events`: envelope recebido, hash/ID unico, estado de
  processamento, erro e tentativas;
- `channel_outbox`: comando de envio, chave de idempotencia, claim, tentativas,
  proxima tentativa e resultado;
- `support_events`: atribuicao, transferencia, mudanca de estado/prioridade,
  revisao e envio, com ator e metadados minimos.

No volume inicial, a rota pode registrar e processar logo depois. A persistencia
permite reprocesso e um worker/cron posterior sem trocar o dominio.

## Seguranca e multi-tenancy

- Toda tabela de negocio leva `organization_id`, indice e RLS.
- O webhook resolve organizacao por uma conexao interna/segredo opaco; nunca
  aceita `organization_id` do payload como autoridade.
- Meta: comparar verify token no GET e validar `X-Hub-Signature-256` sobre o
  corpo bruto no POST, em tempo constante.
- Nao oficial: exigir assinatura, token de callback ou URL com segredo de alta
  entropia, mais rate limit e verificacao cruzada da instancia. Sem controle de
  origem aceitavel, o fornecedor nao passa no gate.
- Owner/admin gerencia conexoes. Membro pode ler e assumir atendimento.
- Depois de atribuida, somente responsavel ou owner/admin envia, transfere ou
  resolve. Toda tomada de posse fica auditada.
- Mutacoes de estado passam por RPC/service; remover `ALL` amplo de membros onde
  ele permitir saltar a maquina de estados.
- Midia futura usa bucket privado, caminho por tenant, validacao de MIME/tamanho
  e URL assinada curta.
- Payload bruto tem retencao curta e redacao; logs nao carregam texto integral,
  tokens ou telefone desnecessario.
- Definir politica LGPD de retencao/exportacao/exclusao antes do piloto externo.

## Experiencia do produto

### `/app/channels`

Trocar o formulario generico por um wizard "Adicionar WhatsApp":

1. Escolher **Oficial Meta** ou **Conexao por WhatsApp Web** com diferencas e
   riscos claros.
2. Oficial: conectar ativos Meta, testar permissao e verificar webhook.
3. Nao oficial: criar instancia, mostrar QR/codigo com expiracao e acompanhar
   estado real.
4. Confirmar numero, nome, saude e destino inicial `Fila geral`.

Cada card mostra modalidade, fornecedor, numero, estado, ultimo evento e acao
adequada: diagnosticar, reconectar, atualizar credencial, desconectar ou excluir.
Nao mostrar botao de QR para canal oficial.

### `/app/support`

Usar um console de tres areas dentro do shell existente:

1. **Inbox, 320--360 px:** busca; tabs `Fila`, `Meus`, `Resolvidos`; filtros de
   nao lidas e canal; linhas com contato, ultima mensagem, hora, badge nao lida,
   prioridade, responsavel e saude do canal.
2. **Conversa, flexivel:** header compacto com assumir/resolver; timeline; estado
   de entrega; barra de janela/capacidade do canal; composer fixo; rascunho de IA
   visualmente distinto e revisavel.
3. **Contexto, cerca de 300 px e recolhivel:** nome, telefone, tags, notas,
   responsavel e historico recente.

No mobile, inbox, conversa e contexto viram estados separados. Evitar
multi-paineis, excesso de toolbar e densidade sem funcao. A assinatura visual do
BEM HUB sera um "pulso operacional": conexao, nao lidas, prioridade e entrega
visiveis com os tokens verdes/cinza/vermelho ja existentes.

### `/app/contacts`

Tela minima:

- busca por nome ou telefone;
- lista com tags, ultima conversa e canal;
- criar/editar nome, e-mail, notas e tags;
- abrir historico e iniciar conversa quando a capacidade do canal permitir.

Contato recebido nasce automaticamente. Importacao, merge e massa ficam fora.

## Sequencia de implementacao

Estimativas sao dias ideais de engenharia, nao prazo comercial.

### Fase 0 - Spike e contratos (3--5 dias)

- congelar os eventos internos e fixtures por fornecedor;
- testar Meta com numero de teste;
- testar parceiro Z-API, QR/codigo, callbacks, envio e desconexao;
- provar autenticacao, retry e idempotencia dos callbacks;
- registrar diferencas operacionais entre Uazapi e Z-API sem leva-las ao
  dominio interno.

Aceite: um script/teste normaliza texto recebido, entrega, falha e desconexao dos
dois provedores para o mesmo contrato interno, sem persistir segredo em log.

### Fase 1 - Banco e dominio (4--6 dias)

- [x] preparar migration incremental para leitura por operador, eventos de
  ciclo e versao otimista;
- [ ] aplicar a migration e concluir outbox/separacao review/delivery;
- [x] preparar indices, unicidade, RLS e RPCs atomicas do ciclo operacional;
- backfill seguro dos rascunhos existentes;
- [ ] executar testes com duas organizacoes no banco configurado.

Aceite: duplicata nao cria mensagem/conversa; usuario A nao le ou altera tenant
B; membro nao pula estados por update direto.

### Fase 2 - Conexao real de canais (5--8 dias)

- implementar `meta_cloud` e o adapter nao oficial escolhido;
- wizard e estados reais em `/app/channels`;
- health check, reconexao/desconexao e rotacao de credencial;
- endpoints de webhook com verificacao.

Aceite: cada modalidade conecta um numero real, atualiza saude e pode ser
desativada sem apagar historico.

### Fase 3 - Entrada, contatos e conversa (5--7 dias)

- [x] registrar webhook idempotente;
- [x] resolver identidade, upsert de contato e conversa ativa;
- [x] persistir texto e status de mensagens;
- [x] validar callback real Uazapi com persistência idempotente na inbox;
- [x] implementar atualização autenticada por Broadcast privado;
- [x] aplicar a migration de Broadcast e validar policy/triggers no banco;
- [x] validar atualização WebSocket sem recarga com mensagem real;
- [x] persistir tentativa e enviar texto humano por endpoint HTTP/adapter;
- [x] ingerir mensagem manual enviada pelo aparelho como outbound;
- [x] reconfigurar webhook sem `fromMeYes`;
- [ ] fazer smoke dos dois caminhos de saida;
- criar `/app/contacts` minimo.

Aceite: mensagem real aparece uma vez na fila correta, cria contato quando
necessario e atualiza ultima mensagem/nao lida para cada operador.

### Fase 4 - Console operacional e envio (7--10 dias)

- layout de tres areas;
- busca, fila/meus/resolvidos, filtros e paginacao;
- [x] implementar localmente assumir, ler, resolver e reabrir;
- [ ] aplicar/validar o ciclo e adicionar transferencia simples por seletor;
- [x] composer de texto direto, persistencia anterior ao fornecedor e
  idempotencia;
- [x] retry explicito sobre a mesma mensagem com tentativas auditaveis;
- [ ] capturar fixture Uazapi `messages_update` e implementar entrega/leitura;
- bloqueio e explicacao quando o canal nao permite resposta livre.

Aceite: dois operadores conseguem atender sem sobrescrever atribuicao; envio
falho e recuperavel; estados vistos na UI correspondem ao fornecedor.

### Fase 5 - IA assistiva (3--5 dias)

- ligar geracao existente ao historico real e ao assistente da organizacao;
- registrar modelo, fontes e autoria;
- editar, aprovar, rejeitar ou escalar;
- envio apenas por comando humano posterior.

Aceite: nenhuma chamada de geracao dispara adapter; mensagem aprovada passa pela
mesma outbox e pelas mesmas regras de uma resposta humana.

### Fase 6 - Oficial completo e hardening (5--8 dias)

- templates aprovados e capacidade/janela do canal;
- imagem, audio e documento com storage privado;
- replay operacional de webhook/outbox e alertas;
- metricas de conexao, latencia, falha e tempo ate primeira resposta;
- runbook de numero desconectado, token expirado e fornecedor indisponivel.

Aceite: piloto oficial e nao oficial possuem runbook, observabilidade e teste de
falha; midia nao atravessa tenant nem fica publica.

## Ordem imediata recomendada

O proximo item nao deve ser a geracao de rascunho por IA. A ordem local correta
para este modulo passa a ser:

1. executar a Fase 0 e fechar Uazapi e Z-API no contrato não oficial;
2. corrigir modelo/seguranca da Fase 1;
3. entregar uma fatia vertical de texto com o adapter nao oficial;
4. repetir a mesma fatia com Meta Cloud;
5. construir o console operacional sobre eventos reais;
6. retomar rascunho por IA.

Isso nao reordena o backlog global do produto. Apenas impede que o item local de
IA avance sobre uma base de atendimento ainda simulada.

## Gates antes de implementar

- Conta/app Meta e numero de teste disponiveis.
- Conta de parceiro/teste Z-API ou decisao explicita por Wuzapi.
- Segredo de criptografia/secret manager definido.
- Aceite comercial e juridico do risco do canal nao oficial.
- Retencao LGPD minima definida.
- Provedor nao oficial comprova autenticacao aceitavel do callback.

Se o ultimo gate falhar, implementar Meta primeiro e manter o nao oficial
bloqueado. Nao reduzir a seguranca do webhook para cumprir cronograma.
