# 🔐 Configuração do Reset de Senha - Supabase

## ⚠️ Problema Comum

Se o link de reset de senha está redirecionando para `localhost:3000` em vez da URL de produção, é necessário configurar as URLs permitidas no Supabase Dashboard.

## ✅ Solução: Configurar URLs no Supabase Dashboard

### Passo 1: Acessar Configurações de Autenticação

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Authentication** → **URL Configuration**

### Passo 2: Configurar Site URL

No campo **Site URL**, configure:
```
https://credgestor.app.br
```

### Passo 3: Adicionar Redirect URLs

No campo **Redirect URLs**, adicione as seguintes URLs (uma por linha):

**Produção:**
```
https://credgestor.app.br/reset-password
https://credgestor.app.br/*
https://www.credgestor.app.br/reset-password
https://www.credgestor.app.br/*
```

**Desenvolvimento Local (opcional):**
```
http://localhost:3000/reset-password
http://localhost:3000/*
http://127.0.0.1:3000/reset-password
http://127.0.0.1:3000/*
```

### Passo 4: Salvar Configurações

Clique em **Save** para salvar as alterações.

## 🔧 Configuração via Variável de Ambiente (Recomendado)

Para maior flexibilidade, configure a variável de ambiente `FRONTEND_URL` no backend:

```bash
FRONTEND_URL=https://credgestor.app.br
```

Isso garante que o backend sempre use a URL correta, independente da configuração do Supabase.

## 📝 Verificação

Após configurar:

1. Solicite um novo reset de senha
2. Verifique se o email contém o link correto
3. O link deve apontar para: `https://credgestor.app.br/reset-password#access_token=...`

## 🐛 Troubleshooting

### Problema: Link ainda redireciona para localhost

**Solução:**
1. Verifique se as URLs estão corretas no Supabase Dashboard
2. Verifique se a variável `FRONTEND_URL` está configurada no backend
3. Limpe o cache do navegador
4. Solicite um novo email de reset

### Problema: Erro "Invalid redirect URL"

**Solução:**
- A URL exata do redirect deve estar na lista de "Redirect URLs"
- URLs com `*` no final permitem qualquer path após o prefixo
- Certifique-se de usar `https://` em produção

## 📚 Referências

- [Supabase Auth - URL Configuration](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Auth - Password Reset](https://supabase.com/docs/guides/auth/auth-password-reset)
