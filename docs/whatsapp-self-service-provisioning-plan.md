# Plano De Provisionamento Gerenciado De WhatsApp

Atualizado em 2026-07-29.

## Resumo Executivo

O BEM HUB deve assumir toda a configuração técnica de novas conexões de
WhatsApp Web. O cliente não informará URL de servidor, token de usuário, API
key, nome de instância, segredo de webhook ou qualquer credencial do provedor.

O fluxo alvo será:

1. O administrador clica em **Conectar WhatsApp**.
2. Informa somente um nome reconhecível para o canal.
3. O BEM HUB escolhe o host gerenciado, cria uma instância isolada, gera e
   guarda os segredos, configura o webhook e solicita o pareamento.
4. O administrador lê o QR Code dentro do BEM HUB.
5. O BEM HUB confirma a conexão, descobre o número pareado e libera o canal no
   Atendimento.

Wuzapi será o provedor gerenciado padrão. Evolution API será a alternativa
operacional e deverá implementar o mesmo contrato. O provedor não precisa ser
uma decisão do cliente; a escolha pode permanecer interna e configurável por
ambiente.

## Estado Da Implementação

Primeira fatia Wuzapi implementada localmente em 2026-07-29:

- drawer com nome, QR e polling;
- configuração Wuzapi somente no servidor;
- credenciais por canal geradas e criptografadas antes da chamada externa;
- criação idempotente e reconciliação após conflito;
- webhook e HMAC automáticos;
- execução recuperável com lease e tentativas;
- telefone descoberto pelo JID após conexão;
- RLS e grants validados em 25 testes pgTAP;
- 102 testes, lint e build aprovados.

Ainda pendente:

- smoke real com os containers Wuzapi;
- descomissionamento externo seguro;
- aplicação das migrations no projeto remoto;
- implementação Evolution pelo mesmo contrato;
- QA visual desktop/mobile.

## Baseline Técnica

O contrato inicial será validado contra as versões já testadas:

- Wuzapi no commit `70642149a0e8a81d49caa640f557217e03e09729`;
- Evolution API `2.3.7`.

Qualquer atualização desses provedores exige rerodar testes de contrato e smoke
antes de chegar ao piloto. Não assumir compatibilidade de endpoints, headers ou
payloads entre versões.

## Resultado Esperado

Um owner ou admin consegue criar e conectar um novo número sem conhecer a
infraestrutura de WhatsApp:

- nenhum segredo ou endereço técnico é digitado pelo cliente;
- nenhum segredo chega ao browser;
- cada canal recebe usuário ou instância e credenciais próprias;
- criação, retry, reconexão e remoção são idempotentes;
- falhas parciais podem ser retomadas sem duplicar recursos;
- o histórico continua isolado por organização;
- Wuzapi e Evolution produzem os mesmos estados de domínio;
- o dashboard Wuzapi permanece disponível para operação interna.

## Decisões De Produto E Arquitetura

### Experiência padrão

- A interface usa o nome **Conexão WhatsApp Web**, não termos de infraestrutura.
- Wuzapi é o padrão inicial.
- Evolution fica disponível como fallback ou escolha operacional interna.
- O cliente não escolhe host, URL, token, API key, instância ou webhook.
- QR Code será o único método entregue na primeira fatia.
- O telefone será descoberto depois do pareamento e confirmado na interface.
- A tela mantém aviso curto de que a conexão usa WhatsApp Web não oficial e
  pode sofrer desconexões ou restrições.

### Operação dos provedores

- O BEM HUB será dono dos hosts Wuzapi e Evolution usados pelo produto.
- Credenciais administrativas dos hosts pertencem à infraestrutura do BEM HUB,
  não a uma organização cliente.
- Cada canal terá credencial de execução exclusiva.
- Wuzapi terá um usuário por canal.
- Evolution terá uma instância por canal.
- Não haverá migração automática de uma sessão conectada entre provedores.
- Fallback automático só pode ocorrer antes da criação do recurso externo. Após
  criação parcial, o BEM HUB deve reconciliar ou compensar antes de tentar outro
  provedor.

### Segredos

