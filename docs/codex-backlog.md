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

## BLOQUEADO - M0 Hardening Para Dados Reais

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
- [ ] Verificar com dois usuarios reais: tabelas, RPC, Storage e URL assinada.
- [ ] Ativar protecao contra senha vazada no Supabase Auth ou registrar o bloqueio
  operacional caso a configuracao dependa do painel.

Aceite: usuario A nao le, busca, baixa, altera ou remove dados da organizacao B;
roles anonimas nao executam funcoes internas; lint e build passam.

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
- [ ] Cobrir casos literal, multi-chunk, ambiguo e sem resposta.
- [ ] Executar o benchmark externo sem indexar arquivos de resposta esperada.
- [ ] Fazer smoke test com historico recarregado e mais de uma organizacao.

Aceite: respostas fundamentadas citam documentos corretos; perguntas sem
evidencia nao inventam resposta; nenhuma busca atravessa organizacoes.

## PROXIMO - M1 Onboarding Do Piloto

Objetivo: permitir que uma dona e sua equipe alcancem valor em menos de 15
minutos sem configuracao tecnica recorrente.

- [x] Definir checklist de configuracao do assistente de catalogo.
- [ ] Importar catalogo e tabela de precos do piloto.
- [ ] Permitir convite ou inclusao segura das tres funcionarias.
- [x] Criar estado inicial e orientacao contextual curta dentro do fluxo real.
- [x] Instrumentar ativacao, uso diario e perguntas sem resposta.
- [ ] Registrar auditoria da plataforma de loja, API, PDV e planilhas.

Aceite: equipe acessa o workspace isolado, encontra o assistente correto e faz a
primeira pergunta util sem ajuda do engenheiro.

## FUTURO - M2 Atendimento Assistido

Bloqueado pelo gate de escolha do provedor WhatsApp e credenciais.

- [ ] Definir contrato independente de provedor para canal de mensagens.
- [ ] Implementar webhook seguro, idempotente e observavel.
- [ ] Criar fila de rascunhos, aprovacao, edicao, envio e escalada.
- [ ] Registrar auditoria e metricas de resolucao.
- [ ] Validar duas semanas em modo assistido antes de automatizar.

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

- DOCX ainda nao tem parser e PDF escaneado ainda nao tem OCR.
- O download e a exclusao completa de documentos precisam de novo smoke test.
- Foreign keys sem indice e policies permissivas ainda geram advisors.
- Tipos Supabase devem ser regenerados quando o schema estabilizar.
- O PDF do piloto considera RAG pronto, mas o chat ainda nao recupera nem exibe fontes.
- `roteiro-de-validacao-rag.md`, se ainda indexado no ambiente remoto, deve ser
  removido antes do benchmark porque contem respostas esperadas.
- A migration `20260712160034_harden_tenant_security_functions.sql` foi
  aplicada remotamente; o proximo passo e validar isolamento com dois usuarios
  reais e registrar os advisories que ainda permanecerem.
- Os 29 testes pgTAP de hardening estao prontos, mas exigem Docker/Supabase local
  ou credencial de banco remoto para execucao.
- A migration `20260712215654_add_foreign_key_indexes.sql` corrige localmente
  os foreign keys sem indice; aplicacao remota e novo advisor permanecem como
  operacoes externas, sem bloquear desenvolvimento local.

## Concluido

- [x] Auth, organizacao e bootstrap multi-tenant.
- [x] Assistants CRUD e selecao de provider/modelo.
- [x] Chat persistente com streaming e limites.
- [x] Conexoes organizacionais de IA com chaves criptografadas.
- [x] Ingestao TXT, Markdown e PDF textual com embeddings.
- [x] Busca semantica manual e exclusao de documentos.
- [x] Fundacao de billing e troca manual de plano.
- [x] Seis automacoes manuais previstas no MVP, incluindo analise CSV/TSV.
