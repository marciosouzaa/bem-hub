# Worklog

Checkpoint curto para continuidade entre sessoes. Manter a entrada mais recente
no topo. Nao substituir `docs/handoff.md`; registrar aqui o andamento operacional
do marco ativo.

## 2026-07-22 - Encerramento Da Sessao WhatsApp

### Estado Confirmado

- Broadcast privado autenticado funciona e atualiza Atendimento em tempo real.
- Mensagem digitada no app usa endpoint HTTP, chega ao WhatsApp e fica salva
  como `sent`; WebSocket nao transporta envio.
- Composer humano nao possui rascunho nem aprovacao.
- Webhook Uazapi recebe mensagens do contato e mensagens manuais `fromMe`; eco
  `wasSentByApi` e grupos permanecem excluidos.
- Regressao de ingestao causada por nome truncado de constraint foi corrigida
  pela migration remota `20260723013202_restore_channel_webhook_constraint_name`.
- Box e copias obsoletas de `Revisao humana` foram removidos do Atendimento.

### Protecoes Adicionadas

- Idempotencia do envio humano por `client_request_id`.
- Persistencia anterior ao fornecedor com estados `sending`, `sent` e `failed`.
- pgTAP verifica constraint real e referencia usada pela funcao de ingestao.
- Principios de migrations agora registram limite de 63 bytes, catalogo como
  fonte da verdade, migrations imutaveis e risco de redefinir funcao antiga.

### Verificacao Final

- 60 testes unitarios passaram.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- Probes remotos inbound e outbound processaram e sofreram rollback completo.
- Advisors nao apontaram novo problema causado por este recorte.

### Retomada

1. Fazer smoke real novo: contato -> WhatsApp -> app e aparelho -> WhatsApp ->
   app; cada mensagem deve aparecer uma vez na mesma thread.
2. Recuperar pelo historico Uazapi apenas o intervalo de callbacks que recebeu
   erro antes da migration corretiva, caso o fornecedor nao o repita.
3. Implementar retry explicito e estados posteriores de entrega/leitura.

## 2026-07-22 - Ingestao WhatsApp Corrigida

### Causa

- `20260723011509_support_direct_messages` redefiniu
  `ingest_channel_inbound_message` a partir de um corpo anterior e restaurou o
  nome longo de uma constraint que o PostgreSQL havia truncado para 63 bytes.
- O webhook continuava chegando, mas cada RPC retornava HTTP 400 antes de criar
  o evento ou a mensagem. O envio pelo app nao era afetado porque usa outro RPC.

### Correcao

- Aplicada remotamente a migration
  `20260723013202_restore_channel_webhook_constraint_name`.
- A migration consulta `pg_constraint`, exige que o objeto real exista e troca
  cirurgicamente a referencia na funcao via `pg_get_functiondef`.
- pgTAP agora verifica a constraint real e a referencia usada pela funcao.
- `docs/principles.md` registra limite de 63 bytes, migrations imutaveis e a
  proibicao de substituir funcoes usando corpos antigos sem incorporar patches.

### Verificacao

- Probe transacional processou `message.received` e
  `message.sent_by_phone` na conversa esperada.
- Rollback confirmado: zero evento e zero mensagem de teste permaneceram.
- A definicao remota referencia
  `channel_webhook_events_channel_connection_id_provider_event_key`.

### Falta

- Fazer novo smoke real nos dois sentidos.
- Verificar se a Uazapi repetira os callbacks que receberam erro durante a
  regressao; se nao repetir, recuperar o intervalo pelo historico do fornecedor.

## 2026-07-22 - Envio Direto De Atendimento

### Feito

- O composer de `/app/support` agora envia texto diretamente, sem rascunho,
  aprovacao ou revisao intermediaria.
- O navegador usa `POST /api/support/messages`; WebSocket continua restrito a
  invalidacao e atualizacao da interface.
- Cada tentativa e persistida como `sending` antes da chamada Uazapi e finaliza
  como `sent` ou `failed`.
- `client_request_id` e indice unico impedem que o mesmo POST envie duas vezes.
- O adapter Uazapi usa `POST /send/text`, header `token` e registra o
  `messageid` retornado pelo fornecedor.
- Webhook Uazapi aceita `fromMe` manual como `message.sent_by_phone`; ecos
  `wasSentByApi` e grupos continuam ignorados.
- Timeline perdeu controles de rascunho/aprovacao e ganhou rolagem automatica.
- Aplicada remotamente a migration
  `20260723011509_support_direct_messages`.
- Deploy `0bcc647` confirmado por `405 Method Not Allowed` na nova rota GET e
  webhook Uazapi reconfigurado para excluir apenas `wasSentByApi` e grupos.

### Verificacao

- Migration, funcoes, permissoes e indice de idempotencia confirmados no remoto.
- Probe transacional confirmou primeira persistencia e retry com `created=false`,
  sem manter a mensagem de teste.
- Contexto real possui destinatario e credencial criptografada resolviveis.
- Testes, lint e build passaram; nenhum novo advisor de seguranca foi criado.
- Nenhuma mensagem real foi enviada durante a verificacao automatica.

### Falta

- Fazer dois smokes: enviar pelo composer e enviar manualmente pelo WhatsApp;
  ambos devem aparecer uma vez na mesma thread.
- Implementar retry explicito e estados posteriores de entrega/leitura.

## 2026-07-22 - Broadcast Privado Remoto Aplicado

### Feito

- Refeito o fluxo desde o preflight conforme documentacao atual do Supabase.
- Isolado que `CREATE POLICY` e permitido em `realtime.messages`, enquanto
  `DROP POLICY` e `COMMENT ON POLICY` recebem `ERROR 42501` por ownership.
- Removidas somente essas duas operacoes opcionais da migration.
- Aplicada remotamente
  `20260723002745_support_realtime_broadcast`.

### Verificacao

- Policy SELECT privada existe somente para `authenticated` e valida membro
  ativo contra `org:<organization_id>:support`.
- Funcao `private.broadcast_support_change()` usa `SECURITY DEFINER`,
  `search_path` vazio e nao pode ser executada por papeis da API.
- Tres triggers estao ativos nas tabelas de atendimento.
- Probes transacionais passaram: topico proprio permitido, topico externo
  negado e trigger emitindo `support.inbox.changed` sem persistir dados de teste.
- 66 testes, lint e build passaram.
- Advisors mantiveram somente alertas anteriores, sem novo alerta do Broadcast.

### Falta

- Fazer smoke WebSocket autenticado com `/app/support` aberto e mensagem real;
  navegador integrado estava indisponivel nesta sessao.

## 2026-07-22 - Inbox Operacional De Atendimento

### Feito

- `/app/support` agora usa canvas master-detail: fila filtravel na lateral,
  conversa selecionada no centro e contexto do contato em painel complementar.
- Busca cobre contato, telefone, e-mail, canal e tags; visualizacoes separam
  abertos, pendentes, escalados e resolvidos sem transformar a inbox em tabela.
- Itens da fila usam signal edge somente para prioridade alta/urgente e mantem
  status, canal e atividade recente visiveis.
