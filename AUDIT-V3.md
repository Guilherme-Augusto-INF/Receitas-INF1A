# Auditoria V3 — Receitas-INF1A

Data: 20/09/2026  
Repositório confirmado: `Guilherme-Augusto-INF/Receitas-INF1A`  
Branch: `main`  
Baseline HEAD: `09a0dc6d35a9b4ac80028cff7ad743ef00cd13f7`  
Produção canônica: <https://guilherme-augusto-inf.github.io/Receitas-INF1A/>  
Supabase: `Atividade de Biologia - Grupos` (`fbniifpkiyafpuhpnbll`)

## Inventário e fluxo de dados

| Página | JavaScript | Dados/RPCs | Permissão esperada |
|---|---|---|---|
| Home | `ui`, `auth`, `classroom`, `home` | `get_group_overview`, `classroom_settings`, Realtime | leitura pública; conta opcional |
| Login | `ui`, `login` | Supabase Auth | público |
| Perfil | `ui`, `auth`, `classroom`, `profile` | perfil próprio, `update_my_profile`, grupo | usuário autenticado; escrita própria restrita |
| Grupo 1–6 | `ui`, `auth`, `classroom`, `group` | `groups`, `recipes`, `get_group_members`, status/histórico/foto | leitura pública; integrantes só do próprio grupo/professor; escrita do grupo/professor |
| Professor | `ui`, `auth`, `classroom`, `teacher` | grupos, perfis, avisos, histórico e RPCs administrativas | professor não anônimo |

Arquitetura preservada: HTML/CSS/JS estático, scripts compartilhados e Supabase. Não foi introduzido framework, bundler, backend separado, PWA ou service worker.

## Baseline antes das alterações

| Funcionalidade | Resultado | Evidência |
|---|---|---|
| Home pública | PASS | produção carregou seis grupos e terminou o loading |
| Status e progresso | PASS parcial | seis grupos em `not_started`; transições RPC passaram em transação revertida |
| Metadados | FAIL | Open Graph, sitemap, robots e QR apontavam para `Receitas-INF1A-02` |
| 404 | FAIL | “Voltar ao início” resolvia para a própria rota inexistente |
| Perfil de aluno | FAIL | não havia `UPDATE` próprio nem RPC executável para o fluxo do frontend |
| Contagem agregada | FAIL potencial | `get_group_overview` era `SECURITY INVOKER`; o resultado dependia da RLS do visitante |
| Finalização | FAIL | `completed → not_started` não desbloqueava receitas; RPC de edição não verificava status do grupo |
| Acesso anônimo | FAIL | RPC de edição não validava de forma completa JWT/perfil anônimo |
| Login UX | FAIL | erros técnicos crus, ausência de loading robusto e labels sem associação |
| Loading/error/retry | FAIL parcial | grupo/perfil tinham retry; home, login e várias ações não tinham timeout consistente |
| Segurança do frontend | FAIL parcial | CDN sem versão fixa/SRI; CSP ausente; HTML dinâmico em excesso |
| Auth real com credenciais | NÃO VERIFICADO | nenhuma credencial foi solicitada ou exposta durante a auditoria |

## Achados e correções

### Alto

1. **Autorização incompleta em `save_recipe_classroom`.** Comparações com papel nulo podiam falhar em modo permissivo, e anonimato/status finalizado não eram validados integralmente. A RPC agora exige usuário, perfil não anônimo, papel/grupo válidos e verifica bloqueio e status.
2. **Finalização burlável por receita reaberta isoladamente.** O trigger de `UPDATE` verificava apenas `old.is_locked`. Agora toda escrita de aluno consulta o status do grupo e bloqueia alterações em grupo finalizado.
3. **Atualização direta de `profiles` excessivamente ampla para professor e inexistente para aluno.** O grant de `UPDATE` foi revogado de `authenticated`; três RPCs expõem apenas os campos autorizados e validam papel/alvo.

### Médio

1. Reabertura para `not_started` mantinha receitas bloqueadas. Corrigido para desbloquear em qualquer status diferente de `completed`.
2. Storage não possuía limite de tamanho ou MIME no bucket. Limitado a 5 MiB e JPG/PNG/WebP, com policies de escrita exclusivas do professor.
3. Metadados e QR apontavam para o repositório antigo. Corrigidos e QR regenerado em SVG e PNG autocontidos.
4. Dependência Supabase estava solta em `@2`. Fixada em `2.116.0` com SRI.
5. Ausência de timeout consistente podia manter telas em loading indefinido. Criado timeout compartilhado de 12 segundos com erro e retry nas telas principais.

### Baixo

1. 404 com base path incorreto; corrigido.
2. Labels de login sem `for`; corrigidos.
3. Efeitos escondiam elementos demais e o visual usava glass/gradientes decorativos. Reduzidos a reveal leve e barra de progresso, com identidade escolar/científica mais direta.
4. Cache busting divergente (`v=2`, `v=3`, `v=5`). Unificado em `v=3.0.0`.

