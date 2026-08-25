## Why

O modulo de Atendimento ja envia e recebe texto e midia, mas ainda tem lacunas de fechamento operacional: validacao ponta a ponta, acoes de mensagem incompletas, paridade esperada de mensageiro, roteamento por equipe e base para primeiro atendimento assistido por IA.

Esta change organiza o plano para deixar Atendimento confiavel para uso diario, sem misturar decisoes futuras de envio automatico, provider principal ou API nao oficial de WhatsApp com recursos de produto que podem ser especificados agora.

## What Changes

- Validar recursos existentes do Atendimento com matriz clara: responder, copiar, baixar, enviar/receber texto, enviar/receber imagem, video, audio e documento, reply inbound/outbound, entrega/leitura, retry, isolamento de Storage e comportamento com dois tenants.
- Completar o ciclo de acoes de mensagem: excluir/apagar quando seguro, editar quando suportado pelo contrato do produto, normalizar reacoes recebidas/enviadas, gravar audio no composer e manter fallback quando provider nao suportar uma operacao.
- Adicionar paridade operacional da inbox: filtro de nao lidas, contador de nao lidas no card, fixar atendimento, marcar atendimento como nao lido, ordenacao considerando fixados/nao lidos e notificacao sonora controlada por usuario.
- Adicionar regras de notificacao: tocar som somente para novo atendimento sem responsavel ou atendimento atribuido ao usuario atual; nao tocar para conversas de outro atendente, eventos historicos, mensagens proprias ou sincronizacao.
- Introduzir departamentos/equipes no Atendimento: cada atendimento deve ter departamento; cada canal pode ter departamento padrao; cada departamento pode ter assistente IA padrao para futura triagem.
- Preparar primeiro atendimento por IA sem ativar automacao: conversas novas sem atendente podem carregar departamento, assistente padrao e estado de elegibilidade para rascunho/triagem futura, mantendo envio automatico fora do escopo.
- Registrar backlog tecnico separado para dependencias de provider/API WhatsApp nao oficial: payload real de reply inbound, reacoes, edicao/exclusao remotas, recibos reais e estabilidade Wuzapi/Evolution.

## Capabilities

### New Capabilities
- `support/message-operations`: contratos e comportamento esperado para responder, editar, apagar, reagir, gravar audio, enviar/receber midias, lidar com fallback de provider e validar isolamento.
- `support/inbox-parity`: comportamento da inbox com nao lidas, fixados, marcar como nao lido, filtros, contadores e notificacoes sonoras por atribuicao.
- `support/department-routing`: departamentos/equipes obrigatorios para atendimentos, departamento padrao por canal e assistente IA padrao por departamento para triagem futura.

### Modified Capabilities
- Nenhuma. OpenSpec ainda nao possuia specs existentes neste repo.

## Impact

- Codigo afetado: `src/features/support/*`, `src/app/app/support/*`, `src/app/api/support/*`, `src/features/channels/*`.
- Banco afetado em fases futuras: `support_conversations`, `support_messages`, `support_message_attachments`, `support_message_reactions`, `channel_connections`, novas tabelas/colunas de departamentos, leitura por operador, fixacao e preferencias de notificacao.
- Supabase: novas migrations tenant-scoped com `organization_id`, RLS, indices FK, RPCs ou services server-side para acoes operacionais.
- UI: inbox master-detail, composer, thread, menu de mensagem, filtros, badges, preferencia de som e administracao de departamentos.
- Integracoes: Wuzapi/Evolution seguem atras de adapters; qualquer operacao dependente de API nao oficial deve ter fallback explicito e teste de contrato antes de smoke real.
- Verificacao: `bun run test:whatsapp-contracts`, testes focados de Atendimento, `bun run lint`, `bun run build`, smoke real Wuzapi/Evolution e teste manual multi-tenant quando credenciais existirem.
