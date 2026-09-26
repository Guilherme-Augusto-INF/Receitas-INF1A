# Receitas-INF1A

Site da atividade prática de Biologia da turma INF1A. A aplicação é estática (HTML, CSS e JavaScript), usa Supabase para autenticação e dados e é publicada pelo GitHub Pages.

## Produção

- Site: <https://guilherme-augusto-inf.github.io/Receitas-INF1A/>
- Repositório: <https://github.com/Guilherme-Augusto-INF/Receitas-INF1A>
- Supabase: projeto `Atividade de Biologia - Grupos` (`fbniifpkiyafpuhpnbll`)
- Branch publicada: `main`

O `vercel.json` foi mantido apenas como compatibilidade histórica. Vercel não é o ambiente principal deste projeto.

## O que o sistema faz

### Alunos

- Consultam os seis grupos, temas, status e quantidade de receitas.
- Visualizam receitas publicamente.
- Após login, veem os integrantes do próprio grupo.
- Editam o próprio nome e número de chamada.
- Criam e editam múltiplas receitas apenas no próprio grupo.
- Não alteram receitas quando o grupo está finalizado.

### Professor

- Usa uma central responsiva com métricas, pendências e atividade recente.
- Pesquisa, filtra, edita e move alunos individualmente ou em massa.
- Gerencia grupos, status e checklist automático/manual.
- Revisa receitas, aprova ou solicita correções com histórico de feedback.
- Publica, destaca, oculta e agenda a validade de avisos.
- Bloqueia, libera ou finaliza a atividade com autorização no banco.
- Recupera receitas pela lixeira e exporta a turma em CSV.
- Abre um modo apresentação legível para projeção em sala.
- Envia fotos JPG, PNG ou WebP de até 5 MiB.
- Exclui contas de alunos com confirmação; não pode excluir a própria conta nem outra conta de professor.

### Colaboração: texto, Forms e frases

- Integrantes autenticados podem cadastrar e editar o texto e o link do formulário do próprio grupo enquanto a atividade estiver aberta.
- Todos podem consultar os formulários publicados e as frases compartilhadas entre os grupos.
- Limite de 30 frases por grupo, com prevenção de duplicatas feita no banco (maiúsculas, acentos, espaços e pontuação final).
- Integrantes removem frases do próprio grupo; professores podem gerenciar todos os grupos.
- Alunos não alteram outros grupos nem editam após bloqueio/finalização. Visitantes anônimos consultam sem editar.
- Migration `20260926124921_shared_group_phrases_and_form_editing.sql`.

### Acesso anônimo

O acesso anônimo é somente para consulta. Ele não pode editar perfil, receitas, status, avisos, fotos ou contas e não aparece na lista do professor.

## Estrutura

- `index.html`: home e progresso da turma.
- `grupo-1/` a `grupo-6/`: páginas dos grupos usando o comportamento compartilhado de `public/group.js`.
- `login/`, `perfil/`, `professor/`: autenticação, perfil e painel.
- `apresentacao/`: acompanhamento público para projeção, sem controles administrativos.
- `public/`: estilos, scripts compartilhados, metadados e QR Codes.
- `supabase/migrations/`: migrations versionadas; migrations aplicadas não devem ser reescritas.
- `tests/static-regression.mjs`: verificações estáticas reproduzíveis.

## Segurança

- O frontend contém somente a chave pública `publishable` do Supabase.
- RLS está ativo em todas as tabelas públicas da aplicação.
- RPCs `SECURITY DEFINER` revogam `PUBLIC`/`anon` quando a operação exige login e validam `auth.uid()`, papel, anonimato, grupo e alvo internamente.
- Atualizações de perfil usam RPCs com campos permitidos; `authenticated` não possui `UPDATE` direto em `profiles`.
- Finalização é imposta por função e trigger no banco, não apenas pela interface.
- Ações administrativas em massa são transacionais e auditadas.
- Receitas usam versão otimista para impedir que uma edição simultânea sobrescreva outra silenciosamente.
- O bucket público de fotos limita tamanho e MIME; somente professores autenticados podem escrever.
- Dados dinâmicos são escapados ou inseridos com `textContent`.
- `@supabase/supabase-js` está fixado em `2.116.0` com SRI.
- GitHub Pages não permite configurar livremente headers HTTP. O projeto usa CSP por `<meta>` e `Referrer-Policy` por meta; `frame-ancestors`, `X-Content-Type-Options` e `Permissions-Policy` continuam limitados pelo host.

O Security Advisor ainda informa que **Leaked Password Protection** está desativado. Essa opção precisa ser habilitada nas configurações de Auth do projeto e não é controlável pelas migrations usadas aqui.

## Realtime

As tabelas `groups`, `recipes`, `classroom_settings` e `profiles` estão na publicação `supabase_realtime`. O frontend mantém um único canal por página e atualiza home, avisos e páginas de grupo conforme o recurso alterado.

## Testes locais

```bash
node tests/static-regression.mjs
for file in public/*.js tests/*.mjs; do node --check "$file"; done
npx html-validate index.html 404.html login/index.html perfil/index.html professor/index.html grupo-*/index.html
```

O QR Code canônico está disponível em `public/qr-code.svg` e `public/qr-code.png` e codifica a URL de produção acima.

## Auditoria V3

O inventário, os achados, a matriz de permissões, os testes negativos e a avaliação de prontidão estão em [`AUDIT-V3.md`](AUDIT-V3.md).

A evolução do painel, o workflow de revisão e os testes de segurança estão em [`AUDIT-TEACHER-CENTER.md`](AUDIT-TEACHER-CENTER.md).

A medição antes/depois, os gargalos encontrados e as decisões de otimização estão em [`PERFORMANCE-AUDIT.md`](PERFORMANCE-AUDIT.md).
