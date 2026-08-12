# Codex Backlog

Fila executavel do BEM HUB. O roadmap define a ordem dos marcos; este arquivo
registra o proximo trabalho concreto, criterios de aceite e descobertas. Manter
itens pequenos o bastante para commits coerentes, mas concluir o marco de ponta
a ponta antes de mudar de objetivo.

## Regras Da Fila

- Trabalhar primeiro no item `AGORA`, salvo incidente, perda de dados ou falha
  critica de seguranca.
- Escolher o proximo item de maior impacto dentro do marco ativo sem esperar
  confirmacao quando a decisao for tecnica e reversivel.
- Mover achados nao bloqueantes para `Descobertas`; nao interromper a entrega.
- Marcar como concluido apenas com implementacao, testes, documentacao e
  verificacao proporcional ao risco.
- Atualizar `docs/worklog.md` a cada checkpoint ou antes de encerrar a sessao.

## GATE OPERACIONAL - M0 Hardening Para Dados Reais

Objetivo: eliminar os riscos conhecidos que impedem usar documentos e dados de
clientes reais com seguranca.

- [x] Criar migration de hardening para `bootstrap_owned_organization`,
  `is_org_member`, `is_org_admin` e `match_document_chunks`.
- [x] Fixar `search_path`, revisar `SECURITY DEFINER`, revogar execucao publica e
  conceder apenas aos papeis necessarios.
- [x] Garantir que RPCs validem `auth.uid()` e `organization_id` sem confiar em
  parametros fornecidos pelo cliente.
- [x] Adicionar testes ou verificacoes reproduziveis para acesso cruzado por RPC.
- [x] Revisar policies do bucket `knowledge-documents` e downloads assinados.
- [x] Rodar advisors Supabase e registrar alertas remanescentes.
- [x] Verificar com dois usuarios reais: tabelas, RPC, Storage e URL assinada.
  Em 2026-08-08, 20 verificacoes remotas passaram com duas organizacoes reais;
  documento, chunk e objeto sinteticos foram removidos ao final.
Aceite tecnico: usuario A nao le, busca, baixa, altera ou remove dados da
organizacao B; roles anonimas nao executam funcoes internas. `bun run lint` e
`bun run build` passaram em 2026-08-08.

## AGORA - M1 RAG No Chat Com Fontes

Objetivo: transformar a base de conhecimento em respostas confiaveis que geram
o primeiro valor diario do piloto.

- [x] Definir contrato de fonte/citacao na API, persistencia e UI.
- [x] Recuperar top chunks no servidor usando a organizacao autenticada.
- [x] Aplicar threshold, limite de contexto e deduplicacao de documentos.
- [x] Injetar instrucoes contra alucinacao e para insuficiencia de contexto.
- [x] Persistir metadata de fontes na mensagem do assistente.
- [x] Renderizar fontes acessiveis com nome do documento e referencia util.
- [x] Criar runner reproduzivel com validacao, filtros e relatorio JSON.
- [x] Cobrir casos literal, multi-chunk, ambiguo e sem resposta.
- [x] Executar o benchmark externo sem indexar arquivos de resposta esperada.
- [x] Fazer smoke test com historico recarregado e mais de uma organizacao.
  Em 2026-08-08, duas organizacoes passaram 12 verificacoes de resposta
  fundamentada, fonte/trecho persistidos apos recarga, download autenticado e
  bloqueio cross-tenant; dados sinteticos foram removidos.

Aceite: respostas fundamentadas citam documentos corretos; perguntas sem
evidencia nao inventam resposta; nenhuma busca atravessa organizacoes.

## PROXIMO - M1 Onboarding Do Piloto

Objetivo: permitir que uma dona e sua equipe alcancem valor em menos de 15
minutos sem configuracao tecnica recorrente.

- [x] Definir checklist de configuracao do assistente de catalogo.
- [x] Importar catalogo e tabela de precos do piloto por CSV/TSV validado.
- [x] Permitir inclusao segura por e-mail de contas BEM HUB cadastradas.
- [x] Criar estado inicial e orientacao contextual curta dentro do fluxo real.
- [x] Instrumentar ativacao, uso diario e perguntas sem resposta.
- [x] Registrar auditoria da plataforma de loja, API, PDV e planilhas.

Aceite: equipe acessa o workspace isolado, encontra o assistente correto e faz a
primeira pergunta util sem ajuda do engenheiro.

## FUTURO - M2 Atendimento Assistido