- Segredos administrativos ficam no secret manager do ambiente de deploy.
- Segredos por canal continuam criptografados com AES-256-GCM em
  `channel_credentials`.
- A credencial administrativa nunca será copiada para `channel_credentials`.
- Nenhum segredo usa prefixo `NEXT_PUBLIC_`.
- Logs, eventos, erros, auditoria e telemetria não armazenam tokens, API keys,
  HMACs, QR Codes ou payloads completos.

Para a primeira versão com um host de cada provedor, usar configuração de
ambiente é mais simples e segura que criar um catálogo de hosts:

```text
WHATSAPP_MANAGED_PROVIDER=wuzapi
WHATSAPP_MANAGED_PROVISIONING_ENABLED=true
WUZAPI_MANAGED_BASE_URL=https://wuzapi.interno.exemplo
WUZAPI_ADMIN_TOKEN=<secret manager>
EVOLUTION_MANAGED_BASE_URL=https://evolution.interno.exemplo
EVOLUTION_GLOBAL_API_KEY=<secret manager>
```

Quando houver mais de um host por provedor, criar um registro privado de hosts
com capacidade, saúde e referência de segredo. Não antecipar esse catálogo no
primeiro piloto.

## Limites Da Primeira Entrega

Incluído:

- Wuzapi e Evolution API;
- provisionamento interno;
- webhook automático;
- QR Code dentro do BEM HUB;
- consulta de saúde;
- desconexão, reconexão e descomissionamento;
- idempotência e retomada de falha;
- isolamento multi-tenant;
- métricas operacionais mínimas.

Fora da primeira entrega:

- Meta Cloud API;
- Uazapi e novas conexões Z-API;
- escolha de host pelo cliente;
- painel de infraestrutura para o cliente;
- migração automática de sessão entre provedores;
- balanceamento automático entre vários hosts;
- proxy ou S3 configurável por organização;
- cobrança automática por instância;
- pareamento por código de telefone;
- mídia e sincronização completa de histórico.

## Experiência Do Usuário

### Novo fluxo em `/app/channels`

Substituir os dois passos atuais de cadastro e credenciais por um único
`EntityDrawer`.

#### Etapa 1 — Identificação

Campos visíveis:

- `Nome do canal`, exemplo: `WhatsApp comercial`;
- aceite do risco da conexão por WhatsApp Web, quando ainda não registrado para
  a organização.

O telefone não precisa ser digitado antes do pareamento.

Ação:

- `Preparar conexão`.

#### Etapa 2 — Preparação automática

Mostrar uma linha de progresso baseada em estados reais:

- `Preparando conexão`;
- `Configurando recebimento`;
- `Gerando QR Code`.

Não mostrar:

- nome do host;
- URL;
- token;
- API key;
- nome técnico da instância;
- segredo do webhook.

#### Etapa 3 — Pareamento

Mostrar:

- QR Code;
- instrução curta para abrir **Aparelhos conectados** no WhatsApp;
- tempo de expiração;
- ação `Gerar novo QR Code`;
- estado `Aguardando leitura`, `Conectando` ou `Conectado`.

O browser consulta somente o BEM HUB. Ele nunca chama Wuzapi ou Evolution.

#### Etapa 4 — Confirmação

Depois do pareamento:

- confirmar número detectado;
- mostrar nome de perfil quando disponível;
- marcar webhook e saúde como ativos;
- oferecer `Abrir Atendimento`.

### Canais existentes

- Conexões antigas configuradas manualmente continuam funcionando.
- Marcar registros com `management_mode = external` ou `legacy`.
- Novas conexões usam `management_mode = managed`.
- A interface padrão não oferece mais campos técnicos para conexões gerenciadas.
- Uma ferramenta interna temporária pode manter a edição técnica durante a
  migração, sem exposição a clientes.

### Diagnóstico

Erros para o cliente devem orientar ação:

- `Não foi possível preparar a conexão. Tente novamente.`
- `QR Code expirado. Gere um novo código.`
- `O serviço de conexão está temporariamente indisponível.`
- `Este número foi desconectado no WhatsApp. Conecte novamente.`