- Conversa preserva historico, edicao/aprovacao/rejeicao/escalada de rascunhos e
  composer sem envio externo; nenhuma acao de transferencia ou finalizacao foi
  inventada antes dos contratos server-side.
- Layout responsivo mostra fila ou conversa no mobile e ambas no desktop.
- Configuracao publica do Supabase passou a usar acesso estatico compativel com
  bundle do Next.js; falha opcional do Realtime nao derruba mais Atendimento.

### Verificacao

- 66 testes passaram, incluindo busca normalizada e filtro por status.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- QA visual autenticado nao foi executado porque o navegador integrado nao estava
  disponivel; revisar desktop e mobile a partir da sessao real.

### Proximo Passo

- Fazer QA visual autenticado e ajustar densidade/overflow com dados reais.
- Manter Broadcast privado bloqueado ate procedimento suportado pelo Supabase;
  depois aplicar migration e validar atualizacao da fila sem recarga.

## 2026-07-18 - Migration Broadcast Bloqueada Pelo Schema Gerenciado

### Confirmado No Remoto

- OAuth do MCP Supabase foi renovado e `list_tables`, `list_migrations`,
  `execute_sql` e advisors voltaram a responder.
- `realtime.messages` possui RLS ativo, mas nenhuma policy configurada.
- A tabela pertence a `supabase_realtime_admin`; `postgres`, papel usado pelo
  executor de migrations, não pode assumir esse papel.

### Tentativa De Aplicação

- `apply_migration` foi chamado com o conteúdo exato de
  `20260718024146_support_realtime_broadcast.sql`.
- O PostgreSQL recusou a primeira instrução com
  `ERROR 42501: must be owner of relation messages`.
- A transação foi revertida integralmente. A migration não entrou no histórico
  e nenhum trigger, função ou policy foi criado remotamente.
- Advisors anteriores à tentativa não apontaram bloqueio relacionado ao
  Broadcast; os avisos existentes continuam sendo os já conhecidos.

### Decisão De Segurança

- Não usar canal público como contorno. Mesmo sem conteúdo no payload, ele
  removeria a autorização server-side por organização e ampliaria risco de
  vazamento ou abuso de quota.
- Manter o código local e os testes de Broadcast privado como estado desejado.

### Próxima Pendência

1. Abrir chamado no Supabase para provisionar a policy SELECT em
   `realtime.messages` como `supabase_realtime_admin`, ou liberar um mecanismo
   suportado para gerenciá-la por migration.
2. Após a resposta, alinhar a migration ao procedimento indicado sem transferir
   ownership de objetos gerenciados.
3. Aplicar a migration, rodar advisors de segurança/performance e verificar
   policy, função e três triggers.
4. Fazer smoke real com `/app/support` aberto; uma nova mensagem deve aparecer
   sem recarga manual.

## 2026-07-17 - Callback Validado E Broadcast Privado Preparado

### Confirmado Em Produção

- Callback real Uazapi chegou, foi normalizado e persistiu contato, conversa e
  mensagem uma única vez.
- A conversa apareceu depois de recarregar `/app/support`, confirmando que
  webhook, idempotência e RPC canônica estavam corretos.
- A lacuna observada era somente atualização ao vivo da interface.

### Feito Localmente

- Criado Broadcast privado por organização no tópico
  `org:<organization_id>:support`.
- RLS em `realtime.messages` permite leitura apenas a membros ativos do tenant;
  o cliente não recebe permissão de publicação.
- Triggers de `support_conversations` e `support_messages` publicam somente o
  evento provider-neutral `support.inbox.changed`, sem conteúdo, telefone ou
  payload bruto.
- `/app/support` mantém um listener no layout do segmento. Evento, reconexão,
  foco e retorno de visibilidade causam reconciliação com as RPCs existentes,
  com debounce para agrupar eventos da mesma transação.
- O padrão preserva API/banco como fonte da verdade, tolera evento duplicado ou
  perdido e não depende de Uazapi, Z-API ou fornecedor futuro.

### Verificação

- 64 testes passaram.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- pgTAP foi ampliado para 122 assertions, incluindo política privada, função
  protegida, triggers e isolamento entre dois tenants.

### Bloqueio E Próximo Passo

- A autorização OAuth foi resolvida em 2026-07-18, mas a aplicação revelou o
  bloqueio de ownership detalhado no checkpoint mais recente.
- Depois fechar envio de texto por outbox/adapter.

## 2026-07-17 - Uazapi Conectada, Callback Ainda Ausente

### Confirmado Em Produção

- Nova credencial Uazapi foi validada; canal aparece como `connected`.
- Webhook foi configurado às `2026-07-17 04:33:39 UTC` e o endpoint interno
  está `active`, sem erro registrado.
- Consulta direta `GET /webhook` da Uazapi retornou HTTP 200 com uma
  configuração habilitada para `messages`, apontando para
  `bem-hub.vercel.app`.
- Filtros ativos excluem `wasSentByApi`, mensagens `fromMe` e grupos, evitando
  loop e entradas fora do piloto.

### Bloqueio Observado

- `last_received_at` e `webhook_verified_at` continuam nulos.
- Banco possui zero `channel_webhook_events`, zero `support_messages` e zero
  `support_conversations`.
- Portanto, a lista de Atendimento não está desatualizada: nenhum callback
  alcançou o BEM HUB.

### Retomada Amanhã

1. Manter a instância gratuita viva e conectada.
2. Enviar mensagem de texto **de outro número** para o número conectado; não
   testar enviando pelo próprio número, por API ou em grupo, pois esses eventos
   são excluídos.
3. Atualizar `/app/support` e verificar se o canal muda para
   `Entrada confirmada`.
4. Se continuar vazio, abrir os logs da Function na Vercel e procurar `POST`
   em `/api/webhooks/channels/uazapi/...`.
5. Se não houver POST, investigar entrega/callback na Uazapi. Se houver POST,
   registrar status HTTP e corrigir verificação/normalização do payload.
6. Somente após entrada real aparecer uma vez, iniciar envio por outbox.

## 2026-07-17 - Entrada Uazapi Implementada

### Feito

- Criado endpoint global `/api/webhooks/channels/[provider]/[endpointToken]`;
  providers só verificam e normalizam para o evento interno
  `message.received`.
- Uazapi configura o callback automaticamente, recebe apenas mensagens de
  entrada e exclui grupos, mensagens próprias e envios feitos pela API.
- Endpoint usa segredo opaco de alta entropia armazenado somente como SHA-256.
- Ingestão idempotente cria identidade, contato, conversa ativa e mensagem,
  mantendo escopo por organização e conexão.
- Drawer de canal ganhou ativação e estados `Aguardando primeira mensagem` e
  `Entrada confirmada`.
- Migrations `channel_webhook_ingestion`, índices de FKs e dois reparos do alvo
  de conflito foram aplicadas no Supabase remoto.
- Smoke SQL processou a fatia completa e os dados temporários foram removidos;
  verificação final confirmou zero resíduos.

### Verificação

- 62 testes passaram.
- `bun run lint` e `bun run build` passaram.
- RLS ativo nas três tabelas internas; `anon` e `authenticated` sem leitura;
  somente `service_role` executa a RPC de ingestão.
- Advisors: nenhuma nova falha de segurança; índices de FKs corrigidos.

