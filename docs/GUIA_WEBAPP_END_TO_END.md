# Guia End-to-End do WebApp CredGestor

Este documento descreve o uso completo do WebApp do CredGestor, do primeiro acesso ao acompanhamento diário da operação.

## 1) Objetivo do WebApp

O CredGestor é um sistema para:
- cadastrar clientes;
- registrar empréstimos (Price e Somente Juros);
- controlar parcelas, recebimentos e atrasos;
- acompanhar histórico dos empréstimos;
- gerenciar equipe e acessos (perfil administrador).

## 2) Pré-requisitos

- Navegador moderno (Chrome, Edge, Firefox ou Safari atualizado).
- URL do sistema (produção): `https://credgestor.app.br`.
- Usuário e senha válidos cadastrados no backend.

## 3) Primeiro acesso e login

1. Acesse `https://credgestor.app.br`.
2. Clique em **Entrar agora**.
3. Informe **email** e **senha**.
4. Clique em **Entrar no Sistema**.

Se o login for válido, você entra no painel principal (Dashboard).

### 3.1 Esqueci senha

1. Na tela de login, clique em **Esqueci senha**.
2. Informe seu email e clique em **Enviar link**.
3. Abra o email recebido e clique no link de redefinição.
4. Defina a nova senha e confirme.
5. Volte para o login e entre normalmente.

## 4) Perfis de acesso

## **Administrador**
- Acesso total: clientes, empréstimos, parcelas, histórico e equipe/acessos.
- Pode criar/editar/excluir clientes e empréstimos.
- Pode receber parcelas, editar parcelas e agendar recebimentos.

## **Cobrador**
- Acesso operacional de cobrança e consulta.
- Não acessa o menu de administração de equipe.

## 5) Visão geral da navegação

Após login, o menu lateral exibe:
- **Dashboard**
- **Clientes**
- **Empréstimos**
- **Parcelas**
- **Histórico de empréstimo**
- **Equipe / Acessos** (somente administrador)

No topo do sistema, é possível trocar o tema visual:
- Claro
- Dark Esmeralda
- Dark Grafite

## 6) Fluxo operacional recomendado (fim a fim)

Ordem sugerida para operação diária:

1. **Cadastrar cliente**  
2. **Criar empréstimo**  
3. **Acompanhar parcelas** (receber, atrasos, promessas)  
4. **Consultar histórico de empréstimos**  
5. **Exportar relatórios** (Dashboard e Parcelas)  

---

## 7) Módulo Clientes

### 7.1 Cadastrar cliente

1. Acesse **Clientes**.
2. Clique em **Novo Cliente**.
3. Preencha os campos obrigatórios:
   - Nome completo
   - CPF
   - WhatsApp
   - CEP e endereço
4. Preencha os opcionais (email, data de nascimento, complemento).
5. Clique em **Salvar**.

Observações:
- O sistema tenta buscar endereço automático pelo CEP.
- Clientes podem ser marcados como **Ativo** ou **Bloqueado**.

### 7.2 Editar cliente

1. Na lista de clientes, clique no ícone de **editar**.
2. Ajuste os dados.
3. Clique em **Salvar**.

### 7.3 Excluir cliente

1. Clique no ícone de **excluir**.
2. Confirme a ação.

Importante:
- Se o cliente tiver empréstimos, o sistema alerta antes da exclusão.

---

## 8) Módulo Empréstimos

### 8.1 Criar empréstimo

1. Acesse **Empréstimos**.
2. Clique em **Novo Empréstimo**.
3. Preencha:
   - Cliente
   - Valor
   - Juros (%)
   - Modelo (**Price** ou **Somente Juros**)
   - Quantidade de parcelas
   - Data da 1ª parcela
4. Revise a simulação (parcelas, juros e amortização).
5. Preencha os dados da nota promissória.
6. Clique em **Confirmar Empréstimo**.

### 8.2 Modelos de empréstimo

## **Price**
- Parcelas com composição de juros + amortização.
- Controle padrão por cronograma de parcelas.

## **Somente Juros**
- Parcelas focadas em juros periódicos.
- Pode haver amortização parcial de capital durante recebimentos.