Detalhes técnicos ficam em telemetria interna com código estável e correlation
ID.

## Arquitetura Alvo

```text
owner/admin
    |
    v
Server Action / Route Handler do BEM HUB
    |
    +-- valida usuário, organização, papel, limite e idempotência
    |
    v
ManagedChannelProvisioningService
    |
    +-- persiste estado recuperável
    +-- escolhe provider interno
    +-- gera segredos por canal
    |
    +-------------------------+
    |                         |
    v                         v
WuzapiProvisioner       EvolutionProvisioner
    |                         |
    v                         v
usuário isolado          instância isolada
    |                         |
    +-----------+-------------+
                |
                v
credencial criptografada + webhook + QR
                |
                v
channel_connections / channel_credentials
                |
                v
Atendimento provider-neutral
```

### Separação de contratos

O adapter atual mistura provisionamento administrativo e operações da
instância. Separar os papéis:

```ts
type ManagedProvisioningInput = {
  channelConnectionId: string;
  organizationId: string;
  webhookUrl: string;
};

type ManagedProvisioningResult = {
  externalInstanceId: string;
  runtimeCredentials: ChannelProviderCredentials;
};

interface ManagedChannelProvisioner {
  provider: "wuzapi" | "evolution";
  provision(input: ManagedProvisioningInput): Promise<ManagedProvisioningResult>;
  reconcile(input: ManagedProvisioningInput): Promise<ManagedProvisioningResult>;
  deprovision(externalInstanceId: string): Promise<void>;
}
```

`ChannelProviderAdapter` permanece responsável por:

- saúde;
- pareamento;
- webhook da instância;
- envio;
- normalização de callback;
- logout.

`ManagedChannelProvisioner` usa a credencial administrativa somente para criar,
localizar, reconciliar ou remover recursos.

## Fluxo Wuzapi

Wuzapi será implementado primeiro.

### Provisionamento

1. Gerar no backend:
   - nome interno derivado do UUID da conexão;
   - token de usuário aleatório com pelo menos 256 bits;
   - chave HMAC aleatória com pelo menos 256 bits;
   - token opaco para o endpoint público do webhook.
2. Criptografar e persistir a credencial de execução antes da chamada externa.
3. Chamar `POST /admin/users` usando somente o Admin Token do host.
4. Criar um usuário com:
   - nome interno;
   - token exclusivo;
   - webhook BEM HUB;
   - eventos `Message,ReadReceipt`;
   - HMAC exclusiva.
5. Persistir o ID externo retornado.
6. Consultar e confirmar configuração de webhook e HMAC.
7. Chamar `POST /session/connect`.
8. Buscar QR em `GET /session/qr`.
9. Consultar `GET /session/status` até `connected=true` e `loggedIn=true`.
10. Extrair JID/número, atualizar o canal e marcar `connected`.

### Credencial de execução

O payload criptografado por canal será equivalente a:

```ts
type ManagedWuzapiCredentials = {
  provider: "wuzapi";
  baseUrl: string;
  externalUserId: string;
  userToken: string;
  webhookHmacKey: string;
};
```

`baseUrl` fica dentro do payload criptografado. Não retornar
`provider_base_url` na consulta pública de canais gerenciados.

### Retomada e remoção

- Retry usa o mesmo token e nome gerados anteriormente.
- Conflito de token dispara reconciliação, não nova criação.
- A reconciliação valida que o usuário externo corresponde à conexão interna.
- `Excluir` na listagem executa exclusão lógica imediata: oculta o canal,
  bloqueia novas operações e preserva atendimentos. Não afirma que o recurso
  externo foi removido.
- `Desconectar` preserva usuário e sessão recuperável.
- `Descomissionar conexão` executa logout e remoção completa do usuário externo
  após confirmação.
- Depois do descomissionamento, apagar a credencial de execução, marcar
  `channel_connections` como `disabled` e preservar o registro e o histórico.

### Dashboard