### Próximo Passo

- Publicar o código com `APP_BASE_URL`, `SUPABASE_SECRET_KEY` e
  `APP_ENCRYPTION_KEY` na Vercel.
- Rotacionar o token Uazapi exposto nas capturas, substituir a credencial no
  BEM HUB, clicar em `Ativar recebimento` e validar mensagem real em
  `/app/support`.
- Depois fechar envio de texto via outbox/adapter; Z-API pluga no mesmo webhook.

## 2026-07-17 - Backend De Canais Liberado

### Feito

- Migration `20260717025135_add_channel_provider_connections.sql` aplicada no
  Supabase remoto.
- `SUPABASE_SECRET_KEY` configurada localmente e reportada como configurada na
  Vercel; nenhum valor secreto foi registrado no repositório.
- Cliente administrativo autenticou com a nova secret key e leu
  `channel_credentials` com sucesso.
- Verificado que `channel_credentials` mantém RLS ativo, nega acesso a
  `anon`/`authenticated` e permite acesso somente ao backend.
- `APP_ENCRYPTION_KEY` local presente para criptografar tokens dos providers.

### Verificação

- `bun test --timeout 15000`: 55 testes passaram.
- `bun run lint`: passou.
- `bun run build`: passou com Next.js 16.2.9 e `.env.local`.

### Próximo Passo

- Confirmar `APP_ENCRYPTION_KEY` também na Vercel e publicar novo deploy.
- Rotacionar credenciais expostas nas capturas e fazer smoke real de Uazapi e
  Z-API pelo drawer de `/app/channels`.
- Com entrada real validada, implementar webhook idempotente e envio pela
  outbox.

## 2026-07-16 - Conexões Uazapi E Z-API Iniciadas

### Feito

- Escolha operacional mudou para dois adapters não oficiais: Uazapi primeiro e
  Z-API no mesmo contrato provider-neutral.
- Migration local adiciona credenciais de canal criptografadas em tabela sem
  acesso de `anon`/`authenticated`, estados reais de conexão, saúde e instância
  externa.
- Operações privilegiadas usam chave Supabase somente no servidor; tokens de
  provider nunca retornam para a interface.
- Adapters validam saúde, pedem QR/código e desconectam usando contratos atuais
  de Uazapi e Z-API.
- `/app/channels` ganhou drawer operacional para escolher provider, validar e
  substituir credenciais, gerar pareamento, atualizar saúde e desconectar.
- Quatro testes novos cobrem headers, URL segura, normalização de telefone,
  saúde e QR/código.
- pgTAP passou a 100 assertions preparadas, incluindo ACL de credenciais e
  estado inicial do canal.

### Verificação

- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- Suite passou 54 testes; um teste DOCX excedeu 5 segundos nessa execução e
  passou isoladamente em 79 ms, indicando flake de tempo sem relação com canais.
- QA visual autenticado não executado porque navegador integrado não estava
  disponível.
- `supabase db lint --local` não executou porque Postgres/Supabase local não
  está disponível.

### Pendente

- Aplicar `20260717025135_add_channel_provider_connections.sql` no Supabase.
- Adicionar `SUPABASE_SECRET_KEY` ao ambiente server-side; `APP_ENCRYPTION_KEY`
  já está presente localmente.
- Regenerar tokens e QR expostos em capturas antes de qualquer teste real.
- Validar uma instância real por provider; depois implementar webhook
  idempotente, entrada de texto e envio pela outbox.

## 2026-07-13 - Fundacao Frontend Aplicada

### Feito

- Primitives compartilhadas implementadas para input, textarea, select,
  checkbox, campo, secao, spinner, skeleton, vazio, erro e botao de icone.
- Dialog, confirmacao, dropdown e drawer usam Radix com estilo e tokens proprios
  do BEM HUB.
- `EntityDrawer` abre novo/editar pela direita, possui footer fixo, bloqueia
  fechamento durante submit e confirma descarte quando o formulario esta sujo.
- DataTable headless implementada com TanStack Table, ordenacao, responsividade,
  loading, vazio, erro, paginacao, click por teclado, signal edge e dropdown por
  linha.
- Canais migrados do formulario fixo e edicao em `details` para DataTable,
  busca, menu por linha e editor lateral; dominio foi separado de Atendimento.
- Assistentes migrados de cards e formularios embutidos para DataTable e drawer
  complexo com React Hook Form + Zod, preservando limites, papeis e providers.
- Conexoes de IA migradas para DataTable e drawer de criacao, preservando
  criptografia, chave write-only, escopo da organizacao e conexao padrao.

### Verificacao

- `bun test`: 51 testes passaram.
- `bun run lint`: passou sem alertas.
- `bun run build`: passou com Next.js 16.2.9.
- Verificacao visual automatizada nao executada: navegador integrado nao estava
  disponivel nesta sessao.

### Proximo Passo

Fazer smoke visual autenticado em desktop/mobile e, depois, aplicar os mesmos
contratos onde forem realmente CRUD: equipe/convites e futuros contatos. Nao
converter chat, composer, upload ou execucao de automacao em drawer apenas por
uniformidade.

## 2026-07-13 - Padroes Frontend E CRUD

### Feito

- Arquitetura frontend de referencia foi analisada em componentes, reutilizacao,
  estrutura de arquivos, formularios, drawers e tabelas.
- Padrao proprio registrado em `docs/frontend-engineering-patterns.md`, sem
  referencias identificaveis a repositorios externos.
- Novo/editar passa a abrir sempre em `EntityDrawer` lateral direito.
- DataTable sera compartilhada, com acoes por linha em dropdown e assinatura
  visual `signal edge`, sem toolbar permanente de botoes.
- Foram definidos orcamentos de arquivo, fronteiras server/client, estrutura por
  feature, estados obrigatorios, acessibilidade e ordem de adocao.

### Decisoes

- Nao criar DataTable monolitica nem `CrudPage` universal.
- Paginacao explicita/cursor e padrao para tabelas; infinite scroll fica em
  feeds, conversas e timelines.
- Nomes de componentes devem ser descritivos; `component.tsx` generico fica
  proibido.

### Proximo Passo

Implementar primitives ausentes e validar `EntityDrawer` + DataTable minima em
um CRUD pequeno antes de migrar canais, contatos e assistentes.

## 2026-07-13 - Definicao Do Atendimento WhatsApp

### Feito

- Fluxos de canais, contatos e atendimento foram analisados de ponta a ponta,
  mantendo somente o que pertence ao escopo do BEM HUB.
- Plano proprio registrado em `docs/atendimento-whatsapp-plan.md`.
- Direcao proposta: Meta Cloud API direta no oficial; spike de Z-API para o
  piloto nao oficial, com Wuzapi como fallback self-hosted.
- Modelo separa credencial, identidade externa, revisao humana, entrega,
  webhook idempotente, outbox e leitura por operador.
- UX proposta usa inbox, conversa e contexto; somente WhatsApp no MVP.

### Riscos Encontrados

- O modelo atual mistura modalidade oficial/nao oficial com QR/PIN.
- Status atual de mensagem mistura revisao e entrega.
- Mutacoes diretas e armazenamento de segredos precisam endurecimento antes de
  conectar um numero real.
