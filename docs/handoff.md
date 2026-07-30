# Handoff Notes

Atualizado em 2026-07-30.

## Handoff 2026-07-30 - Wuzapi Gerenciado E Ingresso Protegido

- O fluxo gerenciado Wuzapi está operacional: o usuário informa somente o nome
  do canal, o backend cria credenciais internas, provisiona a instância,
  configura HMAC/webhook, entrega QR Code e descobre o número conectado.
- O canal gerenciado usado no smoke está conectado. Mensagens iniciadas pelo
  Atendimento chegam ao WhatsApp e permanecem no histórico.
- Canais com atendimento agora usam exclusão lógica (`is_deleted` e
  `deleted_at`), somem da lista administrativa e continuam como `Inativo` no
  histórico do Atendimento.
- A queda de `/app/support` causada por `phone_number` ainda nulo foi corrigida;
  o backend também tenta descobrir o telefone pelo usuário administrado no
  Wuzapi.
- A falha de entrada desta sessão não era migration nem RPC: o Wuzapi ainda
  apontava para um Quick Tunnel encerrado. O callback não alcançava o backend.
- `APP_BASE_URL` local e o webhook da instância foram atualizados. Probe HMAC e
  callbacks reais retornaram HTTP 200; o Supabase confirmou endpoint `active`,
  `webhook_verified_at`/`last_received_at` recentes e nenhum erro.
- Eventos reais observados depois do reparo eram de grupo e foram ignorados
  corretamente. Ainda falta repetir uma mensagem direta 1:1 para confirmar a
  atualização visual da conversa atual.

### Proteção Adicionada

- `/api/health/webhook-ingress` permite ao backend comprovar que
  `APP_BASE_URL` chega ao próprio BEM HUB antes de declarar recebimento saudável.
- `Atualizar estado` verifica separadamente sessão e webhook. Wuzapi e Evolution
  detectam URL divergente e reconciliam o callback automaticamente.
- Ingresso público indisponível deixa o canal `degraded`, em vez de mostrar
  conexão saudável somente porque a sessão consegue enviar.
- O token do endpoint fica dentro da credencial criptografada de
  Wuzapi/Evolution para permitir reconciliações futuras.
- `bun run test:whatsapp-contracts` virou o gate explícito para adapters,
  assinatura, entrada, recibos e início de atendimento.

### Verificação E Estado Local

- Gate WhatsApp: 35/35 testes.
- Suite completa: 111/111 testes.
- `bun run lint`, `bun run build` e `git diff --check` passaram.
- Nenhuma migration nova foi necessária para o reparo do ingresso.
- Quick Tunnel, BEM HUB e containers Wuzapi estavam ativos no encerramento, mas
  o tunnel é efêmero e deve ser verificado na retomada.
- O worktree contém mudanças intencionais ainda sem commit. Preservar o diff e
  consultar `git status --short` antes de qualquer edição.

### Retomada Exata

1. Confirmar `localhost:3000`, Wuzapi em `localhost:8081` e o Quick Tunnel do
   BEM HUB. Se o tunnel mudou, atualizar `APP_BASE_URL` e clicar
   `Atualizar estado`; não editar tokens manualmente.
2. Enviar uma nova mensagem direta do WhatsApp pessoal para o número conectado.
   Não usar grupo, pois grupos são ignorados por contrato.
3. Confirmar que a mensagem entra uma única vez na mesma conversa em
   `/app/support`, sem recarga manual.
4. Responder pelo Atendimento e confirmar entrega/leitura.
5. Revisar e commitar o conjunto coerente de provisionamento gerenciado,
   exclusão lógica, correções do suporte e proteção do ingresso.
6. Depois fechar o smoke equivalente da Evolution antes de escolher o provider
   principal.

## Handoff 2026-07-26 - Evolution Pareada E Primeira Saida Validada

- Evolution API oficial `2.3.7` foi clonada em `C:\repos\evolution-api`.
- Stack local esta ativa em `127.0.0.1:8082` com Postgres, Redis, volumes
  persistentes e Quick Tunnel HTTPS.
- Instancia `bem-hub-piloto-evolution` foi pareada por QR na primeira tentativa.
- API key, HTTPS e adapter BEM HUB foram validados; nenhum segredo foi exibido.
- Arquivos locais nao versionados: `docker-compose.local.yml`,
  `setup-local.ps1` e `show-bem-hub-config.ps1`; `.env` permanece ignorado.
- Canal Evolution foi cadastrado e conectado no BEM HUB.
- O operador usou `Iniciar atendimento`; a primeira mensagem saiu pelo canal
  Evolution sem erro nem ajuste adicional.
- Evolution Manager existe em `/manager`, mas permanece desativado no Compose
  local com `SERVER_DISABLE_MANAGER=true`. O BEM HUB cobre a operacao atual e
  manter o painel desligado reduz a superficie administrativa exposta.

### Retomada Exata

1. Responder pelo contato e confirmar entrada na mesma conversa.
2. Confirmar transicoes de entrega e leitura vindas de `messages.update`.
3. Enviar manualmente pelo aparelho e confirmar a mesma conversa.
4. Reiniciar a stack Evolution e confirmar persistencia da sessao.
5. Manter Evolution e Wuzapi em observacao antes de escolher o provider
   principal.

## Handoff 2026-07-26 - Primeira Mensagem Pelo BEM HUB

- `/app/support` agora possui `Iniciar atendimento`: escolhe canal conectado,
  telefone, nome opcional e envia a primeira mensagem.
- Evolution API, Wuzapi e adapters de envio existentes usam contrato comum.
  Contato é normalizado/reutilizado, conversa é criada por canal, operador
  assume automaticamente e tentativa fica auditável/idempotente.