- Manter dashboard Wuzapi para operação interna.
- Proteger com VPN, allowlist de IP ou proxy reverso com SSO.
- Não disponibilizar Admin Token ao cliente.
- Não incorporar o dashboard na aplicação.
- Usar o dashboard para saúde, inspeção e suporte, nunca como fonte canônica do
  estado do BEM HUB.

## Fluxo Evolution API

Evolution será implementada depois da fatia Wuzapi estar estável.

### Provisionamento

1. Gerar:
   - nome de instância derivado do UUID da conexão;
   - token de instância aleatório;
   - segredo independente para o callback;
   - token opaco do endpoint público do webhook.
2. Criptografar e persistir o token por instância antes da chamada externa.
3. Chamar `POST /instance/create` com a API key global e:
   - `integration = WHATSAPP-BAILEYS`;
   - token por instância;
   - QR inicial desabilitado para manter a criação rápida;
   - configurações mínimas do BEM HUB.
4. Validar `instanceId`, nome e `hash` retornados.
5. A partir daí, usar o token da instância nas operações normais.
6. Configurar o webhook com o token da instância.
7. Solicitar QR por `GET /instance/connect/{instanceName}`.
8. Consultar `connectionState` até `open`.
9. Consultar os dados da instância para descobrir número e perfil.
10. Atualizar o canal e marcar `connected`.

### Credencial de execução

```ts
type ManagedEvolutionCredentials = {
  provider: "evolution";
  baseUrl: string;
  instanceName: string;
  instanceToken: string;
  webhookSecret: string;
};
```

A API key global não entra neste payload.

### Mudança importante no adapter atual

O adapter atual usa a mesma API key para criar e operar a instância. O novo
fluxo deve:

- usar API key global somente no provisioner;
- guardar o `hash` ou token exclusivo retornado na criação;
- operar saúde, webhook, QR, envio e logout com token da instância;
- usar segredo de callback independente da API key;
- manter Evolution Manager desativado.

## Estado, Idempotência E Recuperação

### Máquina de estados do canal

Reusar os estados existentes:

```text
draft
  -> provisioning
  -> awaiting_pairing
  -> connecting
  -> connected

qualquer etapa recuperável -> failed -> provisioning
connected -> disconnected -> awaiting_pairing
qualquer estado terminal operacional -> disabled
```

### Registro de provisionamento

Criar `channel_provisioning_runs` com:

- `id`;
- `organization_id`;
- `channel_connection_id`;
- `provider`;
- `operation`: `provision`, `reconcile` ou `deprovision`;
- `request_id`;
- `status`: `pending`, `running`, `succeeded` ou `failed`;
- `step`;
- `attempt_count`;
- `last_error_code`;
- `started_at`, `finished_at`, `created_at`, `updated_at`;
- `created_by`.

Regras:

- não guardar segredos ou payload bruto;
- unicidade por `organization_id` e `request_id`;
- somente uma execução ativa por conexão;
- RLS por organização como defesa em profundidade;
- acesso de escrita somente pelo backend;
- leitura do cliente apenas por RPC sanitizada, se necessária.

### Ordem segura

1. Criar conexão e execução no banco.
2. Gerar e salvar segredos criptografados.
3. Criar recurso externo.
4. Persistir ID externo.
5. Configurar webhook.
6. Iniciar pareamento.

Persistir antes da chamada externa permite repetir a mesma operação depois de
timeout ou queda do processo.

### Reconciliação

Implementar uma rotina reutilizável:

- execução `provisioning` há mais de 15 minutos;
- credencial existe, mas ID externo não;
- ID externo existe, mas webhook não foi confirmado;
- provedor responde que recurso já existe;
- canal diz `connected`, mas saúde está ausente ou degradada;
- recurso externo existe sem canal válido.

No primeiro piloto, a reconciliação é acionada por retry explícito e por
`Atualizar estado`. Para Wuzapi e Evolution, ela também compara a URL do
webhook no provedor com o `APP_BASE_URL` atual e a reconfigura quando divergir.
Antes de confirmar saúde, o backend valida o ingresso público por um endpoint
marcado do próprio BEM HUB. Agendamento automático vem depois da validação.

## Modelo De Dados

### `channel_connections`

Adicionar:

- `management_mode`: `managed`, `external` ou `legacy`;
- `provisioned_at`;
- `deprovisioned_at`;
- telefone temporariamente nulo enquanto aguarda pareamento;
- índice único de telefone somente quando o valor existir;
- versão otimista para operações concorrentes, se a versão atual não cobrir o
  fluxo.

Manter:

- `organization_id`;
- `provider`;
- `external_instance_id`;
- estados e timestamps de saúde;
- timestamps do webhook.

Não retornar em RPC pública para conexões gerenciadas:

- URL interna do host;
- ID técnico quando não houver uso de produto;
- qualquer conteúdo de `channel_credentials`.

Conexões com histórico não são apagadas fisicamente. O descomissionamento
remove o recurso externo e a credencial, mas mantém o canal desabilitado para
integridade das conversas e auditoria.

### `channel_credentials`

- Continua inacessível a `anon` e `authenticated`.
- Continua usando payload criptografado.
- Passa a conter somente credencial de execução por canal.
- Recebe formato versionado para permitir rotação e evolução de schema.
- Deve permitir rotação da `APP_ENCRYPTION_KEY` sem recriar a sessão externa.

### Configuração administrativa

Primeira versão:

- base URL e credencial administrativa em variáveis protegidas do deploy.

Versão com vários hosts:

- tabela em schema privado;
- sem exposição à Data API;
- sem segredo em texto;
- referência para secret manager;
- estado, capacidade e último health check;
- nenhum acesso pelo browser.

## Segurança

### Autorização

- Somente owner e admin podem provisionar, parear, desconectar ou remover.
- A organização vem da sessão autenticada, nunca do payload como autoridade.
- Toda consulta confirma conexão e organização juntas.
- Limite de canais e billing são verificados no servidor antes da criação
  externa.
- Usuário de uma organização não lê ou opera execução de outra.

### Proteção de segredos

- Gerar tokens com `crypto.randomBytes`.
- Usar HMAC independente por conexão.
- Usar segredo independente no callback Evolution.
- Comparar segredos em tempo constante.
- Nunca devolver credencial em Server Component props, Action result, toast,
  HTML, JSON público ou Realtime.
- Nunca registrar corpo de provisionamento.
- Manter logs do host sem nível debug em produção.
- Redigir headers `Authorization`, `apikey`, `token` e assinaturas.

### Rede

- Hosts de produção usam HTTPS e domínio estável.
- Quick Tunnels ficam restritos a desenvolvimento e smoke.
- Admin APIs devem aceitar tráfego apenas do backend BEM HUB ou rede privada.
- Dashboards administrativos precisam de controle de acesso adicional.
- Banco e Redis dos provedores não publicam portas.
- Definir backup dos volumes antes de números reais.

### Supabase

- Toda nova tabela de negócio leva `organization_id`.
- RLS é obrigatória mesmo quando a tabela for acessada principalmente pelo
  backend.
- Grants e RLS são revisados separadamente.
- Funções públicas usam `SECURITY INVOKER`.
- Funções privilegiadas ficam em schema privado, com `PUBLIC` e `anon`
  revogados e validações explícitas.
- Rodar advisors depois da migration.

Referências:

- [Segurança da Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)

## Organização Do Código

Estrutura proposta:

```text
src/features/channels/
  provisioning/
    contracts.ts
    managed-channel-provisioning.ts
    managed-channel-provisioning-errors.ts
    managed-channel-provisioning.test.ts
  providers/
    wuzapi/
      wuzapi-provisioner.ts
      wuzapi-provisioner.test.ts
    evolution/
      evolution-provisioner.ts
      evolution-provisioner.test.ts
  managed-channel-actions.ts
  managed-channel-drawer.tsx
  managed-channel-progress.tsx
  managed-channel-pairing.tsx
```

Regras:

- manter provisioner administrativo separado do adapter de execução;
- manter schemas Zod junto às fronteiras HTTP;
- usar funções pequenas para cada etapa recuperável;
- não colocar regra de permissão, limite ou credencial no Client Component;
- respeitar os limites de tamanho de arquivo do frontend;
- manter cópia de interface em português.

