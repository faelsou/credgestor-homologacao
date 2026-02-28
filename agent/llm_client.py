"""
Cliente LLM para análise de troubleshooting
"""
import os
from typing import Dict, List, Optional, Any
from agent.config import config


class LLMClient:
    """Cliente para interagir com LLMs (OpenAI ou Anthropic)"""
    
    def __init__(self):
        self.provider = config.LLM_PROVIDER.lower()
        self.model = config.LLM_MODEL
        
        if self.provider == "anthropic":
            self.api_key = config.ANTHROPIC_API_KEY
            if not self.api_key:
                raise ValueError("ANTHROPIC_API_KEY não configurada no .env")
        elif self.provider == "openai":
            self.api_key = config.OPENAI_API_KEY
            if not self.api_key:
                raise ValueError("OPENAI_API_KEY não configurada no .env")
        else:
            raise ValueError(f"Provedor LLM inválido: {self.provider}. Use 'openai' ou 'anthropic'")
    
    def chat(self, system_prompt: str, user_message: str) -> str:
        """
        Envia mensagem para o LLM
        
        Args:
            system_prompt: Prompt do sistema
            user_message: Mensagem do usuário
        
        Returns:
            Resposta do LLM
        """
        if self.provider == "anthropic":
            return self._chat_anthropic(system_prompt, user_message)
        elif self.provider == "openai":
            return self._chat_openai(system_prompt, user_message)
    
    def _chat_anthropic(self, system_prompt: str, user_message: str) -> str:
        """Chat usando Anthropic API"""
        try:
            from anthropic import Anthropic
            
            client = Anthropic(api_key=self.api_key)
            
            message = client.messages.create(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": user_message}
                ]
            )
            
            return message.content[0].text
        
        except Exception as e:
            error_msg = str(e)
            if "401" in error_msg or "authentication" in error_msg.lower() or "invalid x-api-key" in error_msg.lower():
                raise ValueError(
                    f"Erro de autenticação com Anthropic API. Verifique se ANTHROPIC_API_KEY está configurada corretamente no .env.\n"
                    f"Erro original: {error_msg}"
                )
            elif "404" in error_msg or "not_found_error" in error_msg.lower() or "model:" in error_msg.lower():
                raise ValueError(
                    f"Modelo não encontrado: {self.model}. Verifique se o nome do modelo está correto no .env.\n"
                    f"Modelos válidos: claude-3-5-sonnet, claude-3-5-sonnet-20241022, claude-3-haiku-20240307, claude-3-opus-20240229\n"
                    f"Erro original: {error_msg}"
                )
            else:
                raise ValueError(f"Erro ao chamar Anthropic API: {error_msg}")
    
    def _chat_openai(self, system_prompt: str, user_message: str) -> str:
        """Chat usando OpenAI API"""
        try:
            from openai import OpenAI
            
            client = OpenAI(api_key=self.api_key)
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=4096
            )
            
            return response.choices[0].message.content
        
        except Exception as e:
            error_msg = str(e)
            if "401" in error_msg or "authentication" in error_msg.lower() or "invalid api key" in error_msg.lower():
                raise ValueError(
                    f"Erro de autenticação com OpenAI API. Verifique se OPENAI_API_KEY está configurada corretamente no .env.\n"
                    f"Erro original: {error_msg}"
                )
            else:
                raise ValueError(f"Erro ao chamar OpenAI API: {error_msg}")
    
    def analyze_troubleshooting(
        self,
        context: Dict[str, Any],
        symptoms: List[str],
        logs: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analisa problema usando LLM
        
        Args:
            context: Contexto do problema
            symptoms: Lista de sintomas
            logs: Logs relevantes (opcional)
        
        Returns:
            Dicionário com diagnóstico e plano de ação
        """
        system_prompt = """Você é um especialista em troubleshooting de aplicações Docker, Python e sistemas distribuídos.
Analise o problema fornecido e forneça:
1. Diagnóstico detalhado
2. Causa raiz
3. Plano de ação com comandos específicos

Responda em formato JSON com as seguintes chaves:
- diagnostico: Descrição detalhada do problema
- causa_raiz: Causa raiz identificada
- plano_acao: Lista de ações a serem executadas (strings simples e diretas)
- comandos: Lista de comandos Docker/Linux específicos (opcional)

Seja objetivo e prático. Foque em soluções executáveis."""

        user_prompt = f"""Problema detectado:
Componente: {context.get('component', 'desconhecido')}
Descrição: {context.get('description', 'N/A')}

Sintomas:
{chr(10).join(f'- {s}' for s in symptoms)}

Contexto adicional:
{context.get('details', 'N/A')}

{f'Logs relevantes:{chr(10)}{logs}' if logs else ''}

Analise e forneça diagnóstico e plano de ação."""

        try:
            response = self.chat(system_prompt, user_prompt)
            
            # Tentar parsear JSON da resposta
            import json
            import re
            
            # Extrair JSON da resposta (pode ter texto antes/depois)
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                # Se não encontrar JSON, criar estrutura básica
                result = {
                    "diagnostico": response,
                    "causa_raiz": "Análise de IA não retornou JSON válido",
                    "plano_acao": ["Verificar logs manualmente", "Consultar documentação"],
                    "comandos": []
                }
            
            return result
        
        except ValueError as e:
            # Re-raise erros de autenticação/configuração
            raise
        except Exception as e:
            # Para outros erros, retornar diagnóstico básico
            return {
                "diagnostico": f"Erro ao analisar com IA: {str(e)}",
                "causa_raiz": "Erro na análise de IA",
                "plano_acao": ["Verificar configuração da API key", "Consultar logs manualmente"],
                "comandos": []
            }
