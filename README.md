# Receitas-INF1A

Site da atividade prática de Biologia da turma INF1A.

## Estrutura

- `index.html` — página inicial e listagem dos grupos.
- `grupo-1/` a `grupo-6/` — páginas públicas de cada grupo.
- `login/` — autenticação.
- `perfil/` — perfil do usuário.
- `professor/` — painel administrativo do professor.
- `public/` — JavaScript compartilhado, estilos e assets públicos.
- `supabase/migrations/` — migrações SQL do banco.
- `404.html` — página de erro personalizada.
- `vercel.json` — cabeçalhos/configuração da Vercel.

## Dados

Os grupos e receitas são armazenados no Supabase. As permissões de leitura e edição são protegidas por RLS no banco.

Nenhuma receita oficial é definida no código: enquanto não houver cadastro, o grupo informa que a receita ainda não foi cadastrada.

## Desenvolvimento

Projeto estático, sem build obrigatório. A raiz do repositório deve ser usada como **Root Directory** na Vercel.

Não versionar credenciais, tokens ou chaves privadas.