- O conector nao oficial depende de gate juridico, comercial e de autenticacao
  de webhook.

### Proximo Passo

Executar a Fase 0 do plano: fixtures dos contratos e spike dos dois provedores.
Nao retomar geracao de IA antes de provar o transporte real de texto.

## 2026-07-13 - App Shell E Drawer

### Feito

- Sidebar desktop fixa e independente do scroll central.
- Menu retrai de 256px para 80px e persiste preferencia no navegador.
- Mobile usa drawer modal com overlay, Escape, ciclo e retorno de foco.
- Shell separa busca server-side, comportamento client e navegacao visual.
- Antigo menu mobile baseado em `details` foi removido.
- Geometria critica usa limites explicitos: sidebar fixa em `80px/256px` e
  painel central acompanha a largura sem ficar por baixo dela.
- Estado retraido renderiza somente icones; controle fica no rodape.

### Verificacao

- 51 testes, lint e build passaram.
- Usuario validou visualmente o estado final como estavel em desktop.
- Browser visual integrado permaneceu indisponivel para automacao.
- Commits: `9abf4d0`, `05f232f`, `564d28b`, `3b7abea`, `a3c10c9`.

### Proximo Passo

Retomar geracao de rascunho de atendimento por IA sem envio externo. Nao
refatorar novamente o shell sem regressao reproduzivel.

## 2026-07-13 - Revisao Humana No Atendimento

### Feito

- Detalhe do atendimento cria rascunho sem qualquer envio externo.
- Operador aprova, rejeita ou escala; transicoes sao atomicas e server-side.
- Rascunho pode ser editado antes da revisao e fica imutavel depois dela.
- Escalada eleva atendimento para prioridade alta; revisao guarda ator e data.
- Migrations `manage_support_drafts` e `edit_support_drafts` aplicadas remotamente.

### Verificacao

- 51 testes, lint e build passaram.
- RPC remota validada com dados temporarios e rollback.
- Advisors sem nova regressao; permanecem apenas avisos conhecidos.

### Proximo Passo

Preparar geracao de rascunho por IA sem envio externo.

## 2026-07-13 - Separacao Canais E Atendimento

### Correcao

- `/app/channels` agora possui cadastro, listagem e exclusao de numeros.
- Cada canal escolhe API oficial/nao oficial e autenticacao QR/PIN.
- QR/PIN real fica bloqueado ate adapter/fornecedor escolhido, sem simulacao.
- `/app/support` lista somente conversas; cada item abre detalhe/historico.

### Verificacao

- `bun run test`: 51 testes passaram em 13 arquivos.
- Lint e build passaram com rotas `/app/channels` e `/app/support/[id]`.
- Migration remota e teste QR transacional com rollback passaram.

### Pendente

- Escolha dos fornecedores para gerar QR/PIN, autenticar webhook e enviar.

## 2026-07-13 - Contrato De Webhook M2

- Adapter autentica payload antes do evento interno.
- Idempotencia usa conexao mais ID do provider.
- Endpoint publico aguarda fornecedor e mecanismo de autenticacao.
- Proximo: rascunho assistido e aprovacao humana sem envio externo.

## 2026-07-13 - Numeros E Conexoes M2

### Feito

- Admin registra numeros oficiais ou nao oficiais independentemente.
- Numero fica `pending` e sem segredo ate fornecedor ser escolhido.
- Normalizacao e unicidade por tenant ocorrem na RPC server-side.
- Inbox lista todas as conexoes e seu risco/modalidade separadamente.

### Verificacao

- SQL remoto transacional confirmou cadastro/listagem e rollback.
- Lint, build e advisors passaram sem regressao.

### Proximo Passo

Preparar webhook idempotente neutro sem autenticacao especifica de fornecedor.

## 2026-07-13 - Fundacao Da Inbox M2

### Feito

- Schema multi-tenant para conexoes, contatos, atendimentos e mensagens.
- Cada numero e conexao independente `official` ou `unofficial`.
- Inbox inicial lista contato, numero, canal, prioridade e estado.
- RLS protege todas as tabelas; IDs externos de mensagem sao idempotentes.

### Pendente De Gate

- Escolher fornecedor oficial e fornecedor nao oficial para finalizar adapters,
  credenciais, webhooks e envio. Risco do nao oficial e opt-in consciente.

### Proximo Passo

Adicionar gestao de conexoes por numero sem credenciais de fornecedor.

## 2026-07-13 - Hardening Operacional

### Feito

- Cada envio do chat possui `request_id` UUID unico por organizacao.
- Retry duplicado retorna conflito antes de nova chamada de IA.
- pgTAP subiu para 82 assertions com prova de idempotencia.
- Runbooks cobrem incidente, backup/restore, credencial e retencao.

### Verificacao

- `bun run test`: 48 testes passaram em 12 arquivos.
- Lint e build passaram; migration aplicada remotamente.

### Proximo Passo

Continuar M2/M3 somente apos os gates de fornecedor e dados reais, ou ampliar
observabilidade e operacao do MVP comercial.

## 2026-07-13 - Contratos Comerciais M3

### Feito

- Produtos, clientes e pedidos possuem schemas normalizados e independentes.
- Dinheiro usa centavos inteiros; estoque nao aceita negativos; datas sao ISO.
- Importador CSV/TSV reconhece cabecalhos PT/EN e limita 5.000 registros.
- Linhas invalidas falham com numero da linha, sem persistencia parcial.

### Verificacao

- `bun run test`: 48 testes passaram em 12 arquivos.
- Lint e build passaram com Next.js 16.2.9.

### Proximo Passo

Adicionar hardening operacional e runbooks.

## 2026-07-13 - Contrato Neutro De Canal

### Feito

- Mensagens recebidas independem de fornecedor e possuem chave idempotente.
- Maquina de estados exige aprovacao humana antes de envio.
- Estados finais impedem reenvio ou reabertura acidental.

### Proximo Passo

Preparar modelo normalizado e importador comercial M3.

## 2026-07-13 - pgTAP No CI

### Feito

- Workflow GitHub Actions inicia banco Supabase limpo em Docker.
- Todas as migrations sao aplicadas antes das 80 assertions pgTAP.
- Execucao ocorre em PR/push que altere `supabase/**`.
- Scripts locais `test:db` e `test:ci` documentam comandos reproduziveis.

### Verificacao

- CLI 2.109.0 e sintaxe de `supabase test db --local` confirmadas localmente.
- Execucao local do banco segue indisponivel sem Docker; CI remove esse gate.

### Proximo Passo

Preparar contrato neutro de canal assistido para M2.

## 2026-07-13 - Analytics Operacional De IA

### Feito

- Conclusoes do chat registram latencia total em metadata.
- Dashboard admin exibe falhas, membros ativos, tokens e latencia media em 7 dias.
- Agregacao ignora latencias invalidas e nao expoe eventos aos membros comuns.

### Verificacao

- `bun run test`: 41 testes passaram em 10 arquivos.
- Lint e build passaram com Next.js 16.2.9.

### Proximo Passo

Automatizar execucao do pgTAP em ambiente Supabase local/CI.

## 2026-07-13 - Catalogo Versionado

### Feito

