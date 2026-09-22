# Auditoria de performance — 22/09/2026

Produção: <https://guilherme-augusto-inf.github.io/Receitas-INF1A/>  
Supabase: `fbniifpkiyafpuhpnbll` (`sa-east-1`)  
Commit funcional: `c57fb83581e1739a16da32b9c62014c07d3c3089`

## Diagnóstico medido

- `pg_stat_statements`: `realtime.list_changes` tinha 54.061 chamadas, 290.386 ms acumulados e média de 5,371 ms. Uma amostra sem qualquer subscription ativa ainda registrou 23 chamadas em 10 segundos; a quantidade alta de chamadas é majoritariamente o polling interno do Realtime, não uma consulta disparada pelo frontend a cada renderização.
- Todas as páginas que carregavam `classroom.js` abriam seis subscriptions, inclusive Perfil, que não utilizava nenhuma atualização em tempo real.
- Páginas de grupo executavam reload completo em eventos de `groups`, `recipes` ou `profiles`.
- A abertura pública de um grupo exigia quatro requests REST: anúncio, grupo, receitas e configuração. Para um aluno/professor eram seis, contando perfil e integrantes.
- `teacher_dashboard_snapshot`: 20.701 bytes JSON, 8 perfis, 6 grupos, 0 receitas, 54 checks, 1 aviso, 11 históricos e 0 itens na lixeira. `EXPLAIN ANALYZE`: 7,629 ms. O snapshot único foi mantido porque é pequeno e evita diversos round trips.
- `get_group_overview`: 1.394 bytes. Estado público da apresentação: 1.482 bytes. Ambos ficaram abaixo de 10 ms no `EXPLAIN ANALYZE`.
- Assets próprios: aproximadamente 130 KB não comprimidos; sem fontes externas, sem fotos armazenadas e sem evidência de CSS/animações como gargalo.

## Alterações

- Realtime passou a ser configurado por página, com filtros por grupo quando possível, debounce/coalescing e cleanup em `pagehide`.
- Perfil passou de seis subscriptions para zero; Home de seis para quatro; Grupo, Professor e Apresentação de seis para cinco.
- `recipe_reviews` deixou de ser assinado globalmente.
- Eventos de grupo não usam mais `location.reload()`; os dados permanecem visíveis enquanto um refresh incremental é executado.
- A nova RPC `get_group_page(text)` reúne grupo, receitas, configuração e integrantes autorizados.
- Perfil e sessão são reutilizados durante a vida da página e invalidados quando o próprio perfil muda.
- Refreshes causados por uma mesma operação são coalescidos e um refresh recém-concluído impede repetição imediata.
- Timers de apresentação pausam em aba oculta; voltar após mais de 30 segundos reconcilia o estado.
- Fotos futuras usam `decoding="async"`.

## Requests antes e depois

| Fluxo | Antes | Depois |
|---|---:|---:|
| Grupo público, REST inicial | 4 | 2 |
| Grupo autenticado, REST inicial | 6 | 3 |
| Evento de receita no grupo | navegação + 4–6 REST | 1 RPC, sem navegação |
| Refresh Realtime do professor | perfil + snapshot | snapshot; perfil só se o próprio perfil mudou |
| Perfil, subscriptions | 6 | 0 |
| Home, subscriptions | 6 | 4 |
| Grupo, subscriptions | 6 amplas | 5, com filtros de grupo/receita/configuração |
| Professor, subscriptions | 6 | 5 |
| Apresentação, subscriptions | 6 | 5 |

O bootstrap público do Grupo 1 retornou 284 bytes no estado atual. Pelo PostgREST real, `get_group_page` registrou média de 1,721 ms nas primeiras chamadas em produção.

## Tempo até conteúdo útil

Medição no mesmo navegador remoto, esperando o principal elemento de dados de cada rota. Estes números incluem variabilidade de rede e não substituem RUM; a redução de requests dá a evidência estrutural principal.

| Rota | Antes | Depois | Variação |
|---|---:|---:|---:|
| Home | 468 ms | 407 ms | -13,0% |
| Login | 316 ms | 369 ms | +16,8% (ruído; código inalterado) |
| Cadastro | 252 ms | 217 ms | -13,9% |
| Perfil sem sessão | 323 ms | 323 ms | 0% |
| Grupo 1 | 806 ms | 573 ms | -28,9% |
| Professor sem sessão | 372 ms | 295 ms | -20,7% |
| Apresentação | 861 ms | 543 ms | -36,9% |

## Banco, índices e Advisors

- Nenhum índice foi criado, alterado ou removido: os planos são rápidos, os índices de `slug`, `group_id`, histórico e revisão já cobrem as consultas reais e a base é pequena.
- Performance Advisor: somente 11 avisos informativos de índices ainda não utilizados; nenhum aviso de FK sem índice ou `auth_rls_initplan`.
- Security Advisor: avisos heurísticos das RPCs `SECURITY DEFINER` intencionais e das policies compatíveis com anonymous sign-in. `get_group_page` revoga `PUBLIC`, expõe somente execução a `anon`/`authenticated`, filtra lixeira e só retorna integrantes após validar perfil, anonimato, papel e grupo.
- A proteção contra senhas vazadas continua dependendo de habilitação manual no Supabase Auth.

## Decisões de não alteração

- O snapshot do professor não foi dividido: 20,7 KB e 7,6 ms são menores que o custo de múltiplos endpoints em uma conexão móvel.
- Não foram adicionados Service Worker, materialized view, backend intermediário, Edge Function, bundler ou connection pool no navegador.
- Ingredientes/instruções não foram removidos do snapshot porque atualmente há zero receitas; a otimização não teria benefício mensurável agora.
- `realtime.list_changes` não foi tratado como consulta da aplicação: ele continuou executando sem subscriptions ativas, confirmando seu caráter interno.

## Validação

- Sintaxe JavaScript e HTML das 13 páginas.
- Regressão estática, CSP, ausência de segredo e ausência de reload completo no grupo.
- RLS/RPC: anônimo não recebe integrantes; aluno recebe integrantes do próprio grupo e não de outro; receitas em soft delete não aparecem; RPC de professor continua negada ao aluno.
- Realtime em produção: subscriptions filtradas confirmadas na tabela interna e removidas ao sair da página.
- Home, login, cadastro, redirecionamentos protegidos, Grupo 1 e modo apresentação validados no GitHub Pages, sem erro de aplicação no console.

## Segunda rodada — bootstrap consolidado

Uma nova auditoria em 22/09/2026 encontrou dois round trips ainda elimináveis nas páginas de grupo: o perfil mínimo do visitante e o aviso atual eram buscados separadamente, embora `get_group_page` já consultasse o visitante para autorizar integrantes.

| Fluxo | Antes | Depois |
|---|---:|---:|
| Grupo público, leituras REST iniciais | 2 | 1 |
| Grupo autenticado, leituras REST iniciais | 3 | 1 |
| Perfil autenticado, leituras REST | 2 sequenciais | 1 |

`get_group_page('grupo-1')` passou de 306 para 470 bytes no banco (+164 bytes), porque agora inclui o aviso público e quatro campos mínimos do próprio visitante. O `EXPLAIN ANALYZE` passou de 3,861 ms para 4,306 ms (+0,445 ms). Esse pequeno custo no PostgreSQL elimina respostas HTTP completas e, principalmente, dois períodos de latência de rede no celular.

O relógio de Brasília também passou a suspender o `setInterval` quando a aba fica oculta. Nenhum índice, policy RLS ou subscription foi adicionado: os planos e o volume atual continuam não justificando essas mudanças.
