# Padroes de engenharia frontend

Este documento define como telas, componentes e fluxos CRUD devem ser
construidos no BEM HUB. Ele complementa `docs/design-system.md`: o design system
define aparencia e experiencia; este documento define composicao, arquivos,
responsabilidades e contratos reutilizaveis.

## Objetivos

- Manter a interface consistente sem criar componentes monoliticos.
- Preservar contexto enquanto o usuario consulta, cria ou edita registros.
- Reduzir toolbars, botoes repetidos e ruido visual.
- Priorizar Server Components e limitar JavaScript no cliente.
- Tornar estados de carregamento, erro, vazio e permissao previsiveis.
- Permitir evolucao por dominio sem um diretorio global de tipos ou services.

## Principios

1. **Composicao antes de configuracao excessiva.** Um componente compartilhado
   possui contrato pequeno. Slots e subcomponentes sao preferiveis a dezenas de
   flags que alteram completamente seu comportamento.
2. **Server por padrao, client na folha.** Paginas carregam dados no servidor;
   apenas tabela, drawer, filtros e controles interativos entram no bundle do
   cliente.
3. **Dominio perto do uso.** Schemas, contratos, queries, actions e componentes
   especificos vivem dentro de `src/features/<dominio>`.
4. **Primitivo nao conhece negocio.** `DataTable`, `Drawer` e `Dropdown` nao
   validam permissao, tenant, plano ou transicao de estado.
5. **Estado real, nao vazio enganoso.** Falha, ausencia de permissao e zero
   registros sao estados diferentes.
6. **Extrair responsabilidade, nao quantidade de JSX.** Dividir um arquivo deve
   produzir nomes e contratos de negocio claros.
7. **Abstrair depois de provar.** Padrao repetido em dois dominios pode virar
   candidato. Generalizacao ampla exige tres usos consistentes.

## Arquitetura de arquivos

### Rotas

`page.tsx` e `layout.tsx` permanecem Server Components. Uma pagina deve:

- validar sessao e contexto da organizacao;
- carregar dados independentes em paralelo;
- tratar falha primaria pelo boundary da rota;
- passar somente props serializaveis;
- compor a feature sem conter formulario, tabela ou regra de negocio extensa.

Exemplo:

```text
src/app/app/contacts/
  page.tsx
  loading.tsx
  error.tsx
```

### Feature

```text
src/features/contacts/
  contracts.ts
  schemas.ts
  queries.ts
  actions.ts
  mappers.ts                 # somente quando ha formatos externos distintos
  components/
    contacts-workspace.tsx   # coordenacao client da tela
    contacts-table.tsx
    contact-columns.tsx
    contact-editor-drawer.tsx
    contact-form.tsx
    contact-general-section.tsx
  hooks/
    use-contact-editor.ts     # somente se estado for reutilizado/complexo
```

Regras:

- Nomes de arquivo sao descritivos em `kebab-case`.
- Nao criar arquivos genericos chamados `component.tsx`.
- Um arquivo exporta um componente principal. Helpers privados pequenos podem
  permanecer nele.
- Props locais ficam junto do componente. Contratos de dominio ou de API ficam
  em `contracts.ts`.
- Evitar barrel `index.ts` atravessando fronteiras server/client. Imports
  explicitos tornam o bundle e a dependencia visiveis.
- `src/components/ui` contem primitives sem negocio.
- `src/components/app` contem layouts e padroes usados por varios dominios.
- `src/features` contem UI e regras especificas do produto.

### Fluxo de dados

```text
page.tsx (server)
  -> query/server service
  -> props serializaveis
  -> workspace client pequeno
      -> DataTable controlada
      -> EntityDrawer controlado
      -> server action validada
```

- Tabela nao busca dados sozinha.
- Drawer nao decide autorizacao.
- Action revalida input com Zod e permissao no servidor.
- UI pode ocultar acao indisponivel, mas o servidor continua sendo autoridade.
- Server-only modules devem usar `server-only` quando carregarem segredo ou
  cliente privilegiado.

## Orcamento de tamanho

Limites sao gatilhos de design, nao incentivo para fragmentacao artificial.

