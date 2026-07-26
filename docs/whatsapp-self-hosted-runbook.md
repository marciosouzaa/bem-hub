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

Depois que a API responder por HTTPS, no BEM HUB:

1. abra `Canais > Conectar`;
2. escolha `Evolution API`;
3. informe URL, um nome unico de instancia e `AUTHENTICATION_API_KEY`;
4. salve; o BEM HUB cria a instancia `WHATSAPP-BAILEYS` se necessario;
5. gere o QR Code e escaneie no WhatsApp;
6. ative o recebimento para registrar `messages.upsert` e `messages.update`.

O BEM HUB configura o webhook, envia texto e acompanha entrega/leitura.

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

Crie um usuario isolado no Wuzapi usando o Admin Token. O token desse usuario,
e nao o Admin Token, entra no BEM HUB:

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

No BEM HUB, informe a URL HTTPS, o token exclusivo do usuario e uma chave HMAC
de pelo menos 32 caracteres. Ao ativar o recebimento, o BEM HUB grava essa HMAC
no usuario Wuzapi, configura o webhook e passa a rejeitar callbacks sem
assinatura valida.

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

Use a primeira URL como URL do servidor Wuzapi no canal. Use a segunda em
`APP_BASE_URL` no `.env.local` do BEM HUB. Como Quick Tunnels mudam ao
reiniciar:

1. inicie o BEM HUB com `bun dev`;
2. crie os dois tunnels;
3. atualize `APP_BASE_URL` com o tunnel do BEM HUB;
4. substitua a URL do servidor no canal pela URL do tunnel Wuzapi;
5. clique `Reconfigurar recebimento` para gravar o novo callback.

O usuario `bem-hub-piloto` e a sessao WhatsApp permanecem no volume do banco.
Nao recrie o usuario se ele ja existir. Para parar sem destruir dados:

```powershell
docker compose -f .\docker-compose.local.yml stop
```

Quick Tunnels servem somente ao desenvolvimento. Producao exige host continuo,
dominio HTTPS estavel, backup, monitoramento e rotacao dos segredos expostos
durante testes.

## Smoke test obrigatorio

Para cada provider:

1. conectar e confirmar estado `Conectado`;
2. em `Atendimento`, usar `Iniciar atendimento` para enviar a primeira mensagem
   a um numero que ainda nao escreveu;
3. confirmar que o contato recebe a mensagem e que a conversa aparece uma unica
   vez, atribuida ao operador;
4. responder pelo contato e confirmar que a entrada volta para a mesma conversa;
5. confirmar no aplicativo `Aceita -> Entregue -> Lida`;
6. enviar manualmente pelo aparelho e confirmar a mesma conversa;
7. desconectar e reconectar sem apagar o historico do BEM HUB.

So promova um provider a principal depois desse fluxo e de uma janela real de
estabilidade. Evolution e Wuzapi nao formam failover automatico de um mesmo
numero.
