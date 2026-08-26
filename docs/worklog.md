# Worklog

## 2026-08-25 - Smokes Atendimento E Correcao De Convites

### Feito

- Usuario confirmou smoke de canal conectado e de envio de midia no Atendimento.
- Investigacao remota do convite confirmou membership ainda `invited`, sem
  `accepted_at`; logs Auth registraram `Session not found` depois do link.
- A RPC de aceite nao foi chamada; regra SQL atual permite owner de uma conta e
  membro de outra. Correcao segue no aplicativo, sem migration.

### Proximo Passo

- Configurar `BEM_HUB_PRODUCTION_APP_URL=https://bem-hub.vercel.app/app` no
  Vercel, publicar e repetir aceite do convite pendente com usuario owner de
  outra conta. Confirmar workspace convidado, logout/login com seletor e duas
  linhas em `Configuracoes > Conta`.

### Verificacao Local

- `bun test` focado: 8 testes passaram para URL de convite, callback/login,
  destinos de aceite e navegacao/listagem de ambientes.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.

Checkpoint curto para continuidade entre sessoes. Manter a entrada mais recente
no topo. Nao substituir `docs/handoff.md`; registrar aqui o andamento operacional
do marco ativo.

## 2026-08-25 - CRUD De Equipe E Convites

### Feito

- Criada rota `/app/settings/team` com DataTable, busca, filtros, drawer de
  convite/edicao e acoes por linha.
- Fluxo de convite cria membership pendente (`invited`) e so ativa acesso apos
  callback/confirmacao em `/app/invitations/accept`.
- Login prepara selecao multi-conta: uma conta entra direto; mais de uma conta
  redireciona para `/auth/select-workspace` e grava a organizacao ativa em
  cookie httpOnly.
- Convites usam redirect de producao derivado de
  `BEM_HUB_PRODUCTION_APP_URL` ou fallback `http://bem-hub.vercel.app/app`.
- Regra de banco impede adicionar owner, duplicar membro no mesmo tenant,
  ultrapassar limite do plano e manter mais de um vinculo externo de equipe.
- Migration aplicada no remoto como
  `20260825031214_team_invitations_membership_flow`.

### Verificacao

- `bun test` passou: 152 testes.
- `bun run lint` passou.
- `bun run build` passou.
- `bun run test:db` nao executou porque o Postgres local do Supabase nao estava
  acessivel (`LegacyDbConnectError`).
- MCP remoto confirmou colunas `invited_at`, `invited_by`, `accepted_at`,
  `removed_at`, `updated_at` e RPCs do fluxo de convite.

## 2026-08-24 - UI Primitives: Layers E User Menu

### Feito

- Criado OpenSpec change `harden-ui-primitives-and-overlays` com proposal,
  spec, design e tasks para robustez de overlays, primitives globais e
  componentizacao por responsabilidade.
- Auditados pontos de fragilidade: menu manual do usuario, `z-index` cru,
  `details` operacional, `window.confirm`, feedback inline repetido e arquivos
  client acima do orcamento de frontend.
- Adicionados tokens semanticos de layer em `src/app/globals.css`:
  shell, shell overlay, overlay, modal e feedback.
- Dropdowns, dialogs, drawers e shell passaram a usar layers semanticos em vez
  de `z-40`, `z-50` e `z-[70]`.
- `UserMenu` deixou de usar `details`/`summary` com painel absoluto e passou a
  usar o `DropdownMenu` compartilhado com portal, foco, Escape, clique externo,
  tema, logout, identidade e badge de papel preservados.
- Criado `FeedbackToastProvider` global flutuante bottom-center para mensagens
  de sucesso, erro, aviso e informacao sem alterar layout da tela; o padrao
  fecha em 3s, aceita duracao customizada e possui botao `X`.
- Toasts passaram a nascer no provider global do layout raiz, com background
  definido pelo status e `--layer-feedback` acima dos modais.
- Header da conversa do Atendimento ficou com altura fixa (`h-16`); feedback
  de acoes saiu do header e passou a aparecer como toast no canto inferior.
- Menu de acoes do atendimento ganhou `Atualizar mensagens`, que executa
  `router.refresh()` e confirma via toast.

### Verificacao

- `openspec validate --changes harden-ui-primitives-and-overlays --strict`
  passou.
- `bun run lint` passou.
- `bun run build` passou.

### Pendente Real

- QA visual autenticado do menu do usuario em desktop/mobile.
- Confirmar stacking de dropdown dentro de paineis com scroll, dialog/drawer e
  media viewer.
- Follow-ups planejados no OpenSpec: `FeedbackMessage`, `StatusBadge`,
  `IdentityCell`, `DetailList`, substituir `window.confirm` em Knowledge e
  dividir `chat-workspace`, `support-inbox-shell`, `support-message-composer` e
  a pagina de Knowledge por responsabilidade.

## 2026-08-18 - Atendimento: Sync, Midia, Filtros E Avatar Remoto

### Feito

- Corrigida a origem das bolhas falsas que apareciam apos parear/sincronizar o
  WhatsApp: a Wuzapi estava entregando pacotes `HistorySync`/`protocolMessage`
  como evento `Message`. Wuzapi e Evolution agora ignoram mensagens de
  protocolo, newsletters, JIDs remotos nao suportados e pacotes sem texto nem
  midia real.
- Envio de midia do Atendimento deixou de depender de `multipart/form-data` na
  Function. O browser agora faz upload direto para o bucket privado
  `support-message-media` usando URL assinada do Supabase; o backend finaliza o
  registro e entrega ao provedor por JSON pequeno.
- Fluxo de midia ganhou etapa de falha explicita: se o upload direto falhar, a
  tentativa e marcada como `failed` e o objeto esperado e removido quando
  aplicavel, evitando mensagem presa como `sending`.
- Sidebar do Atendimento recebeu toolbar de operacao com busca, filtros
  avancados, ordenacao, conexao, atendente e tag. As abas foram ajustadas para
  `Abertas`, `Atendidas`, `Minhas`, `Grupos` e `Encerradas`.
- UX final pedida: filtros avancados começam fechados por padrao e a aba
  `Grupos` so aparece quando o toggle de grupos esta habilitado.
- Corrigida a quebra de layout da fila: o painel de atendimentos fica travado
  no desktop com largura fixa, e o painel de conversa ocupa o restante sem a
  lista virar pagina inteira.
- Sync de avatar ficou menos agressivo: falha temporaria do provedor nao grava
  `avatar_fetched_at`, e contato sem foto passa a tentar novamente apos janela
  curta em vez de ficar congelado por 24h.
- Aplicada no Supabase remoto `lzqugeqtcisgaztggcxq` a migration
  `20260816142315_add_contact_avatar_url`, criando
  `contacts.avatar_url` e `contacts.avatar_fetched_at` e atualizando RPCs de
  contatos/atendimento para retornar `avatarUrl`.
- A migration `20260816142315` tambem foi marcada como `applied` no historico
  remoto via Supabase CLI.

### Verificacao

- `bun test src/features/channels/providers/wuzapi/wuzapi-webhook.test.ts src/features/channels/providers/evolution/evolution-webhook.test.ts src/features/support/support-inbox-filters.test.ts`
  passou.
- `bun run test:whatsapp-contracts` passou com 51 testes.
- `bun run lint` passou apos os ajustes finais.
- `bun run build` passou apos os ajustes finais.
- Query remota confirmou as colunas `avatar_url` e `avatar_fetched_at` em
  `public.contacts`.
- REST server-side com `SUPABASE_SECRET_KEY` conseguiu selecionar
  `contacts.avatar_url` e `contacts.avatar_fetched_at`.

### Pendente Real

- Deployar o codigo atual na Vercel para a correcao de layout, filtros e envio
  de midia entrar em producao.
- Testar em producao: parear Wuzapi de novo, confirmar que nao surgem bolhas de
  sync/historico e enviar imagem acima de 4,5 MB pelo Atendimento.
- Fazer smoke de avatar com contato que possua foto publica no WhatsApp. No
  contato real testado, Wuzapi respondeu sem erro, mas sem URL de avatar.
- Se necessario, limpar manualmente as mensagens antigas falsas ja criadas
  antes da correcao; a prioridade desta sessao foi impedir novas entradas.

### Proximo Passo Exato

1. Fazer deploy na Vercel.
2. Reparear/sincronizar o canal Wuzapi e confirmar que a fila nao cria novas
   bolhas `Midia recebida` sem midia real.
3. Enviar uma imagem grande pelo Atendimento e confirmar entrega, anexo no
   historico e download autenticado.
4. Enviar/receber mensagem de um contato com foto publica para validar avatar
   persistido.

## 2026-08-16 - Atendimento: Menu De Mensagem, Avatar E Tunnels

### Feito

- Bolhas do Atendimento ganharam menu no canto superior direito, no padrao
  familiar de mensageiro. Acoes disponiveis: `Responder`, `Copiar` e `Baixar`
  anexos existentes. `Editar` e `Excluir` aparecem desabilitados ate haver
  contrato server-side seguro.