- Migration aplicada no remoto como
  `20260726190822_start_support_conversation`.
- Probes local e remoto passaram com rollback para Evolution, Wuzapi,
  idempotência e isolamento cross-tenant, sem chamar fornecedor.
- 19 testes focados e a suíte completa com 99 testes passaram; lint e build
  também passaram, e advisors ficaram sem regressão.
- pgTAP local foi destravado pelo Docker, mas para na policy Realtime antiga com
  `permission denied for table organization_members`. QA visual continua
  pendente porque navegador integrado não estava disponível.

### Retomada Exata

1. Retomar Wuzapi e BEM HUB/tunnels conforme o runbook.
2. Em `/app/support`, iniciar uma conversa para outro número e confirmar saída,
   resposta na mesma thread, entrega/leitura e retry.
3. Corrigir a policy local Realtime para executar as 280 assertions.
4. Subir Evolution API com outro número e repetir o mesmo smoke.

## Handoff 2026-07-26 - Wuzapi Local Operacional

- Wuzapi foi clonado em `C:\repos\wuzapi` a partir de
  `https://github.com/asternic/wuzapi.git`, commit `70642149a0e8`.
- Infra local adicional: Docker Desktop/Compose, PostgreSQL do Wuzapi e
  `cloudflared`. Os arquivos locais `docker-compose.local.yml` e
  `setup-local.ps1` estao no repositorio Wuzapi e ainda nao foram versionados.
- A API local usa `127.0.0.1:8081`; os tunnels HTTPS do Wuzapi e do BEM HUB sao
  Quick Tunnels temporarios e mudam ao reiniciar.
- RabbitMQ nao e usado. A entrega atual e Wuzapi -> webhook HTTP -> BEM HUB ->
  Supabase/Postgres -> Realtime.
- Sessao WhatsApp, HMAC, webhook, entrada e saida foram validados. O volume
  Postgres preservou a sessao depois de recriar o container.
- Corrigidos no BEM HUB: header `token`, status em camelCase, assinatura
  explicita de `Message`/`ReadReceipt` e identidade telefonica via
  `SenderAlt`/`RecipientAlt`.
- Dois contatos LID orfaos foram fundidos nos contatos telefonicos existentes,
  sem apagar conversas ou mensagens.
- 17 testes focados, lint e build passaram. As quatro alteracoes Wuzapi no BEM
  HUB continuam sem commit e sem deploy.
- Segredos permanecem somente em `C:\repos\wuzapi\.env` e nas credenciais
  criptografadas do BEM HUB. O token mostrado em screenshot deve ser rotacionado
  antes de qualquer producao.

### Retomada Exata

1. Consultar `docs/whatsapp-self-hosted-runbook.md`, secao de desenvolvimento
   local Wuzapi.
2. Confirmar Docker, `localhost:8081`, BEM HUB em `localhost:3000` e criar dois
   novos Quick Tunnels.
3. Atualizar `APP_BASE_URL`, substituir a URL Wuzapi do canal e clicar
   `Reconfigurar recebimento`.
4. Implementar a proxima feature do modulo Atendimento.
5. Depois, iniciar Evolution API com outro numero e repetir o smoke.

## Handoff 2026-07-25 - Ciclo E Retry Aplicados

- Ciclo operacional, retry, correcao da ambiguidade de `request_id` e indices
  das FKs de leitura foram aplicados no Supabase remoto.
- Historico remoto:
  `20260726013623_support_operational_lifecycle`,
  `20260726013644_support_message_retry`,
  `20260726013946_disambiguate_support_retry_request_id` e
  `20260726014116_index_support_conversation_read_foreign_keys`.
- Backfill confirmou 11 tentativas. Probes transacionais passaram para ciclo,
  leitura, isolamento cross-tenant, envio novo e retry, com rollback completo e
  sem chamar o fornecedor.
- Advisors nao apontam nova regressao de seguranca nem FK sem indice.
- pgTAP local e QA autenticado desktop/mobile ainda estao pendentes.

### Retomada Exata

1. Fazer QA autenticado com dois operadores.
2. Fazer smoke de erro recuperavel e retry com canal real.
3. Capturar `messages_update`; congelar fixture antes de assinar o evento.
4. Rodar pgTAP quando Docker/Postgres local estiver disponivel.

## Handoff 2026-07-25 - Retry Explicito Local

- Migration `20260726011718_support_message_retry.sql` cria
  `support_message_send_attempts` com RLS, ACL restrita, idempotencia por
  requisicao e sequencia por mensagem.
- Envio novo e retry usam implementacoes privadas `SECURITY DEFINER` com
  wrappers publicos `SECURITY INVOKER`; apenas responsavel ou admin envia.
- Retry preserva o ID da mensagem e adiciona tentativa. A UI oferece a acao no
  balao `failed` e bloqueia o composer sem atribuicao.
- Preflight remoto encontrou 11 envios para backfill e nenhum estado
  incompatível.
- 77 testes, lint e build passaram; pgTAP planeja 237 assertions.
- As migrations foram aplicadas e validadas no checkpoint remoto acima.
- Uazapi documenta `messages_update`, mas falta capturar a fixture real antes de
  implementar entrega/leitura.

### Retomada Exata

1. Executar pgTAP quando o banco local estiver disponivel.
2. Fazer QA autenticado e smoke de retry com canal real.
3. Capturar `messages_update`; congelar fixture antes de assinar o evento.

## Handoff 2026-07-25 - Ciclo Operacional Local

- Migration `20260726005359_support_operational_lifecycle.sql` adiciona
  atribuicao temporal, resolucao, versao otimista, leitura por operador e
  eventos imutaveis.
- RPC atomica controla assumir, atribuir, devolver, abrir, deixar pendente,
  escalar, resolver, reabrir e alterar prioridade, com lock e isolamento de
  tenant. Update direto de estado por `authenticated` fica bloqueado.
