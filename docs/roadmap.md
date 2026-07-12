# BEM HUB Product Roadmap

Atualizado em 2026-07-12 a partir do estado real do repositorio, do backlog e do
roadmap do piloto de cosmeticos apresentado em
`bemhub-roadmap-mvp - Google Slides.pdf`.

## Direcao

O BEM HUB continua sendo um workspace operacional de IA para PMEs. O piloto de
cosmeticos e o primeiro recorte vertical para provar valor: comecar pelo
assistente interno, evoluir para atendimento assistido no WhatsApp e, apenas
depois de validar uso e dados, adicionar inteligencia comercial.

O PDF considera "chat com IA + RAG" como base pronta. O repositorio confirma
chat, ingestao, embeddings e busca semantica, mas ainda nao conecta recuperacao
ao chat nem apresenta fontes. Este roadmap usa o codigo como fonte da verdade e
mantem RAG com citacoes como o proximo marco de produto.

## Ordem De Execucao

1. Proteger dados e isolamento antes de usar dados reais de clientes.
2. Concluir o marco ativo antes de iniciar o seguinte.
3. Entregar uma fatia vertical utilizavel e mensuravel, nao apenas infraestrutura.
4. Validar o resultado com usuarios antes de automatizar ou ampliar o canal.
5. Adiar integracoes que nao sejam necessarias para provar o marco atual.

## M0 - Fundacao Confiavel

Status: em andamento. A base funcional existe; o hardening de seguranca ainda
impede considerar o produto pronto para dados sensiveis reais.

- [x] Autenticacao, organizacoes, membros e RLS por `organization_id`.
- [x] Assistentes por organizacao com gestao owner/admin.
- [x] Chat com streaming, historico e eventos de uso.
- [x] Conexoes de OpenAI, Anthropic e Gemini com chaves criptografadas.
- [x] Upload, extracao, chunks, embeddings e busca semantica.
- [x] Entitlements e troca manual de plano no servidor.
- [x] Preparar hardening de funcoes `SECURITY DEFINER` e permissoes de execucao.
- [ ] Verificar isolamento de tabelas, RPCs e Storage com dois usuarios reais.
- [ ] Ativar protecao contra senha vazada no Supabase Auth.
- [ ] Fechar alertas de seguranca que bloqueiem uso de dados reais.

Criterio de saida: nenhum caminho conhecido permite leitura ou mutacao entre
organizacoes, e os testes essenciais passam em ambiente configurado.

## M1 - Assistente Interno De Catalogo

Status: em andamento. Equivale a Fase 1 do roadmap do piloto.

- [x] Recuperar chunks relevantes antes de cada resposta do chat.
- [x] Injetar contexto com limites claros e sem vazar outra organizacao.
- [x] Exibir fontes por resposta e persistir metadata suficiente para historico.
- [x] Responder que nao ha contexto suficiente quando a evidencia for fraca.
- [ ] Validar o pipeline com `docs/benchmarks/benchmark-rag.*`.
- [ ] Preparar assistente de catalogo com linguagem configuravel da marca.
- [ ] Organizar onboarding guiado para dona e equipe em menos de 15 minutos.
- [ ] Medir uso por organizacao e frequencia do assistente.
- [ ] Auditar plataforma de e-commerce, estoque e origem dos dados do piloto.

Criterio de sucesso: a dona ou uma funcionaria usa o assistente ao menos uma vez
por dia, encontra respostas confiaveis no catalogo e nao precisa de suporte
tecnico recorrente.

## M2 - Atendimento Assistido No WhatsApp

Status: planejado. Equivale a Fase 2 do PDF e comeca somente apos M1 validado.

Gate de produto: escolher Evolution API, Z-API ou outro BSP, definir custos,
termos e credenciais. A integracao deve ficar atras de um adapter de canal para
evitar acoplamento do dominio ao fornecedor.

- [ ] Receber mensagens por webhook com verificacao de autenticidade e idempotencia.
- [ ] Modelar contatos e conversas externas com isolamento por organizacao.
- [ ] Gerar rascunho usando catalogo, preco, disponibilidade e tom da marca.
- [ ] Criar modo assistido: aprovar, editar ou escalar antes de enviar.
- [ ] Escalar reclamacao, devolucao, pagamento e baixa confianca para humano.
- [ ] Registrar trilha de auditoria de entrada, resposta, aprovacao e envio.
- [ ] Exibir painel simples de resolvidas, pendentes e escaladas.
- [ ] Liberar modo automatico somente depois do periodo de validacao.

Criterio de sucesso: pelo menos 60% das perguntas elegiveis sao resolvidas sem
intervencao humana, com qualidade e tempo economizado medidos.

## M3 - Inteligencia De Negocio Para Varejo

Status: condicionado a auditoria do M1 e a dados confiaveis da loja.

Gate de produto: confirmar plataforma da loja e acesso a pedidos, estoque e
clientes. Se nao houver API, validar primeiro com importacao estruturada de
planilha antes de criar um conector permanente.

- [ ] Implementar conector inicial para a plataforma confirmada.
- [ ] Normalizar pedidos, produtos, estoque e clientes no dominio BEM HUB.
- [ ] Entregar digest diario de vendas, metas, top produtos e estoque critico.
- [ ] Criar agente de recompra com ciclo configuravel, inicialmente 55 dias.
- [ ] Exigir aprovacao humana antes de campanhas de recompra.
- [ ] Recomendar upsell e cross-sell com base em historico e contexto atual.
- [ ] Agendar execucoes com idempotencia, observabilidade e limites de plano.
- [ ] Medir conversao atribuivel sem confundir correlacao com causalidade.

Criterio de sucesso: pelo menos 10% dos clientes que recebem uma acao de
recompra validada voltam a comprar no mes.

## M4 - MVP Comercial Repetivel

Status: planejado. Consolida o piloto em produto vendavel para mais empresas.

- [ ] Onboarding repetivel e configuracao inicial em ate um dia.
- [ ] Convites e administracao de membros completos.
- [ ] Checkout, cobranca real, historico e trilha de alteracoes de plano.
- [ ] Templates de automacao manual validados por rotina.
- [ ] Observabilidade de custo, latencia, erros e qualidade de resposta.
- [ ] Auditoria operacional basica para administradores.
- [ ] Runbooks de suporte, backup, incidentes e recuperacao.
- [ ] Tres pilotos pagantes ou compromisso formal equivalente.

Criterio de saida: o produto pode ser configurado, operado, cobrado e suportado
de forma repetivel sem depender do engenheiro para cada uso.

## Decisoes Que Exigem Intervencao Humana

- Fornecedor e numero de WhatsApp Business.
- Plataforma de e-commerce prioritaria apos a auditoria.
- Alteracao de precos, planos ou promessa comercial.
- Envio automatico de mensagens para clientes reais.
- Tratamento juridico de consentimento, retencao e exclusao de dados pessoais.

Esses gates nao impedem trabalho local preparatorio quando contratos, adapters,
testes e documentacao puderem avancar sem assumir a decisao.