- Removido o botao solto `Responder` da base da bolha; a acao agora fica no
  dropdown da propria mensagem.
- Wuzapi e Evolution receberam contrato opcional para buscar foto de perfil do
  contato. O sync e best-effort, nao quebra envio/webhook quando o WhatsApp nao
  libera avatar ou o provider falha.
- Migration local criada para `contacts.avatar_url` e `contacts.avatar_fetched_at`
  e para expor `avatarUrl` em `list_contacts`,
  `get_support_inbox_operational` e `get_support_conversation`.
- Header do atendimento, inbox e painel lateral renderizam a foto quando
  disponivel e caem para iniciais quando a imagem falha.
- Containers locais Wuzapi e Evolution estao rodando via Docker Compose. Tres
  Quick Tunnels foram iniciados:
  - BEM HUB: `https://revision-civilization-tutorials-durham.trycloudflare.com`
  - Wuzapi: `https://look-resolved-bluetooth-situations.trycloudflare.com`
  - Evolution: `https://screensavers-california-paris-absolute.trycloudflare.com`
- `.env.local` local foi atualizado com `APP_BASE_URL` do tunnel BEM HUB e
  base URLs internas `127.0.0.1` para Wuzapi/Evolution.

### Verificacao

- `bun test src/features/channels/channel-provider-adapters.test.ts`: 23/23.
- `bun test`: 134/134.
- `bun run lint` passou.
- `bun run build` passou.
- `git diff --check` passou.
- Health externo do tunnel BEM HUB retornou HTTP 204; Evolution retornou HTTP
  200; Wuzapi retornou HTTP 401 esperado sem token.

### Pendente Real

- Aplicar remotamente a migration
  `20260816142315_add_contact_avatar_url` antes de esperar avatar persistido no
  projeto Supabase remoto.
- Fazer QA visual autenticado desktop/mobile do menu da bolha; browser integrado
  nao ficou disponivel nesta sessao.
- Fazer smoke real de profile pic em Wuzapi e Evolution com contato 1:1.
- Continuar pendencia anterior: capturar payload real sanitizado de reply
  inbound que ainda chega sem referencia.

### Proximo Passo Exato

1. Aplicar a migration de avatar no remoto quando autorizado.
2. Clicar `Atualizar estado` no canal para reconciliar webhook com o novo
   `APP_BASE_URL`.
3. Enviar mensagem direta 1:1 e validar: dropdown da bolha, resposta, avatar do
   contato, midia e reply inbound com payload capturado.

## 2026-08-11 - Atendimento: Reply Bidirecional E Paridade De Citação

### Feito

- Aplicadas no remoto BEM HUB (`lzqugeqtcisgaztggcxq`) as migrations de reply:
  `20260812011209_add_support_message_replies` e
  `20260812013625_20260811213647_link_inbound_support_message_replies`.
- Validado no banco: `begin_support_message_reply` e
  `link_support_message_reply` existem; apenas `service_role` executa o vínculo
  inbound. `anon` e `authenticated` não possuem essa permissão.
- Responder pelo BEM HUB para o WhatsApp funciona para texto e mídia; o
  WhatsApp recebe a citação correta.
- A thread e o composer agora mostram paridade maior de citação: autor,
  texto/legenda, tipo (`Foto`, `Vídeo`, `Áudio`, `Documento`), nome do arquivo
  e miniatura/ícone. A miniatura citada abre o viewer privado.
- Wuzapi e Evolution permanecem sem alteração de API, webhook ou tunnel.

### Pendente Real

- A direção inversa ainda falha no smoke: ao responder no WhatsApp, a mensagem
  chega ao BEM HUB, porém sem a referência/citação. Não marcar reply inbound
  como concluído.
- O normalizador já procura `ContextInfo.StanzaId`/`contextInfo.stanzaId`, mas
  o payload real desse caso não está salvo. Capturar um webhook real sanitizado
  do provedor/canal em teste, congelar fixture e ajustar o normalizador ao
  envelope efetivo. Depois enviar nova resposta por texto e por mídia para
  confirmar o link e a prévia no BEM HUB.
- Mensagens já recebidas sem `reply_to_message_id` não podem ganhar citação
  retroativamente, pois o payload bruto não é persistido.

### Verificação

- `bun test src/features/support/support-reply-preview.test.ts`: 2/2.
- `bun run lint`, `bun run build` e `git diff --check` passaram.
- Advisor de segurança não reportou alerta das funções novas. Permanecem avisos
  anteriores de RPCs autenticadas intencionais e de proteção contra senha
  vazada desativada.

### Próximo Passo Exato

1. Capturar e sanitizar o payload de uma resposta feita no WhatsApp para a
   mensagem citada; não alterar Wuzapi/Evolution antes de conhecer o envelope.
2. Cobrir esse payload com teste de normalização e persistir o ID citado.
3. Repetir smoke inbound texto e mídia, recarregando a conversa no BEM HUB.

## 2026-08-11 - Atendimento: Reply Provider-neutral Local

- A thread permite selecionar mensagem já confirmada e responder com texto ou
  anexo. Composer mostra contexto, permite cancelar e mantém envio otimista.
- Browser envia somente ID interno. Nova RPC tenant-scoped valida organização,
  conversa, canal e confirmação da mensagem original antes de resolver o ID
  externo exclusivamente no servidor para Wuzapi/Evolution.
- Webhooks Wuzapi e Evolution agora extraem `ContextInfo.StanzaId`, persistem a
  ligação somente quando a mensagem citada pertence à mesma conversa e deixam
  a referência não resolvida auditável sem falhar a entrega.
- Esta entrada foi superada pela aplicação remota registrada acima. Não houve
  mudança em APIs, webhook configurado ou tunnel dos provedores.
- `bun test src/features/support/send-support-message.test.ts`, adapters 21/21,
  `bun run lint`, `bun run build` e `git diff --check` passaram.

### Próximo passo

Capturar o payload real de uma resposta pelo aparelho: a entrada chega, mas a
citação não está sendo extraída no envelope real. O webhook já recebido não
pode ser reconstruído sem payload salvo.

## 2026-08-09 - Refinamento: Envio Otimista No Atendimento

- Envio textual cria uma bolha local imediatamente com estado `Enviando`, limpa
  e devolve foco ao composer sem esperar a resposta do provedor.
- Vários envios podem seguir em paralelo. Quando o servidor confirma, a bolha
  local é reconciliada pelo ID definitivo; quando falha, a página recarrega a
  mensagem persistida com o fluxo existente de `Tentar novamente`.
- `bun run lint`, `bun run build` e `git diff --check` passaram.

## 2026-08-09 - Correção: Reprodução Estável De Áudio

- O elemento de áudio dependia da rota que redireciona para URL assinada; em
  requests de faixa subsequentes isso interrompia a reprodução e inutilizava
  play/pausa.
- O player agora baixa o blob autenticado uma vez e toca por URL local, mantendo
  o controle de tempo estável durante toda a reprodução.
- `bun run lint`, `bun run build` e `git diff --check` passaram.

## 2026-08-09 - Refinamento: Paridade Visual Da Conversa

- Bolhas agora seguem a ordem do WhatsApp: mídia primeiro e legenda depois.
  Marcadores internos como `Arquivo: nome` não são exibidos quando o anexo já
  comunica o conteúdo.
- Prévia de imagem/vídeo foi limitada a 280×192 px para consulta rápida; o
  viewer permanece o local para inspeção detalhada.
- O waveform de áudio preenche toda a faixa e o scrub usa a coordenada real do
  ponteiro, eliminando o desvio entre ponto clicado e tempo reproduzido.
- `bun run lint`, `bun run build` e `git diff --check` passaram.

## 2026-08-09 - Refinamento: Mídia Visível, Áudio E Download

- Imagens e vídeos passaram a ocupar a bolha como mídia visual, sem repetir
  nome de arquivo. Documentos preservam nome/tamanho por não terem preview
  útil dentro da conversa.
- Criado player reutilizável de áudio com waveform, reprodução/pausa, arraste
  de posição e tempos atual/duração; ele é usado tanto na bolha como no viewer.
- O download no viewer busca o blob autenticado e inicia salvamento local. A
  abertura em nova aba ficou restrita ao fallback de falha, sem navegar para
  fora do BEM HUB.
- `bun run lint`, `bun run build` e `git diff --check` passaram.

## 2026-08-09 - Correção: UUID De Anexo Inbound

- Um anexo recebido pelo Evolution foi gravado com UUID sem versão RFC. O
  Postgres aceita esse formato, mas a validação da query exige UUID versionado;
  por isso a conversa inteira caía ao montar a thread.
- O gerador determinístico agora força versão/variante v4. O único registro
  afetado foi corrigido in-place, preservando o objeto privado no Storage.