- A inbox mostra responsavel, nao lidas e metricas. A conversa oferece acoes de
  ciclo, baixa leitura ao abrir e exibe timeline operacional.
- O RPC legado `review_support_draft` foi mantido funcional por wrapper
  `SECURITY INVOKER` e implementacao privada segura.
- 74 testes, lint e build passaram. pgTAP agora planeja 216 assertions.
- Docker/Postgres local continua indisponivel para pgTAP. Migration e probes
  foram executados no checkpoint remoto acima; QA autenticado segue pendente.

### Retomada Exata

1. Executar pgTAP quando o banco local estiver disponivel.
2. Fazer QA autenticado de concorrencia, leitura e metricas.
3. Fazer QA da inbox em desktop/mobile com dois operadores.
4. Seguir para eventos de entrega/leitura do provedor.

## Handoff 2026-07-24 - Etiquetas Normalizadas Aplicadas

- `/app/tags` possui CRUD com nome, cor hexadecimal e descricao no padrao
  DataTable + EntityDrawer.
- Contatos agora referenciam etiquetas por UUID em relacao muitos-para-muitos;
  a UI seleciona registros cadastrados e mostra seus nomes/cores.
- Migration `20260724030940_contact_tags_registry.sql` cria tabelas, RLS, ACL,
  RPCs, indices e FKs compostas, migra os arrays textuais e remove a coluna
  antiga somente depois de validar o backfill.
- Nomes sao unicos por organizacao sem diferenciar caixa. Etiquetas em uso nao
  podem ser arquivadas.
- Preflight remoto confirmou que nao ha etiquetas textuais nos 5 contatos atuais
  e que todos os alvos dependentes estao contemplados.
- 71 testes, lint e build passaram; pgTAP planeja 171 assertions.
- Migration aplicada no remoto como
  `20260724034601_contact_tags_registry`.
- Catalogo, RLS, ACL, indices, FKs e assinaturas foram confirmados. Probe
  transacional passou para CRUD, vinculo por ID, contrato do Atendimento,
  protecao de etiqueta em uso e isolamento cross-tenant, com rollback completo.
- Advisors nao ganharam alerta de seguranca. Postgres/Docker local e navegador
  integrado nao estavam disponiveis; pgTAP e QA visual permanecem pendentes.
- Nenhum commit foi criado nesta sessao; implementacao e documentacao permanecem
  no worktree para revisao e commit no proximo checkpoint.

### Retomada Exata

1. Revisar o diff e criar um commit coerente do modulo de contatos/etiquetas.
2. Validar `/app/tags` e o seletor de etiquetas de contatos em desktop/mobile.
3. Cadastrar etiquetas reais e testar criacao/edicao de contato pela UI.
4. Rodar pgTAP quando Docker/Postgres local estiver disponivel.

## Handoff 2026-07-23 - Modulo De Contatos Aplicado

- `/app/contacts` foi implementado com DataTable, EntityDrawer, busca, filtro de
  estagio, cadastro manual, edicao e arquivamento sem apagar historico.
- Webhook e cadastro manual passam a compartilhar chave telefonica canonica no
  banco; celulares brasileiros com oito ou nove digitos nao devem duplicar.
- Outro DDI e preservado por identidade exata com diagnostico
  `unsupported_country`; interface explica a limitacao sem derrubar Atendimento.
- Migration local `20260724015915_contacts_crud_phone_identity.sql` foi aplicada
  remotamente como `20260724024011_contacts_crud_phone_identity`, depois de
  confirmar zero duplicatas canonicas e todos os alvos de patch esperados.
- 67 testes, lint e build passaram. pgTAP agora planeja 148 assertions.
- Catalogo, normalizacao e ACL foram verificados no remoto. Probe transacional
  passou para CRUD, equivalencia 8/9, arquivamento/reativacao e isolamento entre
  organizacoes, com rollback completo.
- Advisors nao apontaram regressao. Docker/Postgres local e navegador integrado
  nao estavam disponiveis; pgTAP e QA visual permanecem pendentes.

### Retomada Exata

1. Fazer smoke real com cadastro manual, callback do mesmo celular nas convencoes de
   oito/nove digitos, contato arquivado e numero com outro DDI.
2. Validar `/app/contacts` e painel de Atendimento em desktop/mobile.
3. Rodar pgTAP quando Docker/Postgres local estiver disponivel e regenerar os
   tipos oficiais do Supabase.

## Handoff 2026-07-22 - Broadcast Privado Aplicado

- O bloqueio `ERROR 42501: must be owner of relation messages` foi isolado nas
  instrucoes `DROP POLICY` e `COMMENT ON POLICY`, nao em `CREATE POLICY`.
- A migration foi ajustada para usar somente operacoes permitidas na tabela
  gerenciada e aplicada remotamente como
  `20260723002745_support_realtime_broadcast`.
- Policy privada, funcao protegida e tres triggers foram confirmados no remoto.
- Probes transacionais confirmaram acesso ao topico da propria organizacao,
  negacao de topico externo e emissao do evento `support.inbox.changed`.
- Advisors nao apresentaram novo alerta relacionado ao Broadcast.
- Smoke WebSocket autenticado em `/app/support` permanece pendente porque o
  navegador integrado nao estava disponivel nesta sessao.

### Retomada Exata

1. Abrir `/app/support` com sessao autenticada.
2. Manter a rota aberta e provocar nova mensagem real pelo canal conectado.
3. Confirmar que a conversa atualiza sem recarga e que logs Realtime nao mostram
   `Unauthorized` para o topico da organizacao.
4. Fazer junto o QA visual desktop/mobile ja pendente.

