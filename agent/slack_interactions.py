"""
Recebimento e consulta das aprovações dos botões do Slack.

O agente expõe seu próprio receptor de interações (POST /slack/interactions)
para que a aprovação funcione mesmo quando o serviço da API está indisponível
— caso em que o endpoint equivalente do backend estaria fora do ar.

Fallback: se a Request URL do Slack App ainda apontar para o backend,
check_approval_status consulta GET /slack/approval-status/{action_id} na API.
"""
import hashlib
import hmac
import json
import os
import re
import threading
import time
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, Optional, Set

import requests

from agent.config import config

# action_id -> {"approved": bool, "user": str, "timestamp": float}
_approvals: Dict[str, Dict[str, object]] = {}
# action_ids que o resolutor está aguardando neste momento
_pending: Set[str] = set()
_lock = threading.Lock()

# Signing secret do Slack é sempre hexadecimal de 32 caracteres
_SECRET_PATTERN = re.compile(r"^[0-9a-fA-F]{32}$")

# Tolerância para replay attacks nas requisições do Slack
_MAX_TIMESTAMP_SKEW = 60 * 5

_API_FALLBACK_URLS = [
    os.getenv("API_URL", "").rstrip("/"),
    "http://credgestor_api:8000",
]


def register_pending(action_id: str) -> None:
    """Marca que o resolutor está aguardando decisão para este action_id."""
    with _lock:
        _pending.add(action_id)


def discard_pending(action_id: str) -> None:
    with _lock:
        _pending.discard(action_id)


def record_approval(action_id: str, approved: bool, user: str = "unknown") -> None:
    with _lock:
        _approvals[action_id] = {
            "approved": approved,
            "user": user,
            "timestamp": time.time(),
        }
        _pending.discard(action_id)


def check_approval_status(action_id: str) -> Optional[bool]:
    """
    Retorna True se aprovado, False se rejeitado, None se ainda pendente.

    Consulta primeiro as aprovações recebidas pelo próprio agente e, se não
    houver registro, tenta o endpoint do backend.
    """
    with _lock:
        entry = _approvals.get(action_id)
    if entry is not None:
        return bool(entry["approved"])

    for base_url in _API_FALLBACK_URLS:
        if not base_url:
            continue
        try:
            response = requests.get(
                f"{base_url}/slack/approval-status/{action_id}", timeout=5
            )
            if response.status_code != 200:
                continue
            status = response.json().get("status")
            if status == "approved":
                return True
            if status == "rejected":
                return False
            return None
        except Exception:
            continue
    return None


def secret_is_usable() -> bool:
    """Indica se o signing secret configurado tem o formato esperado pelo Slack."""
    return bool(_SECRET_PATTERN.match(config.SLACK_SIGNING_SECRET))


def _signature_is_valid(body: str, timestamp: str, signature: str) -> bool:
    """Valida a assinatura do Slack, registrando o motivo de eventual recusa."""
    if not secret_is_usable():
        print(
            "⚠️  SLACK_SIGNING_SECRET ausente ou em formato inválido "
            "(esperado hexadecimal de 32 caracteres): assinatura não verificável"
        )
        return False
    if not signature or not timestamp:
        print("⚠️  Interação sem cabeçalhos de assinatura do Slack")
        return False
    try:
        if abs(time.time() - int(timestamp)) > _MAX_TIMESTAMP_SKEW:
            print("⚠️  Interação recusada: timestamp fora da janela de 5 minutos")
            return False
    except ValueError:
        print("⚠️  Interação recusada: timestamp inválido")
        return False

    expected = "v0=" + hmac.new(
        config.SLACK_SIGNING_SECRET.encode(),
        f"v0:{timestamp}:{body}".encode(),
        hashlib.sha256,
    ).hexdigest()
    if hmac.compare_digest(expected, signature):
        return True
    print("⚠️  Interação recusada: assinatura não confere com o signing secret")
    return False


def _extract_decision(payload: dict) -> Optional[tuple]:
    """Retorna (action_id, approved) a partir de um payload block_actions."""
    for action in payload.get("actions", []):
        for field in (action.get("action_id", ""), action.get("value", "")):
            if field.startswith("approve_"):
                return field[len("approve_"):], True
            if field.startswith("reject_"):
                return field[len("reject_"):], False
    return None


class _Handler(BaseHTTPRequestHandler):
    server_version = "CredgestorAgent/1.0"

    def log_message(self, fmt, *args):  # silenciar log de acesso padrão
        pass

    def _respond(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.rstrip("/") in {"/health", ""}:
            self._respond(200, {"status": "ok"})
            return
        if self.path.startswith("/slack/approval-status/"):
            action_id = self.path.rsplit("/", 1)[-1]
            with _lock:
                entry = _approvals.get(action_id)
            if entry is None:
                self._respond(200, {"status": "pending"})
            else:
                self._respond(200, {
                    "status": "approved" if entry["approved"] else "rejected",
                    "user": entry["user"],
                })
            return
        self._respond(404, {"error": "not found"})

    def do_POST(self):
        if self.path.rstrip("/") != "/slack/interactions":
            self._respond(404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length).decode("utf-8", errors="replace")

        signed = _signature_is_valid(
            body,
            self.headers.get("X-Slack-Request-Timestamp", ""),
            self.headers.get("X-Slack-Signature", ""),
        )

        raw_payload = urllib.parse.parse_qs(body).get("payload", ["{}"])[0]
        try:
            payload = json.loads(raw_payload)
        except json.JSONDecodeError:
            self._respond(400, {"error": "invalid payload"})
            return

        if payload.get("type") == "url_verification":
            if signed or not secret_is_usable():
                self._respond(200, {"challenge": payload.get("challenge", "")})
            else:
                self._respond(403, {"error": "invalid signature"})
            return

        decision = _extract_decision(payload)
        if decision is None:
            self._respond(200, {"ok": True})
            return

        action_id, approved = decision

        # Sem signing secret utilizável não há como verificar a origem. Nesse caso
        # só é aceita a decisão de uma ação que o resolutor está realmente
        # aguardando — o action_id é aleatório e vale por poucos minutos.
        if not signed:
            with _lock:
                is_awaited = action_id in _pending
            if not (is_awaited and not secret_is_usable()):
                print(f"⚠️  Decisão recusada para {action_id}: origem não verificada")
                self._respond(403, {"error": "invalid signature"})
                return
            print(
                "⚠️  Decisão aceita sem verificação de assinatura. "
                "Configure SLACK_SIGNING_SECRET (32 caracteres hex) do Slack App."
            )
        user = payload.get("user", {}).get("name", "unknown")
        record_approval(action_id, approved, user)
        print(f"{'✅' if approved else '❌'} Decisão recebida de {user} para {action_id}")
        self._respond(200, {
            "response_type": "ephemeral",
            "text": (
                "✅ Aprovação registrada! O agente executará a ação."
                if approved else
                "❌ Rejeição registrada! A ação será cancelada."
            ),
        })


def start_server(port: Optional[int] = None) -> None:
    """Sobe o receptor de interações em thread daemon."""
    port = port or int(os.getenv("AGENT_HTTP_PORT", "8085"))
    try:
        server = ThreadingHTTPServer(("0.0.0.0", port), _Handler)
    except Exception as e:
        print(f"⚠️  Não foi possível iniciar o receptor de interações na porta {port}: {e}")
        return

    thread = threading.Thread(
        target=server.serve_forever, name="slack-interactions", daemon=True
    )
    thread.start()
    print(f"✅ Receptor de interações do Slack ouvindo na porta {port}")
