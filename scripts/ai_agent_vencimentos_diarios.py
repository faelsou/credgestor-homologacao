#!/usr/bin/env python3
"""
Agente de IA - Notificações de Vencimentos Diários
===================================================

Este script verifica clientes com parcelas vencendo hoje e envia mensagens
para os usuários do sistema informando sobre os vencimentos.

Funcionalidades:
- Busca parcelas vencendo hoje (status PENDING ou LATE)
- Agrupa por tenant_id
- Envia mensagens para usuários de cada tenant
- Suporta envio via Email e WhatsApp
"""

import os
import sys
from datetime import date, datetime
from typing import Dict, List, Optional
from decimal import Decimal

# Adicionar o diretório raiz ao path para importar módulos do backend
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from backend.supabase_client import get_supabase_admin_client
    from backend.settings import get_settings
except ImportError as e:
    print(f"❌ Erro ao importar módulos do backend: {e}")
    print("   Certifique-se de que está executando o script a partir do diretório raiz do projeto.")
    sys.exit(1)


class VencimentoInfo:
    """Informações sobre uma parcela vencendo hoje"""
    def __init__(self, data: dict):
        self.parcela_id = data.get('id')
        self.loan_id = data.get('loan_id')
        self.client_id = data.get('client_id')
        self.client_name = data.get('client_name', 'Cliente Desconhecido')
        self.client_phone = data.get('client_phone')
        self.client_email = data.get('client_email')
        self.numero_parcela = data.get('number', 0)
        self.valor_parcela = float(data.get('amount', 0))
        self.valor_pago = float(data.get('amount_paid', 0))
        self.valor_aberto = self.valor_parcela - self.valor_pago
        self.interest_amount = float(data.get('interest_amount', 0))
        self.principal_amount = float(data.get('principal_amount', 0))
        self.loan_model = data.get('loan_model', 'PRICE')  # PRICE ou INTEREST_ONLY
        self.data_vencimento = data.get('due_date')
        self.status = data.get('status', 'PENDING')
        self.dias_atraso = (date.today() - datetime.strptime(self.data_vencimento, '%Y-%m-%d').date()).days if self.data_vencimento else 0
    
    def get_valor_para_mensagem(self) -> tuple[str, float]:
        """
        Retorna (tipo, valor) para a mensagem:
        - Se INTEREST_ONLY: retorna ("Juros", valor_juros)
        - Se PRICE: retorna ("Parcela", valor_total_parcela)
        """
        if self.loan_model == 'INTEREST_ONLY':
            valor_juros = self.interest_amount if self.interest_amount > 0 else self.valor_aberto
            return ("Juros", valor_juros)
        else:
            return ("Parcela", self.valor_aberto)


class TenantVencimentos:
    """Vencimentos agrupados por tenant"""
    def __init__(self, tenant_id: str, tenant_name: str):
        self.tenant_id = tenant_id
        self.tenant_name = tenant_name
        self.vencimentos: List[VencimentoInfo] = []
        self.total_valor = 0.0
        self.total_parcelas = 0
    
    def add_vencimento(self, vencimento: VencimentoInfo):
        """Adiciona um vencimento e atualiza totais"""
        self.vencimentos.append(vencimento)
        self.total_valor += vencimento.valor_aberto
        self.total_parcelas += 1