## Handoff 2026-07-22 - Atendimento Master-Detail

- Atendimento foi reorganizado como inbox operacional BEM HUB: fila com busca e
  filtros de status, conversa ativa, composer de rascunho e contexto do contato.
- Desktop usa master-detail; mobile alterna entre fila e atendimento selecionado.
- Fluxos existentes de revisao humana continuam intactos e envio externo nao foi
  liberado pela interface.
- Erro client-side de `NEXT_PUBLIC_SUPABASE_URL` foi corrigido com acesso estatico;
  indisponibilidade do Realtime agora degrada sem derrubar a rota.
- 66 testes, lint e build passaram.
- QA visual autenticado desktop/mobile permanece pendente porque o navegador
  integrado nao estava disponivel.
- Broadcast privado remoto foi aplicado no checkpoint seguinte; falta somente o
  smoke WebSocket autenticado com mensagem real.

### Arquivos Centrais

- `src/features/support/support-inbox-shell.tsx`: canvas, busca, filtros e
  alternancia responsiva entre fila e conversa.
- `src/features/support/support-inbox-item.tsx`: identidade, status, canal,
  atividade e signal edge de prioridade.
- `src/features/support/support-conversation-view.tsx`: composicao do atendimento
  selecionado.
- `src/features/support/support-message-thread.tsx`: historico e revisao de
  rascunhos.
- `src/features/support/support-draft-composer.tsx`: criacao de rascunho sem
  envio externo.
- `src/features/support/support-contact-panel.tsx`: contexto operacional do
  contato.
- `src/features/support/support-inbox-filters.ts`: busca normalizada e filtros
  cobertos por teste.

### Retomada Exata

1. Layout e tratamento da configuracao Realtime estao no commit `e00e46b`; o
   working tree possui somente este complemento de handoff.
2. Abrir `/app/support` com sessao autenticada e dados reais.
3. Verificar desktop em 1024/1440px e mobile em aproximadamente 390px: scroll da
   fila, troca de filtro, busca, selecao, retorno para fila e composer.
4. Ajustar somente densidade, truncamento e overflow encontrados no QA; nao
   adicionar envio, transferencia ou finalizacao sem contratos server-side.
5. Reexecutar `bun test --timeout 15000`, `bun run lint` e `bun run build`.
6. Depois do QA aprovado, registrar eventuais ajustes visuais em commit pequeno.
7. Validar Broadcast privado com mensagem real; nao usar canal publico como
   contorno.

## Handoff 2026-07-18 - Broadcast Bloqueado Por Ownership Do Supabase

- OAuth do MCP Supabase foi renovado e o acesso remoto voltou a funcionar.
- Preflight confirmou `realtime.messages` com RLS ativo, tabelas de suporte
  presentes e migration de Broadcast ainda ausente no histórico remoto.
- A tentativa de aplicar `20260718024146_support_realtime_broadcast.sql` falhou
  na primeira instrução com `ERROR 42501: must be owner of relation messages`.
- `realtime.messages` pertence a `supabase_realtime_admin`; o papel `postgres`
  usado pelo MCP/migrations não é membro desse papel e não pode criar ou remover
  policies na tabela gerenciada.
- A operação foi revertida atomicamente: nenhum trigger, função ou policy foi
  aplicado e a migration continua fora do histórico remoto.
- Não substituir por canal público: isso enfraqueceria isolamento multi-tenant e
  permitiria abuso do Realtime com a chave pública.
- Próxima pendência: abrir chamado no Supabase para provisionar a policy SELECT
  privada por organização em `realtime.messages`, ou fornecer um mecanismo
  suportado para administrá-la por migration.
- Depois da liberação: ajustar a migration para o mecanismo indicado, aplicar,
  rodar advisors e testar mensagem real com `/app/support` aberto. A conversa
  deve aparecer sem recarga manual.

## Handoff 2026-07-17 - Broadcast Privado De Atendimento

- Callback real Uazapi foi validado: contato, conversa e mensagem persistem e a
  inbox mostra o atendimento após recarga.
- Broadcast privado multi-tenant está implementado localmente no tópico
  `org:<organization_id>:support`, com evento provider-neutral de invalidação.
- Triggers publicam somente IDs/metadados mínimos; conteúdo e payload de
  fornecedor não entram no Realtime.
- RLS de `realtime.messages` restringe leitura a membros ativos da organização e
  não permite publicação pelo cliente.
- Layout de `/app/support` reconcilia a fonte canônica após evento, assinatura,
  reconexão, foco ou retorno de visibilidade, com debounce.
- 64 testes, lint e build passaram. pgTAP agora planeja 122 assertions.
- O OAuth foi renovado em 2026-07-18; a aplicação revelou o bloqueio de
  ownership descrito no handoff mais recente.

## Handoff 2026-07-17 - Callback Uazapi Não Chegou

- Canal real está `connected`; credencial substituída e válida.
- Endpoint interno está `active` e sem erro. Uazapi confirma por `GET /webhook`
  uma configuração habilitada para `messages` em `bem-hub.vercel.app`.
- Nenhum callback entrou: `last_received_at`/`webhook_verified_at` nulos e zero
  eventos, mensagens ou conversas no banco.
- A inbox vazia é consequência da ausência do callback, não falha de refresh.
- Primeiro teste amanhã: mensagem de texto de outro WhatsApp para o número
  conectado. Mensagem própria, envio via API e grupo são intencionalmente
  ignorados.
- Se ainda falhar: procurar POST da rota de webhook nos logs da Vercel. Ausência
  de POST aponta para Uazapi; POST com erro aponta para rota/normalizador.
- Não avançar para envio/outbox antes da mensagem real aparecer uma única vez
  em `/app/support`.

## Handoff 2026-07-17 - Webhook Global E Entrada Uazapi