- Regra operacional: uma mídia inválida nunca deve impedir a leitura de todo o
  atendimento; a validação de build continua sendo obrigatória após mudanças
  de contrato/persistência.

## 2026-08-09 - Correção: Tipo Nativo De Mídia Evolution

- O endpoint interno `getBase64FromMediaMessage` devolve tipos nativos como
  `imageMessage`, enquanto o BEM HUB usa `image`. A incompatibilidade causava
  resposta 400 após a mensagem já ser criada, deixando somente “Mídia
  recebida” na thread.
- O adapter agora traduz os quatro tipos nativos antes de persistir o anexo.
  Testes de adapter/webhook: 25/25; `bun run lint` passou.
- A mensagem que já falhou não traz mais seu envelope de mídia no banco; envie
  uma nova mídia pelo WhatsApp para o Evolution para validar o fluxo corrigido.

## 2026-08-09 - M2 Atendimento: Mídia Nos Dois Sentidos

### Feito

- O envio de imagem, vídeo, áudio e documento está persistido antes da entrega,
  em Storage privado tenant-scoped, e funciona contra Evolution e Wuzapi. A
  diferença de payload de Base64 dos provedores está encapsulada no adapter.
- O composer agora abre uma composição de múltiplas mídias: aceita adicionar
  arquivos sem fechar o modal, mostra a prévia selecionada, mantém uma faixa de
  miniaturas e oferece legenda individual por arquivo.
- O viewer foi redesenhado como lightbox amplo: viewport com overflow contido,
  controles de zoom sempre fora da imagem, navegação anterior/próxima,
  download autenticado, nome/tamanho e miniaturas reais das outras mídias da
  conversa.
- A orientação do repositório passa a exigir validação de UX completa, não só o
  caminho funcional, e proíbe concluir telas com conteúdo cobrindo controles.
- Webhooks de Evolution e Wuzapi agora reconhecem imagem, vídeo, áudio e
  documento, preservam a legenda quando existente e não descartam mensagem sem
  texto por ela conter apenas mídia. Wuzapi fornece Base64 no webhook assinado;
  Evolution é recuperado pelo adapter na API interna autenticada.
- A mensagem inbound é criada antes do anexo. O binário passa por validação de
  MIME/tamanho, é salvo no bucket privado e recebe ID/caminho determinísticos;
  reentregas não duplicam o arquivo e uma falha temporária pode ser repetida.

### Verificação

- `bun run lint` passou sem erros.
- `bun run build` passou com Next.js 16.2.9.
- Testes específicos de normalização dos webhooks: 10/10; adapters e webhooks
  relacionados: 28/28.

### Próximo Passo

Executar o smoke real recebendo cada tipo de mídia em Wuzapi e Evolution e
confirmar que o arquivo, a legenda e o download aparecem no atendimento.

## 2026-08-08 - M1 RAG: Smoke Multi-tenant Concluido

### Feito

- Duas organizacoes reais receberam assistente, documento, chunk e conversa
  temporarios para validar a rota `/api/chat` ponta a ponta.
- Ambas respostas ficaram `grounded`, citaram documento e trecho no header, e
  persistiram a mesma fonte na mensagem do assistente apos recarregar a
  conversa.
- Ambas rotas autenticadas de download geraram URL assinada. A conta A nao
  recarregou a conversa nem baixou a fonte temporaria da conta B.
- Foram 12 verificacoes aprovadas. Conversas, assistentes, documentos, chunks e
  objetos temporarios foram removidos pelo ID criado no teste.

### Proximo Passo

Validar uso diario do assistente de catalogo com equipe do piloto; M1 tecnico
esta concluido.

## 2026-08-08 - M0: Isolamento Remoto Com Duas Contas

### Feito

- Autenticadas duas contas reais, cada uma em organizacao distinta, contra o
  projeto configurado em `.env.local`.
- Conta B criou objeto privado, documento `ready` e chunk vetorial sinteticos.
  A conta A nao leu `organizations`, `organization_members`, `documents` ou
  `document_chunks` de B; nao alterou/removou documento; nao baixou/removou
  objeto; e nao gerou URL assinada de B.
- `is_org_member`, `is_org_admin`, `match_document_chunks` e
  `bootstrap_owned_organization` recusaram o acesso cruzado. Papel anonimo nao
  executou RPC interno. A URL assinada da propria conta B funcionou.
- Foram 20 verificacoes aprovadas. Documento, chunk e objeto de teste foram
  removidos ao final; nenhum dado de cliente foi usado.

### Pendencias E Observacoes

- MCP Supabase global foi corrigido para o projeto de `.env.local` e OAuth
  concluiu em 2026-08-08. Esta sessao ainda reteve a ferramenta antiga; iniciar
  nova sessao e confirmar URL antes de executar advisors ou migrations.

### Verificacao

- `bun run lint` passou.
- `bun run build` passou.
- MCP `supabase-bem-hub` confirmou o projeto de `.env.local`. Advisors de
  seguranca retornaram somente tres funcoes `SECURITY DEFINER` autenticadas
  intencionais (`add_organization_member_by_email`,
  `bootstrap_owned_organization` e `register_managed_channel_provisioning`).
  As tres usam `search_path` vazio, recusam `anon` e validam admin/owner antes
  de elevar privilegios.
- Advisors de performance apontaram quatro FKs sem indice, todas no escopo de
  Atendimento/midia: `support_message_attachments_message_fkey`,
  `support_message_reactions_channel_connection_id_fkey`,
  `support_message_reactions_message_fkey` e
  `support_messages_reply_to_message_fkey`. Alertas restantes sao indices ainda
  sem uso; nao remover sem carga real e plano de consulta.

### Proximo Passo

1. Fazer smoke RAG com conversa recarregada em duas organizacoes, incluindo
   fontes persistidas e download autenticado.
2. Planejar indices das quatro FKs de Atendimento antes de ampliar trafego de
   midia; nao bloqueiam M1 RAG.

## 2026-08-04 - Temperatura Compativel Com GPT-5

### Feito

- Docs oficiais e warning do AI SDK confirmaram que o fluxo Responses de
  `gpt-5.5` nao aceita `temperature`; o modelo usa configuracao de reasoning
  propria.
- Criado helper central que omite `temperature` somente para modelos OpenAI da
  familia `gpt-5`. Chat, benchmark RAG e automacoes manuais o utilizam; GPT-4,
  Anthropic e Gemini preservam o valor configurado.
- Um caso autenticado do benchmark passou com `gpt-5.5`, sem warning de
  parametro nao suportado.

### Verificacao

- Testes focados 17/17, lint e build passaram.
- Referencia: https://developers.openai.com/api/docs/models/gpt-5.5

## 2026-08-04 - Benchmark RAG Externo Executado

### Feito

- Corpus remoto foi limpo antes da execucao: somente os tres documentos
  esperados, com 43 chunks, participaram do benchmark.
- `bun run benchmark:rag` executou 21 casos autenticados sem erros de provider
  ou pipeline, media de 3,78 s por caso, usando o assistente configurado.
- O primeiro relatorio marcou 5 PASS, 12 FAIL e 4 REVIEW. Revisao mostrou que
  oito FAIL literais eram falsos negativos por Markdown/pontuacao e tres eram
  respostas explicitas de ausencia/ambiguidade nao reconhecidas pelo runner.
- O avaliador agora normaliza Markdown e pontuacao, e reconhece ausencia de
  informacao e ambiguidade por processo. A reavaliacao do mesmo relatorio fica
  em 16 PASS, 1 FAIL e 4 REVIEW.
- As cinco respostas multi-chunk foram revisadas manualmente: corretas,
  fundamentadas e citadas. `RAG-MC-002` havia recuperado um FAQ com ambas as
  evidencias, mas nao os titulos originais; o baseline passou a usar ancoras
  factuais presentes no chunk para continuar detectando trecho incorreto.
- Nenhum ajuste de threshold ou prompt foi necessario com esta evidencia.

### Verificacao

- `bun test`: 122/122.
- `bun run lint` e `bun run build` passaram.
- O provider alertou que `gpt-5.5` nao suporta `temperature`; a resposta foi
  gerada normalmente. O MCP de docs OpenAI foi instalado globalmente para
  confirmar a correcao adequada apos reiniciar a sessao.

### Pendente E Proximo Passo

- Fazer smoke RAG com conversa recarregada e duas organizacoes, cobrindo fontes
  persistidas, busca isolada e download autenticado.
- Fechar M0 com dois usuarios reais e ativar a protecao contra senha vazada no
  painel Supabase.

## 2026-08-04 - Corpus RAG Limpo, Benchmark Aguarda JWT

### Feito

- O `roteiro-de-validacao-rag.md` foi removido pela Storage API oficial. A
  verificacao posterior confirmou ausencia do objeto privado, documento e seis
  chunks; os tres documentos esperados continuam prontos, com 43 chunks.