### 8.3 Ações disponíveis por empréstimo

Na tabela de empréstimos, você pode:
- gerar **Resumo em PDF**;
- gerar **Nota Promissória Oficial**;
- **Agendar recebimento** da próxima parcela;
- **Editar** empréstimo;
- **Excluir** empréstimo;
- **Reabrir** empréstimo (quando estiver finalizado).

---

## 9) Módulo Parcelas (cobrança)

Esse é o módulo principal para operação diária de cobrança.

### 9.1 Filtros e busca

Você pode filtrar por:
- status: **Todas**, **A Vencer**, **Em Atraso**, **Parcial**, **Pagas**;
- período (data início e fim);
- busca por nome do cliente ou número da parcela.

### 9.2 Ações por parcela

Para cada parcela, você pode:
- abrir WhatsApp com mensagem de lembrete;
- registrar recebimento (**Receber**);
- agendar recebimento futuro (**Agendar recebimento**);
- editar dados da parcela (admin).

### 9.3 Baixa de pagamento

1. Clique em **Receber** na parcela.
2. Informe valor recebido e data de pagamento.
3. Confirme.

Regras práticas:
- O sistema valida valor mínimo quando aplicável (ex.: juros).
- Em caso de pagamento parcial, o histórico fica registrado.
- Para empréstimos finalizados, o status pode mudar automaticamente.

### 9.4 Agendamento de recebimento

1. Clique em **Agendar recebimento**.
2. Informe:
   - motivo;
   - valor combinado;
   - multa/atraso (opcional);
   - data prometida.
3. Salve.

O histórico de promessas fica visível na própria parcela.

### 9.5 Exportar planilha

- Clique em **Exportar Excel** no módulo Parcelas.
- O arquivo exporta os dados de acordo com os filtros atuais.

---

## 10) Dashboard (gestão e análise)

O Dashboard apresenta duas visões:
- **Empréstimos Parcelados**
- **Empréstimos Somente Juros**

Em cada visão você pode:
- aplicar filtro por período;
- ver indicadores de recebido, a receber, atraso e ativos;
- clicar nos cards para abrir Parcelas já filtradas;
- exportar planilha da visão.

---

## 11) Histórico de Empréstimo

Em **Histórico de empréstimo**, você consegue:
- filtrar por cliente, período e status;
- visualizar principal, total, valor em aberto e modelo;
- editar um empréstimo existente;
- reabrir empréstimo finalizado;
- agendar recebimento da próxima parcela pendente.

---

## 12) Equipe e Acessos (Administrador)

No menu **Equipe / Acessos**:

### 12.1 Adicionar usuário

1. Clique em **Novo Usuário**.
2. Preencha nome, email, senha.
3. Defina o perfil (**Cobrador** ou **Administrador**).
4. (Opcional) Cadastre contatos WhatsApp do admin.
5. Clique em **Cadastrar**.

### 12.2 Remover usuário

1. Clique no ícone de exclusão no cartão do usuário.
2. Confirme a remoção.

Observação:
- O usuário logado não pode remover a si mesmo.

---

## 13) Boas práticas de operação

- Sempre cadastre o cliente antes de criar empréstimo.
- Revise juros, modelo e datas antes de confirmar.
- Registre pagamentos no mesmo dia para manter indicadores corretos.
- Use agendamentos quando houver promessa de pagamento.
- Exporte relatórios periodicamente para conferência e auditoria.

## 14) Problemas comuns e solução rápida

## **Não consigo logar**
- Verifique email/senha.
- Tente recuperação de senha.
- Confirme se o backend está acessível.

## **Erro ao salvar cliente/empréstimo**
- Confira se sua sessão está ativa.
- Faça logout/login novamente.
- Verifique conexão com internet/API.

## **Link de reset não funciona**
- Confira se abriu o link completo recebido no email.
- Verifique se o token não expirou.
- Solicite novo link de recuperação.

## 15) Resumo do processo diário

1. Entrar no sistema  
2. Conferir Dashboard  
3. Cobrar e baixar parcelas do dia  
4. Registrar promessas de pagamento  
5. Atualizar/emendar empréstimos quando necessário  
6. Exportar relatórios para fechamento  