- Rota global provider-neutral recebe callbacks; Uazapi é o primeiro adapter de
  verificação e normalização.
- Ingestão idempotente cria contato, identidade, conversa ativa e mensagem sem
  expor tabelas internas a `anon`/`authenticated`.
- Configuração do webhook é automática pelo drawer de `/app/channels`; o mesmo
  núcleo aceita Z-API quando seu normalizador for adicionado.
- Migrations remotas aplicadas e smoke do banco concluído; dados temporários
  removidos e zero resíduos confirmados.
- Suite final: 62 testes, lint e build passaram.
- Pendente operacional: deploy, rotação do token mostrado em screenshot,
  `Ativar recebimento`, mensagem real para `/app/support`; depois envio/outbox.

## Handoff 2026-07-17 - Backend De Canais Liberado

- Migration de conexões Uazapi/Z-API aplicada no Supabase remoto como
  `20260717025135_add_channel_provider_connections`.
- `SUPABASE_SECRET_KEY` configurada localmente, autenticada e validada contra a
  tabela protegida `channel_credentials`; configuração na Vercel foi reportada
  pelo usuário.
- `channel_credentials` permanece sem acesso de `anon`/`authenticated`, com RLS
  ativo e acesso somente do backend.
- `APP_ENCRYPTION_KEY` local válida; confirmar a mesma variável na Vercel antes
  do smoke remoto.
- Suite com 55 testes, lint e build passaram.
- Próximo passo: rotacionar credenciais mostradas em capturas e validar
  instâncias reais Uazapi/Z-API em `/app/channels`.

## Handoff 2026-07-16 - Conexões Uazapi E Z-API

- Fundação local criada para credenciais criptografadas, estado, saúde,
  QR/código e desconexão de Uazapi e Z-API.
- `/app/channels` possui drawer operacional separado do cadastro do número.
- Tokens nunca retornam para o browser; acesso às credenciais exige
  `SUPABASE_SECRET_KEY` server-side.
- Migration `20260717025135_add_channel_provider_connections.sql` ainda não foi
  aplicada remotamente.
- Lint e build passaram; quatro testes novos passaram. QA visual autenticado
  continua pendente porque navegador integrado não estava disponível.
- Próximo passo: aplicar migration, configurar secret key, rotacionar tokens
  expostos e fazer smoke real Uazapi/Z-API antes de construir webhooks e envio.

## Handoff 2026-07-13 - Fundacao Frontend E CRUDs

- Fundacao reutilizavel agora inclui DataTable, EntityDrawer, Dialog,
  ConfirmDialog, DropdownMenu, campos de formulario e estados de tela.
- Dependencias adicionadas: `@tanstack/react-table`,
  `@radix-ui/react-dialog` e `@radix-ui/react-dropdown-menu`.
- `/app/channels` usa tabela limpa, acoes por linha e drawer para novo/editar;
  queries/actions de canais nao ficam mais no dominio de Atendimento.
- `/app/assistants` usa o mesmo contrato com formulario complexo RHF + Zod;
  regras de plano, owner/admin, provider e conexao continuam server-side.
- `/app/settings/ai-providers` usa tabela e drawer de criacao; segredo permanece
  criptografado e nunca retorna para edicao.
- Fluxos operacionais de chat, upload, rascunho de atendimento e execucao de
  automacao nao foram convertidos: nao sao cadastros CRUD.
- Suite final: 51 testes, lint e build passaram.
- QA visual autenticado desktop/mobile permanece pendente porque o navegador
  integrado estava indisponivel.
- Proxima adocao segura: equipe/convites; depois contatos quando o modulo ganhar
  CRUD real. Revisar automacoes separadamente antes de remover os `details`.

## Handoff 2026-07-13 - Shell, Canais E Atendimento

- Shell foi separado em `AppShell` server-side, `WorkspaceShell` interativo e
  `AppSidebar` visual.
- Sidebar desktop e fixa no viewport, ocupa `256px` expandida e `80px`
  retraida; somente o painel central possui scroll vertical.
- Header pertence ao painel central e nunca invade a sidebar.
- Mobile renderiza exclusivamente drawer modal; desktop renderiza
  exclusivamente sidebar. Preferencia de retracao persiste em `localStorage`.
- Usuario confirmou visualmente que o estado final da sidebar esta estavel.
- `/app/channels` possui CRUD independente por numero, modalidade oficial ou
  nao oficial e autenticacao planejada por QR/PIN.
- `/app/support` lista atendimentos; `/app/support/[conversationId]` abre o
  historico e permite criar, editar, aprovar, rejeitar ou escalar rascunhos.
- Aprovacao nunca marca mensagem como enviada. Envio, QR/PIN real e webhook
  publico aguardam escolha e implementacao dos adapters de fornecedor.
- Migrations de suporte e revisao humana foram aplicadas remotamente.
- Proximo passo seguro: gerar rascunho por IA sem envio externo.

## Handoff 2026-07-13 - Onboarding Do Piloto

- Catalogos CSV/TSV com produto e preco entram no pipeline RAG com limites e
  neutralizacao de formulas.
- Inclusao de conta existente por e-mail foi aplicada remotamente com limite de
  plano e owner imutavel; a RPC `SECURITY DEFINER` e intencional e restrita.
- Settings persiste auditoria de plataforma, API, estoque, pedidos e clientes
  usando `integrations` e RLS existente.
- Suite final possui 40 testes em 10 arquivos; lint e build passaram.

## Handoff 2026-07-13 - RAG E Persistencia Do Chat

- Matriz automatica cobre literal, multi-chunk, ambiguo e sem resposta; corpus
  offline valida 21 casos em quatro categorias.
- `finalize_chat_completion` foi aplicada remotamente como RPC transacional,
  `SECURITY INVOKER`, tenant-scoped e restrita a authenticated.