- A tentativa SQL inicial foi corretamente bloqueada pelo Storage, que protege
  contra objetos orfaos. A exclusao final usou a mesma API de Storage adotada
  pela rota autenticada do BEM HUB.
- `bun run benchmark:rag -- --validate-only` confirmou 21 casos validos;
  testes focados RAG/runner passaram 19/19.
- Auditoria remota das funcoes avisadas pelo advisor confirmou `search_path`
  vazio e verificacao de usuario/organizacao antes de elevar privilegios. Os
  avisos continuam esperados para os RPCs autenticados de bootstrap, membros e
  provisionamento gerenciado.

### Bloqueios Reais

- URL, chave publica, credencial server-side, IA e organizacao do corpus estao
  configuradas localmente. `bun run benchmark:rag` para antes de chamar IA,
  pois falta `BEM_HUB_BENCHMARK_ACCESS_TOKEN` valido de um membro.
- A organizacao esta no limite de tres membros ativos. Nao criar usuario de
  benchmark temporario nem ultrapassar o limite e uma alternativa segura.
- Advisor ainda aponta `auth_leaked_password_protection`; a ativacao depende
  do painel Supabase.

### Proximo Passo Exato

1. Definir `BEM_HUB_BENCHMARK_ACCESS_TOKEN` temporario de um membro existente
   da organizacao do corpus.
2. Rodar `bun run benchmark:rag`, revisar cada `REVIEW` e so entao calibrar
   retrieval ou prompt.

## 2026-08-03 - RAG Com Referencias De Trecho E Benchmark De Evidencia

### Feito

- Fontes novas do chat agora preservam e mostram os indices humanos dos trechos
  recuperados. A referencia fica ao lado do documento, inclusive apos recarregar
  a conversa.
- Metadados de mensagens antigas, sem indices de trecho, continuam compativeis
  e exibem a contagem original.
- O runner RAG passou a registrar `expectedSectionsFound` e reprova uma resposta
  citada quando o contexto recuperado nao contem a secao esperada. Isto evita
  aprovar recuperacao de documento certo com trecho errado.
- Antes de chamar provider ou IA, o runner valida corpus pronto, documentos
  esperados e bloqueia nomes de gabarito/roteiro de validacao indexados.
- A busca adicional por indices usa o mesmo `organization_id` e RLS da consulta
  vetorial; ausencia de referencia falha em vez de inventar um indice.

### Verificacao

- `bun test src/features/chat/rag.test.ts scripts/benchmark-rag.test.ts`: 17/17.
- `bun run benchmark:rag -- --validate-only`: corpus valido com 21 casos.
- Suite completa: 119/119 testes.
- `bun run lint`, `bun run build` e `git diff --check` passaram.
- Commits: `cd03a66 feat(rag): add chunk references` e
  `880eae2 fix(rag): validate benchmark corpus`.

### Pendente E Proximo Passo

- Benchmark externo permanece bloqueado sem token dedicado, organizacao do
  corpus e credenciais de IA. O runner agora bloqueia automaticamente roteiro
  ou arquivo de respostas esperadas indexado.
- Executar benchmark autenticado, revisar todos os casos `REVIEW` e fazer smoke
  RAG com conversa recarregada em duas organizacoes.

## 2026-07-30 - Fundacao De Midia, Resposta E Reacao WhatsApp

### Feito

- Definido contrato provider-neutral para referência de mensagem, reply,
  reação e mídia (`audio`, `image`, `video`, `document`).
- Evolution envia texto/mídia citados e reações pelo contrato real da versão
  local; Wuzapi usa `ContextInfo`, endpoints específicos de mídia e o prefixo
  `me:` para reação sobre mensagem própria.
- Testes de adapter congelam URL, headers e payloads de reply, reação, áudio e
  documento. Nenhuma mensagem foi disparada automaticamente.

### Estado Da Entrega

- Esta fundação **não é testável no app ainda**: `/app/support` só aceita e
  exibe texto; mídia recebida é ignorada pelo normalizador atual.
- O contrato de adapters permite envio, mas ainda não há upload, autorização,
  persistência de tentativa nem chamada server-side para `sendMediaMessage`.
- Reply e reação também não possuem rota/RPC/UI. Não usar o celular como smoke
  de mídia até a entrega ponta a ponta existir.

### Retomada Exata

1. Estender o contrato de webhook para anexo, citação e reação, com fixtures
   reais dos dois provedores; manter texto puro sem regressão.
2. Criar RPCs tenant-scoped/idempotentes para reservar mensagem/anexo, fazer
   transferência server-side ao bucket privado e finalizar a tentativa.
3. Criar rota de upload validada por MIME/tamanho e ligar o composer a envio de
   arquivo/imagem/áudio; somente ação explícita do operador envia ao WhatsApp.
4. Renderizar anexo, áudio, reply e reação na thread; gerar URL assinada no
   servidor, nunca expor URL/credencial do fornecedor.
5. Fazer smoke bidirecional Wuzapi/Evolution com dois tenants e validar RLS,
   limites, duplicidade e reinício.

### Verificação

- `bun test src/features/channels/channel-provider-adapters.test.ts`: 20/20.
- `bun run lint` iniciou, mas não produziu saída antes do limite operacional;
  repetir junto do build após a próxima fatia.

### Aplicação Remota

- Aplicada em `lzqugeqtcisgaztggcxq` a migration
  `20260731005056_support_message_media`.
- Confirmados: RLS nas tabelas de anexos e reações, bucket
  `support-message-media` privado com limite de 25 MB, FK tenant-scoped de
  reply e policies de leitura por membro para tabelas e Storage.
- Advisors não apontaram alerta novo desta migration. Permanecem os avisos
  conhecidos de funções `SECURITY DEFINER` revisadas e de proteção contra
  senha vazada desativada.

## 2026-07-30 - Ingresso Wuzapi Restaurado E Protegido

### Causa E Correção

- A sessão Wuzapi estava conectada e o envio funcionava, mas o webhook ainda
  apontava para um Quick Tunnel encerrado. A requisição de entrada não chegava
  ao BEM HUB; migrations, RPC idempotente e Realtime não eram alcançados.
- Um novo tunnel público foi iniciado, `APP_BASE_URL` foi atualizado e o
  callback da instância gerenciada foi reconciliado sem expor credenciais.
- Probe HMAC pelo endereço público e callbacks reais do Wuzapi retornaram HTTP
  200. O banco confirmou endpoint `active`, verificado, recebimento recente e
  nenhum erro.

### Proteção Contra Regressão

- O BEM HUB agora valida `/api/health/webhook-ingress` pelo próprio
  `APP_BASE_URL` antes de considerar o recebimento saudável.
- `Atualizar estado` separa saúde da sessão e saúde do webhook. Wuzapi e
  Evolution consultam a URL configurada e corrigem automaticamente divergência;
  ingresso inacessível deixa o canal `degraded`.
- O token opaco do endpoint passa a permanecer dentro da credencial
  criptografada de Wuzapi/Evolution para permitir reconciliação futura.
- Criado `bun run test:whatsapp-contracts`, cobrindo adapters, HMAC,
  normalização inbound, recibos, início de atendimento e drift de URL.
- Runbook e plano de provisionamento agora tratam saída, entrada, idempotência,
  mesma conversa e recibos como um único contrato de regressão.

### Verificação

- Gate WhatsApp passou com 35/35 testes.
- Suite completa passou com 111/111 testes.
- `bun run lint`, `bun run build` e `git diff --check` passaram.
- Build confirmou a nova rota dinâmica `/api/health/webhook-ingress`.

### Próximo Passo

1. Enviar uma nova mensagem direta do WhatsApp para o número conectado.
2. Confirmar atualização da mesma conversa em `/app/support`.
3. Confirmar entrega/leitura da resposta seguinte.

## 2026-07-30 - Atendimento Com Canal Gerenciado Corrigido

### Feito

- Corrigida a queda de `/app/support` quando um canal gerenciado conectado
  ainda não possui `phone_number`.
- Inbox e detalhe agora tratam o número próprio do canal como opcional e usam
  `Número não identificado` como fallback.
- O backend gerenciado consulta `/admin/users` para descobrir o telefone pelo
  JID quando o `/session/status` do Wuzapi não o informa.
- O canal `wuzp` foi reconciliado no banco sem expor telefone ou credenciais.
- A conversa e a mensagem do smoke foram preservadas; a mensagem chegou ao
  destinatário antes da falha de renderização.

### Verificação

- Banco remoto confirmou canal conectado, telefone preenchido, uma conversa e
  uma mensagem.
- Suite passou com 106/106 testes.
- `bun run lint`, `bun run build` e `git diff --check` passaram.
- O servidor de desenvolvimento recompilou os arquivos alterados e permanece
  ativo; o navegador autenticado não estava disponível para automação.

### Próximo Passo

1. Em `/app/support`, usar `Tentar novamente` e abrir a conversa criada.
2. Responder pelo Atendimento e confirmar a segunda mensagem no celular.
3. Atualizar o túnel público antes do smoke de mensagem recebida.

