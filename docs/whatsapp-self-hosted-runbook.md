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

## Smoke test obrigatorio

Para cada provider:

1. conectar e confirmar estado `Conectado`;
2. enviar uma mensagem externa e confirmar que aparece uma unica vez;
3. responder pelo BEM HUB;
4. confirmar no aplicativo `Aceita -> Entregue -> Lida`;
5. enviar manualmente pelo aparelho e confirmar a mesma conversa;
6. desconectar e reconectar sem apagar o historico do BEM HUB.

So promova um provider a principal depois desse fluxo e de uma janela real de
estabilidade. Evolution e Wuzapi nao formam failover automatico de um mesmo
numero.