- Resposta, atividade da conversa e `chat.completion` agora persistem juntas.
- Falhas de stream ou persistencia geram logs estruturados e `chat.failed` sem
  armazenar prompt ou resposta.
- Teste remoto com rollback confirmou mensagem, uso e atividade; pgTAP possui
  57 assertions preparadas.

## Handoff 2026-07-12 - Default De Assistente

- `set_default_assistant` foi aplicada remotamente como RPC transacional,
  `SECURITY INVOKER`, tenant-scoped e restrita a admin.
- Actions de criar, editar, promover e fallback usam a mesma operacao atomica.
- Tipos oficiais regenerados; pgTAP atual possui 40 assertions.

## Handoff 2026-07-12 - DOCX Textual

- DOCX agora usa Mammoth para extracao de texto cru no servidor.
- Arquivos vazios falham explicitamente; HTML, macros e imagens nao sao
  executados.
- Testes de OOXML em memoria, lint e build passaram.

## Handoff 2026-07-12 - RLS E Automacoes No Remoto

- Aplicadas migrations de 15 indices FK, policies de runs manuais, initplans
  Auth e consolidacao de policies permissivas.
- Advisors remotos: zero FK sem indice, zero initplan Auth e zero policies
  permissivas sobrepostas.
- Permanecem warning intencional do bootstrap `SECURITY DEFINER`, protecao de
  senha vazada desativada e infos de indices novos ainda sem uso.
- pgTAP local possui 34 assertions, incluindo isolamento de runs e bloqueio de
  movimentacao de conversa entre tenants.

## Handoff 2026-07-12 - Benchmark RAG Reproduzivel

- Criado `bun run benchmark:rag` para executar o corpus oficial sem depender da
  UI do chat.
- `--validate-only` confirma estrutura e selecao sem credenciais ou custo.
- Execucao real exige `BEM_HUB_BENCHMARK_ACCESS_TOKEN`,
  `BEM_HUB_BENCHMARK_ORGANIZATION_ID` e assistente default ou ID explicito.
- Relatorios JSON sao gravados em `output/benchmarks` e ignorados pelo Git.
- O corpus validou 21 casos; 8 testes automatizados, lint e build passaram.
- Nenhuma chamada real de IA foi feita pelo runner nesta sessao.
- Avaliador agora respeita os criterios declarados no corpus, diferencia
  `PASS`/`FAIL`/`REVIEW` e inclui resumo por categoria.
- Casos com parafrase exigem revisao humana em vez de aprovacao automatica.
- Suite atual possui 11 testes; lint e build passaram apos o hardening do
  avaliador.

## Handoff 2026-07-12 - RAG No Chat

- Implementada recuperacao semantica antes do chat com threshold e limites.
- Contexto recuperado e tratado como dado nao confiavel no prompt.
- Fontes sao persistidas em metadata e exibidas no stream/historico.
- Estados sem documentos e sem evidencia relevante sao explicitos na UI.
- Cinco testes Bun, lint e build passaram.
- Benchmark real, QA autenticado e verificacao visual permanecem pendentes por
  falta de credenciais/sessao de usuario e navegador integrado indisponivel.
- O proximo passo e executar `docs/benchmarks/benchmark-rag.*` contra o corpus
  remoto e calibrar o threshold com resultados, nao por intuicao.

## Handoff 2026-07-12 - Hardening M0

- Criada a migration local
  `20260712160034_harden_tenant_security_functions.sql`.
- Criado `supabase/tests/security_hardening_test.sql`; suite atual possui 33
  assercoes pgTAP, incluindo isolamento de automacoes manuais.
- O remoto ainda nao recebeu a migration; chamada anonima a `is_org_member`
  respondeu HTTP 200 antes do hardening.
- Lint e build passaram.
- Validacao SQL, advisors, aplicacao remota, leaked-password protection e teste
  com dois usuarios estao bloqueados por ausencia de Docker local e credenciais
  de gerenciamento/banco.
- Trabalho local pode continuar no M1 RAG, mas dados reais nao devem ser
  considerados liberados ate concluir o gate remoto de M0.

## Estado Atual

BEM HUB está com a base de produto do MVP funcionando como workspace
autenticado: Supabase Auth, organização, membros, assistentes, chat,
entitlements, troca manual de plano e conexões de provedores de IA.

O foco visual atual é o console operacional escuro descrito em
`docs/design-system.md`: sidebar fixa, topbar compacta, cards escuros,
sinalização verde e páginas de trabalho em português.

## Feito

- Criado e mantido o guia operacional `AGENTS.md`.
- Criada a skill local `.codex/skills/bem-hub-frontend-design`.
- Documentado o design system em `docs/design-system.md`.
- Instaladas as skills Supabase:
  - `.agents/skills/supabase`
  - `.agents/skills/supabase-postgres-best-practices`
- Configurado MCP Supabase para o projeto `lzqugeqtcisgaztggcxq`.
- Configurado ambiente local com `.env.local`.
- Adicionado `APP_ENCRYPTION_KEY` para criptografar chaves de IA.
- Aplicadas migrations remotas Supabase até:
  - `0006_ai_provider_connections`
- Implementado auth:
  - `/auth/login`
  - `/auth/signup`
  - `/auth/logout`
  - `src/proxy.ts` para refresh de sessão SSR.
- Implementado bootstrap autenticado do workspace:
  - upsert de profile
  - criação/recuperação de organização
  - membership owner via RPC
  - assinatura free/manual inicial.
- Implementado `/app` com shell escuro, sidebar, topbar, menu de usuário,
  logout e suporte a tema.
