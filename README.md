# Receitas-INF1A-02

Versão aprimorada do site da atividade prática de Biologia da turma INF1A, baseada no `Receitas-INF1A` e preparada para uso real durante a aula.

## Recursos

### Para alunos
- Escolha rápida do grupo.
- Visualização dos integrantes por número de chamada.
- Edição das receitas somente quando permitida.
- Perfil com nome, número, função e grupo.
- Avisos do professor.
- Atualização em tempo real de avisos, status, grupos e receitas quando a página está aberta.
- Indicador de atividade finalizada/bloqueada.
- Interface responsiva para celular.
- Tema claro/escuro.
- Relógio padrão de Brasília/São Paulo (`America/Sao_Paulo`).

### Para o professor
- Dashboard de modo aula.
- Visão dos 6 grupos em uma única tela.
- Contagem de grupos por status.
- Status: não iniciado, em andamento, em revisão e finalizado.
- Relógio padrão de Brasília/São Paulo.
- Publicação e limpeza de avisos para toda a turma.
- Organização de alunos por grupo e número de chamada.
- Regra de unicidade do número de chamada dentro de cada grupo.
- Criação de grupos.
- Upload de foto do trabalho para cada grupo.
- Histórico das alterações do grupo.
- Finalização que bloqueia as receitas do grupo.
- Reabertura de edição pelo professor.
- Exclusão de contas de alunos.

### Segurança e banco
- RLS habilitado nas tabelas da aplicação.
- Funções privilegiadas com verificação de papel do usuário.
- Funções de trigger sem acesso RPC público.
- RPCs administrativos sem execução para `anon`.
- Sessões anônimas impedidas de executar operações de escrita da sala.
- Histórico de atividade com RLS.
- Storage separado para fotos dos trabalhos.
- Receitas finalizadas não podem ser alteradas pelo fluxo de edição.
- Índices para chaves estrangeiras e consultas frequentes.
- Restrições de integridade para número de chamada e campos essenciais das receitas.
- Realtime habilitado para `groups`, `recipes`, `classroom_settings` e `profiles`.

## Efeitos visuais

- Identidade visual inspirada em Biologia.
- Barra de progresso da rolagem.
- Elementos com entrada suave conforme aparecem na tela.
- Hover e profundidade nos cards.
- Fundo com detalhes orgânicos sutis.
- Animação decorativa do DNA.
- Suporte a `prefers-reduced-motion`.
- Layout responsivo para celular e desktop.

## Banco de dados

As mudanças de aula e hardening estão organizadas em migrations versionadas no diretório `supabase/migrations/`. As migrations mais recentes adicionam ferramentas da sala, endurecimento de permissões/RLS, índices, integridade de dados e Realtime.

O banco em produção utilizado pelo projeto é o Supabase `Atividade de Biologia - Grupos`.

## Segurança pendente no painel do Supabase

O Security Advisor ainda sinaliza **Leaked Password Protection** desativado. Essa configuração é de Auth e precisa ser habilitada no painel do Supabase; ela não é controlada pelo código do site.

Também existem avisos do Advisor sobre funções `SECURITY DEFINER` que precisam continuar acessíveis a usuários autenticados para que as operações administrativas funcionem. Essas funções fazem validação de papel antes de executar operações privilegiadas.

## Publicação

O projeto é estático e pode ser publicado pelo GitHub Pages usando a branch `main`.

`https://guilherme-augusto-inf.github.io/Receitas-INF1A-02/`