## Matriz de autorização efetiva

| Recurso | Visitante/anon | Aluno | Professor |
|---|---:|---:|---:|
| Ler grupos/status/receitas/aviso | Sim | Sim | Sim |
| Ver nomes e números | Não | Somente próprio grupo | Todos os cadastrados |
| Editar perfil próprio | Não para conta anônima | Sim, nome/número | Sim, nome/número |
| Criar receita | Não | Próprio grupo não finalizado | Sim |
| Editar receita | Não | Próprio grupo não finalizado | Sim |
| Excluir receita | Não | Não | Sim |
| Alterar status/aviso/foto | Não | Não | Sim |
| Organizar usuários/papéis | Não | Não | Sim, com validação server-side |
| Ler histórico | Não | Não | Sim |
| Excluir conta | Não | Não | Somente aluno; nunca a própria conta |

## Banco e migrations

Migration V3: `harden_permissions_and_classroom_flows_v3`, registrada no Supabase como versão `20260920173730` e versionada localmente em `supabase/migrations/20260920171959_harden_permissions_and_classroom_flows.sql`.

Estado verificado após a migration:

- 6 grupos, 5 perfis, 0 receitas reais, 1 configuração e 2 registros de histórico.
- 0 perfis órfãos, 0 receitas órfãs, 0 números duplicados no mesmo grupo, 0 status inválidos.
- RLS ativo nas tabelas públicas.
- Realtime: `groups`, `recipes`, `classroom_settings`, `profiles`.
- Bucket `activity-photos` público para leitura, restrito para escrita, vazio no momento da auditoria.
- Nenhum padrão de `service_role`, `sb_secret_`, senha de banco ou JWT secret encontrado no histórico Git local.

## Testes de banco

Todos executados em transações com `ROLLBACK`; nenhum registro de QA permaneceu.

- Cinco transições de status, inclusive `completed → not_started`: PASS.
- Bloqueio ao finalizar e desbloqueio ao reabrir: PASS.
- Múltiplas receitas no mesmo grupo: PASS.
- Edição da própria receita: PASS.
- Unicode e payloads de XSS armazenados como texto: PASS.
- Número vazio e conflito de número no mesmo grupo: PASS.
- Visibilidade de integrantes do próprio grupo: PASS.
- Aluno tentando alterar perfil alheio, papel, outro grupo, status, aviso, lock, conta e histórico: NEGADO.
- Conta anônima tentando editar perfil e receita via RPC: NEGADO.
- Professor tentando excluir a própria conta: NEGADO.
- URL externa/inválida de foto: NEGADA.
- Resíduos `__V3_QA__`: 0.

## Testes estáticos

- `node --check` em todos os scripts: PASS.
- `html-validate` em 11 páginas: PASS.
- `node tests/static-regression.mjs`: PASS.
- `git diff --check`: PASS.
- QR PNG decodificado para a URL canônica: PASS.

## Supabase Advisors

- **Leaked Password Protection**: pendente no painel de Auth.
- Functions `SECURITY DEFINER`: avisos esperados. As RPCs privilegiadas são endpoints intencionais, têm `search_path` fixo, grants mínimos e validação interna; as funções de trigger não são executáveis por clientes.
- `get_group_overview`: endpoint público intencional que retorna apenas agregados e dados públicos de grupo.
- Avisos de performance de RLS: baixo impacto para seis grupos e poucos perfis; não justificam complexidade adicional nesta atividade.

## Production readiness

| Área | Status | Evidência/Ação |
|---|---|---|
| Funcionalidade pública | PASS | home e seis grupos carregam |
| Auth por e-mail | NÃO VERIFICADO | exige credencial real/conta confirmada |
| Autorização/RLS/RPC | PASS | testes positivos e negativos transacionais |
| Storage | PASS parcial | regras/limites verificados; upload real autenticado não executado |
| Realtime | PASS parcial | publicação e assinaturas confirmadas; duas sessões reais não executadas |
| Receitas/status/perfil | PASS | testes transacionais e validações frontend |
| Professor/exclusão | PASS parcial | backend testado; UI autenticada sem credencial não executada |
| XSS | PASS | escaping/textContent/CSP e payloads literais |
| Mobile | PASS parcial | CSS 320–430 sem larguras fixas críticas; render real nesses viewports pendente |
| Acessibilidade | PASS parcial | labels, foco, teclado semântico e reduced motion; auditoria assistiva completa pendente |
| Performance | PASS | frontend leve, CDN fixada, sem framework/PWA |
| SEO/metadados/404 | PASS | domínio/base path corrigidos e rotas privadas com noindex |
| QR | PASS | SVG+PNG e decodificação confirmada |
| GitHub Pages | PASS | ambiente canônico confirmado |
| Leaked Password Protection | FAIL | precisa ser habilitado no painel Supabase Auth |

O status global é **PASS parcial**: os fluxos públicos e o backend de autorização estão prontos; permanecem pendentes somente verificações que exigem credenciais reais/configuração de Auth ou viewport/browser adicional.