- Implementados componentes base de layout responsivo:
  - `PageLayout`
  - `PageHeader`
  - `SectionHeader`
  - `ContentGrid`
  - `SplitPanel`
  - `ContextPanel`
  - `CommandSearch`
  - `MobileShell`
- Implementado Assistants CRUD em `/app/assistants`:
  - listar por organização
  - criar, editar, excluir
  - definir padrão
  - validar inputs com Zod
  - owner/admin gerenciam
  - member fica read-only.
- Implementado chat com persistência e streaming:
  - `/api/chat`
  - validação de payload
  - criação/reuso de conversa
  - gravação de mensagens
  - uso de instruções do assistente
  - registro de metadata de modelo/provedor
  - registro de `usage_events`
  - checagem server-side de plano/limite antes de chamar IA.
- Estruturada camada de entitlements:
  - leitura de `subscriptions` e `plans`
  - módulos por plano
  - limites por plano
  - erros padronizados para feature bloqueada, limite e assinatura.
- Criada tela de CTA/upgrade e depois migrada para settings/billing.
- Implementadas conexões de provedores de IA:
  - tabela `ai_provider_connections`
  - colunas `assistants.provider` e `assistants.provider_connection_id`
  - RLS para leitura por membro e gestão por admin
  - cadastro de chaves por organização
  - criptografia AES-256-GCM no servidor
  - suporte a OpenAI, Anthropic/Claude e Gemini via AI SDK
  - fallback para env vars legadas quando não houver conexão cadastrada
  - seleção de provider/conexão/modelo no cadastro do assistente.
- Smoke test funcional de settings/billing, settings/ai-providers,
  assistants e chat foi reportado como concluído pelo usuário em 2026-07-01.
- Implementado Knowledge Base Ingestion inicial:
  - migration `0007_knowledge_base_ingestion`
  - bucket privado Supabase Storage `knowledge-documents`
  - policies de storage por primeiro segmento do path como `organization_id`
  - colunas de metadata em `documents`: tamanho, chunks, modelo e data de
    processamento
  - upload em `/api/knowledge/documents`
  - tela `/app/knowledge`
  - validação server-side de owner/admin, plano e limite de documentos
  - extração de TXT/Markdown/PDF com texto selecionável
  - chunks e embeddings OpenAI `text-embedding-3-small`
  - busca semântica via `match_document_chunks`
  - exclusão de documentos em `/app/knowledge` para owner/admin, removendo
    objeto do Storage e chunks por cascade
  - DOCX e PDFs sem texto extraível ficam registrados como `failed` com
    mensagem clara.
- Aplicada remotamente a migration `0006_ai_provider_connections` via MCP.
- Recarregado schema cache do PostgREST com `notify pgrst, 'reload schema';`.
- Criada área de configurações com submenu:
  - `/app/settings`
  - `/app/settings/account`
  - `/app/settings/billing`
  - `/app/settings/ai-providers`
- Ajustada navegação principal:
  - removido item isolado `Plano`
  - `Configurações` agora abre a área de settings.
- Implementada troca manual de plano em `/app/settings/billing`:
  - server action `changeOrganizationPlanAction`
  - owner/admin podem ativar plano durante a construção
  - atualiza `subscriptions` com status `manual`
  - revalida rotas afetadas.
- Mantida compatibilidade:
  - `/app/upgrade` redireciona para `/app/settings/billing`
  - `UpgradeCTA` aponta para `/app/settings/billing`.
- Atualizados docs/env:
  - `.env.example`
  - `docs/architecture.md`
  - `docs/deployment-vercel.md`.

## Verificado

- `bun run lint` passou após as alterações.
- `bun run build` passou após as alterações.
- Build atual inclui as rotas:
  - `/api/knowledge/documents`
  - `/api/knowledge/documents/[documentId]`
  - `/app/knowledge`
  - `/app/settings`
  - `/app/settings/account`
  - `/app/settings/billing`
  - `/app/settings/ai-providers`
  - `/app/upgrade`
- Supabase remoto validado via MCP:
  - migration `0006_ai_provider_connections` no histórico remoto
  - migration `0007_knowledge_base_ingestion` no histórico remoto
  - `public.ai_provider_connections` criada
  - RLS ativo na tabela
  - `assistants.provider` existe
  - `assistants.provider_connection_id` existe.
  - bucket privado `storage.buckets.knowledge-documents` criado
  - colunas `documents.file_size`, `documents.chunk_count`,
    `documents.embedding_model` e `documents.processed_at` existem
  - policies `knowledge_documents_*` existem em `storage.objects`.

## Ainda Não Verificado Manualmente

- Abrir `/app/knowledge` em ambiente com Supabase Storage e OpenAI configurados.
- Enviar um TXT, Markdown ou PDF com texto selecionável e confirmar status
  `ready`, chunks e busca
  semântica.
- Excluir documentos prontos e falhos pela UI e confirmar remoção do registro,
  chunks e objeto no bucket.
- Enviar um DOCX ou PDF escaneado e confirmar status `failed` com mensagem
  clara de parser/OCR ainda não suportado.
- Verificação com dois usuários Supabase para confirmar isolamento completo
  entre organizações, incluindo objetos de Storage.

## Alertas Supabase

Advisors ainda apontam hardening pendente:

- Funções `SECURITY DEFINER` públicas executáveis por `anon`/`authenticated`:
  - `bootstrap_owned_organization`
  - `is_org_admin`
  - `is_org_member`
  - `match_document_chunks`
- Proteção contra senha vazada desativada no Supabase Auth.
- Foreign keys sem índices, incluindo novo alerta em:
  - `public.ai_provider_connections.created_by`
- Algumas políticas RLS com initplan/performance warnings.
- Algumas tabelas com múltiplas políticas permissivas.

Esses pontos não bloquearam o MVP local, mas devem virar uma migration de
hardening antes de qualquer uso com dados sensíveis reais.

