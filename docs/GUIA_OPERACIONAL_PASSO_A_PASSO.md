# Guia Operacional Passo a Passo (WebApp CredGestor)

Este documento foi feito para quem precisa de instruções bem detalhadas, com exemplos práticos, para evitar erros de cadastro e operação. Siga cada passo com calma e use os checklists ao final de cada seção.

1. Cadastrar clientes
2. Criar novo emprestimo
3. Receber pagamento
4. Editar emprestimo
5. Editar cadastro do cliente

## 1) Como cadastrar clientes

Passo a passo detalhado:
1. Acesse o menu **Clientes** (menu lateral).
2. Clique em **Novo Cliente** (botão no topo direito da lista).
3. Preencha os campos obrigatorios (um por vez):
   - Nome completo  
     Exemplo: Maria de Souza Lima
     - Faça: usar o nome civil completo.
     - Não faça: apelidos (ex.: “Mariazinha”), nomes incompletos.
   - CPF  
     Exemplo: 123.456.789-09 (digite apenas números; o sistema formata)  
     - Faça: confira cada dígito com documento do cliente.  
     - Não faça: usar CPF de outra pessoa ou CNPJ neste campo.
   - WhatsApp (com DDD)  
     Exemplo: (11) 91234-5678  
     - Faça: inclua DDD e valide com o cliente no momento do cadastro.  
     - Não faça: colocar telefone fixo aqui.
   - CEP e endereco  
     Exemplo de CEP: 01311-000  
     - Dica: ao informar o CEP, o sistema tenta preencher rua/bairro/cidade automaticamente; confira antes de salvar.  
     - Complete número e complemento quando necessário.
4. Campos opcionais (preencha se souber):
   - Email (ex.: maria@email.com)
   - Data de nascimento (ex.: 23/04/1985)
   - Complemento (ex.: Apto 34, Bloco B)
5. Clique em **Salvar**.

Erros comuns (e como evitar):
- CPF com números trocados: peça o documento e confira devagar, dígito por dígito.
- Telefone sem DDD: sempre inclua o DDD (ex.: 11, 21, 31).
- Endereço automático errado: após o CEP, revise rua/bairro/cidade/número.

Checklist rapido (antes de salvar):
- Nome completo está correto?
- CPF confere com o documento?
- WhatsApp tem DDD e foi validado?
- Endereço (rua, número, bairro, cidade, CEP) está correto?

## 2) Como criar novo emprestimo

Passo a passo detalhado:
1. Acesse o menu **Emprestimos**.
2. Clique em **Novo Emprestimo**.
3. Selecione o **Cliente** (digite parte do nome e escolha na lista).
4. Preencha os dados principais, com atenção:
   - Valor do emprestimo  
     Exemplo: 5.000,00  
     - Faça: confirme o valor com o cliente.  
     - Não faça: usar vírgula no lugar de ponto ao digitar rápido; confira após digitar.
   - Juros (%) ao mês  
     Exemplo: 6,00  
     - Faça: insira a taxa combinada (ao mês), com vírgula.  
     - Não faça: colocar “0” por engano ou taxa anual aqui.
   - Modelo  
     Escolha entre **Price** (parcelas com juros+amortização) ou **Somente Juros** (pagam juros periodicamente; capital pode ser amortizado depois).
   - Quantidade de parcelas  
     Exemplo: 12
   - Data da primeira parcela  
     Exemplo: 10/05/2026 (evite finais de semana/feriados se isso for prática da sua operação)
5. Revise a simulacao (o sistema mostra tabela com valor das parcelas, juros e amortização).
6. Preencha os dados da nota promissória (quando solicitado).
7. Clique em **Confirmar Emprestimo**.

Erros comuns (e como evitar):
- Trocar vírgula por ponto na taxa de juros: use vírgula (ex.: 6,00).
- Data da 1ª parcela no passado: escolha sempre uma data futura válida.
- Escolher modelo errado: se tiver dúvida, use Price (mais comum) ou peça confirmação.

Checklist rapido (antes de confirmar):
- Valor e taxa de juros conferem?
- Quantidade de parcelas correta?
- Data da 1ª parcela correta?
- Modelo de cálculo correto para o caso?

## 3) Como receber pagamento (baixa de parcela)

Passo a passo detalhado:
1. Acesse o menu **Parcelas**.
2. Use os filtros para localizar a parcela:
   - Status (A Vencer, Em Atraso, Pagas, etc.)
   - Período (data início e fim)
   - Busca pelo nome do cliente
3. Clique em **Receber** na linha da parcela correta.
4. Preencha:
   - Valor recebido (ex.: 450,00)  
     - Faça: se for parcial, informe exatamente o que entrou.  
     - Não faça: arredondar “de cabeça”.
   - Data do pagamento (ex.: 12/05/2026)
5. Clique em **Confirmar**.

O que acontece:
- Pagamento parcial fica registrado no histórico.
- Status da parcela e do emprestimo pode mudar automaticamente.

Erros comuns (e como evitar):
- Baixar a parcela errada: confira nome do cliente, nº da parcela e valor previsto.
- Data de pagamento incorreta: verifique dia/mês/ano com o comprovante.
- Receber valor total quando foi parcial: separe o que entrou de fato.

Checklist rapido (depois de confirmar):
- A parcela mudou para o status esperado?
- Se foi parcial, o saldo restante aparece corretamente?
- O histórico mostra o recebimento?

## 4) Como editar emprestimo

Passo a passo detalhado:
1. Acesse **Emprestimos** ou **Historico de emprestimo**.
2. Localize o emprestimo (filtros por cliente/período).
3. Clique em **Editar**.
4. Ajuste apenas o necessário:
   - Dados financeiros (valor, juros, etc.) — quando permitido
   - Datas — atenção para impactos nas parcelas
   - Observações/informações complementares
5. Clique em **Salvar**.
6. Verifique o resultado:
   - Cronograma/parcelas recalculadas (se aplicável)
   - Status do emprestimo

Boas praticas:
- Edite o mínimo necessário para manter a rastreabilidade.
- Antes de salvar, pense no impacto: a mudança altera parcelas futuras?
- Se errar, registre a correção no campo de observações (quando houver).

## 5) Como editar cadastro do cliente

Passo a passo detalhado:
1. Acesse o menu **Clientes**.
2. Busque pelo nome completo ou CPF.
3. Clique em **Editar** na linha do cliente.
4. Atualize os dados necessários:
   - Telefone/WhatsApp (com DDD)
   - Endereco (revise CEP e número)
   - Email
   - Outros campos cadastrais
5. Clique em **Salvar**.
6. Confirme na lista se os dados já aparecem atualizados.

Erros comuns (e como evitar):
- Trocar o telefone (DDD) por engano: confirme com o cliente no ato.
- CEP errado puxando outro bairro: revise e corrija antes de salvar.
- Esquecer de salvar: ao sair da tela sem salvar, a alteração se perde.

Checklist rapido (depois de salvar):
- O telefone/WhatsApp está correto?
- O endereço está correto (rua, número, bairro, cidade, CEP)?
- O email foi digitado corretamente?

## Erros comuns e como evitar

- **Salvar sem revisar dados**: sempre execute o checklist rapido da seção.
- **Datas incorretas** (parcela/pagamento): valide dia, mês e ano com atenção.
- **Editar mais do que o necessário**: mude apenas o que precisa; registre contexto nas observações (quando houver).

## Fluxo recomendado de operacao diaria

1. Cadastrar cliente (quando novo)
2. Criar emprestimo
3. Acompanhar parcelas e receber pagamentos
4. Editar cadastro ou emprestimo apenas quando necessario

