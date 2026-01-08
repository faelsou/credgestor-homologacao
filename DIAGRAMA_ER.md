```mermaid
erDiagram
    TENANTS ||--o{ USUARIOS : "possui"
    TENANTS ||--o{ CLIENTES : "possui"
    TENANTS ||--o{ PRODUTOS : "possui"
    TENANTS ||--o{ PROPOSTAS : "possui"
    TENANTS ||--o{ PARCELAS : "possui"
    TENANTS ||--o{ PAGAMENTOS : "possui"
    TENANTS ||--o{ DOCUMENTOS : "possui"
    TENANTS ||--o{ AUDITORIA : "possui"
    TENANTS ||--o{ COMISSOES : "possui"
    
    CLIENTES ||--o{ PROPOSTAS : "solicita"
    PRODUTOS ||--o{ PROPOSTAS : "oferece"
    USUARIOS ||--o{ PROPOSTAS : "gerencia"
    
    PROPOSTAS ||--o{ PARCELAS : "gera"
    PARCELAS ||--o{ PAGAMENTOS : "recebe"
    
    PROPOSTAS ||--o{ COMISSOES : "gera"
    USUARIOS ||--o{ COMISSOES : "recebe"
    
    USUARIOS ||--o{ AUDITORIA : "executa"
    
    TENANTS {
        int id PK
        string nome
        string slug UK
        string cnpj UK
        string email
        string telefone
        text endereco
        boolean ativo
        timestamp data_criacao
        timestamp data_atualizacao
        jsonb configuracoes
    }
    
    USUARIOS {
        int id PK
        int tenant_id FK
        string nome
        string email
        string senha_hash
        string cpf UK
        string telefone
        string cargo
        boolean ativo
        string tipo_usuario
        timestamp ultimo_acesso
        timestamp data_criacao
        timestamp data_atualizacao
    }
    
    CLIENTES {
        int id PK
        int tenant_id FK
        string nome
        string cpf_cnpj UK
        string tipo_pessoa
        string email
        string telefone
        string celular
        text endereco
        string cidade
        string estado
        string cep
        date data_nascimento
        decimal renda_mensal
        string profissao
        text observacoes
        int score_credito
        boolean ativo
        timestamp data_criacao
        timestamp data_atualizacao
    }
    
    PRODUTOS {
        int id PK
        int tenant_id FK
        string nome
        string tipo
        text descricao
        decimal taxa_juros_min
        decimal taxa_juros_max
        int prazo_min
        int prazo_max
        decimal valor_min
        decimal valor_max
        jsonb requisitos
        boolean ativo
        timestamp data_criacao
        timestamp data_atualizacao
    }
    
    PROPOSTAS {
        int id PK
        int tenant_id FK
        int cliente_id FK
        int produto_id FK
        int usuario_id FK
        string numero_proposta UK
        decimal valor_solicitado
        decimal valor_aprovado
        decimal taxa_juros
        int prazo
        decimal valor_parcela
        date data_primeira_parcela
        string status
        text observacoes
        jsonb documentos
        timestamp data_criacao
        timestamp data_atualizacao
        timestamp data_aprovacao
        timestamp data_desembolso
    }
    
    PARCELAS {
        int id PK
        int tenant_id FK
        int proposta_id FK
        int numero_parcela
        decimal valor_parcela
        decimal valor_pago
        date data_vencimento
        date data_pagamento
        string status
        int dias_atraso
        decimal juros_atraso
        decimal multa
        timestamp data_criacao
        timestamp data_atualizacao
    }
    
    PAGAMENTOS {
        int id PK
        int tenant_id FK
        int parcela_id FK
        decimal valor_pago
        string forma_pagamento
        timestamp data_pagamento
        string comprovante
        text observacoes
        int usuario_id FK
    }
    
    DOCUMENTOS {
        int id PK
        int tenant_id FK
        string entidade_tipo
        int entidade_id
        string tipo_documento
        string nome_arquivo
        string caminho_arquivo
        bigint tamanho_bytes
        string mime_type
        text observacoes
        timestamp data_upload
        int usuario_upload_id FK
    }
    
    AUDITORIA {
        int id PK
        int tenant_id FK
        int usuario_id FK
        string acao
        string tabela
        int registro_id
        jsonb dados_anteriores
        jsonb dados_novos
        string ip_address
        text user_agent
        timestamp data_hora
    }
    
    COMISSOES {
        int id PK
        int tenant_id FK
        int proposta_id FK
        int usuario_id FK
        decimal percentual
        decimal valor_comissao
        string status
        timestamp data_pagamento
        text observacoes
        timestamp data_criacao
    }
```

## Arquitetura Multi-Tenancy

### Estratégia: Schema Compartilhado com Tenant ID

**Características:**
- Todas as tabelas possuem `tenant_id` como Foreign Key para `tenants`
- Isolamento lógico através de filtros nas queries
- Índices compostos otimizados: `(tenant_id, campo_principal)`
- Cascade delete: Deletar tenant remove todos os dados relacionados

**Fluxo de Dados:**

1. **Tenant** (Organização)
   - Ponto central da arquitetura
   - Todos os dados pertencem a um tenant
   - Configurações globais em JSONB

2. **Usuários**
   - Vinculados a um tenant
   - Gerenciam propostas e clientes
   - Autenticação e autorização por tenant

3. **Clientes**
   - Pessoas físicas ou jurídicas
   - Vinculados a um tenant
   - Podem ter múltiplas propostas

4. **Propostas**
   - Solicitações de crédito
   - Vinculam cliente, produto e usuário
   - Geram parcelas quando aprovadas

5. **Parcelas**
   - Geradas automaticamente da proposta
   - Controlam vencimentos e pagamentos
   - Status: pendente, pago, atrasado

6. **Sistema de Comissões**
   - Calculadas sobre propostas aprovadas
   - Vinculadas a vendedores
   - Controle de pagamento

7. **Auditoria**
   - Log completo de todas as ações
   - Rastreabilidade para compliance
   - Dados antes/depois em JSONB

### Segurança

- **Isolamento**: Todas as queries filtram por `tenant_id`
- **Integridade**: Foreign Keys garantem consistência
- **Rastreabilidade**: Auditoria completa de ações
- **Soft Delete**: Marcação de inativos para preservar histórico