## Estado Do Git

A worktree está suja com mudanças intencionais desta sessão. Não houve commit.
Antes de continuar, rode:

```powershell
git status --short
```

Arquivos novos importantes:

- `supabase/migrations/0006_ai_provider_connections.sql`
- `supabase/migrations/0007_knowledge_base_ingestion.sql`
- `src/features/ai-provider-connections/*`
- `src/features/knowledge-base/*`
- `src/lib/ai/providers.ts`
- `src/lib/ai/runtime.ts`
- `src/lib/ai/embeddings.ts`
- `src/lib/security/encryption.ts`
- `src/lib/supabase/schema-errors.ts`
- `src/app/api/knowledge/documents/route.ts`
- `src/app/app/knowledge/page.tsx`
- `src/app/app/settings/*`
- `src/components/app/settings-nav.tsx`
- `src/features/billing/actions.ts`
- `src/features/billing/plan-change-button.tsx`

Arquivos de logo em `public/` também aparecem como não rastreados:

- `public/bh16.svg`
- `public/logo-bh32.svg`
- `public/logo-bh64.svg`

## Próximo Passo Recomendado

Fazer smoke test da nova tela `/app/knowledge` com a migration
`0007_knowledge_base_ingestion` já aplicada no Supabase remoto:

1. Enviar TXT, Markdown ou PDF com texto selecionável.
2. Confirmar objeto no bucket privado `knowledge-documents`.
3. Confirmar documento `ready`, chunks gravados e evento de uso.
4. Rodar busca semântica na própria tela.
5. Excluir um documento e confirmar remoção do Storage, `documents` e chunks.
6. Confirmar que DOCX e PDF escaneado aparecem como `failed` com mensagem clara.
7. Repetir checagem com dois usuários/organizações para isolamento em tabelas e
   Storage.

Depois disso, o próximo bloco pelo backlog é RAG Answering:

- recuperar top chunks antes da resposta do chat
- injetar contexto no prompt
- retornar fontes/citacoes para a UI

## Handoff 2026-07-07

Resumo da sessao:

- Smoke test reportado pelo usuario:
  - upload/processamento de TXT funciona.
  - upload/processamento de PDF com texto selecionavel passou depois da
    correcao do parser.
- Corrigido erro de PDF no Next.js:
  - `next.config.ts` externaliza `pdf-parse` e `pdfjs-dist` via
    `serverExternalPackages`.
  - `/api/knowledge/documents` declara `runtime = "nodejs"`.
  - Isso evita o erro de `pdf.worker.mjs` sendo procurado dentro de
    `.next/dev/server/chunks`.
- Implementado download do arquivo original:
  - `GET /api/knowledge/documents/[documentId]`.
  - rota autenticada.
  - busca `documents` filtrando por `id` e `organization_id`.
  - gera signed URL de 5 minutos no bucket privado `knowledge-documents`.
  - UI de `/app/knowledge` ganhou botao `Baixar` em cada card.
  - membros podem baixar documentos visiveis; exclusao segue restrita a
    owner/admin.

Verificacao desta sessao:

- `bun run lint` passou apos a correcao de PDF.
- `bun run build` passou apos a correcao de PDF.
- `bun run lint` passou apos adicionar download.
- `bun run build` passou apos adicionar download.

Pendente:

- Confirmar manualmente download pela UI em um documento pronto e um falho.
- Confirmar exclusao removendo Storage, `documents` e chunks.
- Testar Markdown.
- Testar DOCX/PDF escaneado como `failed` com mensagem clara.
- Repetir verificacao com dois usuarios/organizacoes para isolamento em tabelas
  e Storage quando houver credenciais disponiveis.

Proxima sessao:

Comecar RAG Answering. A base de conhecimento ja tem upload, processamento,
chunks, embeddings, busca semantica, exclusao e download do arquivo original.
O primeiro slice recomendado:

1. Recuperar top chunks da organizacao antes da resposta do chat.
2. Injetar contexto documental no prompt do assistente.
3. Fazer o assistente responder quando o contexto for insuficiente.
4. Retornar fontes para a UI do chat.
5. Manter limites/entitlements e isolamento por `organization_id` no servidor.

## Handoff 2026-07-09

Preparacao do benchmark RAG:

- O usuario processou com sucesso quatro arquivos Markdown em `/app/knowledge`.
- A tela reportou 4 documentos prontos, 49 chunks e nenhuma falha.
- Os documentos corporativos indexados foram:
  - `manual-de-reembolsos.md`
  - `politica-de-ferias.md`
  - `operacao-cliente-orion.md`
- `roteiro-de-validacao-rag.md` tambem foi processado, mas contem o gabarito e
  deve ser excluido da base de conhecimento antes de qualquer validacao RAG.
- Os artefatos externos de benchmark estao versionados em `docs/benchmarks`:
  - `benchmark-rag.csv`
  - `benchmark-rag.json`
  - `benchmark-rag.yaml`
- Esses tres arquivos de benchmark nao devem ser enviados nem indexados na base
  de conhecimento.

Nao foi executado teste RAG nesta sessao. O chat ainda precisa receber a
implementacao do bloco RAG Answering antes da validacao ponta a ponta.

Proxima sessao:

1. Excluir `roteiro-de-validacao-rag.md` de `/app/knowledge` para remover o
   gabarito dos chunks pesquisaveis.
2. Implementar recuperacao dos top chunks da organizacao no fluxo de chat.
3. Injetar o contexto recuperado no prompt sem expor dados entre organizacoes.
4. Retornar e exibir as fontes usadas na resposta.
5. Executar o benchmark externo, incluindo perguntas sem resposta, e comparar
   resultado, documento citado e comportamento esperado.