## 2026-07-29 - Corrida De Geração Do QR Wuzapi Corrigida

### Feito

- O pareamento agora consulta o estado antes de iniciar a sessão e não repete
  `/session/connect` quando o Wuzapi já aguarda a leitura do QR.
- A leitura do QR tolera a janela assíncrona entre a conexão e a geração da
  imagem, com polling curto e limitado.
- Uma resposta HTTP 500 de conexão é reconciliada pelo estado real somente
  quando a sessão já ficou conectada; outros erros continuam sendo propagados.

### Verificação

- O canal gerenciado real `wuzp` retornou um QR válido pelo adapter corrigido.
- Testes cobrem sessão já iniciada e QR disponibilizado com atraso.
- Suite passou com 104/104 testes.
- `bun run lint`, `bun run build` e `git diff --check` passaram.

### Próximo Passo

1. No drawer do canal `wuzp`, usar `Retomar conexão` e ler o QR.
2. Confirmar a transição para `Conectado` e o telefone descoberto.
3. Atualizar o túnel público do webhook antes do smoke de mensagem recebida.

## 2026-07-29 - Exclusão Lógica De Canais Com Histórico

### Feito

- `channel_connections` ganhou `is_deleted` e `deleted_at`; a exclusão agora
  preserva canal, conversas, mensagens e auditoria mesmo quando já existe
  atendimento.
- O RPC de exclusão passou a marcar o canal como `disabled`; a listagem de
  Canais omite registros excluídos e permite reutilizar o mesmo número.
- Exclusão física foi removida das permissões e policies de
  `channel_connections`; somente owner/admin executa a inativação tenant-scoped.
- Atendimento mantém conversas antigas e apresenta o canal como `Conectado`,
  `Desconectado` ou `Inativo`. Composer, retry e webhook não operam sobre canal
  excluído.
- Exclusão também ficou disponível para canais gerenciados. O recurso externo
  permanece para descomissionamento posterior; esta ação somente o retira da
  operação do BEM HUB.
- Migrations de provisionamento gerenciado, exclusão lógica e índice da FK de
  criação foram aplicadas no Supabase remoto.

### Verificação

- pgTAP específico passou com 24/24 asserções.
- Suite passou com 102/102 testes.
- `bun run lint`, `bun run build` e `git diff --check` passaram.
- Banco remoto confirmou três canais existentes preservados, zero excluídos,
  filtro da listagem ativo, exclusão física revogada e status inativo presente
  no contrato de Atendimento.
- Advisors não registraram regressão de segurança desta mudança. Permanecem os
  avisos conhecidos sobre funções administrativas intencionais e proteção de
  senha vazada desativada.

### Próximo Passo

1. Fazer smoke autenticado: excluir um canal com conversa, confirmar que some
   em Canais e aparece como `Inativo` no Atendimento.
2. Conectar um novo canal Wuzapi pelo fluxo gerenciado.
3. Implementar descomissionamento externo separado para liberar recursos do
   host sem misturar essa operação com a preservação do histórico.

## 2026-07-29 - Provisionamento Gerenciado Wuzapi Implementado Localmente

### Feito

- O cadastro padrão de canal agora pede somente um nome e abre um drawer único
  com preparo, QR Code, polling de estado e confirmação da conexão.
- O provedor fica interno e configurável por ambiente; a primeira fatia usa
  Wuzapi sem expor URL, admin token, token de usuário, HMAC ou token do webhook.
- O backend gera e criptografa credenciais exclusivas antes da chamada externa,
  cria o usuário em `/admin/users`, configura webhook/HMAC e solicita o QR.
- Retry usa `request_id`, lease curta e reconciliação por token após HTTP 409,
  evitando duplicar o usuário Wuzapi em falha parcial.
- `channel_provisioning_runs` registra somente estado operacional sanitizado,
  com RLS e acesso exclusivo do `service_role`.
- Canais gerenciados podem nascer sem telefone; após o pareamento, o adapter
  extrai o número do JID retornado pela Wuzapi.
- O fluxo manual anterior continua disponível para canais legados. Exclusão de
  canal gerenciado ficou oculta até existir descomissionamento externo seguro.
- Plano completo registrado em
  `docs/whatsapp-self-service-provisioning-plan.md`.

### Verificação

- Duas migrations aplicadas com sucesso no Supabase local.
- pgTAP isolado passou com 25/25 asserções de RLS, grants, isolamento,
  idempotência, lease e referência sanitizada.
- Suite completa passou com 102 testes.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- `git diff --check` passou.
- `db lint` global mantém somente o erro legado de ambiguidade em
  `public.finalize_support_message_send`.
- QA visual não executou porque nenhum navegador estava conectado à sessão.

### Pendente

1. Configurar as variáveis gerenciadas e subir Wuzapi para o smoke real.
2. Validar nome → usuário Wuzapi → QR → telefone descoberto → webhook.
3. Implementar descomissionamento seguro antes de reativar exclusão.
4. Aplicar migrations no remoto somente após o smoke local.
5. Implementar Evolution usando o mesmo contrato após estabilizar Wuzapi.

## 2026-07-26 - Evolution Pareada E Primeira Saida Validada

### Feito

- Clonado o repositorio oficial Evolution API em `C:\repos\evolution-api` e
  pinada a versao `2.3.7`; `latest` nao e usado.
- Criados Compose local, setup de segredos e script seguro para exibir a
  configuracao do BEM HUB sem imprimir a API key.
- Evolution roda em `127.0.0.1:8082` com PostgreSQL 15, Redis 7 e tres volumes
  persistentes. Banco e Redis nao publicam portas.
- API key aleatoria foi validada em `/verify-creds`; Quick Tunnel HTTPS foi
  criado; instancia `bem-hub-piloto-evolution` foi pareada por QR na primeira
  tentativa.
- O adapter real do BEM HUB executou `provision` e `getHealth` contra a API
  Evolution via HTTPS antes do pareamento.
- Canal Evolution foi salvo e conectado. O operador iniciou atendimento pelo
  modulo de Atendimento e a primeira mensagem saiu sem erro ou surpresa.
- Verificacao fechada com 19 testes focados, suite completa com 99 testes,
  lint e build de producao aprovados.
- Corrigido no Compose o CORS da Evolution 2.3.7: requests server-to-server sem
  `Origin` recebem 500 quando a origem e restrita. O host permanece local-only
  e todas as rotas operacionais exigem `apikey`.
- A Evolution API fornece o Evolution Manager em `/manager`, mas ele foi
  mantido desativado no Compose local por `SERVER_DISABLE_MANAGER=true`; o BEM
  HUB ja cobre o fluxo operacional necessario.

### Proxima Validacao

1. Responder pelo contato e confirmar a mesma conversa.
2. Confirmar entrega e leitura pelo callback real `messages.update`.
3. Enviar pelo aparelho e confirmar reconciliacao na mesma conversa.
4. Reiniciar a stack e confirmar persistencia da sessao.
5. Observar Evolution e Wuzapi antes de escolher o provider principal.

## 2026-07-26 - Atendimento Iniciado Pelo Operador

### Feito

- Atendimento ganhou ação primária `Iniciar atendimento` na fila e drawer
  direito com canal, telefone, nome opcional e primeira mensagem.
- Somente canais conectados e com credenciais ficam disponíveis. Evolution API
  e Wuzapi usam o mesmo contrato provider-neutral já usado nas respostas.
- A RPC atômica normaliza o telefone, reutiliza ou reativa o contato, registra a
  identidade no canal, reutiliza uma conversa ativa ou cria outra e atribui o
  operador antes de persistir a primeira tentativa.
- Falha do fornecedor preserva conversa, mensagem e tentativa para abrir o
  histórico e usar o retry existente.
- O serviço de entrega foi separado do contrato de send/retry para permitir
  reuso sem duplicar regra de credenciais, adapter ou finalização.

### Banco E Verificacao

- Migration local `20260726185154_start_support_conversation.sql`; aplicada no
  remoto como `20260726190822_start_support_conversation`.
- RPC pública é `SECURITY INVOKER`; implementação privilegiada fica em
  `private`, valida `auth.uid()`, membro ativo, tenant, canal conectado,
  credenciais, telefone e idempotência.
- Probes transacionais local e remoto passaram para Evolution, Wuzapi, contato
  canônico compartilhado, uma conversa por canal, atribuição, idempotência e
  bloqueio cross-tenant. Ambos fizeram rollback e não chamaram fornecedor.
- 19 testes focados e a suíte completa com 99 testes passaram; `bun run lint`
  e `bun run build` também passaram.
- Advisors local e remoto não apontaram regressão nova.
- pgTAP local agora inicia, mas a suíte antiga para em 148/280 na policy
  Realtime com `permission denied for table organization_members`. `db lint`
  também mantém o erro legado de ambiguidade em
  `public.finalize_support_message_send`; nenhum dos dois nasceu nesta feature.