| Tipo de arquivo | Alvo | Revisao obrigatoria | Direcao de divisao |
| --- | ---: | ---: | --- |
| `page.tsx` / `layout.tsx` | ate 100 | acima de 150 | mover feature e carregamento auxiliar |
| Primitive de UI | ate 180 | acima de 250 | subcomponentes, hook de comportamento, tipos |
| Componente de feature | ate 200 | acima de 300 | secoes, tabela, drawer, controller |
| Workspace/controller client | ate 220 | acima de 320 | hooks por caso de uso e paineis independentes |
| Formulario | ate 180 | acima de 280 | `FormSection` por grupo de campos |
| Hook | ate 120 | acima de 180 | separar estado, efeito e adaptacao |
| Query/action/service | ate 220 | acima de 320 | dividir por leitura, mutacao ou caso de uso |
| Schema, contratos ou colunas | ate 160 | acima de 240 | dividir por agregado/capacidade |
| Teste | ate 300 | acima de 450 | dividir por comportamento |

Excecoes: tipos gerados, migrations, fixtures volumosas e artefatos externos.
Esses arquivos nao justificam componentes manuais grandes.

Regras complementares:

- Linha de codigo: alvo de 100 caracteres; quebras automaticas podem exceder em
  URLs, tipos e strings que perderiam legibilidade.
- Funcao: alvo de 40 linhas; revisar responsabilidade acima de 60.
- JSX: evitar mais de quatro niveis conceituais. Extrair secoes nomeadas quando
  a hierarquia esconder a intencao.
- Componente com mais de cinco estados `useState` relacionados deve avaliar
  reducer ou hook de caso de uso.
- Arquivo acima do limite deve ser justificado no review ou dividido antes de
  receber novas responsabilidades.

## Padrao de listagem

Telas de registros usam:

1. `PageHeader` com titulo, descricao curta e no maximo uma acao primaria.
2. `DataTableControlBar` com busca, filtros essenciais e overflow de opcoes da
   lista.
3. `DataTable` com acoes por registro em dropdown.
4. `EntityDrawer` lateral direito para novo e editar.
5. `ConfirmDialog` para destruicao ou mudanca irreversivel.

Nao repetir cards de resumo antes de toda tabela. KPI so aparece quando muda uma
decisao operacional naquela tela.

## DataTable BEM HUB

### Contrato

A tabela compartilhada deve suportar inicialmente:

- colunas tipadas;
- ID estavel por registro;
- ordenacao controlada local ou server-side;
- busca e filtros controlados;
- paginacao controlada;
- click de linha;
- dropdown de acoes por linha;
- loading com skeleton;
- vazio com proxima acao;
- erro com tentativa novamente;
- cabecalho fixo;
- prioridade responsiva de colunas.

Capacidades posteriores, somente com caso real:

- selecao e acao em massa;
- redimensionamento;
- reordenacao por drag;
- virtualizacao;
- colunas configuraveis pelo usuario.

O componente nao deve nascer com todas essas capacidades. Cada uma aumenta
estado, acessibilidade e combinacoes de teste.

Base tecnica escolhida:

