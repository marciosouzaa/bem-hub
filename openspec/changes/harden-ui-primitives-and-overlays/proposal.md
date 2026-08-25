## Why

UI de base ainda permite desvios por componente: o menu do usuario usa
`details`/`summary` e painel absoluto, causando conflito de z-index com a
topbar. O mesmo risco aparece em outros pontos quando HTML cru, `z-index`
arbitrario, confirmacoes nativas e arquivos client grandes substituem
primitives globais.

## What Changes

- Padronizar a pilha de overlays com layers semanticos para shell, dropdown,
  popover, dialog, drawer e futuros toasts.
- Migrar menus operacionais para primitives portalizados baseados em Radix,
  com foco, Escape, clique externo e posicionamento consistente.
- Eliminar o menu manual do usuario e corrigir o caso visivel de baixa
  prioridade de z-index.
- Identificar e priorizar extracoes de componentes globais para alerts,
  status, celulas de identidade, detalhes, confirmacoes e controles de
  formulario.
- Definir limite pratico para componentizacao: quebrar arquivos grandes por
  responsabilidade de produto, sem criar um componente universal monolitico.
- Preservar regras de negocio no servidor; primitives nao passam a conhecer
  tenant, permissao, billing ou transicoes de dominio.

## Capabilities

### New Capabilities

- `ui-primitives-and-overlays`: comportamento padrao para overlays,
  primitives globais e limites de componentizacao da UI do workspace.

### Modified Capabilities

- None.

## Impact

- Afeta `src/components/ui`, `src/components/app` e componentes de feature que
  usam menus, drawers, dialogs, alerts, tabelas, formularios e cards
  operacionais.
- Sem mudanca de API publica, banco, RLS, billing ou contratos de canal.
- Verificacao esperada: `bun run lint`, `bun run build` e QA visual do menu do
  usuario/topbar em desktop e mobile.