- CSV/TSV de catalogo nasce inativo enquanto processa embeddings.
- RPC `activate_catalog_version` troca versao ativa atomicamente por tenant.
- Catalogos anteriores permanecem no historico, mas saem da busca vetorial.
- UI identifica versao ativa e historica; limites/metricas contam ativos.
- pgTAP possui 80 assertions preparadas.

### Verificacao

- SQL remoto confirmou v2, supersessao da v1 e um unico ativo com rollback.
- 40 testes, lint e build passaram; advisors sem alerta novo.

### Proximo Passo

Expor falhas, uso por assistente/membro, latencia e tokens no analytics.

## 2026-07-13 - Gestao Completa De Equipe

### Feito

- Settings lista membros ativos/removidos com nome, e-mail, papel e estado.
- Owner/admin podem promover, rebaixar e remover acesso.
- RPC `manage_organization_member` e `SECURITY INVOKER`, tenant-scoped e
  protege owner contra alteracao ou remocao.
- Perfis ficam visiveis apenas para colegas ativos da mesma organizacao.
- pgTAP subiu para 70 assertions preparadas.

### Verificacao

- Teste SQL remoto transacional confirmou promocao e remocao com rollback.
- ACL remota bloqueia anon; advisors nao ganharam alerta novo.

### Proximo Passo

Versionar e substituir catalogos importados sem manter precos obsoletos.

## 2026-07-13 - Auditoria De Dados Comerciais

### Feito

- Settings registra plataforma, disponibilidade de API e origem de estoque,
  pedidos e clientes.
- Auditoria usa `integrations` com provider `commerce_audit`, escopo por tenant
  e escrita restrita a owner/admin pela action e RLS.
- Nenhum fornecedor ou conector foi presumido; dados servem ao gate do M3.
- Sete passos autonomos solicitados foram implementados.

### Verificacao

- `bun run test`: 40 testes passaram em 10 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Executar benchmark RAG real quando houver token dedicado ou seguir para o
proximo trabalho tecnico desbloqueado do M1.

## 2026-07-13 - Inclusao Segura De Membros

### Feito

- Conta settings inclui membro/admin por e-mail de conta ja cadastrada.
- RPC remota valida admin, tenant, papel, limite do plano e owner imutavel.
- Busca em `auth.users` fica encapsulada; e-mail inexistente gera erro generico.
- ACL bloqueia anon e pgTAP possui 61 assertions preparadas.

### Verificacao

- 38 testes, lint e build passaram.
- Remoto confirmou `SECURITY DEFINER`, search path vazio e ACL restrita.

### Proximo Passo

Implementar auditoria persistida de loja, PDV e planilhas.

## 2026-07-13 - Catalogo E Precos Estruturados

### Feito

- Upload de conhecimento aceita CSV/TSV com produto e preco obrigatorios.
- Parser suporta delimitadores, campos entre aspas e normalizacao para RAG.
- Limites: 1.000 produtos, 30 colunas e 500 caracteres por celula.
- Formulas de planilha sao neutralizadas antes de entrar no contexto.

### Verificacao

- Seis testes focados de processamento passaram.
- Lint e build passaram com Next.js 16.2.9.

### Proximo Passo

Implementar convites e gestao segura de membros.

## 2026-07-13 - RAG E Chat Confiavel

### Feito

- Matriz RAG automatica cobre literal, multi-chunk, ambiguidade, falta de
  citacao e resposta inventada sem evidencia.
- Corpus offline validou 21 casos e quatro categorias sem credenciais externas.
- RPC remota `finalize_chat_completion` atomiciza mensagem, atividade e uso.
- Falhas de stream/persistencia usam logger sanitizado e evento `chat.failed`.
- Backlog, roadmap e handoff foram sincronizados com codigo e banco reais.

### Verificacao

- Suite chegou a 34 testes automatizados antes deste checkpoint.
- Lint e build passaram com Next.js 16.2.9.
- SQL remoto transacional confirmou os tres efeitos e executou rollback.

### Proximo Passo

Implementar importacao estruturada de catalogo e tabela de precos.

## 2026-07-12 - Atividade Do Chat Observavel

### Feito

- Update de `conversations.updated_at` agora exige retorno da linha afetada.
- Erro do banco ou update com zero linhas deixa log estruturado em vez de falhar
  silenciosamente e esconder conversa recente na ordenacao do historico.

### Verificacao

- `bun run test`, `bun run lint` e `bun run build` passaram.

### Proximo Passo

Continuar auditoria de persistencia e telemetria do chat.

## 2026-07-12 - Exclusao Atomica De Assistente

### Feito

- Criada e aplicada remotamente RPC `delete_assistant` com `SECURITY INVOKER`,
  search path vazio, ACL restrita e validacao server-side de admin/tenant.
- Exclusao do assistente padrao e promocao do fallback agora ocorrem na mesma
  transacao; `set_default_assistant` e delete serializam pelo lock da organizacao.
- Action deixou de encadear delete e promocao em chamadas separadas.
- Tipos Supabase incluem a nova RPC; pgTAP subiu para 49 assertions, incluindo
  ACL, invoker, promocao e tentativa cross-tenant.

### Verificacao

- `bun run test`: 27 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- Teste SQL remoto transacional confirmou exclusao e exatamente um default;
  fixtures foram descartadas por rollback.
- Advisors permaneceram sem regressao; apenas avisos conhecidos.

### Proximo Passo

Continuar falhas silenciosas restantes, com foco na persistencia do chat.

## 2026-07-12 - Assistente Padrao Atomico

### Feito

- Criada e aplicada remotamente RPC `set_default_assistant`.
- RPC e `SECURITY INVOKER`, usa search path vazio, exige admin da organizacao,
  valida assistente no tenant e atualiza todos os defaults atomicamente.
- Anon nao executa; authenticated possui execute e ainda depende de RLS/admin.
- Criacao de assistente nao limpa mais o default antes de confirmar insert; se
  promocao falhar, novo registro e removido.
- Edicao comum nao desmarca default acidentalmente; promocao e botao dedicado
  usam a RPC transacional.
- Tipos Supabase foram regenerados com a assinatura da RPC.
- pgTAP possui 40 assertions cobrindo ACL, invoker, search path, default unico e
  tentativa cross-tenant.
- Unique partial index `assistants_single_default_per_org_idx` foi aplicado e
  confirmado no remoto; pgTAP agora possui 41 assertions e rejeita dois
  defaults mesmo por escrita direta.

### Verificacao

- `bun run test`: 27 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- Validacao SQL remota confirmou ACL e atributos da funcao.

### Proximo Passo

Continuar falhas silenciosas restantes e invariantes de dados.

## 2026-07-12 - Confirmacao De Exclusao Documental

### Feito

- DELETE de documento agora exige retorno do registro realmente removido.
- Operacao bloqueada por RLS ou que afete zero linhas nao responde mais com
  sucesso falso depois da etapa de Storage.

### Verificacao

- `bun run test`: 27 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Continuar auditoria de falhas silenciosas em chat e automacoes.

## 2026-07-12 - Consistencia Da Ingestao

### Feito

- Update final para `documents.status = ready` deixou de ser ignorado; falha na
  transicao agora interrompe processamento.
