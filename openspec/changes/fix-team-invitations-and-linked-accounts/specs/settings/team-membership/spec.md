## Purpose

Garante que usuarios convidados aceitem acesso a novas contas de equipe, alternem entre ambientes autorizados e visualizem seus vinculos ativos dentro das configuracoes da propria conta.

## ADDED Requirements

### Requirement: Convite aceito ativa acesso multi-conta
O sistema SHALL ativar o membership convidado quando um usuario autenticado aceita um convite valido pelo link de e-mail.

#### Scenario: Usuario existente aceita convite
- **WHEN** um usuario que ja possui conta propria como owner abre o link de convite, conclui o callback de autenticacao e chega ao aceite
- **THEN** o membership convidado muda para ativo e o usuario passa a ter acesso ativo a sua conta propria e a conta convidada

#### Scenario: Convite sem sessao valida
- **WHEN** o aceite de convite e acessado sem sessao autenticada valida
- **THEN** o usuario e direcionado para login sem ativar o membership

#### Scenario: Usuario novo conclui primeiro acesso pelo convite
- **WHEN** um usuario sem senha criada abre um link de convite que retorna sessao no fragmento da URL
- **THEN** o navegador converte a sessao em cookie autenticado, ativa somente o convite do usuario e abre a tela de primeiro acesso para definir a senha

#### Scenario: Fragmento de convite cai no login por configuracao externa
- **WHEN** o Supabase Auth redireciona um convite para `/auth/login` com sessao no fragmento
- **THEN** a pagina reconhece o convite e continua o mesmo fluxo de aceite e primeiro acesso sem pedir uma senha inexistente

#### Scenario: Convite inexistente
- **WHEN** um usuario autenticado acessa o aceite sem convite pendente elegivel
- **THEN** o sistema mostra estado de convite nao confirmado e nao cria novo workspace

### Requirement: Login e aceite direcionam para o ambiente correto
O sistema SHALL persistir a organizacao ativa do usuario antes de abrir o workspace e SHALL mostrar selecao de conta quando houver mais de um ambiente ativo.

#### Scenario: Aceite cria segunda conta ativa
- **WHEN** um usuario aceita convite e passa a ter dois ambientes ativos
- **THEN** o sistema define a conta convidada como ambiente ativo para a sessao atual e oferece caminho claro para entrar no workspace

#### Scenario: Login com duas contas ativas
- **WHEN** um usuario com duas ou mais contas ativas faz login com senha
- **THEN** o sistema mostra a tela de selecao de conta antes de abrir `/app`

#### Scenario: Login com uma conta ativa
- **WHEN** um usuario com exatamente uma conta ativa faz login ou entra pela selecao
- **THEN** o sistema grava essa conta como ambiente ativo antes de redirecionar para `/app`

### Requirement: Conta lista ambientes vinculados
O sistema SHALL mostrar em `Configuracoes > Conta` uma tabela com todos os ambientes ativos vinculados ao usuario atual e controles limitados ao proprio vinculo.

#### Scenario: Usuario ve contas vinculadas
- **WHEN** um usuario autenticado abre `Configuracoes > Conta`
- **THEN** a pagina mostra uma tabela com nome da conta, slug, papel do usuario e indicador da conta em uso

#### Scenario: Usuario tem uma conta
- **WHEN** o usuario tem apenas um ambiente ativo
- **THEN** a tabela mostra esse unico ambiente sem estado vazio falso

#### Scenario: Usuario tem varias contas
- **WHEN** o usuario tem duas ou mais contas ativas
- **THEN** a tabela mostra todas elas e destaca a organizacao atualmente selecionada

#### Scenario: Isolamento entre usuarios
- **WHEN** usuario A abre a tabela de ambientes vinculados
- **THEN** o sistema nao lista ambientes que pertencem somente ao usuario B

#### Scenario: Usuario alterna ambiente ativo
- **WHEN** o usuario seleciona outro ambiente ativo vinculado a ele
- **THEN** o sistema persiste esse ambiente como ativo e abre o workspace sem encerrar a sessao

#### Scenario: Usuario se desvincula de ambiente convidado
- **WHEN** o usuario confirma desvinculo de um ambiente em que seu papel nao e owner
- **THEN** somente seu membership naquele ambiente e revogado, seus outros ambientes e sua identidade de usuario permanecem intactos

#### Scenario: Owner nao se desvincula da propria conta
- **WHEN** o usuario visualiza ambiente em que e owner
- **THEN** o sistema nao oferece acao de desvinculo

### Requirement: Usuario ve e aceita convite pendente na conta
O sistema SHALL mostrar somente os convites pendentes do usuario autenticado em `Configuracoes > Conta` e permitir aceite direto com a mesma regra de seguranca do link de e-mail.

#### Scenario: Convite pendente aparece para convidado
- **WHEN** usuario autenticado possui membership com status `invited`
- **THEN** a pagina mostra o ambiente convidante, o papel proposto e uma acao explicita para aceitar

#### Scenario: Usuario aceita convite na plataforma
- **WHEN** o usuario confirma aceite de um convite pendente listado na pagina de Conta
- **THEN** o membership e ativado e o ambiente convidado passa a ser o ambiente ativo da sessao

#### Scenario: Convites de outro usuario ficam ocultos
- **WHEN** usuario A abre a pagina de Conta
- **THEN** nenhum convite pendente destinado somente ao usuario B e retornado ou aceito

### Requirement: Redirect de convite usa origem segura
O sistema SHALL gerar links de convite com origem HTTPS de producao configurada e sem path incorreto que quebre o callback.

#### Scenario: Variavel de producao ausente
- **WHEN** `BEM_HUB_PRODUCTION_APP_URL` nao esta configurada
- **THEN** o fallback do convite usa `https://bem-hub.vercel.app/app`

#### Scenario: Variavel contem path do app
- **WHEN** `BEM_HUB_PRODUCTION_APP_URL` aponta para a origem publica com ou sem `/app`
- **THEN** o link final aponta para `/auth/invite` na mesma origem, que trata callback com codigo ou fragmento de sessao sem expor token ao servidor