- QA visual não foi executado porque navegador integrado não estava disponível.

### Retomada

1. Abrir `/app/support`, clicar `Iniciar atendimento` e fazer smoke real com o
   canal Wuzapi já conectado.
2. Confirmar primeira mensagem no aparelho, resposta do contato na mesma
   conversa e transição de entrega/leitura.
3. Corrigir a policy local de Broadcast para liberar pgTAP completo.
4. Depois subir Evolution API com outro número e repetir o smoke iniciado pelo
   operador.

## 2026-07-26 - Wuzapi Local Validado De Ponta A Ponta

### Infraestrutura Adicional

- Instalado Docker Desktop; ambiente validado com Docker Engine `29.6.2` e
  Docker Compose `v5.3.1`.
- Instalado `cloudflared 2026.7.3` em
  `C:\Program Files (x86)\cloudflared\cloudflared.exe`.
- Clonado o repositorio adicional
  `https://github.com/asternic/wuzapi.git` em `C:\repos\wuzapi`, no commit
  `70642149a0e8`.
- Criados no repositorio Wuzapi os arquivos locais nao versionados
  `docker-compose.local.yml` e `setup-local.ps1`. O `.env` gerado permanece
  ignorado pelo Git e concentra todos os segredos.
- O Compose local executa somente Wuzapi e PostgreSQL, com API publicada em
  `127.0.0.1:8081`, banco sem porta publica e volume
  `wuzapi_local_db_data`.
- RabbitMQ nao esta instalado nem ativo. O fluxo atual usa webhook HTTP direto;
  RabbitMQ permanece opcional para fila duravel, retry desacoplado e dead-letter
  quando houver necessidade operacional comprovada.
- Dois Quick Tunnels temporarios do Cloudflare expuseram Wuzapi e BEM HUB por
  HTTPS. As URLs mudam a cada reinicio e nao substituem dominio/proxy reverso
  de producao.

### Correcoes Durante O Smoke

- O adapter Wuzapi passou a autenticar endpoints de usuario com o header
  `token`; `Authorization` fica reservado ao Admin Token.
- O status foi alinhado ao contrato real `connected`/`loggedIn`.
- A ativacao do recebimento agora assina explicitamente `Message` e
  `ReadReceipt`; sem a lista, o cache Wuzapi descartava mensagens antes do
  webhook.
- A chave global de criptografia Wuzapi foi corrigida para 32 bytes. Como o
  script usa hexadecimal, ele gera 16 bytes aleatorios, resultando em 32
  caracteres ASCII aceitos pelo AES-256.
- O normalizador passou a priorizar `SenderAlt` em mensagens recebidas e
  `RecipientAlt` em mensagens enviadas pelo aparelho. Isso recupera o telefone
  quando o WhatsApp usa LID e remove o sufixo de dispositivo do JID.
- Dois contatos LID sem nome/telefone criados durante o diagnostico foram
  fundidos nos contatos telefonicos Uazapi correspondentes. Conversas,
  mensagens e identidades foram preservadas; somente os dois registros orfaos
  foram removidos.

### Verificacao

- Wuzapi respondeu `/health`, conectou e restaurou a sessao apos reinicio do
  container.
- HMAC e webhook foram configurados com sucesso.
- Mensagens enviadas pelo aparelho e pelo BEM HUB chegaram ao mesmo dominio de
  Atendimento; contatos foram reconciliados por telefone entre Uazapi e
  Wuzapi.
- O reparo remoto terminou com cinco contatos, zero registros obsoletos e zero
  contatos simultaneamente sem nome e sem telefone na organizacao validada.
- 17 testes focados de adapters/webhook passaram; `bun run lint` e
  `bun run build` passaram com Next.js `16.2.9`.
- O codigo BEM HUB desta validacao permanece no worktree, sem commit e sem
  deploy para Vercel.

### Retomada

1. Preservar `C:\repos\wuzapi\.env`; nunca registrar seus valores em docs,
   commits ou screenshots.
2. Retomar os containers e os dois tunnels seguindo
   `docs/whatsapp-self-hosted-runbook.md`. Atualizar `APP_BASE_URL` e as URLs do
   canal porque Quick Tunnels sao efemeros.
3. Implementar a proxima feature solicitada no modulo Atendimento.
4. Em seguida, subir Evolution API local com Postgres e Redis e executar o
   mesmo smoke com outro numero.
5. Antes de producao, rotacionar o token Wuzapi exposto durante o diagnostico,
   usar dominio HTTPS estavel e decidir backup/monitoramento.

## 2026-07-25 - Evolution E Wuzapi Preparados

### Decisao

- Z-API foi pausada por decisao do responsavel pelo produto. O adapter legado
  permanece no codigo e conexoes existentes continuam legiveis, mas interface,
  Server Action e RPC impedem nova configuracao.
- Evolution API passa a ser a opcao principal para o primeiro piloto
  self-hosted. Wuzapi entra como alternativa enxuta e deve usar outro numero
  durante a comparacao; o mesmo WhatsApp nao deve conectar nos dois ao mesmo
  tempo.

### Feito

- Implementados adapters Evolution API e Wuzapi para saude, pareamento,
  desconexao, envio de texto e configuracao automatica de webhook.
- Evolution cria a instancia `WHATSAPP-BAILEYS` quando o nome ainda nao existe.
- Webhooks Evolution normalizam `messages.upsert` e `messages.update`, incluindo
  entrega e leitura, e validam API key e instancia.
- Webhooks Wuzapi exigem HMAC-SHA256 do corpo bruto e normalizam `Message` e
  `ReadReceipt`.
- O drawer de canais oferece Evolution, Wuzapi e Uazapi; Z-API aparece apenas
  como opcao pausada para orientar migracao de conexoes legadas.
- Aplicada remotamente a migration
  `enable_evolution_and_wuzapi_providers`. A constraint preserva `z_api` para
  dados legados, enquanto o RPC aceita somente os tres providers ativos.
- Criado `docs/whatsapp-self-hosted-runbook.md` com o limite entre configuracao
  automatica do BEM HUB e os passos de infraestrutura/QR.

### Verificacao

- 92 testes passaram; 28 cobrem especificamente schemas, adapters e webhooks
  de canais.
- `bun run lint` e `bun run build` passaram com Next.js 16.2.9.
- pgTAP foi ampliado de 261 para 263 assertions; a execucao local continua
  pendente porque Docker/Postgres nao esta disponivel.
- Catalogo remoto confirmou a constraint e o bloqueio de Z-API no RPC.
- Advisors nao apontaram alerta novo causado pela migration; permanecem apenas
  os avisos conhecidos de funcoes administrativas, senha vazada desativada e
  indices ainda sem uso.

### Retomada

1. Escolher host, criar DNS HTTPS e disponibilizar Evolution API.
2. Informar no BEM HUB URL, API key e nome da instancia; escanear o QR.
3. Disponibilizar Wuzapi com `WEBHOOK_FORMAT=json`, criar um usuario isolado e
   informar URL, token do usuario e HMAC; testar com outro numero.
4. Fazer smoke de entrada, envio e `Aceita -> Entregue -> Lida` em cada
   provider antes de decidir qual permanece como principal.

## 2026-07-25 - Confirmacoes De Entrega Aplicadas No Remoto

### Causa Raiz

- O fornecedor aceitava e entregava a mensagem, mas
  `private.finalize_support_message_send_attempt` falhava com `SQLSTATE 42702`
  porque `provider_message_id` podia significar tanto o parametro quanto a
  coluna da tentativa.
- O webhook Uazapi assinava somente `messages`, excluia mensagens enviadas pela
  API e, por isso, nao recebia `messages_update`.
- A resposta HTTP do fornecedor era gravada como `deliveredAt`, embora
  comprovasse apenas que a mensagem fora aceita para processamento.

### Feito

- Aplicada remotamente a migration
  `20260726022509_support_delivery_receipts`.
- A finalizacao usa parametros posicionais e separa os estados `sending`,
  `accepted`, `sent`, `delivered`, `read` e `failed`.
- O webhook Uazapi passa a assinar `messages_update`; o normalizador aceita os
  estados textuais documentados pelo fornecedor e preserva o filtro que evita
  recriar o eco da mensagem enviada pela API.
- Recibos sao idempotentes e monotonicos: duplicatas nao reaplicam mudancas e
  eventos atrasados nao regridem uma mensagem entregue ou lida.
- A interface mostra estados distintos e acessiveis: Enviando, Aceita, Enviada,
  Entregue, Lida e Falhou.
- Broadcast existente em `support_messages` continua sendo a invalidacao
  provider-neutral para atualizar a conversa aberta.
- As mensagens historicas travadas nao foram recuperadas, conforme decisao do
  usuario; a mudanca e preventiva para novos envios.

### Verificacao