class AgenteVencimentosDiarios:
    """Agente de IA para notificar usuários sobre vencimentos diários"""
    
    def __init__(self):
        """Inicializa o agente"""
        try:
            self.supabase = get_supabase_admin_client()
            self.settings = get_settings()
            print("✅ Agente inicializado com sucesso")
        except Exception as e:
            print(f"❌ Erro ao inicializar agente: {e}")
            sys.exit(1)
    
    def buscar_parcelas_vencendo_hoje(self) -> List[Dict]:
        """
        Busca todas as parcelas vencendo hoje com status PENDING ou LATE
        """
        hoje = date.today().isoformat()
        
        print(f"\n🔍 Buscando parcelas vencendo hoje ({hoje})...")
        
        try:
            # Buscar parcelas vencendo hoje (incluindo interest_amount e principal_amount)
            response = self.supabase.table('installments').select(
                'id, loan_id, client_id, tenant_id, number, due_date, amount, amount_paid, interest_amount, principal_amount, status'
            ).eq('due_date', hoje).in_('status', ['PENDING', 'LATE']).execute()
            
            parcelas = response.data or []
            print(f"✅ Encontradas {len(parcelas)} parcelas vencendo hoje")
            
            # Enriquecer com dados de clientes e loans
            parcelas_enriquecidas = []
            for parcela in parcelas:
                parcela_enriquecida = parcela.copy()
                
                # Buscar dados do cliente
                try:
                    client_id = parcela.get('client_id')
                    if client_id:
                        client_response = self.supabase.table('clients').select(
                            'nome, telefone, celular, whatsapp, email'
                        ).eq('id', client_id).execute()
                        if client_response.data:
                            client_data = client_response.data[0]
                            parcela_enriquecida['client_name'] = client_data.get('nome', 'Cliente Desconhecido')
                            # Prioridade: whatsapp > celular > telefone
                            parcela_enriquecida['client_phone'] = (
                                client_data.get('whatsapp') or 
                                client_data.get('celular') or 
                                client_data.get('telefone')
                            )
                            parcela_enriquecida['client_email'] = client_data.get('email')
                except Exception as e:
                    print(f"⚠️  Erro ao buscar cliente {parcela.get('client_id')}: {e}")
                    parcela_enriquecida['client_name'] = 'Cliente Desconhecido'
                
                # Buscar modelo do empréstimo
                try:
                    loan_id = parcela.get('loan_id')
                    if loan_id:
                        loan_response = self.supabase.table('loans').select('model').eq('id', loan_id).execute()
                        if loan_response.data:
                            loan_data = loan_response.data[0]
                            parcela_enriquecida['loan_model'] = loan_data.get('model', 'PRICE')
                        else:
                            parcela_enriquecida['loan_model'] = 'PRICE'
                    else:
                        parcela_enriquecida['loan_model'] = 'PRICE'
                except Exception as e:
                    print(f"⚠️  Erro ao buscar loan {parcela.get('loan_id')}: {e}")
                    parcela_enriquecida['loan_model'] = 'PRICE'
                
                parcelas_enriquecidas.append(parcela_enriquecida)
            
            return parcelas_enriquecidas
        
        except Exception as e:
            print(f"❌ Erro ao buscar parcelas: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def processar_parcelas_por_tenant(self, parcelas: List[Dict]) -> Dict[str, TenantVencimentos]:
        """
        Processa parcelas e agrupa por tenant_id
        """
        print(f"\n📊 Processando {len(parcelas)} parcelas por tenant...")
        
        tenant_vencimentos: Dict[str, TenantVencimentos] = {}
        
        for parcela in parcelas:
            try:
                # Extrair tenant_id
                tenant_id = parcela.get('tenant_id')
                if not tenant_id:
                    print(f"⚠️  Parcela {parcela.get('id')} sem tenant_id, ignorando...")
                    continue
                
                # Extrair dados do cliente (já enriquecidos na busca)
                client_name = parcela.get('client_name', 'Cliente Desconhecido')
                client_phone = parcela.get('client_phone')
                client_email = parcela.get('client_email')
                
                # Criar objeto VencimentoInfo
                vencimento_data = {
                    'id': parcela.get('id'),
                    'loan_id': parcela.get('loan_id'),
                    'client_id': parcela.get('client_id'),
                    'client_name': client_name,
                    'client_phone': client_phone,
                    'client_email': client_email,
                    'number': parcela.get('number', 0),
                    'amount': parcela.get('amount', 0),
                    'amount_paid': parcela.get('amount_paid', 0),
                    'due_date': parcela.get('due_date'),
                    'status': parcela.get('status', 'PENDING')
                }
                
                vencimento = VencimentoInfo(vencimento_data)
                
                # Adicionar ao tenant correspondente
                if tenant_id not in tenant_vencimentos:
                    # Buscar nome do tenant
                    tenant_name = self._buscar_nome_tenant(tenant_id)
                    tenant_vencimentos[tenant_id] = TenantVencimentos(tenant_id, tenant_name)
                
                tenant_vencimentos[tenant_id].add_vencimento(vencimento)
            
            except Exception as e:
                print(f"⚠️  Erro ao processar parcela {parcela.get('id')}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"✅ Processados {len(tenant_vencimentos)} tenants com vencimentos")
        return tenant_vencimentos
    
    def _buscar_nome_tenant(self, tenant_id: str) -> str:
        """Busca o nome do tenant"""
        try:
            response = self.supabase.table('tenants').select('name').eq('id', tenant_id).execute()
            if response.data and len(response.data) > 0:
                return response.data[0].get('name', f'Tenant {tenant_id[:8]}')
            return f'Tenant {tenant_id[:8]}'
        except:
            return f'Tenant {tenant_id[:8]}'
    
    def buscar_usuarios_tenant(self, tenant_id: str) -> List[Dict]:
        """
        Busca usuários ativos de um tenant
        """
        try:
            response = self.supabase.table('tenant_users').select(
                'id, user_id, email, role, metadata'
            ).eq('tenant_id', tenant_id).eq('ativo', True).execute()
            
            usuarios = response.data or []
            
            # Enriquecer com dados de users se disponível
            usuarios_enriquecidos = []
            for usuario in usuarios:
                usuario_enriquecido = usuario.copy()
                
                # Tentar buscar nome do usuário na tabela users
                try:
                    user_id = usuario.get('user_id')
                    if user_id:
                        user_response = self.supabase.table('users').select('name, email').eq('id', user_id).execute()
                        if user_response.data:
                            user_data = user_response.data[0]
                            usuario_enriquecido['user_name'] = user_data.get('name')
                            if not usuario_enriquecido.get('email'):
                                usuario_enriquecido['email'] = user_data.get('email')
                except Exception:
                    pass
                
                usuarios_enriquecidos.append(usuario_enriquecido)
            
            return usuarios_enriquecidos
        
        except Exception as e:
            print(f"⚠️  Erro ao buscar usuários do tenant {tenant_id}: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def formatar_mensagem_email(self, tenant_vencimentos: TenantVencimentos) -> str:
        """
        Formata a mensagem para enviar por email aos usuários
        """
        hoje = date.today().strftime('%d/%m/%Y')
        
        mensagem = f"""
🔔 NOTIFICAÇÃO DE VENCIMENTOS - {hoje}

Olá! Este é um resumo automático dos vencimentos do dia de hoje para o tenant: {tenant_vencimentos.tenant_name}

📊 RESUMO:
• Total de parcelas vencendo: {tenant_vencimentos.total_parcelas}
• Valor total em aberto: R$ {tenant_vencimentos.total_valor:,.2f}

📋 DETALHES DAS PARCELAS:
"""
        
        for vencimento in tenant_vencimentos.vencimentos:
            status_emoji = "🔴" if vencimento.status == "LATE" else "🟡"
            tipo_valor, valor = vencimento.get_valor_para_mensagem()
            mensagem += f"""
{status_emoji} Cliente: {vencimento.client_name}
   • Parcela #{vencimento.numero_parcela}
   • {tipo_valor}: R$ {valor:,.2f}
   • Status: {vencimento.status}
   • Contato: {vencimento.client_phone or vencimento.client_email or 'Não informado'}
"""
        
        mensagem += f"""
---
Sistema CredGestor - Agente de IA
Gerado automaticamente em {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}
"""
        
        return mensagem.strip()
    
    def formatar_mensagem_whatsapp_cliente(self, vencimento: VencimentoInfo) -> str:
        """
        Formata mensagem individual para WhatsApp do cliente
        """
        hoje = date.today().strftime('%d/%m/%Y')
        tipo_valor, valor = vencimento.get_valor_para_mensagem()
        
        mensagem = f"""🔔 *Lembrete de Vencimento*

Olá *{vencimento.client_name}*!

Sua {tipo_valor.lower()} #{vencimento.numero_parcela} no valor de *R$ {valor:,.2f}* vence hoje ({hoje}).

Por favor, realize o pagamento para evitar juros e multa.

*Telefone para contato:* {vencimento.client_phone or 'Não informado'}

Obrigado!"""
        
        return mensagem.strip()
    
    def enviar_email(self, destinatario: str, assunto: str, mensagem: str) -> bool:
        """
        Envia email para o destinatário
        TODO: Implementar integração com serviço de email (SendGrid, AWS SES, etc.)
        """
        print(f"📧 [EMAIL] Enviando para {destinatario}...")
        print(f"   Assunto: {assunto}")
        print(f"   Mensagem: {mensagem[:200]}...")
        
        # Por enquanto, apenas simula o envio
        # Implementar aqui a integração com serviço de email
        return True
    
    def enviar_whatsapp(self, telefone: str, mensagem: str, cliente_nome: str = "") -> bool:
        """
        Envia mensagem via WhatsApp
        TODO: Implementar integração com API de WhatsApp (Evolution API, Twilio, etc.)
        """
        # Limpar telefone (remover caracteres não numéricos)
        telefone_limpo = ''.join(filter(str.isdigit, telefone)) if telefone else ''
        
        # Adicionar código do país se não tiver
        if telefone_limpo and not telefone_limpo.startswith('55'):
            telefone_limpo = '55' + telefone_limpo
        
        print(f"\n💬 [WHATSAPP] Enviando para {telefone_limpo} ({cliente_nome or 'Cliente'})...")
        print("=" * 60)
        print(mensagem)
        print("=" * 60)
        
        # Verificar se há configuração de API de WhatsApp
        whatsapp_api_url = os.getenv('WHATSAPP_API_URL')
        whatsapp_api_token = os.getenv('WHATSAPP_API_TOKEN') or os.getenv('AUTHENTICATION_API_KEY')
        whatsapp_api_instance = os.getenv('WHATSAPP_API_INSTANCE')
        
        # Se não tiver URL completa mas tiver instância, montar URL
        if not whatsapp_api_url and whatsapp_api_instance:
            whatsapp_api_url = f"https://api.evolutionapi.com/v1/message/sendText/{whatsapp_api_instance}"
        
        if whatsapp_api_url and whatsapp_api_token:
            try:
                import requests
                # Evolution API usa header "apikey" em vez de "Authorization: Bearer"
                headers = {
                    'Content-Type': 'application/json',
                    'apikey': whatsapp_api_token
                }
                
                # Tentar também com Authorization Bearer (para outras APIs)
                if not whatsapp_api_url.startswith('https://api.evolutionapi.com'):
                    headers['Authorization'] = f'Bearer {whatsapp_api_token}'
                
                response = requests.post(
                    whatsapp_api_url,
                    json={
                        'number': telefone_limpo,
                        'text': mensagem
                    },
                    headers=headers,
                    timeout=30
                )
                
                if response.status_code in [200, 201]:
                    print(f"✅ Mensagem enviada com sucesso para {telefone_limpo}")
                    if response.text:
                        print(f"   Resposta: {response.text[:200]}")
                    return True
                else:
                    print(f"⚠️  Erro ao enviar: Status {response.status_code}")
                    print(f"   Resposta: {response.text[:500]}")
                    return False
            except Exception as e:
                print(f"⚠️  Erro ao enviar WhatsApp: {e}")
                import traceback
                traceback.print_exc()
                return False
        else:
            print("⚠️  WhatsApp API não configurada")
            print("   Configure as variáveis de ambiente:")
            print("   - WHATSAPP_API_URL ou WHATSAPP_API_INSTANCE")
            print("   - WHATSAPP_API_TOKEN ou AUTHENTICATION_API_KEY")
            return False
    
    def enviar_notificacoes(self, tenant_vencimentos: TenantVencimentos, usuarios: List[Dict]):
        """
        Envia notificações para os usuários do tenant
        """
        if not usuarios:
            print(f"⚠️  Nenhum usuário ativo encontrado para o tenant {tenant_vencimentos.tenant_name}")
            return
        
        mensagem_email = self.formatar_mensagem_email(tenant_vencimentos)
        assunto = f"Vencimentos do Dia - {tenant_vencimentos.tenant_name}"
        
        print(f"\n📤 Enviando notificações para {len(usuarios)} usuários do tenant {tenant_vencimentos.tenant_name}...")
        
        # Enviar emails para usuários do sistema
        for usuario in usuarios:
            try:
                email = usuario.get('email')
                if not email:
                    print(f"⚠️  Usuário {usuario.get('id')} sem email, ignorando...")
                    continue
                
                # Enviar email
                self.enviar_email(email, assunto, mensagem_email)
            
            except Exception as e:
                print(f"⚠️  Erro ao enviar notificação para usuário {usuario.get('id')}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        # Enviar mensagens WhatsApp individuais para cada cliente
        print(f"\n📱 Enviando mensagens WhatsApp para {len(tenant_vencimentos.vencimentos)} clientes...")
        for vencimento in tenant_vencimentos.vencimentos:
            if not vencimento.client_phone:
                print(f"⚠️  Cliente {vencimento.client_name} não tem telefone cadastrado, pulando WhatsApp...")
                continue
            
            try:
                mensagem_whatsapp = self.formatar_mensagem_whatsapp_cliente(vencimento)
                self.enviar_whatsapp(vencimento.client_phone, mensagem_whatsapp, vencimento.client_name)
            except Exception as e:
                print(f"⚠️  Erro ao enviar WhatsApp para {vencimento.client_name}: {e}")
                import traceback
                traceback.print_exc()
                continue
    
    def executar(self):
        """
        Executa o processo completo do agente
        """
        print("=" * 60)
        print("🤖 AGENTE DE IA - NOTIFICAÇÕES DE VENCIMENTOS DIÁRIOS")
        print("=" * 60)
        
        # 1. Buscar parcelas vencendo hoje
        parcelas = self.buscar_parcelas_vencendo_hoje()
        
        if not parcelas:
            print("\n✅ Nenhuma parcela vencendo hoje. Nada a fazer!")
            return
        
        # 2. Processar e agrupar por tenant
        tenant_vencimentos = self.processar_parcelas_por_tenant(parcelas)
        
        if not tenant_vencimentos:
            print("\n⚠️  Nenhum tenant encontrado com vencimentos. Nada a fazer!")
            return
        
        # 3. Para cada tenant, buscar usuários e enviar notificações
        for tenant_id, vencimentos in tenant_vencimentos.items():
            print(f"\n🏢 Processando tenant: {vencimentos.tenant_name}")
            print(f"   • {vencimentos.total_parcelas} parcelas")
            print(f"   • R$ {vencimentos.total_valor:,.2f} em aberto")
            
            usuarios = self.buscar_usuarios_tenant(tenant_id)
            self.enviar_notificacoes(vencimentos, usuarios)
        
        print("\n" + "=" * 60)
        print("✅ Processo concluído com sucesso!")
        print("=" * 60)


def main():
    """Função principal"""
    try:
        agente = AgenteVencimentosDiarios()
        agente.executar()
    except KeyboardInterrupt:
        print("\n\n⚠️  Processo interrompido pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