- Quantidade de embeddings precisa corresponder exatamente aos chunks antes de
  qualquer insert.
- Falha depois de gravar chunks remove todos os chunks parciais do documento
  dentro do tenant antes de marcar `failed`.
- Erros de cleanup, status e telemetria sao registrados no servidor em vez de
  falharem silenciosamente.
- Serializacao em batch possui teste para resposta incompleta do provider.

### Verificacao

- `bun run test`: 27 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Continuar auditoria de consistencia em exclusao, chat e automacoes.

## 2026-07-12 - Recovery E Loading Do Workspace

### Feito

- Adicionado `src/app/app/error.tsx` seguindo contrato Next.js 16.2 com
  `unstable_retry`.
- Falhas inesperadas agora preservam AppShell, exibem mensagem operacional,
  digest quando disponivel e botao de nova tentativa.
- Erro completo fica no log do servidor/navegador e nao e exposto na UI.
- Adicionado loading compartilhado com dimensoes estaveis para header, cards e
  lista, reduzindo layout shift entre modulos.
- Animacoes de skeleton respeitam `prefers-reduced-motion`.

### Verificacao

- `bun run test`: 26 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Continuar confiabilidade e produto automatizaveis; testes manuais permanecem
fora da fila ativa conforme orientacao do usuario.

## 2026-07-12 - Extracao DOCX

### Feito

- Adicionado `mammoth@1.12.0` para extrair texto cru de DOCX no runtime Node.
- Pipeline existente agora aceita DOCX, normaliza paragrafos, cria chunks e
  embeddings pelo mesmo fluxo tenant-scoped dos demais formatos.
- Nenhum HTML do documento e renderizado; imagens, macros e formatacao nao sao
  executadas.
- DOCX vazio retorna erro especifico em vez de produzir documento pronto sem
  conteudo.
- `mammoth` foi externalizado no bundle server do Next.js.
- Testes criam OOXML minimo em memoria e cobrem extracao e arquivo vazio.

### Verificacao

- `bun run test`: 26 testes passaram em 8 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Continuar lacunas automatizaveis. OCR de PDF escaneado permanece fora por custo
e escolha de provider, mas nao bloqueia documentos textuais.

## 2026-07-12 - Tipos Oficiais Do Supabase

### Feito

- `src/types/database.ts` foi substituido pelos tipos gerados do schema remoto
  com PostgREST 14.5, incluindo relationships e assinaturas RPC reais.
- Roles textuais de mensagens agora passam por narrowing/validacao antes de
  entrar no contrato do AI SDK e da UI.
- `provider` e `status`, armazenados como `text` com CHECK no banco, deixaram de
  fingir enums PostgreSQL e sao validados nas fronteiras de dominio.
- Pgvector agora usa representacao string oficial da Data API; embeddings
  continuam numericos internamente e sao serializados somente na persistencia
  e chamada RPC.
- Adicionado teste unitario da serializacao pgvector.

### Verificacao

- `bun run test`: 24 testes passaram em 7 arquivos.
- `bun run lint` passou.
- `bun run build` passou com os tipos oficiais e Next.js 16.2.9.

### Proximo Passo

Continuar proximo item local de produto sem depender de verificacao manual.

## 2026-07-12 - Migrations Remotas E RLS Consolidado

### Feito

- Aplicadas remotamente `add_foreign_key_indexes` e
  `secure_manual_automation_runs` com autorizacao do usuario.
- Validado no remoto: 15 indices esperados e 2 policies de runs presentes.
- Criada e aplicada `optimize_auth_rls_policies`: cinco policies usam initplan,
  roles explicitos e `WITH CHECK`; conversa nao pode mudar para outro tenant.
- Criada e aplicada `consolidate_permissive_policies`: policies `FOR ALL`
  sobrepostas foram separadas por acao e limitadas a `authenticated`.
- Bootstrap direto de owner foi preservado em policy unica, sem ampliar acesso.
- pgTAP passou para 34 assertions com tentativa de mover conversa entre tenants.

### Advisors Pos-Migration

- `unindexed_foreign_keys`: 0.
- `auth_rls_initplan`: 0.
- `multiple_permissive_policies`: 0.
- Restam 19 infos `unused_index`, esperadas logo apos criar indices e antes de
  carga relevante.
- Seguranca mantem 2 warnings conhecidos: bootstrap `SECURITY DEFINER`
  intencional e leaked-password protection desativada no painel Auth.

### Proximo Passo

Continuar produto sem depender de teste manual. Leaked-password protection
permanece unica configuracao de seguranca externa nao resolvida.

### Verificacao

- `bun run test`: 22 testes passaram em 6 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

## 2026-07-12 - Automacoes Manuais Verticais

### Feito

- Criada rota `/app/automations` com resumo, rascunho de resposta ao cliente e
  checklist operacional.
- Adicionados tambem relatorio estruturado e conversao de notas de reuniao em
  tarefas; dados ausentes permanecem explicitos e compromissos nao sao
  inventados.
- Analise de planilha aceita CSV/TSV colado, nao executa formulas, URLs ou
  instrucoes de celulas e explicita formato invalido ou truncado.
- Execucao valida input com Zod, entitlement `automations`, sessao e
  organizacao no servidor.
- Provider, conexao e modelo sao resolvidos pelo assistente padrao do tenant;
  UI nao escolhe nem injeta configuracao de provider.
- Inputs sao tratados como dados nao confiaveis; templates proibem seguir
  instrucoes embutidas, inventar fatos ou prometer condicoes nao confirmadas.
- Runs persistem estados `running`, `succeeded` e `failed`, resultado, erro e
  evento `automation.completed` com tokens.
- Historico permite reabrir resultados persistidos e nunca envia mensagens ou
  executa efeito externo automaticamente.
- Migration `20260712221934_secure_manual_automation_runs.sql` restringe update
  ao criador autenticado dentro da organizacao.
- pgTAP de hardening passou de 29 para 33 assertions, cobrindo leitura e update
  cruzados de runs, update proprio e spoof de `created_by`.

### Verificacao

- `bun run test`: 22 testes passaram em 6 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9 e rota `/app/automations`.

### Proximo Passo

Ampliar cobertura de falhas da action sem depender de chamada real ao provider
e manter migration pronta para aplicacao remota autorizada.

## 2026-07-12 - Navegacao Alinhada Ao Produto Real

### Feito

- Removidos do menu cinco atalhos sem rota propria que redirecionavam para o
  dashboard: Agentes IA, Automacoes, Documentos, Analytics e Time.
- Navegacao agora apresenta apenas Dashboard, Assistentes, Conversas, Base de
  conhecimento e Configuracoes, todos com fluxos utilizaveis.
- Modulos futuros permanecem no roadmap e voltam ao menu quando entregarem uma
  fatia vertical real.

### Verificacao

- `bun run test`: 18 testes passaram em 5 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Preparar automacoes manuais como nova rota somente junto de contrato de
execucao, persistencia, entitlement e estados de falha; nao expor shell vazio.

## 2026-07-12 - Indices De Foreign Keys

### Feito

- Criada via Supabase CLI a migration
  `20260712215654_add_foreign_key_indexes.sql`.