- Probe remoto transacional passou por `sending -> accepted -> delivered ->
  read`, confirmou a correcao da ambiguidade, rejeitou regressao por `sent` e
  `failed` atrasados e reconheceu recibo duplicado. Rollback confirmado, sem
  fixture persistida.
- 79 testes unitarios passaram.
- pgTAP foi ampliado de 237 para 261 assertions; a execucao local continua
  pendente porque Docker/Postgres nao esta disponivel.
- `bun run lint`, `bun run build` e `git diff --check` passaram.
- Advisors nao apontaram novo alerta de seguranca nem FK sem indice. Permanecem
  apenas os avisos conhecidos.

### Retomada

1. Publicar o codigo da aplicacao.
2. Reconfigurar uma vez os webhooks Uazapi existentes para ativar
   `messages_update`; novos canais ja usam o contrato atualizado.
3. Fazer um smoke real de novo envio e observar `Aceita -> Entregue -> Lida`.
4. Executar o pgTAP quando houver Postgres local e concluir QA desktop/mobile.

## 2026-07-25 - Ciclo Operacional E Retry Aplicados No Remoto

### Feito

- Aplicadas no projeto remoto, nesta ordem:
  `20260726013623_support_operational_lifecycle`,
  `20260726013644_support_message_retry`,
  `20260726013946_disambiguate_support_retry_request_id` e
  `20260726014116_index_support_conversation_read_foreign_keys`.
- O backfill criou 11 tentativas para os envios historicos elegiveis.
- Um probe transacional revelou ambiguidade entre o parametro `request_id` e a
  coluna homonima nos RPCs privados de envio/retry. A migration corretiva
  regravou apenas essas referencias com os parametros posicionais originais.
- Dois indices foram adicionados para cobrir as FKs de mensagem e usuario em
  `support_conversation_reads`.

### Verificacao

- Probes transacionais passaram para ciclo operacional, leitura individual,
  isolamento cross-tenant, novo envio e retry da mesma mensagem.
- O retry preservou a mensagem e criou a segunda tentativa; todos os probes
  foram revertidos e nenhum envio ao fornecedor foi disparado.
- Catalogo remoto confirmou RLS, wrappers, 11 tentativas, funcoes corrigidas e
  os dois indices.
- Advisors nao ganharam alerta de seguranca nem FK sem indice. Permanecem apenas
  os avisos conhecidos de funcoes administrativas intencionais, protecao de
  senha vazada desativada e indices ainda sem uso.
- pgTAP local continua pendente porque Docker/Postgres nao esta disponivel.

### Retomada

1. Fazer QA autenticado desktop/mobile com dois operadores.
2. Fazer smoke controlado de falha e retry com o canal real.
3. Capturar callback real `messages_update` antes de implementar entrega e
   leitura do provedor.

## 2026-07-25 - Retry Explicito De Atendimento Preparado

### Feito

- Criada migration local `20260726011718_support_message_retry.sql`.
- Cada envio pelo app passa a gerar uma tentativa imutavel com chave
  idempotente, numero sequencial, estado, erro e ID retornado pelo provedor.
- Retry reutiliza a mensagem `failed`, cria uma nova tentativa e impede dois
  envios concorrentes do mesmo registro.
- Somente o responsavel pelo atendimento ou owner/admin pode enviar e tentar
  novamente; a interface bloqueia o composer quando falta atribuicao.
- A mensagem com falha agora oferece `Tentar novamente` no proprio balao.
- Credenciais administrativas sao validadas antes de persistir o envio,
  evitando criar `sending` orfao quando o ambiente server-side esta incompleto.
- O endpoint existente diferencia explicitamente `send` e `retry`, sem criar
  uma segunda superficie HTTP.

### Verificacao

- Preflight remoto somente leitura encontrou 11 envios historicos com
  `client_request_id`; todos usam `sending`, `sent` ou `failed` e cabem no
  backfill planejado.
- 77 testes unitarios passaram.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- pgTAP foi ampliado de 216 para 237 assertions, incluindo ACL/RLS da outbox,
  wrappers, idempotencia, retry do mesmo registro e isolamento cross-tenant.
- pgTAP nao foi executado porque Docker/Postgres local segue indisponivel. A
  migration foi aplicada e validada no checkpoint remoto acima.

### Descoberta Sobre Entrega E Leitura

- A documentacao Uazapi atual confirma a assinatura do evento
  `messages_update`, separado de `messages`.
- O material consultado nao forneceu uma fixture inequivoca do callback atual.
  O canal continuara sem assinar esse evento ate capturar um payload real; nao
  sera criado normalizador por suposicao.

### Retomada

1. Executar pgTAP quando o banco local estiver disponivel e concluir o QA
   autenticado com dois operadores.
2. Fazer smoke de falha controlada seguido de retry, garantindo uma mensagem e
   duas tentativas.
3. Capturar callback real `messages_update`, congelar fixture e so entao
   persistir `sent`, `delivered`, `read` e `failed` fora do eixo de revisao.

## 2026-07-25 - Ciclo Operacional De Atendimento Preparado

### Feito

- Implementado localmente o ciclo seguro de assumir, devolver, abrir, deixar
  pendente, escalar, resolver, reabrir e alterar prioridade.
- Atribuicao, estado e prioridade usam RPC atomica com lock da conversa,
  versao otimista e checagem explicita de membro/administrador do tenant.
- Updates diretos de estado foram removidos de `authenticated`; o envio atual
  conserva acesso somente a `last_message_at`.
- Leitura passou a ser individual por operador, com contador de nao lidas na
  fila e baixa automatica ao abrir a conversa.
- Mudancas operacionais geram eventos imutaveis de auditoria. A interface exibe
  responsavel, timeline e metricas de fila, resolucao em sete dias e tempo
  medio de resolucao.
- O RPC legado de revisao de rascunho foi preservado por wrapper
  `SECURITY INVOKER` e implementacao privada com validacao de tenant, evitando
  regressao ao restringir a tabela de conversas.
- Migration local:
  `20260726005359_support_operational_lifecycle.sql`.

### Verificacao

- 74 testes unitarios passaram.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9.
- pgTAP foi ampliado de 171 para 216 assertions, cobrindo ACL, RLS, wrappers,
  isolamento cross-tenant, concorrencia por versao, leitura, auditoria,
  resolucao e reabertura.
- `git diff --check` passou; avisos exibidos sao apenas da conversao
  LF/CRLF configurada no Windows.
- `supabase db lint --local` e pgTAP nao executaram porque Docker/Postgres local
  nao esta disponivel.
- A migration foi aplicada e validada no checkpoint remoto acima. QA visual
  autenticado permanece pendente.

### Retomada

1. Executar os testes pgTAP quando o banco local estiver disponivel.
2. Fazer QA autenticado desktop/mobile da fila, atribuicao, estados, nao lidas,
   timeline e metricas.
3. Separar entrega/leitura do provedor do estado de revisao da mensagem.
4. Validar envio pelo app e pelo aparelho na mesma thread com o canal real.

## 2026-07-24 - Modulo De Etiquetas Aplicado No Remoto

### Feito

- Criada rota `/app/tags` com DataTable, busca, EntityDrawer, criacao, edicao e
  arquivamento seguro.
- Etiquetas possuem nome unico por organizacao sem diferenciar caixa, cor
  hexadecimal, descricao, contagem de contatos e estado arquivado.
- Contatos deixaram de editar texto livre e agora selecionam ate 12 etiquetas
  cadastradas por ID, com cor e nome exibidos na tabela.
- Migration `20260724030940_contact_tags_registry.sql` cria `tags` e
  `contact_tag_assignments`, migra arrays textuais existentes, valida o backfill
  e remove `contacts.tags`.
- FKs compostas impedem vincular contato e etiqueta de organizacoes diferentes.
  RLS e RPCs `SECURITY INVOKER` preservam isolamento multi-tenant.
- Etiqueta em uso nao pode ser arquivada; primeiro precisa ser removida dos
  contatos, evitando classificacao quebrada.
- Atendimento continua recebendo nomes de etiquetas pelo contrato existente,
  enquanto o modulo de contatos recebe IDs, nomes e cores.

### Verificacao

- Preflight remoto somente leitura confirmou 5 contatos, nenhum texto de
  etiqueta existente e apenas `list_contacts`/`get_support_inbox` dependentes da
  coluna antiga, ambos cobertos pela migration.
- 71 testes unitarios passaram.
- pgTAP foi ampliado de 148 para 171 assertions.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9 e rota `/app/tags`.
- `supabase db lint --local` e `supabase test db --local` nao executaram porque
  o Postgres/Docker local continua indisponivel.
- Navegador integrado nao estava disponivel; QA visual autenticado permanece
  pendente.
- Migration aplicada no remoto como
  `20260724034601_contact_tags_registry`.
- Catalogo remoto confirmou RLS, FKs compostas, indices, grants explicitos,
  RPCs `SECURITY INVOKER`, remocao da coluna textual e nova assinatura por
  `uuid[]`.
