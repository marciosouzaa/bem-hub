## Context

Atendimento hoje possui inbox master-detail, filtros locais, contadores de nao lidas, envio otimista de texto, envio/recebimento de midia via Storage privado, reply outbound, menu de mensagem com algumas acoes desabilitadas, retry, entrega/leitura separada e adapters Wuzapi/Evolution.

Estado operacional registrado em `docs/worklog.md` e `docs/handoff.md`: faltam smoke real completo, reply inbound com payload real, reacoes, gravacao de audio, edicao/exclusao com contrato seguro, QA visual autenticado, departamentos e base para triagem por assistente.

As regras do repo continuam mandatorias: toda entidade de negocio leva `organization_id`, RLS e server-side checks; browser nao recebe segredo de provider; envio automatico para cliente real exige validacao posterior explicita.

## Goals / Non-Goals

**Goals:**

- Transformar lacunas do Atendimento em plano executavel por fatias pequenas.
- Separar recursos locais de produto dos recursos dependentes de Wuzapi/Evolution.
- Preparar schema e UI para departamentos, canal com departamento padrao e assistente padrao por departamento.
- Manter IA futura em modo de elegibilidade/rascunho, sem envio automatico.
- Definir verificacao antes de declarar modulo fechado.

**Non-Goals:**

- Escolher provider principal de WhatsApp.
- Enviar resposta automatica para contatos reais.
- Prometer suporte remoto a editar/apagar mensagem se o provider nao suportar ou nao for confiavel.
- Reescrever Atendimento fora dos padroes atuais de `src/features/support`.
- Publicar deploy ou aplicar migration remota destrutiva como parte da proposta.

## Decisions

### 1. Planejar em camadas, nao em uma mega-entrega

Implementar em ordem:

1. Inventario e matriz de validacao do que ja existe.
2. Paridade local da inbox: fixar, marcar como nao lido, filtro dedicado e som.
3. Departamentos e defaults de canal/departamento.
4. Acoes de mensagem que nao dependem de provider remoto.
5. Provider-dependent: reply inbound, reacoes, edicao/exclusao remota se viavel.
6. Base para rascunho/triagem IA sem envio automatico.

Racional: reduz risco em modulo que ja toca webhook, Storage, RLS, Realtime e UI diaria. Alternativa seria implementar tudo de uma vez, mas isso mistura UX local com instabilidade de provider e dificulta validar regressao.

### 2. Estado por operador para nao lidas, fixados e som

Adicionar estado por usuario/operador, separado do estado global da conversa:

- leitura do operador;
- conversa fixada pelo operador;
- marca manual de nao lida;
- preferencia local/usuario de notificacao sonora.

Racional: WhatsApp-like para cada atendente sem alterar leitura de outro usuario nem delivery/read receipt do provider. Alternativa global seria mais simples, mas quebraria fila com varios operadores.

### 3. Departamentos como entidade tenant-scoped

Criar departamentos por organizacao e vincular:

- `channel_connections.default_department_id`;
- `support_conversations.department_id`;
- `support_departments.default_assistant_id` opcional.

Racional: todo atendimento precisa cair em uma equipe antes de IA ou humano decidir fluxo. Canal com default evita atendimento sem departamento quando contato inicia conversa. Alternativa de usar tags/assignee nao representa equipe, default de canal nem futura triagem.

### 4. Acoes de mensagem com fallback explicito

Editar/apagar devem ter dois niveis:

- local/auditavel no BEM HUB;
- remoto no WhatsApp somente se provider e contrato suportarem.

Racional: garante produto usavel sem mentir que mensagem sumiu no WhatsApp. Alternativa de esconder recurso ate provider completo atrasa correcoes locais; alternativa de apagar fisicamente perde auditoria.

### 5. Provider-dependent precisa de fixture real antes de "done"

Reply inbound, reacoes, messages_update real, edicao/exclusao remota e midias em ambos providers exigem:

- payload sanitizado real;
- fixture de adapter;
- teste de contrato;
- smoke real em canal separado.

Racional: historico mostra que envelopes reais diferem do esperado. Alternativa de codar por documentacao ou palpite causou lacunas em reply inbound.

### 6. IA futura preparada como metadado e rascunho, nao automacao

Atendimento novo pode carregar `department_id`, `default_assistant_id` e elegibilidade para triagem. A primeira resposta automatica fica fora desta change; maximo permitido na aplicacao futura e rascunho/assistido ate periodo de validacao.

Racional: preserva controle humano, LGPD/consentimento e qualidade. Alternativa de auto-send agora viola gate de produto.

## Risks / Trade-offs

- [Risk] Mais tabelas e RPCs aumentam superficie RLS. Mitigation: criar migrations pequenas, pgTAP ou probes transacionais, indices FK e teste cross-tenant.
- [Risk] Notificacao sonora pode irritar operador. Mitigation: preferencia por usuario/navegador, tocar somente em eventos elegiveis, sem som para sync/historico/proprias mensagens.
- [Risk] Provider nao suporta editar/apagar/reagir com paridade total. Mitigation: fallback local claro, capability matrix por provider e UI sem prometer operacao remota.
- [Risk] Departamento obrigatorio pode bloquear ingresso se canal nao tiver default. Mitigation: estado "roteamento pendente" visivel e tarefa para admin corrigir default.
- [Risk] IA de triagem pode virar automacao prematura. Mitigation: persistir somente elegibilidade/assistente padrao; envio automatico exige outra change e validacao humana.

## Migration Plan

1. Criar migration local para departamentos, defaults, estado por operador e indices FK. Todas as novas tabelas/colunas com `organization_id` quando entidade de negocio.
2. Adicionar RLS para leitura por membro e gestao por admin/owner quando aplicavel.
3. Atualizar RPCs `get_support_inbox_operational`, `get_support_conversation` e actions server-side para retornar campos novos sem quebrar clientes antigos.
4. Implementar UI com fallbacks: se departamento ausente, mostrar roteamento pendente; se preferencia de som ausente, padrao silencioso ou configuravel.
5. Aplicar em remoto somente depois de lint/build/testes locais e revisao de SQL.
6. Rollback funcional: desabilitar UI nova por fallback/feature flag local e manter colunas/tabelas sem uso ate migration corretiva. Nao remover migration aplicada.

## Open Questions

- Qual nomenclatura final do produto: "Departamento", "Equipe" ou ambos? A proposta assume departamentos/equipes como mesmo conceito, com label de UI decidivel depois.
- Notificacao sonora deve persistir por usuario no banco ou iniciar em localStorage? A especificacao exige controle por usuario; primeira fatia pode usar localStorage se nao afetar regra server-side.
- Edicao/exclusao remota sera suportada por ambos Wuzapi/Evolution ou ficara local por provider? A matriz de provider resolve antes de implementar operacao remota.
