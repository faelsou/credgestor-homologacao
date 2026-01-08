# CredGestor Homologação – Integração Supabase (Backend)

## Fluxo de autenticação

1. O front-end envia `POST /auth/login` (ou `/webhook/auth/login`) com `{ email, senha, tenant_id }`.
2. O backend usa o **Supabase Auth** (`sign_in_with_password`) com a `SUPABASE_ANON_KEY`.
3. O token de acesso retornado pelo Supabase é repassado ao front-end no formato esperado.
4. Todas as operações protegidas exigem o header `Authorization: Bearer <token>`.

## Resolução do tenant

A resolução do `tenant_id` segue a ordem:

1. `tenant_id` presente em `user_metadata` ou `app_metadata` do usuário no Supabase Auth.
2. `tenant_id` informado na requisição (payload ou path), validado contra `tenant_users`.
3. Quando só existe um tenant vinculado ao e-mail em `tenant_users`, ele é usado automaticamente.

Se o usuário estiver vinculado a múltiplos tenants e nenhum `tenant_id` for informado, o backend retorna erro solicitando o tenant.

## Operações protegidas

- Todas as rotas `/tenants/{tenant_id}/...` exigem token válido e conferem se o `tenant_id` da rota corresponde ao tenant do usuário.
- Operações globais (`/tenants`, `/users`) são restritas a `role = super_admin` no metadata do Supabase Auth.

## Exemplos de payloads

### Login

```json
POST /auth/login
{
  "email": "admin@cliente-alpha.com",
  "senha": "senhaFort3!",
  "tenant_id": "00000000-0000-0000-0000-000000000001"
}
```

### Criar cliente

```json
POST /tenants/00000000-0000-0000-0000-000000000001/clients
Authorization: Bearer <token>

{
  "nome_completo": "João da Silva",
  "cpf": "12345678901",
  "email": "joao@email.com",
  "whatsapp": "11999999999"
}
```

## Políticas RLS (exemplo)

As políticas abaixo devem existir no Supabase (ou equivalente), garantindo isolamento por tenant.

```sql
-- Exemplo para tabela clients
alter table public.clients enable row level security;

create policy "tenant read" on public.clients
for select using (
  auth.uid() = user_id and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
);

create policy "tenant write" on public.clients
for insert with check (
  auth.uid() = user_id and tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
);
```

Ajuste as policies conforme o modelo real das suas tabelas (campos `user_id`, `tenant_id`, etc.).

## Logs de auditoria

O backend tenta registrar log em `login_audit` (caso exista) com `tenant_id`, `user_id`, `email` e timestamp ao efetuar login.

## Observações de segurança

- Nunca expor a `SUPABASE_SERVICE_ROLE_KEY` no frontend.
- Manter RLS ativo em todas as tabelas.
- Garantir que todo acesso do backend valide o tenant.
