#!/usr/bin/env python3
"""
Batimento FE ↔ DB: empréstimos e parcelas.

Compara valores persistidos no Supabase com as fórmulas do frontend:
  - Canônica (loanBalances.ts / Histórico)
  - Listagem Empréstimos (Loans.tsx) — INTEREST_ONLY diverge

Uso:
  python3 scripts/batimento_emprestimos_parcelas.py
  python3 scripts/batimento_emprestimos_parcelas.py --tenant <uuid>
  python3 scripts/batimento_emprestimos_parcelas.py --json out.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

# Carrega .env do root do projeto se dotenv estiver disponível
ROOT = Path(__file__).resolve().parents[1]
try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / ".env")
except ImportError:
    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip("'").strip('"')
            os.environ.setdefault(key, val)


TOLERANCE = Decimal("0.02")  # centavos / arredondamento
TODAY = date.today()  # America/Sao_Paulo aproximado pelo host; override via TZ


def money(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.00")
    d = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return d


def ceil_money(value: Decimal) -> Decimal:
    """Espelha Math.ceil do JS para reais (centavos para cima no valor inteiro)."""
    # Math.ceil em JS atua sobre o número float em reais (não centavos).
    # Ex.: 99.1 → 100
    import math

    return Decimal(str(math.ceil(float(value))))


@dataclass
class Finding:
    tipo: str
    severidade: str  # CRITICAL | HIGH | MEDIUM | LOW
    tenant_id: str
    client_name: str
    loan_id: str
    installment_id: str | None
    detalhe: str
    db_value: Any = None
    fe_value: Any = None


@dataclass
class Report:
    findings: list[Finding] = field(default_factory=list)
    summary: dict[str, int] = field(default_factory=dict)
    totals: dict[str, Any] = field(default_factory=dict)

    def add(self, f: Finding) -> None:
        self.findings.append(f)
        self.summary[f.tipo] = self.summary.get(f.tipo, 0) + 1


class SupabaseRest:
    def __init__(self, url: str, key: str) -> None:
        self.base = url.rstrip("/")
        self.key = key

    def fetch_all(self, table: str, select: str, extra: dict[str, str] | None = None) -> list[dict]:
        rows: list[dict] = []
        page_size = 1000
        offset = 0
        while True:
            params = {"select": select, "limit": str(page_size), "offset": str(offset)}
            if extra:
                params.update(extra)
            qs = urlencode(params)
            req = Request(
                f"{self.base}/rest/v1/{table}?{qs}",
                headers={
                    "apikey": self.key,
                    "Authorization": f"Bearer {self.key}",
                    "Prefer": "count=exact",
                },
            )
            try:
                with urlopen(req, timeout=60) as resp:
                    chunk = json.loads(resp.read().decode())
            except HTTPError as e:
                body = e.read().decode() if e.fp else ""
                raise RuntimeError(f"HTTP {e.code} em {table}: {body}") from e
            except URLError as e:
                raise RuntimeError(f"Falha de rede em {table}: {e}") from e

            if not isinstance(chunk, list):
                raise RuntimeError(f"Resposta inesperada de {table}: {chunk}")
            rows.extend(chunk)
            if len(chunk) < page_size:
                break
            offset += page_size
        return rows


def sum_principal_paid(installments: list[dict]) -> Decimal:
    total = Decimal("0")
    for inst in installments:
        history = inst.get("payment_history") or []
        if not isinstance(history, list):
            continue
        for entry in history:
            total += money(entry.get("principalPaid") or entry.get("principal_paid") or 0)
    return total


def has_pending_balance(installments: list[dict]) -> bool:
    for inst in installments:
        status = (inst.get("status") or "").upper()
        amount = money(inst.get("amount"))
        paid = money(inst.get("amount_paid"))
        if status != "PAID" and paid < amount:
            return True
    return False


def outstanding_interest_only_canonical(loan: dict, related: list[dict]) -> Decimal:
    """loanBalances.ts — fórmula canônica."""
    pending_capital = max(Decimal("0"), money(loan.get("amount")) - sum_principal_paid(related))
    calculated_interest = money(pending_capital * money(loan.get("interest_rate")) / Decimal("100"))

    open_charges = Decimal("0")
    for inst in related:
        status = (inst.get("status") or "").upper()
        amount = money(inst.get("amount"))
        paid = money(inst.get("amount_paid"))
        if status != "PAID" and paid < amount:
            open_charges += max(Decimal("0"), amount - paid)

    monthly = max(calculated_interest, open_charges)
    return money(pending_capital + monthly)


def outstanding_interest_only_loans_tsx(loan: dict, related: list[dict]) -> Decimal:
    """Loans.tsx — multiplica juros mensais por installments_count."""
    pending_capital = max(Decimal("0"), money(loan.get("amount")) - sum_principal_paid(related))
    monthly_interest = ceil_money(
        pending_capital * money(loan.get("interest_rate")) / Decimal("100")
    )
    total_installments = int(loan.get("installments_count") or len(related) or 1)
    return money(pending_capital + monthly_interest * total_installments)


def outstanding_price(loan: dict, related: list[dict]) -> Decimal:
    total_paid = sum((money(i.get("amount_paid")) for i in related), Decimal("0"))
    return money(max(Decimal("0"), money(loan.get("total_amount")) - total_paid))


def calculate_outstanding_canonical(loan: dict, related: list[dict]) -> Decimal:
    status = (loan.get("status") or "").upper()
    pending = has_pending_balance(related)
    if status == "PAID" and not pending:
        return Decimal("0.00")
    if not related:
        return money(loan.get("total_amount"))
    model = (loan.get("model") or "PRICE").upper()
    if model == "INTEREST_ONLY":
        return outstanding_interest_only_canonical(loan, related)
    return outstanding_price(loan, related)


def calculate_outstanding_loans_tsx(loan: dict, related: list[dict]) -> Decimal:
    status = (loan.get("status") or "").upper()
    if status == "PAID":
        return Decimal("0.00")
    if not related:
        return money(loan.get("total_amount"))
    model = (loan.get("model") or "PRICE").upper()
    if model == "INTEREST_ONLY":
        return outstanding_interest_only_loans_tsx(loan, related)
    return outstanding_price(loan, related)


def display_status_canonical(loan: dict, related: list[dict]) -> str:
    if not related:
        return "ACTIVE"
    model = (loan.get("model") or "PRICE").upper()
    if model == "INTEREST_ONLY":
        capital_paid = sum_principal_paid(related) >= money(loan.get("amount"))
        pending = has_pending_balance(related)
        return "PAID" if capital_paid and not pending else "ACTIVE"
    all_paid = all(
        (i.get("status") or "").upper() == "PAID" or money(i.get("amount")) <= 0 for i in related
    )
    return "PAID" if all_paid else "ACTIVE"


def run_batimento(
    loans: list[dict],
    installments: list[dict],
    clients: dict[str, str],
    tenants: dict[str, str],
    tenant_filter: str | None,
) -> Report:
    report = Report()
    by_loan: dict[str, list[dict]] = defaultdict(list)
    for inst in installments:
        if tenant_filter and inst.get("tenant_id") != tenant_filter:
            continue
        by_loan[inst["loan_id"]].append(inst)

    filtered_loans = [
        l for l in loans if (not tenant_filter or l.get("tenant_id") == tenant_filter)
    ]

    report.totals = {
        "tenants": len({l["tenant_id"] for l in filtered_loans}),
        "loans": len(filtered_loans),
        "installments": sum(len(by_loan[l["id"]]) for l in filtered_loans),
        "hoje": str(TODAY),
    }

    for loan in filtered_loans:
        loan_id = loan["id"]
        related = by_loan.get(loan_id, [])
        tenant_id = loan.get("tenant_id") or ""
        client_name = clients.get(loan.get("client_id") or "", "(sem cliente)")
        tenant_label = tenants.get(tenant_id, tenant_id[:8])
        db_status = (loan.get("status") or "").upper()
        db_outstanding = money(loan.get("outstanding_amount"))
        fe_canon = calculate_outstanding_canonical(loan, related)
        fe_loans_tsx = calculate_outstanding_loans_tsx(loan, related)
        fe_status = display_status_canonical(loan, related)
        model = (loan.get("model") or "PRICE").upper()

        # G) outstanding_amount persistido ≠ fórmula canônica do FE
        if abs(db_outstanding - fe_canon) > TOLERANCE:
            report.add(
                Finding(
                    tipo="G_outstanding_db_vs_fe_canonico",
                    severidade="HIGH",
                    tenant_id=tenant_id,
                    client_name=f"{client_name} [{tenant_label}]",
                    loan_id=loan_id,
                    installment_id=None,
                    detalhe=(
                        f"modelo={model} status_db={db_status} | "
                        f"DB outstanding={db_outstanding} ≠ FE canônico={fe_canon} "
                        f"(Δ={db_outstanding - fe_canon}) | "
                        f"FE Loans.tsx={fe_loans_tsx}"
                    ),
                    db_value=float(db_outstanding),
                    fe_value=float(fe_canon),
                )
            )

        # H) divergência entre fórmulas FE (só INTEREST_ONLY costuma divergir)
        if abs(fe_canon - fe_loans_tsx) > TOLERANCE:
            report.add(
                Finding(
                    tipo="H_divergencia_formulas_fe",
                    severidade="MEDIUM",
                    tenant_id=tenant_id,
                    client_name=f"{client_name} [{tenant_label}]",
                    loan_id=loan_id,
                    installment_id=None,
                    detalhe=(
                        f"modelo={model} | Histórico/loanBalances={fe_canon} ≠ "
                        f"Listagem Empréstimos={fe_loans_tsx} "
                        f"(Δ={fe_canon - fe_loans_tsx})"
                    ),
                    db_value=float(fe_loans_tsx),
                    fe_value=float(fe_canon),
                )
            )

        # I) status DB ≠ status exibido pelo FE canônico
        if db_status in ("ACTIVE", "OPEN", "PAID") and db_status != fe_status and not (
            db_status == "OPEN" and fe_status == "ACTIVE"
        ):
            # OPEN mapeia para ACTIVE no FE
            if not (db_status == "OPEN" and fe_status == "ACTIVE"):
                report.add(
                    Finding(
                        tipo="I_status_emprestimo_db_vs_fe",
                        severidade="HIGH",
                        tenant_id=tenant_id,
                        client_name=f"{client_name} [{tenant_label}]",
                        loan_id=loan_id,
                        installment_id=None,
                        detalhe=f"DB status={db_status} ≠ FE display={fe_status} modelo={model}",
                        db_value=db_status,
                        fe_value=fe_status,
                    )
                )

        # J) PRICE: total_amount ≠ soma das parcelas
        if model == "PRICE" and related:
            sum_amounts = sum((money(i.get("amount")) for i in related), Decimal("0"))
            total_amount = money(loan.get("total_amount"))
            if abs(sum_amounts - total_amount) > TOLERANCE:
                report.add(
                    Finding(
                        tipo="J_total_amount_vs_soma_parcelas",
                        severidade="HIGH",
                        tenant_id=tenant_id,
                        client_name=f"{client_name} [{tenant_label}]",
                        loan_id=loan_id,
                        installment_id=None,
                        detalhe=(
                            f"total_amount={total_amount} ≠ Σ parcelas.amount={sum_amounts} "
                            f"(Δ={total_amount - sum_amounts}) qtd={len(related)}"
                        ),
                        db_value=float(total_amount),
                        fe_value=float(sum_amounts),
                    )
                )

        # K) amount_paid > amount (pagamento acima do valor da parcela)
        for inst in related:
            amount = money(inst.get("amount"))
            paid = money(inst.get("amount_paid"))
            if paid > amount + TOLERANCE:
                report.add(
                    Finding(
                        tipo="K_pago_maior_que_parcela",
                        severidade="MEDIUM",
                        tenant_id=tenant_id,
                        client_name=f"{client_name} [{tenant_label}]",
                        loan_id=loan_id,
                        installment_id=inst.get("id"),
                        detalhe=(
                            f"parcela #{inst.get('number')} amount={amount} "
                            f"amount_paid={paid} excesso={paid - amount}"
                        ),
                        db_value=float(paid),
                        fe_value=float(amount),
                    )
                )

            # L) payment_history soma ≠ amount_paid
            history = inst.get("payment_history") or []
            if isinstance(history, list) and history:
                hist_sum = Decimal("0")
                for entry in history:
                    hist_sum += money(entry.get("amount") or 0)
                if abs(hist_sum - paid) > TOLERANCE:
                    report.add(
                        Finding(
                            tipo="L_historico_vs_amount_paid",
                            severidade="MEDIUM",
                            tenant_id=tenant_id,
                            client_name=f"{client_name} [{tenant_label}]",
                            loan_id=loan_id,
                            installment_id=inst.get("id"),
                            detalhe=(
                                f"parcela #{inst.get('number')} Σ payment_history={hist_sum} "
                                f"≠ amount_paid={paid}"
                            ),
                            db_value=float(paid),
                            fe_value=float(hist_sum),
                        )
                    )

            # Tipos A–F (status)
            status = (inst.get("status") or "").upper()
            due_raw = inst.get("due_date")
            due = None
            if due_raw:
                try:
                    due = date.fromisoformat(str(due_raw)[:10])
                except ValueError:
                    due = None

            if paid >= amount and amount > 0 and status != "PAID":
                report.add(
                    Finding(
                        tipo="B_valor_quitado_status_nao_paid",
                        severidade="CRITICAL",
                        tenant_id=tenant_id,
                        client_name=f"{client_name} [{tenant_label}]",
                        loan_id=loan_id,
                        installment_id=inst.get("id"),
                        detalhe=f"parcela #{inst.get('number')} pago={paid} valor={amount} status={status}",
                        db_value=status,
                        fe_value="PAID",
                    )
                )

            if status == "PAID" and paid < amount and amount > 0:
                report.add(
                    Finding(
                        tipo="C_status_paid_com_saldo",
                        severidade="CRITICAL",
                        tenant_id=tenant_id,
                        client_name=f"{client_name} [{tenant_label}]",
                        loan_id=loan_id,
                        installment_id=inst.get("id"),
                        detalhe=(
                            f"parcela #{inst.get('number')} status=PAID mas saldo="
                            f"{amount - paid}"
                        ),
                        db_value=status,
                        fe_value="PARTIAL" if paid > 0 else "PENDING",
                    )
                )

            if (
                status == "PENDING"
                and paid < amount
                and due is not None
                and due < TODAY
            ):
                report.add(
                    Finding(
                        tipo="D_vencida_ainda_pending",
                        severidade="MEDIUM",
                        tenant_id=tenant_id,
                        client_name=f"{client_name} [{tenant_label}]",
                        loan_id=loan_id,
                        installment_id=inst.get("id"),
                        detalhe=(
                            f"parcela #{inst.get('number')} vencimento={due} "
                            f"dias_atraso={(TODAY - due).days} status=PENDING"
                        ),
                        db_value="PENDING",
                        fe_value="LATE",
                    )
                )

            if db_status == "PAID" and status != "PAID" and paid < amount:
                report.add(
                    Finding(
                        tipo="A_emprestimo_paid_parcela_pendente",
                        severidade="CRITICAL",
                        tenant_id=tenant_id,
                        client_name=f"{client_name} [{tenant_label}]",
                        loan_id=loan_id,
                        installment_id=inst.get("id"),
                        detalhe=(
                            f"loan PAID mas parcela #{inst.get('number')} "
                            f"status={status} saldo={amount - paid}"
                        ),
                        db_value=db_status,
                        fe_value="ACTIVE",
                    )
                )

        # E / F
        if db_status in ("ACTIVE", "OPEN") and related and not has_pending_balance(related):
            # INTEREST_ONLY: só E se capital também quitado
            if model == "INTEREST_ONLY":
                if sum_principal_paid(related) >= money(loan.get("amount")):
                    report.add(
                        Finding(
                            tipo="E_emprestimo_active_sem_parcela_pendente",
                            severidade="HIGH",
                            tenant_id=tenant_id,
                            client_name=f"{client_name} [{tenant_label}]",
                            loan_id=loan_id,
                            installment_id=None,
                            detalhe="ACTIVE/OPEN sem parcela pendente e capital quitado → deveria PAID",
                            db_value=db_status,
                            fe_value="PAID",
                        )
                    )
            else:
                report.add(
                    Finding(
                        tipo="E_emprestimo_active_sem_parcela_pendente",
                        severidade="HIGH",
                        tenant_id=tenant_id,
                        client_name=f"{client_name} [{tenant_label}]",
                        loan_id=loan_id,
                        installment_id=None,
                        detalhe="ACTIVE/OPEN sem parcela pendente → deveria PAID",
                        db_value=db_status,
                        fe_value="PAID",
                    )
                )

        if db_status == "PAID" and db_outstanding > TOLERANCE:
            report.add(
                Finding(
                    tipo="F_emprestimo_paid_com_valor_aberto",
                    severidade="HIGH",
                    tenant_id=tenant_id,
                    client_name=f"{client_name} [{tenant_label}]",
                    loan_id=loan_id,
                    installment_id=None,
                    detalhe=f"PAID com outstanding_amount={db_outstanding}",
                    db_value=float(db_outstanding),
                    fe_value=0.0,
                )
            )

        # M: empréstimo sem parcelas
        if not related and db_status not in ("PAID",):
            report.add(
                Finding(
                    tipo="M_emprestimo_sem_parcelas",
                    severidade="HIGH",
                    tenant_id=tenant_id,
                    client_name=f"{client_name} [{tenant_label}]",
                    loan_id=loan_id,
                    installment_id=None,
                    detalhe=f"status={db_status} amount={loan.get('amount')} sem installments",
                    db_value=0,
                    fe_value=None,
                )
            )

    return report


def print_report(report: Report) -> None:
    print("=" * 72)
    print("BATIMENTO EMPRÉSTIMOS / PARCELAS — FE ↔ DB")
    print(f"Gerado em: {datetime.now().isoformat(timespec='seconds')}")
    print(
        f"Escopo: {report.totals.get('tenants')} tenant(s), "
        f"{report.totals.get('loans')} empréstimos, "
        f"{report.totals.get('installments')} parcelas | hoje={report.totals.get('hoje')}"
    )
    print("=" * 72)

    if not report.findings:
        print("\n✅ Nenhuma inconsistência encontrada.\n")
        return

    print("\n## RESUMO POR TIPO\n")
    for tipo, qtd in sorted(report.summary.items(), key=lambda x: (-x[1], x[0])):
        print(f"  {qtd:4d}  {tipo}")

    by_sev: dict[str, int] = defaultdict(int)
    for f in report.findings:
        by_sev[f.severidade] += 1
    print("\n## POR SEVERIDADE\n")
    for sev in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
        if by_sev[sev]:
            print(f"  {by_sev[sev]:4d}  {sev}")

    print("\n## DETALHES (até 80 por tipo)\n")
    by_tipo: dict[str, list[Finding]] = defaultdict(list)
    for f in report.findings:
        by_tipo[f.tipo].append(f)

    for tipo in sorted(by_tipo.keys()):
        items = by_tipo[tipo]
        print(f"\n### {tipo} ({len(items)})\n")
        for f in items[:80]:
            print(f"  • {f.client_name}")
            print(f"    loan={f.loan_id}" + (f" inst={f.installment_id}" if f.installment_id else ""))
            print(f"    [{f.severidade}] {f.detalhe}")
        if len(items) > 80:
            print(f"  … +{len(items) - 80} omitidos")

    print("\n" + "=" * 72)
    print(f"TOTAL DE ACHADOS: {len(report.findings)}")
    print("=" * 72)


def main() -> int:
    parser = argparse.ArgumentParser(description="Batimento FE↔DB de empréstimos/parcelas")
    parser.add_argument("--tenant", help="Filtrar por tenant_id (UUID)")
    parser.add_argument("--json", dest="json_out", help="Salvar relatório JSON neste path")
    args = parser.parse_args()

    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.", file=sys.stderr)
        return 1

    api = SupabaseRest(url, key)
    print("Carregando dados do Supabase…", flush=True)

    tenants_rows = api.fetch_all("tenants", "id,name")
    clients_rows = api.fetch_all("clients", "id,nome,tenant_id")
    loans = api.fetch_all(
        "loans",
        "id,tenant_id,client_id,amount,interest_rate,total_amount,outstanding_amount,"
        "installments_count,model,status,start_date",
    )
    installments = api.fetch_all(
        "installments",
        "id,tenant_id,loan_id,client_id,number,due_date,amount,amount_paid,"
        "interest_amount,principal_amount,status,paid_date,payment_history",
    )

    tenants = {t["id"]: t.get("name") or t["id"] for t in tenants_rows}
    clients = {c["id"]: c.get("nome") or "(sem nome)" for c in clients_rows}

    print(
        f"OK: {len(tenants)} tenants, {len(clients)} clients, "
        f"{len(loans)} loans, {len(installments)} installments",
        flush=True,
    )

    report = run_batimento(loans, installments, clients, tenants, args.tenant)
    print_report(report)

    if args.json_out:
        payload = {
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "totals": report.totals,
            "summary": report.summary,
            "findings": [
                {
                    "tipo": f.tipo,
                    "severidade": f.severidade,
                    "tenant_id": f.tenant_id,
                    "client_name": f.client_name,
                    "loan_id": f.loan_id,
                    "installment_id": f.installment_id,
                    "detalhe": f.detalhe,
                    "db_value": f.db_value,
                    "fe_value": f.fe_value,
                }
                for f in report.findings
            ],
        }
        Path(args.json_out).write_text(json.dumps(payload, ensure_ascii=False, indent=2))
        print(f"\nJSON salvo em: {args.json_out}")

    # Exit code: 0 se ok, 2 se CRITICAL/HIGH
    critical = sum(1 for f in report.findings if f.severidade in ("CRITICAL", "HIGH"))
    return 2 if critical else 0


if __name__ == "__main__":
    sys.exit(main())