- Probe SQL transacional confirmou CRUD, nome unico sem diferenciar caixa,
  vinculo por ID, contrato do Atendimento, protecao de etiqueta em uso,
  arquivamento e isolamento de leitura/escrita entre organizacoes; todas as
  fixtures sofreram rollback.
- Advisors nao apontaram novo alerta de seguranca. Dois indices novos aparecem
  como ainda nao utilizados, resultado esperado antes de trafego real.
- Nenhum commit foi criado nesta sessao; implementacao e documentacao permanecem
  no worktree para revisao e commit no proximo checkpoint.

### Retomada

1. Revisar o diff e criar um commit coerente do modulo de contatos/etiquetas.
2. Fazer QA visual de `/app/tags` e do seletor em `/app/contacts`.
3. Cadastrar as primeiras etiquetas reais e validar o fluxo completo pela UI.
4. Rodar pgTAP quando Docker/Postgres local estiver disponivel.

## 2026-07-23 - CRUD De Contatos Aplicado No Remoto

### Feito

- Criada rota `/app/contacts` com DataTable, busca por identidade, filtro por
  estagio e EntityDrawer para criar ou editar.
- Contatos podem nascer manualmente ou continuar sendo criados pelo webhook;
  ambos passam pelo mesmo contrato de identidade telefonica no banco.
- Cadastro possui estagios `new`, `lead`, `customer` e `discarded`, etiquetas,
  origem por canal, ultima atividade e acesso ao atendimento mais recente.
- Exclusao fisica nao foi exposta. Arquivamento preserva conversas e mensagens;
  novo callback reativa o contato.
- Painel do Atendimento mostra telefone formatado e alerta operacional para DDI
  ainda nao suportado.

### Identidade Telefonica

- Brasil possui chave canonica por organizacao.
- Celular antigo com oito digitos e versao atual com nono digito resolvem para
  a mesma chave; telefone fixo nao recebe nono digito.
- Outro DDI e persistido com chave exata e estado `unsupported_country`.
- Numero invalido nao derruba o parser; cadastro manual recebe erro claro e
  webhook ainda conserva a identidade fornecida pelo provedor.
- Migration falha antes de criar o indice unico caso encontre duplicatas
  historicas equivalentes, evitando mesclagem destrutiva automatica.

### Verificacao

- 67 testes unitarios passaram.
- `bun run lint` passou.
- `bun run build` passou com Next.js 16.2.9 e rota `/app/contacts`.
- pgTAP foi ampliado de 129 para 148 assertions, mas nao executou porque Docker
  e Postgres local nao estao disponiveis.
- Preflight remoto confirmou 5 contatos, zero colisoes canonicas e todos os
  alvos esperados nas funcoes de ingestao e Atendimento.
- Migration foi aplicada no remoto como
  `20260724024011_contacts_crud_phone_identity`.
- Catalogo remoto confirmou RLS, trigger, indices, RPCs `SECURITY INVOKER`, ACL
  sem acesso anonimo e sem `DELETE` para `authenticated`.
- Probe SQL transacional confirmou criacao/listagem, bloqueio de duplicata entre
  oito e nove digitos, arquivamento, reativacao do mesmo ID e isolamento de
  leitura/escrita entre duas organizacoes; todas as fixtures sofreram rollback.
- Advisors nao apontaram regressao desta migration. Permanecem os warnings
  conhecidos de duas RPCs `SECURITY DEFINER` intencionais e protecao contra
  senha vazada desativada, alem de indices ainda sem uso em base pequena.
- QA visual autenticado nao executou porque navegador integrado nao esta
  disponivel.

### Retomada

1. Fazer smoke real: cadastro manual, callback com versao 8/9 do mesmo celular,
   arquivamento/reativacao e DDI estrangeiro.
2. Fazer QA visual desktop/mobile em `/app/contacts` e no painel do Atendimento.
3. Rodar pgTAP quando Docker/Postgres local estiver disponivel e regenerar os
   tipos oficiais do Supabase.

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
## 2026-08-08 - Canais Gerenciados Sem URL De Usuário

### Feito

- O provisionamento gerenciado agora resolve Wuzapi e Evolution exclusivamente
  no servidor. O usuário informa o nome do canal e lê o QR Code.
- URLs de infraestrutura, chaves administrativas, instância e webhook não são
  mais dados operacionais do usuário. Em desenvolvimento, as chaves locais
  podem ser lidas dos `.env` dos provedores apenas pelo servidor.
- URLs temporárias atuais foram registradas só em `.env.local`; os containers e
  os três túneis locais estão ativos.

### Verificação

- `bun run test`: 124 testes passaram.
- `bun run lint`, `bun run build` e `git diff --check` passaram.
- Smoke real Wuzapi concluído pelo usuário: QR, envio pelo Atendimento e
  recebimento na mesma conversa funcionaram.

### Próximo Passo

1. Para testar Evolution, trocar somente `WHATSAPP_MANAGED_PROVIDER` no
   ambiente server-side, reiniciar o BEM HUB e criar outro canal.
## 2026-08-09 - Mídia No Atendimento: Envio E Viewer

### Feito

- Anexos saem por Evolution e Wuzapi, ficam em Storage privado e retornam ao
  histórico pelo link autenticado de curta duração.
- Corrigido Evolution: a versão local aceita Base64 puro e rejeita o prefixo
  `data:`; Wuzapi mantém o formato próprio.
- Bolhas identificam imagem, vídeo, áudio e documento; imagens têm prévia e
  todo anexo abre viewer com zoom, carrossel e download.

### Verificação

- Smoke real Evolution confirmou envio de imagem.
- Teste focado dos adapters, lint, build e `git diff --check` passaram.

### Próximo passo

1. Trocar o seletor simples pelo compositor modal múltiplo, com legenda por
   mídia e inclusão contínua.
2. Normalizar e persistir mídia recebida por webhook nos dois provedores.

## 2026-08-26 - Convites E Ambientes Vinculados

### Feito

- Os smokes de canal conectado e de mídia foram concluídos pelo usuário antes
  desta correção.
- Convites pendentes passam a aparecer em `Configurações > Conta`; o usuário
  autenticado pode aceitar o próprio convite sem depender do e-mail.
- A tabela de ambientes vinculados permite trocar a conta ativa sem logout.
- Usuários `member` e `admin` podem somente se desvincular do próprio acesso;
  owners não recebem essa ação. A desvinculação da conta em uso seleciona uma
  conta restante ou encerra a sessão quando não houver nenhuma.
- Aplicada remotamente a migration
  `20260826000000_account_invitation_and_membership_self_service.sql` com RPCs
  restritas ao `auth.uid()` atual. Não houve nova variável de ambiente.

### Verificação

- `bun test`: 161 testes passaram.
- `bun run lint` e `bun run build` passaram.
- A migration remota foi aplicada com sucesso; `anon` não executa as novas
  funções e `authenticated` recebe somente o acesso esperado.
- O pgTAP foi adicionado em `supabase/tests/account_membership_self_service_test.sql`.
  Sua execução local ficou pendente porque o container `supabase_db_bem-hub`
  não está em execução.

### Pendência Manual Em Produção

1. Com usuário que já é owner de uma conta, confirmar convite para outra e
   aceitar pelo card em `Configurações > Conta`.
2. Alternar entre as duas contas pela tabela e confirmar o contexto no sidebar.
3. Como membro ou admin, desvincular a conta convidada e confirmar que owner
   não vê essa opção.

## 2026-08-26 - Primeiro Acesso Por Convite

### Feito

- Corrigido o convite de usuário novo que chegava em `/auth/login` com sessão
  no fragmento da URL. A ponte cliente persiste a sessão sem enviar tokens ao
  servidor e segue para o aceite do membership.
- Criada a rota `/auth/invite` para links configurados por `redirectTo`; ela
  cobre callback PKCE e fragmento de sessão. O login mantém a mesma ponte como
  fallback para configuração externa de Site URL.
- Após aceitar convite de usuário criado pelo fluxo de equipe, a página mostra
  `Primeiro acesso`, exige a definição de senha e então abre o workspace.
- Atualizada a configuração obrigatória do Supabase Auth em
  `docs/deployment-vercel.md`: Site URL sem path e Redirect URL para
  `/auth/invite`.

### Verificação

- `bun test`: 164 testes passaram.
- `bun run lint` e `bun run build` passaram.

### Pendência Manual Em Produção

1. Publicar a aplicação na Vercel.
2. No Supabase Auth, confirmar Site URL `https://bem-hub.vercel.app` e Redirect
   URL `https://bem-hub.vercel.app/auth/invite`.
3. Revogar o convite cujo link foi exposto e enviar um novo para um e-mail sem
   conta. O resultado esperado é: convite, primeiro acesso, senha e workspace.

### Smoke Confirmado

- O usuário enviou novo convite, concluiu o primeiro acesso em e-mail sem conta
  prévia, definiu a senha e entrou no workspace convidado com sucesso.