Adapters de conexao e envio estao implementados; o gate agora e disponibilizar
e operar os hosts self-hosted com numeros de teste separados.

- [x] Definir contrato independente de provedor para canal de mensagens.
- [x] Implementar adapters de conexão Uazapi e Z-API com credenciais
  criptografadas, saúde, QR/código e desconexão.
- [x] Pausar novas configuracoes Z-API sem remover o adapter legado.
- [x] Implementar Evolution API e Wuzapi para saude, QR, envio, webhook,
  entrega/leitura e autenticacao do callback.
- [x] Definir contrato provider-neutral para resposta citada, reação e envio de
  áudio, imagem, vídeo e documento; Evolution e Wuzapi cobertos por testes de
  payload.
- [ ] Criar armazenamento privado tenant-scoped para anexos, com retenção,
  auditoria e URLs assinadas de leitura.
  - [x] Base remota aplicada: bucket privado de 25 MB, tabelas de anexos e
    reações, RLS e FK tenant-scoped para reply.
  - [x] Implementar upload server-side e rota autenticada de leitura; Storage
    está acessível pelo composer e pela thread sem expor credenciais.
  - [ ] Definir retenção e auditoria operacional de anexos.
- [x] Normalizar anexos recebidos em ambos os webhooks e baixá-los no servidor,
  nunca no navegador ou por URL do fornecedor. Wuzapi entrega Base64 assinado;
  Evolution é recuperado pela API server-side autenticada.
- [ ] Fechar citação recebida do WhatsApp em Wuzapi/Evolution: migrations estão
  aplicadas e o normalizador procura `ContextInfo.StanzaId`, mas o smoke real
  ainda entrega a mensagem sem referência. Capturar payload sanitizado,
  congelar fixture e ajustar o envelope antes de alterar APIs dos provedores.
- [ ] Normalizar reações recebidas em ambos os webhooks.
- [x] Entregar composer de múltiplos anexos, persistindo antes do envio e
  preservando idempotência; cada mídia tem prévia e legenda própria.
- [x] Tornar envio textual otimista, sem bloquear o composer enquanto a entrega
  é confirmada no provedor.
- [x] Aplicar migrations de reply no remoto BEM HUB: registradas como
  `20260812011209_add_support_message_replies` e
  `20260812013625_20260811213647_link_inbound_support_message_replies`; RPCs
  e permissões verificadas.
- [x] Validar resposta citada do BEM HUB para o WhatsApp, texto e mídia;
  provider recebe a citação correta sem alteração das APIs hospedadas.
- [ ] Implementar gravação de áudio e reações.
- [x] Renderizar mídia e arquivo de saída na thread, com fallback, download e
  viewer com zoom/carrossel.
- [x] Renderizar mídia recebida pelo aparelho pela mesma thread/viewer privado;
  o smoke real comparativo segue pendente.
- [ ] Renderizar citação recebida pelo aparelho após corrigir a extração do
  payload real; UI já mostra texto/legenda, tipo, arquivo e miniatura quando o
  `reply_to_message_id` chega persistido. Reações continuam pendentes.
- [ ] Executar smoke bidirecional por Wuzapi/Evolution com dois tenants e
  validar limites, MIME, tamanho, exclusão e isolamento de Storage.
- [x] Implementar provisionamento gerenciado Wuzapi com nome, credenciais
  internas, usuário por canal, HMAC, webhook, QR e descoberta do número.
- [x] Reconciliar automaticamente o webhook de Wuzapi/Evolution ao atualizar a
  saúde, validando antes que `APP_BASE_URL` alcance o ingresso do BEM HUB.
- [x] Substituir exclusão física de canais por inativação tenant-scoped,
  preservando atendimentos e bloqueando novas operações no canal excluído.
- [ ] Repetir mensagem direta 1:1 no Wuzapi gerenciado após a troca do Quick
  Tunnel e confirmar entrada única, Realtime e mesma conversa.
- [x] Subir Wuzapi local com Docker/Postgres, HTTPS temporario, usuario isolado
  e fazer smoke de conexao, webhook, entrada, saida e reconciliacao de contatos.
- [x] Preparar Evolution API `2.3.7` local com Postgres/Redis, volumes,
  credenciais aleatorias, HTTPS temporario e instancia provisionada sem QR.
- [x] Parear Evolution API com outro numero e validar a primeira mensagem
  iniciada pelo modulo de Atendimento.
