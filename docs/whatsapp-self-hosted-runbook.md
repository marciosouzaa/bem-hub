# Runbook de WhatsApp self-hosted

Este runbook separa o que o BEM HUB configura automaticamente do que depende da
infraestrutura externa. Evolution API e Wuzapi usam sessoes WhatsApp Web nao
oficiais: podem desconectar, sofrer mudancas de protocolo ou restricao do
numero. Nao usar o mesmo numero nos dois servidores ao mesmo tempo.

## Pre-requisitos comuns

- um host com Docker e volumes persistentes;
- um dominio publico com HTTPS valido para cada API;
- DNS e proxy reverso apontando para os containers;
- backup do banco e dos dados de sessao;
- um numero de WhatsApp para Evolution e outro numero de teste para Wuzapi;
- acesso ao aparelho para escanear o QR Code.

Nunca exponha Postgres ou Redis na internet. Restrinja o painel e a API por
firewall quando a plataforma permitir.

## Evolution API

Use a distribuicao Docker oficial com PostgreSQL e Redis. Configure ao menos:

```dotenv
SERVER_URL=https://evolution.seudominio.com.br
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://...
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://...
AUTHENTICATION_API_KEY=<segredo-forte>
```

Depois que a API responder por HTTPS, configure `EVOLUTION_MANAGED_BASE_URL` e
`EVOLUTION_API_KEY` somente no ambiente server-side do BEM HUB e selecione
`WHATSAPP_MANAGED_PROVIDER=evolution`. O usuário do BEM HUB informa apenas o
nome do canal e lê o QR Code; a instância, credenciais e webhook são internos.

O BEM HUB configura o webhook, envia texto e acompanha entrega/leitura.

### Desenvolvimento local preparado no Windows

O ambiente preparado em 2026-07-26 usa:

- Evolution API oficial pinada em `2.3.7`;
- repositorio `https://github.com/EvolutionAPI/evolution-api.git` em
  `C:\repos\evolution-api`;
- API local em `127.0.0.1:8082`;
- PostgreSQL 15 e Redis 7 sem portas publicadas;
- volumes persistentes separados para banco, cache e instancias;
- `docker-compose.local.yml`, `setup-local.ps1` e
  `show-bem-hub-config.ps1`.

Nao use `latest` neste ambiente. A versao `2.3.7` foi testada contra o adapter
do BEM HUB; uma troca de versao exige repetir contratos, QR, webhooks e smoke.
O uso de Evolution API fica identificado na tela administrativa de Canais e
neste runbook, conforme a notificacao exigida pela licenca do projeto.

A Evolution tambem fornece o painel administrativo Evolution Manager em
`/manager`. Neste ambiente ele permanece desativado com
`SERVER_DISABLE_MANAGER=true`: o BEM HUB cobre conexao, QR, estado, webhook e
envio, e o painel adicional aumentaria a superficie administrativa exposta
pelo Quick Tunnel. Habilite-o somente para diagnostico intencional.

Prepare e suba:

```powershell
Set-Location C:\repos\evolution-api
powershell -ExecutionPolicy Bypass -File .\setup-local.ps1
docker compose -f .\docker-compose.local.yml up -d
powershell -ExecutionPolicy Bypass -File .\show-bem-hub-config.ps1
```

O setup preserva o `.env` existente e gera API key e senha do banco aleatorias.
Nao apague nem registre esse arquivo. O script de status nunca imprime a API
key; para coloca-la na area de transferencia:

```powershell
powershell -ExecutionPolicy Bypass -File .\show-bem-hub-config.ps1 -CopyApiKey
```

O endpoint `/` da Evolution consulta a versao web do WhatsApp e pode demorar em
rede restrita. O readiness local usa `/verify-creds` e o estado da instancia.
`CORS_ORIGIN=*` e necessario na `2.3.7` para aceitar requests server-to-server
sem header `Origin`; a API continua restrita a `127.0.0.1` e autenticada por
`apikey`.

Para HTTPS temporario:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:8082 --no-autoupdate 2> .\.cloudflared-evolution.log
```

Mantenha esse terminal aberto. Depois execute `show-bem-hub-config.ps1` em
outro terminal; ele encontra a URL no `.cloudflared-evolution.log`.

No ambiente server-side do BEM HUB, registre a URL pública temporária em
`EVOLUTION_MANAGED_BASE_URL` e use `EVOLUTION_LOCAL_ENV_FILE` apenas em
desenvolvimento para ler a chave local. No produto, crie `Novo canal`, dê um
nome e leia o QR Code. Nenhuma URL, nome de instância ou chave é informada pelo
usuário final.

Para parar sem apagar sessao, banco ou cache:

```powershell
docker compose -f .\docker-compose.local.yml stop
```

## Wuzapi

Use o Docker Compose oficial com PostgreSQL. Configure ao menos:

```dotenv
WUZAPI_ADMIN_TOKEN=<segredo-forte>
WUZAPI_GLOBAL_ENCRYPTION_KEY=<chave-aleatoria-de-32-bytes>
WUZAPI_GLOBAL_HMAC_KEY=<segredo-com-32-ou-mais-caracteres>
WEBHOOK_FORMAT=json
DB_USER=wuzapi
DB_PASSWORD=<segredo-forte>
DB_NAME=wuzapi
DB_HOST=db
DB_PORT=5432
```

`WEBHOOK_FORMAT=json` e obrigatorio porque o endpoint do BEM HUB aceita apenas
JSON e valida a assinatura sobre o corpo bruto.

O BEM HUB cria um usuário Wuzapi isolado pelo Admin Token no provisionamento
gerenciado. Esta chamada é interna; o token do usuário nunca chega ao browser:

```http
POST /admin/users
Authorization: <WUZAPI_ADMIN_TOKEN>
Content-Type: application/json

