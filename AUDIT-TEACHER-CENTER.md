# Central do Professor — auditoria, implementação e validação

Data: 21/09/2026  
Produção: <https://guilherme-augusto-inf.github.io/Receitas-INF1A/>  
Supabase: `fbniifpkiyafpuhpnbll`

## Escopo implementado

- Dashboard agregado com métricas, pendências e atividade recente.
- Gerenciamento pesquisável de alunos, edição e movimentação individual ou em massa.
- Central de grupos, ações em massa e checklist com itens automáticos e manuais.
- Workflow de receita: rascunho, enviada, correções solicitadas e aprovada.
- Feedback pedagógico versionado, sem substituir revisões anteriores.
- Bloqueio/liberação/finalização da atividade aplicado no banco.
- Avisos publicados, ocultos, destacados e com validade opcional.
- Histórico paginado e filtrável.
- Soft delete, restauração e exclusão definitiva de receitas.
- Modo apresentação público, sem controles administrativos.
- CSV UTF-8 com BOM e separador compatível com Excel em português.
- Realtime somente nos recursos úteis ao acompanhamento.
- Atualização otimista de receitas por `row_version`, evitando lost updates.

## Estruturas adicionadas

- `recipe_reviews`
- `group_checklist`
- `announcements`
- Colunas de revisão, lixeira e versão em `recipes`
- Colunas de bloqueio/finalização em `classroom_settings`
- Metadados de alvo e papel em `activity_history`

Todas as novas tabelas expostas possuem RLS. Operações administrativas passam por RPCs que validam professor não anônimo no banco. Funções internas ficam no schema `private`, sem `EXECUTE` para clientes.

## Testes de banco

Os testes foram executados em transações com `ROLLBACK`:

- snapshot administrativo e métricas;
- aluno individual e ação em massa;
- checklist manual e bloqueio de item automático;
- criação, edição versionada e detecção de atualização concorrente;
- envio, comentário, correções solicitadas e aprovação;
- bloqueio global, liberação e finalização;
- aviso, lixeira, restauração e purge;
- ações em massa de grupos;
- histórico e auditoria.

Testes negativos:

- anônimo escrevendo no banco;
- aluno tentando acessar snapshot do professor;
- aluno tentando RPC administrativa;
- aluno tentando alterar `role`;
- aluno tentando criar receita em outro grupo;
- aluno tentando aprovar a própria receita;
- atualização concorrente com versão antiga;
- edição de check automático pelo cliente.

Resultado: todos negados. Resíduos de QA após rollback: zero.

## Advisors

O Performance Advisor ficou sem avisos de FK sem índice e sem avisos de `auth_rls_initplan`. Permanecem apenas índices recém-criados/ainda não utilizados, esperados em uma base pequena.

O Security Advisor continua exibindo avisos genéricos para RPCs `SECURITY DEFINER` intencionalmente expostas. Cada RPC administrativa valida `auth.uid()`, perfil, papel e anonimato no backend e foi testada com usuário sem privilégio. Os dois endpoints anônimos retornam somente dados públicos/agregados.

Pendente no painel do Supabase: **Leaked Password Protection**. Essa configuração de Auth não é controlada pelas migrations deste repositório.

## Histórico de migrations

As migrations desta entrega usam exatamente as versões registradas no banco remoto. O projeto remoto possui migrations históricas anteriores que foram criadas antes de seus SQLs serem versionados no GitHub; os arquivos consolidados legados foram preservados para não reescrever o histórico.