## Sequência De Implementação

### Fase 0 — Gates operacionais

- Definir host Wuzapi estável para piloto.
- Definir host Evolution estável para fallback.
- Configurar HTTPS e acesso privado às rotas administrativas.
- Definir secret manager do deploy.
- Definir limite inicial de instâncias por organização e por host.
- Definir backup e monitoramento dos volumes.
- Manter Wuzapi como padrão e Evolution como fallback interno.

Aceite:

- backend BEM HUB alcança `/health` dos dois hosts;
- browser não alcança rotas administrativas;
- segredos não aparecem em arquivos versionados ou logs.

### Fase 1 — Contrato e estado recuperável

- Criar migration pelo fluxo oficial do Supabase CLI.
- Adicionar `management_mode` e suporte a telefone ainda não descoberto.
- Criar `channel_provisioning_runs`.
- Criar RPCs e grants mínimos.
- Separar contrato de provisionamento do adapter de execução.
- Adicionar configuração server-side dos hosts.
- Definir códigos de erro estáveis e sanitizados.

Aceite:

- retry com mesmo `request_id` retorna a mesma execução;
- tenant A não lê nem altera tenant B;
- nenhum segredo aparece na tabela de execução.

### Fase 2 — Fatia vertical Wuzapi

- Implementar criação de usuário com token e HMAC gerados internamente.
- Persistir ID externo e credencial criptografada.
- Configurar e confirmar webhook.
- Iniciar sessão e obter QR.
- Detectar conexão e telefone.
- Implementar reconciliação de conflito e timeout.
- Implementar desconexão e remoção completa.

Aceite:

- novo canal aparece no dashboard interno Wuzapi;
- usuário conecta sem informar detalhes técnicos;
- retry não duplica usuário;
- remoção encerra recurso externo sem apagar histórico BEM HUB.

### Fase 3 — UX gerenciada

- Substituir cadastro técnico pelo drawer único.
- Mostrar progresso real, QR, expiração e retry.
- Atualizar canal automaticamente após pareamento.
- Ocultar campos e metadados técnicos.
- Manter estados acessíveis, foco, teclado e comportamento mobile.
- Adicionar confirmação antes de desconectar ou descomissionar.

Aceite:

- owner/admin conclui conexão informando somente nome;
- nenhum token, URL ou ID técnico aparece no DevTools do browser;
- fluxo funciona em desktop e mobile.

### Fase 4 — Paridade Evolution

- Implementar provisioner com API key global isolada.
- Gerar token por instância.
- Adaptar operações normais para token da instância.
- Configurar callback com segredo independente.
- Implementar reconciliação, desconexão e remoção.
- Executar o mesmo contrato de testes da Wuzapi.

Aceite:

- trocar configuração interna de Wuzapi para Evolution não altera UX;
- domínio, estados, webhook e Atendimento continuam provider-neutral;
- API key global nunca entra em credencial de organização.

### Fase 5 — Hardening e operação

- Adicionar rate limit de provisionamento.
- Adicionar métricas e alertas.
- Criar script de reconciliação e limpeza de órfãos.
- Testar rotação de segredos.
- Criar runbook de host indisponível, QR expirado, sessão perdida e capacidade
  esgotada.
- Proteger dashboard Wuzapi com acesso interno.
- Rodar advisors, pgTAP, lint e build.

Aceite:

- falha em qualquer etapa pode ser retomada;
- órfãos são detectáveis e removíveis;
- logs permitem diagnóstico sem revelar segredos;
- reinício do host preserva sessões.

## Estratégia De Testes

### Unitários e contratos

- Wuzapi cria usuário com token/HMAC internos.
- Evolution cria instância com token por instância.
- respostas externas passam por Zod;
- API key administrativa nunca compõe `runtimeCredentials`;
- provider errors viram códigos internos sanitizados;
- URLs vêm apenas de configuração permitida;
- idempotência preserva os mesmos identificadores;
- retry de conflito chama reconciliação;
- fallback não ocorre após criação parcial.

### Banco e segurança