{
  "name": "bem-hub-piloto",
  "token": "<token-exclusivo-do-usuario>",
  "events": "Message,ReadReceipt"
}
```

No servidor, configure `WUZAPI_MANAGED_BASE_URL` e `WUZAPI_ADMIN_TOKEN` (ou
`WUZAPI_LOCAL_ENV_FILE` no desenvolvimento). O BEM HUB gera token e HMAC por
canal, configura o webhook e entrega somente o QR Code ao usuário.

### Desenvolvimento local validado no Windows

O smoke de 2026-07-26 usou:

- Docker Desktop, Engine `29.6.2` e Compose `v5.3.1`;
- `cloudflared 2026.7.3`;
- repositorio `https://github.com/asternic/wuzapi.git`;
- checkout local `C:\repos\wuzapi`, commit `70642149a0e8`;
- `C:\repos\wuzapi\docker-compose.local.yml`;
- `C:\repos\wuzapi\setup-local.ps1`;
- BEM HUB em `C:\repos\bem-hub`.

Prepare e suba o Wuzapi:

```powershell
Set-Location C:\repos\wuzapi
powershell -ExecutionPolicy Bypass -File .\setup-local.ps1
docker compose -f .\docker-compose.local.yml up -d --build
Invoke-WebRequest http://127.0.0.1:8081/health
```

O script preserva um `.env` existente. Nao apague esse arquivo: ele guarda
Admin Token, token do usuario, HMAC, credenciais do banco e chave global de
criptografia. Para a chave AES-256, o script gera 16 bytes aleatorios em
hexadecimal, equivalentes a 32 caracteres/bytes ASCII aceitos pelo Wuzapi.

O Compose local contem apenas `wuzapi-server` e `db`. PostgreSQL nao publica
porta no host e a persistencia fica no volume `wuzapi_local_db_data`. RabbitMQ
nao participa deste ambiente.

Para HTTPS gratuito e temporario durante desenvolvimento, abra um terminal para
cada tunnel e mantenha os processos ativos:

```powershell
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:8081
& 'C:\Program Files (x86)\cloudflared\cloudflared.exe' tunnel --url http://127.0.0.1:3000
```

Registre a primeira URL internamente em `WUZAPI_MANAGED_BASE_URL` e a segunda
em `APP_BASE_URL` no `.env.local` do BEM HUB. Como Quick Tunnels mudam ao
reiniciar, a atualização é de infraestrutura, nunca de formulário do usuário:

1. inicie o BEM HUB com `bun dev`;
2. crie os dois tunnels;
3. atualize `APP_BASE_URL` com o tunnel do BEM HUB;
4. atualize `WUZAPI_MANAGED_BASE_URL` ou `EVOLUTION_MANAGED_BASE_URL` conforme
   o provedor ativo e reinicie o BEM HUB;
5. abra o canal e leia um novo QR Code somente se a sessão tiver sido perdida.

Antes de aceitar um webhook como saudável, o backend consulta
`/api/health/webhook-ingress` pelo próprio `APP_BASE_URL`. Um tunnel encerrado,
DNS inválido ou endereço apontando para outro serviço deixa o canal
`Instável`, em vez de mostrar uma conexão de entrada falsa. A sessão do
WhatsApp e o recebimento são verificações distintas.

O usuario `bem-hub-piloto` e a sessao WhatsApp permanecem no volume do banco.
Nao recrie o usuario se ele ja existir. Para parar sem destruir dados:

```powershell
docker compose -f .\docker-compose.local.yml stop
```

Quick Tunnels servem somente ao desenvolvimento. Producao exige host continuo,
dominio HTTPS estavel, backup, monitoramento e rotacao dos segredos expostos
durante testes.

## Smoke test obrigatorio

Antes do smoke real, execute o gate de contratos:

```powershell
bun run test:whatsapp-contracts
```

Para cada provider:

1. conectar e confirmar estado `Conectado`, URL de webhook atual e ingresso
   público saudável;
2. em `Atendimento`, usar `Iniciar atendimento` para enviar a primeira mensagem
   a um numero que ainda nao escreveu;
3. confirmar que o contato recebe a mensagem e que a conversa aparece uma unica
   vez, atribuida ao operador;
4. responder pelo contato e confirmar que a entrada volta para a mesma conversa;
5. confirmar no aplicativo `Aceita -> Entregue -> Lida`;
6. enviar manualmente pelo aparelho e confirmar a mesma conversa;
7. desconectar e reconectar sem apagar o historico do BEM HUB.

Ao alterar adapter, provisioning, webhook, migrations de atendimento ou
infraestrutura local, esses sete comportamentos formam um contrato indivisível.
Não considerar apenas “mensagem saiu” como smoke aprovado: saída HTTP, entrada
por webhook, idempotência, mesma conversa e recibos precisam passar juntos.

So promova um provider a principal depois desse fluxo e de uma janela real de
estabilidade. Evolution e Wuzapi nao formam failover automatico de um mesmo
numero.
