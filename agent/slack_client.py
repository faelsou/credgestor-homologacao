"""
Cliente Slack para notificações e interações
"""
import requests
import time
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
from zoneinfo import ZoneInfo
from agent.config import config

# Timezone de São Paulo
TZ_SP = ZoneInfo("America/Sao_Paulo")


class SlackClient:
    """Cliente para interagir com Slack"""
    
    def __init__(self):
        self.webhook_url = config.SLACK_WEBHOOK_URL
        self.bot_token = config.SLACK_BOT_TOKEN
        self.signing_secret = config.SLACK_SIGNING_SECRET
        self.channel = config.SLACK_CHANNEL
        self.approval_timeout = config.APPROVAL_TIMEOUT
        # ID do canal capturado da resposta do chat.postMessage (não depende
        # de scopes de listagem de canais)
        self.last_channel_id: Optional[str] = None
    
    def send_message(self, text: str, blocks: Optional[List[Dict]] = None) -> bool:
        """
        Envia mensagem para o Slack com fallback Bot API ↔ webhook e 1 retry.

        Troubleshooting e pedidos de aprovação NÃO podem falhar em silêncio.
        """
        for attempt in (1, 2):
            # Bot API: com ou sem blocks (texto simples também)
            if self.bot_token:
                message_ts = self._send_via_bot_api(text, blocks or [])
                if message_ts:
                    return True

            if self.webhook_url and self._send_via_webhook(text):
                return True

            if attempt == 1:
                print("⚠️  Falha no envio ao Slack — nova tentativa em 2s...")
                time.sleep(2)

        print("❌ FALHA DEFINITIVA ao enviar mensagem ao Slack (bot + webhook)")
        return False
    
    def _send_via_webhook(self, text: str) -> bool:
        """Envia mensagem via webhook"""
        if not self.webhook_url:
            return False
        try:
            payload = {"text": text}
            response = requests.post(self.webhook_url, json=payload, timeout=10)
            ok = response.status_code == 200
            if not ok:
                print(f"❌ Webhook Slack HTTP {response.status_code}: {response.text[:120]}")
            return ok
        except Exception as e:
            print(f"❌ Erro ao enviar via webhook: {str(e)}")
            return False
    
    def _send_via_bot_api(self, text: str, blocks: Optional[List[Dict]] = None) -> Optional[str]:
        """Envia mensagem via Bot API (com suporte opcional a botões)"""
        if not self.bot_token:
            return None
        
        try:
            channel_id = self._get_channel_id(self.channel)
            if not channel_id:
                print(f"⚠️  Não foi possível encontrar ID do canal {self.channel}")
                print(f"   Certifique-se de que o bot está no canal ou use o ID do canal diretamente")
                return None
            
            payload = {
                "channel": channel_id,
                "text": text,
            }
            if blocks:
                payload["blocks"] = blocks
            
            response = requests.post(
                "https://slack.com/api/chat.postMessage",
                headers={
                    "Authorization": f"Bearer {self.bot_token}",
                    "Content-Type": "application/json"
                },
                json=payload,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("ok"):
                    self.last_channel_id = data.get("channel") or self.last_channel_id
                    return data.get("ts")  # Timestamp da mensagem
                else:
                    error = data.get("error", "unknown")
                    if error == "not_in_channel":
                        print(f"❌ Bot não está no canal {self.channel}")
                        # Tentar adicionar bot ao canal automaticamente
                        if self._try_add_bot_to_channel(channel_id):
                            print(f"✅ Bot adicionado ao canal. Tentando enviar novamente...")
                            # Tentar enviar novamente
                            retry_response = requests.post(
                                "https://slack.com/api/chat.postMessage",
                                headers={
                                    "Authorization": f"Bearer {self.bot_token}",
                                    "Content-Type": "application/json"
                                },
                                json=payload,
                                timeout=10
                            )
                            if retry_response.status_code == 200:
                                retry_data = retry_response.json()
                                if retry_data.get("ok"):
                                    self.last_channel_id = retry_data.get("channel") or self.last_channel_id
                                    return retry_data.get("ts")
                        print(f"   Adicione o bot ao canal manualmente com: /invite @bot no canal {self.channel}")
                    else:
                        print(f"❌ Erro ao enviar via Bot API: {error}")
                    return None
            else:
                print(f"❌ Erro HTTP ao enviar via Bot API: {response.status_code}")
                return None
        
        except Exception as e:
            print(f"❌ Erro ao enviar via Bot API: {str(e)}")
            return None
    
    def _get_channel_id(self, channel: str) -> Optional[str]:
        """Resolve nome do canal para ID"""
        if not self.bot_token:
            return None
        
        # Se já é um ID (começa com C)
        if channel.startswith("C") and len(channel) > 8:
            return channel
        
        # Remover # se presente
        channel_name = channel.lstrip("#")
        
        try:
            # Tentar buscar canal com paginação
            cursor = None
            while True:
                # Apenas canais públicos: incluir private_channel exige o scope
                # groups:read e derruba a chamada inteira com missing_scope
                params = {
                    "types": "public_channel",
                    "limit": 200,
                    "exclude_archived": True
                }
                if cursor:
                    params["cursor"] = cursor
                
                response = requests.get(
                    "https://slack.com/api/conversations.list",
                    headers={
                        "Authorization": f"Bearer {self.bot_token}",
                        "Content-Type": "application/json"
                    },
                    params=params,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        for ch in data.get("channels", []):
                            if ch.get("name") == channel_name:
                                channel_id = ch.get("id")
                                # Verificar se bot está no canal, se não, tentar adicionar
                                if not ch.get("is_member", False):
                                    print(f"⚠️  Bot não está no canal {channel_name}. Tentando adicionar...")
                                    if self._try_add_bot_to_channel(channel_id):
                                        print(f"✅ Bot adicionado ao canal {channel_name}")
                                    else:
                                        print(f"⚠️  Não foi possível adicionar bot ao canal automaticamente")
                                        print(f"   Adicione manualmente com: /invite @bot no canal {channel_name}")
                                return channel_id
                        
                        # Verificar se há mais páginas
                        cursor = data.get("response_metadata", {}).get("next_cursor")
                        if not cursor:
                            break
                    else:
                        error = data.get("error", "unknown")
                        print(f"⚠️  Erro ao listar canais: {error}")
                        break
                else:
                    print(f"⚠️  Erro HTTP ao buscar canais: {response.status_code}")
                    break
            
            # Se não encontrou, tentar buscar por ID direto (caso seja um ID mas sem o C)
            if channel_name and len(channel_name) > 8:
                # Pode ser um ID sem o prefixo C
                return channel_name
            
            return None
        
        except Exception as e:
            print(f"⚠️  Erro ao buscar ID do canal: {str(e)}")
            return None
    
    def _try_add_bot_to_channel(self, channel_id: str) -> bool:
        """Tenta adicionar o bot ao canal automaticamente"""
        if not self.bot_token:
            return False
        
        try:
            # Obter ID do bot
            bot_info_response = requests.get(
                "https://slack.com/api/auth.test",
                headers={
                    "Authorization": f"Bearer {self.bot_token}",
                    "Content-Type": "application/json"
                },
                timeout=10
            )
            
            if bot_info_response.status_code == 200:
                bot_data = bot_info_response.json()
                if bot_data.get("ok"):
                    bot_user_id = bot_data.get("user_id")
                    
                    # Tentar adicionar bot ao canal
                    response = requests.post(
                        "https://slack.com/api/conversations.join",
                        headers={
                            "Authorization": f"Bearer {self.bot_token}",
                            "Content-Type": "application/json"
                        },
                        json={"channel": channel_id},
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        if data.get("ok"):
                            return True
                        else:
                            error = data.get("error", "unknown")
                            if error == "already_in_channel":
                                return True  # Já está no canal
                            print(f"⚠️  Erro ao adicionar bot ao canal: {error}")
                            return False
            
            return False
        
        except Exception as e:
            print(f"⚠️  Erro ao tentar adicionar bot ao canal: {str(e)}")
            return False
    
    def send_approval_request(
        self,
        action_description: str,
        action_id: str,
        action_details: Optional[Dict[str, str]] = None
    ) -> Optional[bool]:
        """
        Envia solicitação de aprovação e aguarda resposta
        
        Args:
            action_description: Descrição da ação
            action_id: ID único da ação
            action_details: Detalhes adicionais (opcional)
        
        Returns:
            True se aprovado, False se rejeitado, None se timeout
        """
        # Criar blocos com botões
        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"🔐 *APROVAÇÃO NECESSÁRIA*\n\n*Ação solicitada:*\n{action_description}"
                }
            }
        ]
        
        if action_details:
            detail_text = "\n".join([f"• *{k}:* {v}" for k, v in action_details.items()])
            blocks.append({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Detalhes:*\n{detail_text}"
                }
            })
        
        # Botões de aprovação (sem confirmação, conforme solicitado)
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Aprovar"
                    },
                    "style": "primary",
                    "value": f"approve_{action_id}",
                    "action_id": f"approve_{action_id}"
                },
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Rejeitar"
                    },
                    "style": "danger",
                    "value": f"reject_{action_id}",
                    "action_id": f"reject_{action_id}"
                }
            ]
        })
        
        blocks.append({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": f"Action ID: `{action_id}` | Timeout: {self.approval_timeout}s\n\n💡 *Como aprovar:*\n• Clique no botão **Aprovar** para aprovar a ação\n• Clique no botão **Rejeitar** para rejeitar a ação"
                }
            ]
        })
        
        # Tentar enviar via Bot API (com botões)
        message_ts = None
        if self.bot_token:
            message_ts = self._send_via_bot_api(
                f"🔐 *APROVAÇÃO NECESSÁRIA*\n\n*Ação solicitada:*\n{action_description}",
                blocks
            )
            
            if message_ts:
                print(f"✅ Mensagem de aprovação enviada via Bot API (com botões)")
            else:
                print(f"❌ Falha ao enviar mensagem com botões via Bot API")
        
        # Se não conseguiu via Bot API, tentar via webhook (sem botões, mas com instruções)
        if not message_ts:
            print("⚠️  Não foi possível enviar via Bot API. Tentando via webhook...")
            
            # Adicionar instruções de aprovação no texto (fallback quando botões não estão disponíveis)
            approval_text = f"🔐 *APROVAÇÃO NECESSÁRIA*\n\n"
            approval_text += f"*Ação solicitada:*\n{action_description}\n\n"
            if action_details:
                detail_text = "\n".join([f"• *{k}:* {v}" for k, v in action_details.items()])
                approval_text += f"*Detalhes:*\n{detail_text}\n\n"
            approval_text += f"⚠️ *Botões não disponíveis* - Configure SLACK_BOT_TOKEN e adicione bot ao canal para usar botões interativos.\n\n"
            approval_text += f"*Para aprovar:* Adicione reação 👍 (thumbsup) nesta mensagem\n"
            approval_text += f"*Para rejeitar:* Adicione reação 👎 (thumbsdown) nesta mensagem\n\n"
            approval_text += f"Action ID: `{action_id}` | Timeout: {self.approval_timeout}s"
            
            # Enviar via webhook (sem botões, mas com instruções claras)
            webhook_sent = self.send_message(approval_text)
            
            if not webhook_sent:
                # Última tentativa: texto simples sem blocks, ainda assim visível no canal
                emergency = (
                    f"🚨 *FALHA AO ENVIAR BOTÕES — APROVAÇÃO URGENTE*\n"
                    f"*Ação:* {action_description}\n"
                    f"*Action ID:* `{action_id}`\n"
                    f"Responda neste canal com a reação 👍 para aprovar ou 👎 para rejeitar."
                )
                if not self.send_message(emergency):
                    print("❌ Não foi possível enviar solicitação de aprovação ao Slack.")
                    return None
            
            print("⚠️  Mensagem de aprovação no Slack (fallback sem botões ou emergência).")
            print(f"⏳ Aguardando aprovação para {action_id} (timeout {self.approval_timeout}s)...")
            return self._wait_for_approval_via_webhook(action_id)
        
        # Aguardar aprovação real via polling
        print(f"⏳ Aguardando aprovação para ação {action_id}...")
        print(f"   Use 👍 (thumbsup) para aprovar ou 👎 (thumbsdown) para rejeitar")
        print(f"   Ou clique nos botões na mensagem do Slack")
        print(f"   Timeout: {self.approval_timeout} segundos")
        
        # Aguardar aprovação via polling
        return self._wait_for_approval(message_ts, action_id)
    
    def _wait_for_approval(self, message_ts: str, action_id: str) -> Optional[bool]:
        """
        Aguarda aprovação via polling (verifica reações na mensagem)
        
        Args:
            message_ts: Timestamp da mensagem
            action_id: ID da ação
        
        Returns:
            True se aprovado, False se rejeitado, None se timeout
        """
        if not self.bot_token:
            print("⚠️  SLACK_BOT_TOKEN não configurado. Não é possível aguardar aprovação real.")
            print("   Configure SLACK_BOT_TOKEN no .env para usar aprovação interativa.")
            print("   ⚠️  AÇÃO NÃO SERÁ EXECUTADA automaticamente.")
            print("   ⚠️  Adicione reação 👍 na mensagem do Slack para aprovar manualmente.")
            return None  # Não assumir aprovação - requer configuração correta
        
        start_time = time.time()
        poll_interval = 5  # Verificar a cada 5 segundos
        channel = self.channel.lstrip('#')
        
        # Preferir o ID capturado do chat.postMessage (não depende de scopes de listagem)
        channel_id = self.last_channel_id or self._get_channel_id(self.channel) or channel
        
        while True:
            elapsed = time.time() - start_time
            
            # Verificar timeout
            if elapsed >= self.approval_timeout:
                print(f"⏰ Timeout de aprovação ({self.approval_timeout}s). Ação não será executada.")
                return None

            # Cancelada porque o componente já se recuperou
            try:
                from agent.slack_interactions import was_cancelled
                if was_cancelled(action_id):
                    print(f"🛑 Aprovação {action_id} cancelada: componente já recuperado")
                    return None
            except Exception:
                pass
            
            # Verificar reações na mensagem
            try:
                response = requests.get(
                    "https://slack.com/api/reactions.get",
                    headers={
                        "Authorization": f"Bearer {self.bot_token}",
                        "Content-Type": "application/json"
                    },
                    params={
                        "channel": channel_id,
                        "timestamp": message_ts
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        message = data.get("message", {})
                        reactions = message.get("reactions", [])
                        
                        # Verificar reações
                        for reaction in reactions:
                            name = reaction.get("name", "")
                            # 👍 (thumbsup) = aprovar
                            if name in ["thumbsup", "+1", "white_check_mark", "heavy_check_mark"]:
                                print(f"✅ Aprovação recebida via reação 👍")
                                return True
                            # 👎 (thumbsdown) = rejeitar
                            elif name in ["thumbsdown", "-1", "x", "cross_mark"]:
                                print(f"❌ Rejeição recebida via reação 👎")
                                return False
                
                # Verificar se botões foram clicados via servidor de interações
                try:
                    from agent.slack_interactions import check_approval_status
                    approval_status = check_approval_status(action_id)
                    if approval_status is True:
                        print(f"✅ Aprovação recebida via botão")
                        return True
                    elif approval_status is False:
                        print(f"❌ Rejeição recebida via botão")
                        return False
                except ImportError:
                    # Servidor de interações não disponível, continuar com reações
                    pass
                except Exception as e:
                    print(f"⚠️  Erro ao verificar aprovação via interações: {str(e)}")
                
            except Exception as e:
                print(f"⚠️  Erro ao verificar aprovação: {str(e)}")
            
            # Aguardar antes de verificar novamente
            remaining = self.approval_timeout - elapsed
            if remaining > poll_interval:
                print(f"   Aguardando aprovação... ({int(remaining)}s restantes)")
                time.sleep(poll_interval)
            else:
                time.sleep(min(remaining, poll_interval))
    
    def _wait_for_approval_via_webhook(self, action_id: str) -> Optional[bool]:
        """
        Aguarda aprovação quando mensagem foi enviada via webhook (sem timestamp)
        Verifica últimas mensagens do canal procurando pela mensagem de aprovação
        
        Args:
            action_id: ID da ação
        
        Returns:
            True se aprovado, False se rejeitado, None se timeout
        """
        if not self.bot_token:
            print("⚠️  SLACK_BOT_TOKEN não configurado. Não é possível aguardar aprovação via webhook.")
            print("   Configure SLACK_BOT_TOKEN no .env para usar aprovação interativa.")
            return None
        
        start_time = time.time()
        poll_interval = 10  # Verificar a cada 10 segundos (menos frequente pois é mais custoso)
        channel = self.channel.lstrip('#')
        channel_id = self.last_channel_id or self._get_channel_id(self.channel) or channel
        
        print(f"🔍 Procurando mensagem de aprovação no canal {self.channel}...")
        print(f"   Action ID: {action_id}")
        
        while True:
            elapsed = time.time() - start_time
            
            # Verificar timeout
            if elapsed >= self.approval_timeout:
                print(f"⏰ Timeout de aprovação ({self.approval_timeout}s). Ação não será executada.")
                return None

            try:
                from agent.slack_interactions import check_approval_status, was_cancelled
                if was_cancelled(action_id):
                    print(f"🛑 Aprovação {action_id} cancelada: componente já recuperado")
                    return None
                approval_status = check_approval_status(action_id)
                if approval_status is True:
                    print(f"✅ Aprovação recebida via botão")
                    return True
                if approval_status is False:
                    print(f"❌ Rejeição recebida via botão")
                    return False
            except Exception as e:
                print(f"⚠️  Erro ao verificar aprovação via interações: {str(e)}")
            
            # Buscar últimas mensagens do canal procurando pela mensagem de aprovação
            try:
                response = requests.get(
                    "https://slack.com/api/conversations.history",
                    headers={
                        "Authorization": f"Bearer {self.bot_token}",
                        "Content-Type": "application/json"
                    },
                    params={
                        "channel": channel_id,
                        "limit": 20,  # Verificar últimas 20 mensagens
                        "oldest": int(start_time - 300)  # Últimos 5 minutos
                    },
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get("ok"):
                        messages = data.get("messages", [])
                        
                        # Procurar mensagem que contém o action_id
                        for msg in messages:
                            text = msg.get("text", "")
                            blocks = msg.get("blocks", [])
                            
                            # Verificar se é a mensagem de aprovação (contém action_id)
                            if action_id in text or any(action_id in str(block) for block in blocks):
                                msg_ts = msg.get("ts")
                                
                                # Verificar reações nesta mensagem
                                try:
                                    reaction_response = requests.get(
                                        "https://slack.com/api/reactions.get",
                                        headers={
                                            "Authorization": f"Bearer {self.bot_token}",
                                            "Content-Type": "application/json"
                                        },
                                        params={
                                            "channel": channel_id,
                                            "timestamp": msg_ts
                                        },
                                        timeout=10
                                    )
                                    
                                    if reaction_response.status_code == 200:
                                        reaction_data = reaction_response.json()
                                        if reaction_data.get("ok"):
                                            message = reaction_data.get("message", {})
                                            reactions = message.get("reactions", [])
                                            
                                            # Verificar reações
                                            for reaction in reactions:
                                                name = reaction.get("name", "")
                                                if name in ["thumbsup", "+1", "white_check_mark", "heavy_check_mark"]:
                                                    print(f"✅ Aprovação recebida via reação 👍")
                                                    return True
                                                elif name in ["thumbsdown", "-1", "x", "cross_mark"]:
                                                    print(f"❌ Rejeição recebida via reação 👎")
                                                    return False
                                except Exception as e:
                                    print(f"⚠️  Erro ao verificar reações: {str(e)}")
                                
                                break  # Encontrou a mensagem, não precisa continuar procurando
                
            except Exception as e:
                print(f"⚠️  Erro ao verificar aprovação via webhook: {str(e)}")
            
            # Aguardar antes de verificar novamente
            remaining = self.approval_timeout - elapsed
            if remaining > poll_interval:
                print(f"   Aguardando aprovação... ({int(remaining)}s restantes)")
                time.sleep(poll_interval)
            else:
                time.sleep(min(remaining, poll_interval))
    
    def send_troubleshooting_report(
        self,
        issue: Dict[str, Any],
        diagnosis: Dict[str, Any],
        action_plan: List[str]
    ) -> bool:
        """Envia relatório de troubleshooting para o Slack"""
        timestamp = datetime.now(TZ_SP).strftime("%Y-%m-%d %H:%M:%S")
        
        severity_emoji = {
            "CRITICAL": "🔴",
            "HIGH": "🟠",
            "MEDIUM": "🟡",
            "LOW": "🟢"
        }
        
        severity = issue.get("severity", "MEDIUM")
        emoji = severity_emoji.get(severity, "⚠️")
        
        text = f"{emoji} *Relatório de Troubleshooting*\n\n"
        text += f"*Problema Detectado:* {issue.get('description', 'N/A')}\n"
        text += f"*Componente:* {issue.get('component', 'N/A')}\n"
        text += f"*Severidade:* {severity}\n\n"
        text += f"*Diagnóstico:*\n{diagnosis.get('diagnostico', 'N/A')}\n\n"
        text += f"*Causa Raiz:*\n{diagnosis.get('causa_raiz', 'N/A')}\n\n"
        text += f"*Plano de Ação:*\n"
        for i, action in enumerate(action_plan, 1):
            text += f"{i}. {action}\n"
        text += f"\n*Timestamp:* {timestamp}"
        
        return self.send_message(text)
    
    def send_issue_detected(self, issue: Dict[str, Any]) -> bool:
        """Envia notificação de problema detectado"""
        timestamp = datetime.now(TZ_SP).strftime("%Y-%m-%d %H:%M:%S")
        
        severity_emoji = {
            "CRITICAL": "🔴",
            "HIGH": "🟠",
            "MEDIUM": "🟡",
            "LOW": "🟢"
        }
        
        severity = issue.get("severity", "MEDIUM")
        emoji = severity_emoji.get(severity, "⚠️")
        
        text = f"{emoji} *Problema Detectado - {issue.get('component', 'unknown')}*\n"
        text += f"{issue.get('description', 'N/A')}\n"
        text += f"*Componente:* {issue.get('component', 'N/A')}\n"
        text += f"*Sintomas:* {', '.join(issue.get('symptoms', []))}\n"
        text += f"*Severidade:* {severity} | {timestamp}"
        
        return self.send_message(text)
    
    def send_resolution_report(self, resolution: Dict[str, Any]) -> bool:
        """Envia relatório de resolução"""
        timestamp = datetime.now(TZ_SP).strftime("%Y-%m-%d %H:%M:%S")
        
        text = f"✅ *Problema Resolvido*\n\n"
        text += f"*Problema:* {resolution.get('problem', 'N/A')}\n"
        text += f"*Causa Raiz:* {resolution.get('root_cause', 'N/A')}\n\n"
        
        actions = resolution.get('actions', [])
        if actions:
            text += f"*Ações Executadas:*\n"
            for action in actions:
                text += f"{action}\n"
        
        text += f"\n*Resultado:* {resolution.get('result', 'N/A')}\n"
        text += f"*Timestamp:* {timestamp}"
        
        return self.send_message(text)
    
    def send_healthy_status(self, health_status: Dict[str, Any]) -> bool:
        """Envia status saudável da aplicação"""
        timestamp = datetime.now(TZ_SP).strftime("%Y-%m-%d %H:%M:%S")
        
        text = f"✅ *Status Saudável*\n\n"
        text += f"Todos os componentes estão funcionando corretamente.\n\n"
        
        components = health_status.get("components", {})
        for name, status in components.items():
            status_emoji = "✅" if status.get("status") == "healthy" else "⚠️"
            text += f"{status_emoji} *{name.upper()}*: {status.get('message', 'N/A')}\n"
        
        text += f"\n*Timestamp:* {timestamp}"
        
        return self.send_message(text)
    
    def send_startup_message(self, monitor_interval: int) -> bool:
        """Envia mensagem de inicialização"""
        timestamp = datetime.now(TZ_SP).strftime("%Y-%m-%d %H:%M:%S")
        
        # Converter intervalo para formato legível
        if monitor_interval >= 3600:
            interval_str = f"{monitor_interval // 3600} hora{'s' if monitor_interval // 3600 > 1 else ''}"
        elif monitor_interval >= 60:
            interval_str = f"{monitor_interval // 60} minuto{'s' if monitor_interval // 60 > 1 else ''}"
        else:
            interval_str = f"{monitor_interval} segundo{'s' if monitor_interval > 1 else ''}"
        
        text = f"ℹ️ *Agente de IA Iniciado*\n\n"
        text += f"Agente de monitoramento e troubleshooting iniciado com sucesso.\n\n"
        text += f"*Configurações:*\n"
        text += f"- Intervalo: {interval_str}\n"
        text += f"- Stack: {config.DOCKER_STACK}\n"
        text += f"\n*Timestamp:* {timestamp}"
        
        return self.send_message(text)
