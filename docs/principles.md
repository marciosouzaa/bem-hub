# Engineering Principles

## Produto Primeiro

- Maximizar valor comprovavel para o usuario, nao volume de funcionalidades.
- Concluir marcos verticais utilizaveis antes de ampliar a plataforma.
- Medir comportamento real; nao declarar sucesso apenas porque o codigo existe.
- Preferir o recorte mais estreito que valide uma hipotese comercial importante.
- Nao automatizar uma rotina antes de entende-la em modo assistido.

## Seguranca E Dados

- Tratar isolamento multi-tenant como requisito de correcao, nao melhoria futura.
- Manter `organization_id` em toda entidade de negocio e RLS em toda tabela.
- Verificar no servidor permissoes, limites, billing e regras de execucao.
- Nunca confiar em IDs de organizacao, usuario ou recurso enviados pelo cliente.
- Minimizar acesso a segredos e dados pessoais; nunca devolver chaves ao browser.
- Nao usar dados reais de clientes antes dos gates de seguranca do roadmap.

## Codigo

- Escrever codigo simples, legivel, coeso e testavel.
- Preferir composicao e contratos pequenos a hierarquias ou frameworks internos.
- Evitar abstracoes prematuras e overengineering.
- Nao duplicar regra de negocio entre UI, API e banco.
- Remover codigo morto quando ele estiver no escopo da mudanca.
- Refatorar quando reduzir risco ou complexidade do marco ativo; registrar o
  restante no backlog.
- Manter provider de IA, canal externo e conector de loja atras de adapters.

## Entrega

- Validar input externo com Zod e tipar contratos nas fronteiras do dominio.
- Preferir Server Components; usar Client Components somente para interacao real.
- Adicionar testes proporcionais ao risco e ao raio de impacto.
- Rodar lint e build antes de concluir mudancas significativas.
- Fazer commits pequenos, coerentes e limitados aos arquivos da sessao.
- Atualizar roadmap, backlog e worklog quando o estado do produto mudar.

## Decisoes

O engenheiro pode decidir autonomamente quando a mudanca:

- preserva regras de negocio e contratos externos;
- segue arquitetura, design system e padroes existentes;
- e reversivel e melhora seguranca, qualidade, testes, UX local ou manutencao;
- nao cria custo externo, nao envia dados e nao publica em producao.

Exigir intervencao humana quando houver:

- mudanca de posicionamento, fluxo de negocio ou promessa ao cliente;
- alteracao de preco, plano, cobranca ou metrica comercial;
- novo dominio ou remocao de funcionalidade existente;
- provedores externos equivalentes com custo ou contrato diferente;
- envio automatico para clientes reais ou tratamento juridico de dados pessoais;
- deploy, migration remota destrutiva ou acao irreversivel em dados reais;
- duas opcoes equivalentes com consequencias de produto relevantes.

Uma decisao pendente nao deve interromper trabalho preparatorio seguro nem outra
tarefa de alto valor que continue desbloqueada.