- [ ] Fechar o smoke Evolution com resposta na mesma conversa, entrega/leitura,
  envio pelo aparelho e persistencia apos reinicio antes de comparar
  estabilidade e escolher o provider principal.
- [x] Implementar webhook provider-neutral seguro, idempotente e observável,
  com entrada Uazapi normalizada.
- [x] Validar callback real Uazapi: uma mensagem de outro número deve preencher
  `last_received_at`, criar um evento e aparecer uma única vez na inbox.
- [x] Implementar Broadcast privado provider-neutral para invalidar a inbox por
  organização sem transmitir conteúdo ou payload do fornecedor.
- [x] Ajustar a migration ao conjunto suportado de operações em
  `realtime.messages`: `CREATE POLICY` funciona; `DROP POLICY` e
  `COMMENT ON POLICY` recebem `ERROR 42501` por ownership.
- [x] Aplicar a migration de Broadcast, rodar advisors e validar policy,
  função, triggers e isolamento por tópico no banco.
- [x] Validar que nova mensagem aparece com `/app/support` aberto, sem recarga
  manual.
- [x] Remover rascunho/aprovacao do envio humano; mensagem digitada pelo
  operador segue diretamente para o endpoint HTTP.
- [x] Reorganizar Atendimento como inbox master-detail com busca, filtros de
  status, conversa ativa e contexto do contato.
- [x] Iniciar atendimento pela inbox com canal conectado, telefone, contato
  canônico, atribuição automática e primeira mensagem provider-neutral;
  Evolution API e Wuzapi foram validados por probes transacionais.
- [ ] Fazer QA visual autenticado da inbox em desktop/mobile com dados reais.
- [x] Adicionar envio de texto via adapter autenticado, persistencia anterior ao
  fornecedor e idempotencia por requisicao.
- [x] Normalizar mensagem manual `fromMe` como `message.sent_by_phone`, sem
  duplicar eco `wasSentByApi`.
- [x] Reconfigurar webhook Uazapi sem o filtro `fromMeYes`.
- [ ] Validar envio pelo app e pelo aparelho na mesma thread apos publicar e
  reconfigurar o webhook existente.
- [x] Implementar localmente ciclo operacional com atribuicao, estados,
  prioridade, leitura por operador, auditoria imutavel e metricas de resolucao.
- [x] Aplicar as migrations de ciclo e retry e executar probes de duas
  organizacoes no remoto.
- [ ] Executar pgTAP e fazer QA visual autenticado do ciclo operacional.
- [x] Implementar localmente retry explicito sobre a mesma mensagem, com
  tentativas idempotentes e auditaveis.
- [x] Implementar estados de entrega/leitura independentes do fluxo de revisao
  usando o contrato textual oficial de `messages_update`.
- [ ] Capturar um callback real `messages_update` e congelar a fixture para
  detectar mudancas futuras do fornecedor.
- [ ] Validar duas semanas em modo assistido antes de automatizar.
- [x] Implementar fundacao reutilizavel de DataTable, EntityDrawer, formularios
  e estados de tela.
- [x] Migrar Canais, Assistentes e Conexoes de IA para os novos contratos de
  cadastro sem alterar identidade visual ou regras server-side.
- [ ] Fazer QA visual autenticado dos novos drawers e tabelas em desktop/mobile.
- [x] Implementar localmente o CRUD de contatos com DataTable, EntityDrawer,
  criacao manual, arquivamento e vinculo ao Atendimento.
- [x] Normalizar telefones brasileiros com equivalencia entre celulares de oito
  e nove digitos; preservar outro DDI com diagnostico sem quebrar a ingestao.
- [x] Aplicar remotamente a migration de contatos apos preflight de duplicatas
  canonicas; probes transacionais validaram CRUD, equivalencia 8/9,
  arquivamento/reativacao e isolamento entre organizacoes.
- [x] Implementar localmente o modulo de etiquetas com nome, cor hexadecimal,
  descricao e vinculo de contatos por ID.
- [x] Aplicar remotamente a migration normalizada de etiquetas e validar
  backfill, CRUD, RLS e vinculos entre contatos e etiquetas.
- [ ] Fazer QA visual autenticado do modulo de contatos em desktop/mobile.
- [ ] Migrar equipe/convites; manter composer, upload e acoes operacionais fora
  do padrao de cadastro.

## FUTURO - M3 Inteligencia De Negocio

Bloqueado pela auditoria da plataforma e disponibilidade dos dados.