- Adicionados 15 indices idempotentes para foreign keys ainda nao cobertas por
  PK, unique ou indice composto existente.
- Cobertos owners, planos, criadores, assistentes de conversa, usuarios,
  organizacoes, automacoes e conexoes de IA.
- Nenhuma policy, permissao, dado ou contrato da Data API foi alterado.

### Verificacao

- `bun run test`: 18 testes passaram em 5 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- `supabase db lint --local` tentou executar e retornou
  `Failed to connect`; banco local/Docker segue indisponivel.

### Proximo Passo

Manter migration local commitada. Aplicacao remota nao sera feita sem
autorizacao explicita. Continuar hardening e produto que possam ser validados
pela suite automatizada.

## 2026-07-12 - Dashboard Sem Dados Ficticios

### Feito

- Removidas conversas, assistentes, percentuais, integracoes, latencia, uptime
  e sincronizacao ficticios do dashboard.
- Resumo agora usa listas reais de assistentes, documentos e conversas da
  organizacao autenticada.
- Conversas recentes apontam para historico real; ausencia de dados possui
  estado vazio e CTA utilizavel.
- Cards exibem documentos prontos, chunks pesquisaveis, assistente padrao e
  uso registrado sem alegar estados nao observados.
- Onboarding passou a derivar progresso das mesmas consultas, eliminando tres
  contagens duplicadas por carregamento.
- Contexto lateral mostra organizacao, papel, saude documental e perguntas sem
  evidencia, sem simular integracoes ainda inexistentes.

### Verificacao

- `bun run test`: 18 testes passaram em 5 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- QA manual/visual nao bloqueia continuidade conforme orientacao do usuario.

### Proximo Passo

Auditar proximos fluxos locais por dados ficticios, estados incompletos e riscos
server-side. Manter gates externos registrados sem interromper trabalho
automatizavel.

## 2026-07-12 - Modelo Configuravel De Catalogo

### Feito

- Formulario de novo assistente ganhou modelo de catalogo com nome da marca e
  tres tons de voz configuraveis.
- Modelo preenche nome, area, descricao e instrucoes, mantendo tudo editavel
  antes da persistencia.
- Instrucoes exigem evidencia documental, citacao, abstinencia para preco,
  estoque e politica ausentes, esclarecimento de ambiguidade e revisao humana
  para excecoes sensiveis.
- Contrato continua usando campos existentes; nenhuma migration ou regra de
  negocio nova foi necessaria.
- Gerador do modelo possui testes para linguagem, limites e fallback de marca.

### Verificacao

- `bun run test`: 18 testes passaram em 5 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Avancar trabalho local independente de dados do piloto. Convites, importacao e
auditoria comercial permanecem gates externos, mas nao bloqueiam hardening,
qualidade do dashboard ou preparacao tecnica dos fluxos seguintes.

## 2026-07-12 - Metricas Operacionais Do Assistente

### Feito

- Reutilizados eventos `chat.completion` existentes para medir conclusoes nas
  ultimas 24 horas, nos ultimos 7 dias e perguntas sem evidencia documental.
- Dashboard substituiu percentual ficticio por metricas reais da organizacao.
- Consulta filtra `organization_id`, periodo e status RAG no servidor.
- Metricas ficam restritas a owner/admin, alinhadas a policy RLS de
  `usage_events`; membros recebem estado informativo sem consulta proibida.
- Calculo defensivo impede contagem sem evidencia acima do total do periodo.

### Verificacao

- `bun run test`: 16 testes passaram em 4 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Proximo Passo

Convite seguro de membros e importacao do catalogo continuam dependentes,
respectivamente, de fluxo de entrega/aceite e arquivos reais do piloto.
Auditoria da plataforma depende de informacao da cliente.

## 2026-07-12 - Onboarding Contextual Do Workspace

### Feito

- Dashboard ganhou checklist de primeiros 15 minutos baseado no estado real da
  organizacao: assistente existente, documento pronto e primeira conversa.
- Consultas executam em paralelo no servidor e filtram explicitamente por
  `organization_id`, preservando RLS e isolamento multi-tenant.
- Progresso aponta somente para a proxima acao disponivel no produto e some
  quando o fluxo essencial termina.
- Adicionados progresso acessivel, estados concluidos com texto e layout
  responsivo para desktop/mobile.
- Calculo do onboarding coberto por testes unitarios.

### Verificacao

- `bun run test`: 14 testes passaram em 3 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- QA visual nao executado porque o navegador integrado nao esta disponivel.

### Proximo Passo

Instrumentar ativacao e uso diario com eventos organizacionais sem duplicar os
eventos de IA existentes. Convites permanecem pendentes porque exigem fluxo
seguro de membership e entrega de convite; importacao do catalogo depende dos
arquivos reais do piloto.

## 2026-07-12 - Avaliacao Do Benchmark RAG Endurecida

### Feito

- Corrigido o runner para respeitar `must_find_documents`,
  `must_cite_sections` e `allow_partial` definidos no corpus.
- Respostas com parafrase deixaram de receber aprovacao automatica sem
  avaliacao semantica; agora ficam explicitamente em `REVIEW`.
- Saida por caso diferencia `PASS`, `FAIL` e `REVIEW`.
- Resumo do relatorio passou a detalhar resultados por categoria.
- Adicionados testes para criterios opcionais, evidencia parcial e revisao de
  parafrases.

### Verificacao

- `bun run test`: 11 testes passaram em 2 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Bloqueio E Proximo Passo

Benchmark real continua bloqueado porque `.env.local` nao possui
`BEM_HUB_BENCHMARK_ACCESS_TOKEN` nem `BEM_HUB_BENCHMARK_ORGANIZATION_ID`.
Obter token curto de usuario e organizacao do corpus, remover o documento com
gabarito da base e executar `bun run benchmark:rag`; revisar todos os casos
`REVIEW` antes de calibrar retrieval ou prompt.

## 2026-07-12 - Runner Do Benchmark RAG

### Feito

- Criado `scripts/benchmark-rag.ts` com schema Zod para o corpus oficial.
- Adicionado modo `--validate-only`, filtros por categoria, limite de casos e
  caminho de saida configuravel.
- Execucao real exige token curto de usuario, organizacao e assistente opcional;
  nenhum segredo e escrito no relatorio.
- Runner usa os mesmos retrieval, prompt, provider runtime e entitlements do
  produto, sem persistir conversas ou eventos de uso.
- Relatorio registra resposta, fontes, citacao, abstinencia, latencia, erros e
  casos que ainda exigem revisao humana.
- Resultados gerados ficam ignorados em `output/benchmarks`.

### Verificacao

- `bun run benchmark:rag -- --validate-only` validou 21 casos: 10 literais, 5
  multi-chunk, 3 ambiguos e 3 sem resposta.
- `bun run test`: 8 testes passaram em 2 arquivos.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

### Bloqueio E Proximo Passo

Definir temporariamente `BEM_HUB_BENCHMARK_ACCESS_TOKEN` e
`BEM_HUB_BENCHMARK_ORGANIZATION_ID` em `.env.local`, remover da base remota o
documento com gabarito e executar `bun run benchmark:rag`. Revisar os casos
marcados e calibrar o threshold somente depois do relatorio.