- pgTAP para RLS de `channel_provisioning_runs`;
- grants de `anon`, `authenticated` e `service_role`;
- usuário A não lê ou opera organização B;
- membro não provisiona;
- owner/admin provisiona somente dentro do próprio tenant;
- unicidade de execução ativa;
- telefone nulo permitido apenas antes da conexão;
- credenciais continuam inacessíveis pelo Data API.

### Integração local com Docker

Os containers não precisam estar ativos para implementar contrato, banco e
testes mockados. Eles serão retomados para o smoke real.

Para cada provedor:

1. subir stack e dependências;
2. criar recurso pelo BEM HUB;
3. gerar e ler QR;
4. confirmar conexão e descoberta do número;
5. validar webhook;
6. receber mensagem;
7. enviar mensagem;
8. validar entrega e leitura;
9. enviar pelo aparelho e reconciliar na mesma conversa;
10. reiniciar containers e confirmar persistência;
11. repetir provisionamento com mesmo `request_id`;
12. remover conexão e confirmar limpeza externa.

### QA visual e de segurança

- desktop e mobile;
- QR expirado;
- provedor indisponível;
- browser fechado durante provisionamento;
- retry depois de timeout;
- dois admins tentando conectar o mesmo canal;
- inspeção de HTML, RSC payload, respostas HTTP e Realtime;
- inspeção de logs BEM HUB, Wuzapi e Evolution;
- teste manual com duas organizações.

## Observabilidade

Eventos mínimos:

- `channel.provisioning.started`;
- `channel.provisioning.step_completed`;
- `channel.provisioning.succeeded`;
- `channel.provisioning.failed`;
- `channel.provisioning.reconciled`;
- `channel.deprovisioning.succeeded`;
- `channel.deprovisioning.failed`.

Dimensões permitidas:

- provider;
- código do passo;
- código de erro;
- duração;
- número da tentativa;
- ambiente.

Dimensões proibidas:

- token;
- HMAC;
- API key;
- QR Code;
- telefone completo;
- URL com segredo;
- payload do fornecedor.

## Rollout

1. Ativar por feature flag somente para organização interna.
2. Validar Wuzapi com número de teste.
3. Validar descomissionamento e recuperação de falha.
4. Ativar para organização piloto.
5. Manter configuração manual apenas como fallback interno temporário.
6. Validar Evolution com o mesmo contrato.
7. Remover formulário técnico do produto quando os dois fluxos estiverem
   estáveis.

Rollback:

- desligar `WHATSAPP_MANAGED_PROVISIONING_ENABLED`;
- manter canais já conectados operacionais;
- impedir novas criações sem apagar credenciais;
- preservar ação interna de diagnóstico;
- nunca apagar recurso externo automaticamente durante rollback.

## Critérios De Conclusão

- Cliente conecta um novo número informando somente nome e lendo QR.
- Wuzapi é padrão; Evolution entrega paridade funcional.
- Nenhuma configuração técnica é solicitada ao cliente.
- Nenhuma credencial administrativa fica associada a tenant.
- Cada canal usa credencial de execução exclusiva.
- Retry não duplica usuário ou instância.
- Webhook é configurado e autenticado automaticamente.
- Telefone e perfil são descobertos depois do pareamento.
- Atendimento recebe e envia na mesma conversa.
- Entrega e leitura são atualizadas.
- Sessão sobrevive ao reinício do provedor.
- Descomissionamento remove recurso externo e preserva histórico interno.
- Isolamento entre duas organizações é validado.
- pgTAP, testes de contrato, lint e build passam.
- Advisors não apresentam regressão de segurança.
- QA autenticado desktop/mobile passa.

## Primeiro Incremento Recomendado

Implementar uma fatia Wuzapi pequena e completa:

1. configuração interna do host;
2. `ManagedChannelProvisioner`;
3. `channel_provisioning_runs`;
4. criação idempotente do usuário Wuzapi;
5. credencial criptografada;
6. webhook e HMAC automáticos;
7. QR no drawer;
8. conexão e descoberta do número;
9. remoção do usuário externo;
10. testes e smoke real.

Somente depois dessa fatia ser confiável, implementar Evolution usando o mesmo
contrato.