- [ ] Criar modelo normalizado de produto, estoque, pedido e cliente.
- [ ] Implementar importacao por planilha ou API confirmada.
- [ ] Entregar digest diario e alertas de estoque.
- [ ] Entregar recompra com aprovacao humana e ciclo configuravel.
- [ ] Medir conversao e recomendacoes de produto.

## FUTURO - M4 Comercial

- [ ] Checkout e cobranca reais.
- [ ] Convites e gestao completa de membros.
- [ ] Templates manuais por rotina validada.
- [ ] Observabilidade, auditoria e runbooks.
- [ ] Onboarding repetivel para novos pilotos.

## Descobertas

- PDF escaneado ainda nao tem OCR; DOCX textual agora possui extracao.
- O download e a exclusao completa de documentos precisam de novo smoke test.
- Tipos Supabase oficiais foram regenerados apos estabilizacao do schema;
  providers/status textuais agora sao validados nas fronteiras de dominio.
- `roteiro-de-validacao-rag.md` foi removido do corpus remoto antes do
  benchmark; manter gabaritos e artefatos de avaliacao fora da base indexada.
- O MCP Supabase conectado nao expoe Storage API: nao excluir documentos por
  SQL direto, pois o banco bloqueia essa operacao para evitar objeto orfao.
  Usar DELETE autenticado do BEM HUB ou credencial server-side de Storage.
- A migration `20260712160034_harden_tenant_security_functions.sql` foi
  aplicada remotamente; o proximo passo e validar isolamento com dois usuarios
  reais e registrar os advisories que ainda permanecerem.
- Advisors corretos de 2026-08-08: as unicas funcoes `SECURITY DEFINER`
  sinalizadas sao RPCs autenticadas intencionais, com `search_path` vazio,
  `anon` revogado e guardas de admin/owner. Performance aponta quatro FKs sem
  indice em Atendimento/midia; planejar nova migration antes de ampliar o
  trafego desse modulo.
- Os 57 testes pgTAP de hardening estao prontos, mas exigem Docker/Supabase local
  para execucao completa; contratos criticos tambem foram validados por SQL
  transacional no remoto.
- Migrations de indices, runs manuais e consolidacao RLS foram aplicadas
  remotamente. Advisors agora reportam zero foreign keys sem indice, zero
  initplans de Auth e zero policies permissivas sobrepostas.
- Finalizacao do chat persiste resposta, atividade e uso atomicamente; falhas de
  stream ou persistencia geram telemetria `chat.failed` sem conteudo sensivel.
- Gestao de equipe lista perfis do mesmo tenant, altera papel e remove acesso;
  owner permanece imutavel e pgTAP possui 70 assertions preparadas.
- Catalogos possuem versao ativa atomica; historico permanece auditavel, mas
  chunks substituidos nao entram mais na recuperacao RAG.
- Advisor sinaliza `add_organization_member_by_email` como `SECURITY DEFINER`
  executavel por authenticated; e intencional para consultar `auth.users`, com
  admin/tenant/papel/limite/owner validados dentro da RPC e anon revogado.
- Uazapi comprovou o fluxo real inicial. Z-API foi pausada para novas
  configuracoes, preservando somente compatibilidade legada. Wuzapi completou o
  smoke local original e o novo provisionamento gerenciado chegou até conexão,
  envio e callback público verificado; falta repetir a entrada direta 1:1 após
  o reparo do tunnel. Evolution API `2.3.7` já foi subida com Postgres/Redis,
  pareada e validada na primeira saída; resposta na mesma conversa,
  entrega/leitura, envio pelo aparelho e persistência após reinício continuam
  pendentes no smoke comparativo.
- O contrato novo de multimídia usa data URL apenas na fronteira interna de
  entrega. O browser não recebe credenciais do fornecedor e a persistência
  definitiva de binários continua bloqueada até a migration de Storage/RLS.

## Concluido

- [x] Auth, organizacao e bootstrap multi-tenant.
- [x] Assistants CRUD e selecao de provider/modelo.
- [x] Chat persistente com streaming e limites.
- [x] Conexoes organizacionais de IA com chaves criptografadas.
- [x] Ingestao TXT, Markdown e PDF textual com embeddings.
- [x] Busca semantica manual e exclusao de documentos.
- [x] Fundacao de billing e troca manual de plano.
- [x] Seis automacoes manuais previstas no MVP, incluindo analise CSV/TSV.
