# Runbooks Operacionais

## Incidente De Chat

1. Consultar `chat.failed` por organizacao e estagio.
2. Confirmar provider/modelo sem acessar prompt ou resposta.
3. Suspender conexao afetada em erro de credencial ou cobranca.
4. Reprocessar somente com novo `request_id`; IDs antigos sao idempotentes.
5. Registrar horario, impacto, causa e correcao.

## Backup E Recuperacao

1. Confirmar backups Supabase antes de operacao destrutiva.
2. Aplicar migrations e pgTAP em banco limpo no CI.
3. Restaurar primeiro em projeto isolado, nunca sobre producao.
4. Validar contagens por tenant, RLS, Storage e URLs assinadas.
5. Liberar trafego depois de testes, build, pgTAP e advisors.

## Credencial Comprometida

1. Desativar conexao organizacional e revogar chave no provider.
2. Cadastrar nova chave criptografada.
3. Revisar `usage_events` por volume, horario e organizacao.
4. Nunca registrar chave, prompt ou documento em logs.

## Retencao

- Nao apagar dados sem politica de produto aprovada.
- Catalogos historicos ficam fora do RAG.
- Eventos guardam IDs e metricas, nunca conteudo sensivel.
- Limpeza futura deve ser tenant-scoped, auditavel e em lotes.