- [`@tanstack/react-table`](https://tanstack.com/table/latest/docs/framework/react/react-table)
  como engine headless de colunas, linhas, ordenacao e estado;
- markup, tokens, responsividade e interacao pertencem ao BEM HUB;
- `ColumnDef<T>` pode receber metadata BEM para alinhamento e prioridade, sem
  criar uma segunda engine de tabela;
- virtualizacao nao entra na dependencia inicial; adicionar apenas quando uma
  medicao provar a necessidade.

### Arquivos internos

```text
src/components/ui/data-table/
  data-table.tsx
  data-table-types.ts
  data-table-header.tsx
  data-table-row.tsx
  data-table-state.tsx
  data-table-pagination.tsx
  row-actions-menu.tsx
  use-data-table.ts             # somente quando a coordenacao justificar
```

Nenhum desses arquivos deve concentrar busca, drag, virtualizacao, dropdown,
paginacao e renderizacao completa em um unico componente.

### Acoes limpas

- A ultima coluna possui largura fixa de `44px` para `MoreHorizontal`.
- O gatilho fica discreto, mas aparece em hover, foco e linha selecionada.
- A linha inteira abre o fluxo principal: editar quando permitido; visualizar
  quando o usuario so possui leitura.
- Dropdown agrupa acoes normais primeiro e destrutivas depois de separador.
- Icone e texto sao obrigatorios no menu; perigo nao depende so de cor.
- Nao renderizar botoes `Editar`, `Excluir`, `Ativar` e `Duplicar` lado a lado.
- Acoes em massa aparecem em barra contextual somente depois da selecao.
- A barra fixa da tabela contem no maximo busca, filtros, acao primaria e um
  overflow da lista. Recursos raros ficam no overflow.

### Assinatura visual

A tabela deve parecer BEM HUB, sem sacrificar leitura:

- superficie unica e calma, sem cards dentro de cards;
- somente divisores horizontais de baixo contraste;
- cabecalho `12px`, muted, sticky e sem fundo contrastante pesado;
- linhas entre `48px` e `56px`;
- primeira coluna ancora identidade com icone/avatar, titulo e metadado curto;
- status usa texto e semantica existente;
- hover eleva contraste, nao escala a linha;
- sem zebra striping por padrao;
- `signal edge` opcional: trilho de `2px` na borda esquerda apenas para estado
  que exige atencao, processamento, falha ou saude. Linha normal nao recebe cor;
- foco por teclado contorna a linha e revela o menu;
- numeros, datas e IDs podem usar Geist Mono quando isso reduzir ambiguidade.

O `signal edge` e a assinatura diferencial. Ele comunica estado operacional e
nao vira decoracao repetida.

### Busca, filtro e paginacao

- Busca aplica apos debounce de `300--400ms` e no Enter.
- Busca server-side, ordenacao, pagina e filtros relevantes ficam na URL quando
  o retorno do navegador ou compartilhamento precisarem preservar estado.
- Filtros ativos aparecem como chips removiveis; filtros avancados abrem popover
  ou drawer estreito, nao uma segunda toolbar.
- Tabelas administrativas usam paginacao explicita ou cursor com
  anterior/proximo. Infinite scroll fica reservado para conversas, timelines e
  feeds onde continuidade temporal e a tarefa principal.
- Virtualizacao entra apenas apos medicao de volume/renderizacao.

### Responsividade

- Colunas recebem prioridade `primary`, `secondary` ou `optional`.
- Mobile preserva identidade, status e acao. Colunas opcionais somem primeiro.
- Scroll horizontal e aceito quando comparar colunas for a tarefa principal;
  nao transformar automaticamente toda tabela em cards.
- Alvos interativos mantem `44px` onde possivel.

## Editor lateral de registros

Todo fluxo de **novo registro** e **editar registro** abre no lado direito por
meio de `EntityDrawer`. Dialog central fica reservado para confirmacao,
destruicao, escolha curta ou aviso bloqueante.

`EntityDrawer` usa
[`@radix-ui/react-dialog`](https://www.radix-ui.com/primitives/docs/components/dialog)
como base de foco, semantica, portal e teclado. `RowActionsMenu` usa
[`@radix-ui/react-dropdown-menu`](https://www.radix-ui.com/primitives/docs/components/dropdown-menu).
O estilo e os contratos publicos continuam sendo do BEM HUB.

### Anatomia

```text
┌──────────────────────────────┐
│ Titulo                  [x]  │  header fixo
│ contexto curto               │
├──────────────────────────────┤
│ Secao                        │
│ campos                       │  corpo com scroll
│                              │
├──────────────────────────────┤
│ Cancelar      Salvar         │  footer fixo
└──────────────────────────────┘
```

- Abre da direita; nunca da esquerda para cadastro.
- Desktop: `420px` pequeno, `520px` padrao, `680px` formulario complexo.
- Mobile: ocupa a viewport e preserva header/footer.
- `Novo <entidade>` e `Editar <entidade>` usam a mesma composicao e schema.
- O primeiro campo invalido recebe foco no submit.
- Fechamento restaura foco no gatilho.
- Escape, overlay, X e Cancelar passam por `requestClose`.
- Se o formulario estiver alterado, qualquer saida pede confirmacao para
  descartar. Salvar com sucesso fecha sem confirmacao.
- Enquanto salva, impedir submit duplicado e fechamento acidental.
- Erro de campo fica ao lado do campo; erro geral fica no topo do formulario.
- Acao destrutiva nao ocupa o footer padrao; fica no menu do registro e exige
  confirmacao separada.

### Estado e URL

- CRUD simples pode controlar drawer no workspace client.
- Se novo/editar precisar deep link, refresh ou back/forward previsivel, usar
  rota interceptada + slot paralelo conforme a documentacao local do Next.js.
- Nao adotar rotas paralelas em toda listagem por padrao; elas exigem
  `default.tsx`, fechamento de slot e estados de hard navigation.

## Formularios

- React Hook Form + Zod para formularios interativos.
- O mesmo schema valida no cliente e novamente na action server-side.
- `FormSection` organiza grupos semanticamente relacionados.
- `FormField` padroniza label, descricao, obrigatoriedade, erro e `aria-*`.
- Duas colunas somente para campos curtos e relacionados; mobile volta a uma.
- Campo condicional desmontado precisa de regra explicita de persistencia.
- Nao usar toast para erro de validacao.
- Footer usa `Cancelar` secundario e verbo especifico no primario:
  `Criar contato`, `Salvar canal`, `Convidar membro`.
- Formulario complexo divide secoes em arquivos; o drawer coordena, nao renderiza
  centenas de linhas de campos.

## Componentes a padronizar

### Prioridade 1 - fundacao

- `IconButton`
- `Input`, `TextArea`, `Select`, `Checkbox`, `Toggle`
- `Avatar`, `Tooltip`, `Skeleton`, `Spinner`
- `DropdownMenu`
- `Dialog` e `ConfirmDialog`
- `Drawer`
- `Toast`/`Feedback`

### Prioridade 2 - registros

- `DataTable` e subcomponentes
- `RowActionsMenu`
- `DataTableControlBar`
- `EntityDrawer`
- `UnsavedChangesGuard`
- `FormField` e `FormSection`
- `IdentityCell`, para avatar/icone + titulo + metadado
- `StatusCell`, para status semanticamente consistente
- `DateCell`, com formato e valor acessivel
- `EmptyState`, `ErrorState` e `AsyncState`
- `Pagination`

### Prioridade 3 - operacao

- `FilterMenu` e `ActiveFilterChips`
- `DetailList`, para pares label/valor
- `ActivityTimeline`
- `ContextPanel`
- `CommandSearch`
- `MetricCard`, somente para medida acionavel

Nao criar um `CrudPage` universal que recebe dezenas de configuracoes. A pagina
e a feature devem continuar expressando o trabalho real do dominio.

## Estados obrigatorios

Todo componente compartilhado documenta e testa:

- default;
- hover e active;
- focus-visible;
- disabled;
- loading sem layout shift;
- erro;
- vazio, quando aplicavel;
- reduced motion;
- desktop e mobile.

Toda listagem diferencia:

- carregando;
- carregando proxima pagina;
- vazia sem filtro;
- zero resultado com filtro;
- falha inicial;
- falha ao paginar;
- sem permissao;
- dado desatualizado apos mutacao.

## Acessibilidade

- Usar elemento `table` para dados tabulares.
- Cabecalho ordenavel anuncia `aria-sort`.
- Menu de linha funciona por teclado e possui `aria-label` com a entidade.
- Drawer usa semantica de dialog, focus trap, Escape e retorno de foco.
- Status sempre inclui texto.
- IconButton sempre possui nome acessivel.
- Clique de linha nao substitui link/acao acessivel.
- Motion respeita `prefers-reduced-motion`.

## Testes

### Primitive compartilhado

- navegacao por teclado;
- foco e fechamento;
- estados visuais estruturais;
- callback e disabled;
- reduced motion quando relevante.

### DataTable

- render de coluna e ID estavel;
- ordenacao controlada;
- busca/filtro emitidos sem fetch interno;
- loading, erro e vazio;
- menu de linha e separacao destrutiva;
- paginacao;
- prioridades responsivas;
- selecao, somente quando implementada.

### EntityDrawer

- novo e editar;
- reset entre registros;
- dirty guard em todas as saidas;
- submit unico;
- erro de schema e erro server-side;
- foco inicial e retorno de foco.

## Sequencia de adocao

1. Implementar primitives ausentes: Dialog, Drawer, Dropdown, campos e estados.
2. Implementar `EntityDrawer` e guard de alteracoes.
3. Implementar DataTable minima, sem drag, virtualizacao ou bulk.
4. Migrar primeiro um CRUD pequeno e validar a API.
5. Migrar canais, contatos e assistentes; ajustar somente padroes comprovados.
6. Adicionar recursos avancados quando dois dominios demonstrarem necessidade.

O primeiro CRUD deve ser pequeno. Nao usar atendimento como laboratorio da
tabela, pois sua inbox e uma lista operacional, nao uma grade administrativa.

## Checklist de review

- [ ] `page.tsx` continua server-side e pequeno.
- [ ] Client boundary esta na menor subarvore interativa.
- [ ] Novo/editar abre `EntityDrawer` direito.
- [ ] Acoes do registro ficam no dropdown da linha.
- [ ] Tabela nao possui toolbar duplicada.
- [ ] Permissao e tenant sao revalidados no servidor.
- [ ] Schema Zod roda na action.
- [ ] Loading, erro, vazio e zero resultado sao distintos.
- [ ] Dirty form nao fecha sem confirmacao.
- [ ] Arquivos estao dentro do orcamento ou possuem justificativa.
- [ ] Nomes de arquivos descrevem a responsabilidade.
- [ ] Teclado, foco, mobile e reduced motion foram verificados.
- [ ] `bun run lint` e `bun run build` passam.
