# 🔌 Instruções de Conexão na VPS para Monitoramento

Este documento contém todas as instruções necessárias para conectar na VPS e monitorar a aplicação CredGestor.

## 📋 Informações da VPS

- **Host**: `167.235.76.26`
- **Usuário**: `root` (ou conforme configurado)
- **Porta SSH**: `22` (padrão)
- **Diretório da Aplicação**: `/var/www/credgestor-homologacao`

## 🔐 Método 1: Conexão SSH Direta

### Conectar via SSH

```bash
ssh root@167.235.76.26
```

Ou se usar uma chave SSH específica:

```bash
ssh -i ~/.ssh/sua_chave_privada root@167.235.76.26
```

### Verificar Conexão

Após conectar, você deve ver o prompt do servidor:

```bash
root@manager01:/var/www/credgestor-homologacao#
```

## 🔐 Método 2: Conexão SSH com Chave Configurada

### Configurar SSH Config (Recomendado)

Adicione ao arquivo `~/.ssh/config`:

```bash
Host credgestor-vps
    HostName 167.235.76.26
    User root
    Port 22
    IdentityFile ~/.ssh/sua_chave_privada
```

Depois, conecte simplesmente com:

```bash
ssh credgestor-vps
```

## 📊 Comandos de Monitoramento Essenciais

### 1. Verificar Status dos Serviços Docker

```bash
# Listar todos os serviços
docker service ls

# Ver status detalhado
docker stack services credgestor

# Ver logs de um serviço específico
docker service logs credgestor_api --tail 100 -f

# Ver logs do frontend
docker service logs credgestor_site --tail 100 -f
```

### 2. Verificar Recursos do Sistema

```bash
# Uso de CPU e memória
docker stats

# Uso de disco
df -h

# Uso de memória
free -h

# Processos em execução
top
# ou
htop  # se instalado
```

### 3. Verificar Saúde da Aplicação

```bash
# Health check da API
curl https://credgestor.app.br/api/health

# Verificar métricas
curl https://credgestor.app.br/api/metrics

# Verificar frontend
curl -I https://credgestor.app.br
```

### 4. Verificar Logs do Sistema

```bash
# Logs do Docker
journalctl -u docker -f

# Logs do sistema
tail -f /var/log/syslog

# Logs de autenticação
tail -f /var/log/auth.log
```

### 5. Verificar Rede e Conectividade

```bash
# Verificar portas abertas
netstat -tulpn

# Verificar conexões ativas
ss -tulpn

# Testar conectividade
ping -c 4 8.8.8.8
```

### 6. Verificar Traefik

```bash
# Ver logs do Traefik
docker service logs traefik --tail 100 -f

# Verificar configuração do Traefik
docker service inspect traefik
```

### 7. Verificar Banco de Dados (Supabase)

```bash
# Verificar conexões ativas (se tiver acesso direto)
# Nota: O banco está no Supabase, não na VPS
# Para verificar via API:
curl https://credgestor.app.br/api/health
```

## 🔍 Comandos de Troubleshooting

### Reiniciar Serviços

```bash
# Reiniciar serviço específico
docker service update --force credgestor_api

# Reiniciar todo o stack
docker stack deploy -c docker-compose.yml credgestor
```

### Verificar Espaço em Disco

```bash
# Ver uso de disco
df -h

# Limpar imagens Docker não utilizadas
docker system prune -a

# Ver tamanho dos volumes
docker system df -v
```

### Verificar Memória

```bash
# Ver uso de memória
free -h

# Ver processos usando mais memória
ps aux --sort=-%mem | head -10
```

### Verificar CPU

```bash
# Ver uso de CPU
top

# Ver processos usando mais CPU
ps aux --sort=-%cpu | head -10
```

## 📁 Estrutura de Diretórios Importantes

```bash
# Diretório principal da aplicação
cd /var/www/credgestor-homologacao

# Arquivos de configuração
ls -la docker-compose.yml
ls -la .env

# Logs (se houver)
ls -la logs/

# Scripts
ls -la scripts/
```

## 🔧 Configuração de Variáveis de Ambiente

```bash
# Ver variáveis de ambiente atuais
cat .env

# Editar variáveis de ambiente
nano .env

# Recarregar configuração após edição
docker stack deploy -c docker-compose.yml credgestor
```

## 🚨 Comandos de Emergência

### Parar Todos os Serviços

```bash
# Parar stack
docker stack rm credgestor

# Verificar se parou
docker service ls
```

### Iniciar Serviços

```bash
# Iniciar stack
docker stack deploy -c docker-compose.yml credgestor

# Verificar status
docker service ls
```

### Acessar Container em Execução

```bash
# Listar containers
docker ps

# Acessar container
docker exec -it <container_id> /bin/bash

# Para serviços Docker Swarm
docker service ps credgestor_api
docker exec -it $(docker ps -q -f name=credgestor_api) /bin/bash
```

## 📡 Monitoramento Remoto

### Via Prometheus (se configurado)

Acesse: `https://credgestor.app.br:9090` (se exposto)

### Via Grafana (se configurado)

Acesse: `https://credgestor.app.br:3000` (se exposto)

### Via Portainer (se configurado)

Acesse: `https://credgestor.app.br:9000` (se exposto)

## 🔒 Segurança

### Verificar Acessos SSH

```bash
# Ver últimas conexões SSH
last

# Ver tentativas de login
grep "Failed password" /var/log/auth.log

# Ver usuários conectados
who
```

### Atualizar Sistema

```bash
# Atualizar pacotes
apt update && apt upgrade -y

# Reiniciar se necessário
reboot
```

## 📝 Logs Importantes

### Logs da Aplicação

```bash
# Logs do backend
docker service logs credgestor_api --tail 500

# Logs do frontend
docker service logs credgestor_site --tail 500

# Logs em tempo real
docker service logs credgestor_api -f
```

### Logs do Sistema

```bash
# Logs do sistema
journalctl -xe

# Logs do Docker
journalctl -u docker -f
```

## 🛠️ Ferramentas Úteis

### Instalar Ferramentas Adicionais

```bash
# htop (monitoramento interativo)
apt install htop

# net-tools (netstat)
apt install net-tools

# vim (editor)
apt install vim

# curl (já deve estar instalado)
curl --version
```

## 📞 Suporte

Em caso de problemas:

1. Verifique os logs: `docker service logs <serviço> --tail 100`
2. Verifique recursos: `docker stats`
3. Verifique saúde: `curl https://credgestor.app.br/api/health`
4. Consulte documentação: `README.md` e `DEPLOY.md`

## 🔄 Workflow de Monitoramento Recomendado

1. **Conectar na VPS**: `ssh root@167.235.76.26`
2. **Verificar serviços**: `docker service ls`
3. **Verificar recursos**: `docker stats`
4. **Verificar logs**: `docker service logs credgestor_api --tail 100`
5. **Verificar saúde**: `curl https://credgestor.app.br/api/health`
6. **Verificar métricas**: `curl https://credgestor.app.br/api/metrics`

---

**Última atualização**: 2024-12-20  
**Versão**: 1.0