## 2026-07-12 - M1 RAG Vertical Implementado

### Feito

- Chat consulta apenas quando o plano libera knowledge base e ha documentos
  prontos; organizacoes sem documentos continuam usando o chat normalmente.
- Busca semantica ganhou threshold inicial de `0.45`, limite de 8 chunks, ate 3
  chunks por documento e 12 mil caracteres de contexto.
- Chunks foram agrupados por documento e injetados como fontes numeradas.
- Prompt trata documentos como entrada nao confiavel, exige evidencia para fatos
  internos e instrui resposta explicita quando faltar contexto.
- Contexto RAG e persistido em `messages.metadata.knowledge` e em usage metadata.
- O stream envia contexto compacto em header para exibir fontes sem esperar
  recarregar o historico.
- UI mostra documentos consultados, quantidade de trechos e estados sem
  evidencia/documentos, com links autenticados para os originais.
- Corrigida navegacao de conversa nova para nao remontar o componente durante o
  streaming.
- Busca vetorial agora exclui documentos que nao estejam `ready`.

### Verificacao

- `bun test`: 5 testes passaram, cobrindo threshold, agrupamento, limite por
  documento, header UTF-8 e regras do prompt.
- `bun run lint` passou sem warnings.
- `bun run build` passou com Next.js 16.2.9.
- `/api/chat` sem sessao retorna 401 no servidor local.
- Servidor de desenvolvimento existente continua em `http://localhost:3000`.

### Pendente

- Executar benchmark RAG com os documentos remotos e remover antes o roteiro que
  contem o gabarito.
- Validar respostas literais, multi-chunk, ambiguas e sem resposta.
- Confirmar persistencia e fontes apos recarregar uma conversa autenticada.
- Verificar visualmente desktop/mobile; navegador integrado e credenciais de
  login nao estavam disponiveis nesta sessao.
- Ajustar threshold apenas com evidencias do benchmark.

### Proximo Passo

Executar o benchmark autenticado e corrigir qualidade/citacoes. Se a credencial
continuar indisponivel, criar um runner de benchmark desacoplado da UI com
entrada por organizacao e relatorio comparavel, sem indexar o gabarito.

## 2026-07-12 - M0 Hardening Preparado

### Feito

- Auditadas funcoes privilegiadas, policies RLS, Storage e rotas de documento.
- Confirmado no remoto atual que `anon` ainda executa `is_org_member` e recebe
  HTTP 200, demonstrando a exposicao antes da migration.
- Criada `20260712160034_harden_tenant_security_functions.sql` pelo Supabase CLI.
- Movidos helpers privilegiados para schema `private`; wrappers publicos e busca
  vetorial passaram a `SECURITY INVOKER`.
- Mantido apenas o bootstrap como RPC publica `SECURITY DEFINER`, com validacao
  de owner por `auth.uid()`.
- Revogada execucao de `PUBLIC`/`anon`, fixado `search_path` vazio e limitado o
  retorno da busca vetorial a 20 chunks.
- Criado pgTAP transacional com 29 assercoes para ACLs, funcoes, RLS, busca,
  Storage, delecao cruzada e bootstrap com dois tenants.

### Verificacao

- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- `git diff --check` passou antes do checkpoint.
- `supabase db lint --local` e `supabase test db --local` nao executaram porque
  Docker/Supabase local nao esta disponivel.

### Bloqueios Operacionais

- `SUPABASE_ACCESS_TOKEN` e database password nao estao disponiveis para
  advisors, aplicacao remota ou pgTAP linked.
- A protecao contra senha vazada depende de acesso ao projeto/painel Supabase.
- O teste manual com duas contas reais permanece pendente.

### Proximo Passo

Executar reset/lint/pgTAP em um Supabase local ou linked, corrigir qualquer
falha, aplicar a migration remotamente com autorizacao, rodar advisors e repetir
o teste anonimo. Enquanto esse gate operacional estiver bloqueado, iniciar a
preparacao local do M1 pelo contrato de fontes e recuperacao RAG no servidor.

## 2026-07-12 - Roadmap E Autonomia

### Feito

- Revisado o roadmap do piloto de cosmeticos em PDF contra o estado real do repo.
- Reorganizado o roadmap em marcos M0 a M4 com criterios mensuraveis.
- Convertido o backlog em fila executavel com `AGORA`, `DEPOIS` e descobertas.
- Criados principios de engenharia, decisao e seguranca.
- Criada a skill `$bem-hub-autonomous-engineer` para execucao continua.

### Decisoes

- O codigo e o benchmark sao a fonte da verdade: RAG no chat ainda nao esta pronto.
- WhatsApp e inteligencia de negocio sao extensoes do piloto apos validar o
  assistente interno, nao atalhos sobre o RAG incompleto.
- Hardening e verificacao multi-tenant bloqueiam uso de dados reais.
- O agente pode decidir mudancas tecnicas reversiveis, mas nao decisoes de
  produto, cobranca, fornecedor, envio real ou operacoes remotas irreversiveis.

### Falta

- Implementar e validar a migration de hardening do marco M0.
- Executar teste de isolamento com dois usuarios Supabase.
- Conectar busca semantica ao chat e exibir fontes no marco M1.

### Verificacao

- Skill validada com `quick_validate.py`.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- Nenhum commit foi criado nesta configuracao inicial.

### Proximo Passo

Iniciar M0 pelo inventario das funcoes `SECURITY DEFINER`, criar migration que
restrinja execucao e adicionar uma verificacao reproduzivel de isolamento. Em
seguida, sem esperar confirmacao, continuar para RAG no chat se nao houver
bloqueio de credencial ou decisao de produto.

## 2026-07-12 - Hardening Remoto Aplicado

### Feito

- Reautenticado o Supabase MCP com `codex mcp login supabase`.
- Instaladas as skills `supabase` e `supabase-postgres-best-practices`.
- Aplicada remotamente a migration
  `20260712160034_harden_tenant_security_functions.sql`.
- Corrigido o SQL de recuperacao vetorial para qualificar o operador
  `extensions.<=>` com `OPERATOR(...)`, permitindo aplicar a migration com
  `search_path` vazio.
- Validados `list_migrations`, `get_advisors` de seguranca e performance.
- Instalada a skill `JuliusBrussee/caveman` pedida pelo usuario.

### Decisoes

- Manter `bootstrap_owned_organization` como o unico RPC `SECURITY DEFINER`
  exposto em `public`, porque o fluxo de bootstrap ainda depende dele.
- Qualificar operadores de vector search explicitamente em vez de reabrir o
  `search_path`, para preservar o hardening.

### Falta

- Verificar com dois usuarios reais o isolamento de tabelas, RPCs, Storage e
  download assinado.
- Resolver ou aceitar os advisories remanescentes de autenticacao e indices.
- Rodar o teste manual com dois usuarios quando houver credenciais disponíveis.

### Verificacao

- `mcp__supabase.apply_migration` retornou `success: true`.
- `mcp__supabase.list_migrations` passou a incluir
  `20260712160034_harden_tenant_security_functions`.
- `mcp__supabase.get_advisors` reportou o warning esperado sobre
  `bootstrap_owned_organization` como `SECURITY DEFINER` exposto.
