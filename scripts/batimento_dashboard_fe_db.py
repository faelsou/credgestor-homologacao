#!/usr/bin/env python3
"""
Batimento Dashboard (Home.tsx) ↔ Banco Supabase.

Replica as fórmulas dos cards:
  - Empréstimos Parcelados (PRICE)
  - Empréstimos Somente Juros (INTEREST_ONLY)

Valida:
  1. Totais do card (capital, parcelas/juros, lucro, recebido, a receber, atraso, ativos)
  2. Identidades internas (PRICE: recebido+a_receber = total; JUROS: capital+juros = jmc)
  3. Qualidade de dados (interest+principal ≠ amount; interest_amount=0 com residual)
  4. Paginação (conta real vs se cortasse em 1000)
  5. Opcional: compara valores colados da tela (--expect / --expect-json)

Uso:
  python3 scripts/batimento_dashboard_fe_db.py
  python3 scripts/batimento_dashboard_fe_db.py --tenant 00000000-0000-0000-0000-000000000003
  python3 scripts/batimento_dashboard_fe_db.py --as-of 2026-08-05
  python3 scripts/batimento_dashboard_fe_db.py --start 2026-01-01 --end 2026-08-05
  python3 scripts/batimento_dashboard_fe_db.py --expect-json scripts/dashboard_expect_0003.json
  python3 scripts/batimento_dashboard_fe_db.py --json /tmp/batimento_dashboard.json

Exit code:
  0 = tudo OK (ou só relatório sem --expect)
  1 = divergência FE×DB ou identidade quebrada (PRICE)
  2 = erro de configuração / API
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import asdict, dataclass, field
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

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
            os.environ.setdefault(key.strip(), val.strip().strip("'").strip('"'))

TOLERANCE = Decimal("0.02")
DEFAULT_TENANT = "00000000-0000-0000-0000-000000000003"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def money(value: Any) -> Decimal:
    if value is None:
        return Decimal("0.00")
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def brl(value: Decimal | float | int) -> str:
    d = money(value)
    # 1234.56 → R$ 1.234,56
    neg = d < 0
    cents = int((abs(d) * 100).to_integral_value(rounding=ROUND_HALF_UP))
    whole, frac = divmod(cents, 100)
    whole_s = f"{whole:,}".replace(",", ".")
    s = f"R$ {whole_s},{frac:02d}"
    return f"-{s}" if neg else s


def parse_ymd(s: str | None) -> date | None:
    if not s:
        return None
    return date.fromisoformat(s.strip()[:10])


def due_date_of(inst: dict) -> date | None:
    raw = inst.get("due_date") or inst.get("dueDate")
    if not raw:
        return None
    return date.fromisoformat(str(raw).split("T")[0].split(" ")[0])


def is_late(due: date | None, as_of: date) -> bool:
    return due is not None and due < as_of


def close(a: Decimal, b: Decimal, tol: Decimal = TOLERANCE) -> bool:
    return abs(a - b) <= tol


# ---------------------------------------------------------------------------
# Fórmulas espelhando Home.tsx
# ---------------------------------------------------------------------------

def price_interest(inst: dict) -> Decimal:
    """interestAmount ?? Math.max(0, amount - (principalAmount ?? amount))"""
    ia = inst.get("interest_amount")
    if ia is not None:
        return money(ia)
    amt = money(inst.get("amount"))
    pa = inst.get("principal_amount")
    if pa is not None:
        return max(Decimal("0.00"), amt - money(pa))
    return Decimal("0.00")


def price_principal(inst: dict) -> Decimal:
    """principalAmount ?? Math.max(0, amount - (interestAmount ?? 0))"""
    pa = inst.get("principal_amount")
    if pa is not None:
        return money(pa)
    amt = money(inst.get("amount"))
    ia = money(inst.get("interest_amount") or 0)
    return max(Decimal("0.00"), amt - ia)


def juros_interest(inst: dict) -> Decimal:
    """interestAmount ?? amount  (card Somente Juros)"""
    ia = inst.get("interest_amount")
    if ia is not None:
        return money(ia)
    return money(inst.get("amount"))


def pending_of(inst: dict) -> Decimal:
    return money(inst.get("amount")) - money(inst.get("amount_paid") or 0)


# ---------------------------------------------------------------------------
# Supabase
# ---------------------------------------------------------------------------

class SupabaseRest:
    def __init__(self, url: str, key: str) -> None:
        self.base = url.rstrip("/")
        self.key = key

    def fetch_all(self, table: str, select: str, filters: dict[str, str]) -> list[dict]:
        rows: list[dict] = []
        page_size = 1000
        offset = 0
        while True:
            params = {"select": select, "limit": str(page_size), "offset": str(offset)}
            params.update(filters)
            req = Request(
                f"{self.base}/rest/v1/{table}?{urlencode(params)}",
                headers={
                    "apikey": self.key,
                    "Authorization": f"Bearer {self.key}",
                    "Prefer": "count=exact",
                },
            )
            try:
                with urlopen(req, timeout=90) as resp:
                    chunk = json.loads(resp.read().decode())
            except HTTPError as e:
                body = e.read().decode() if e.fp else ""
                raise RuntimeError(f"HTTP {e.code} em {table}: {body}") from e
            except URLError as e:
                raise RuntimeError(f"Falha de rede: {e}") from e
            rows.extend(chunk)
            if len(chunk) < page_size:
                break
            offset += page_size
        return rows


# ---------------------------------------------------------------------------
# Cálculo
# ---------------------------------------------------------------------------

@dataclass
class CardMetrics:
    capital_emprestado: Decimal = Decimal("0.00")
    valor_parcelas_ou_juros: Decimal = Decimal("0.00")  # PRICE: sum amount; JUROS: sum interest
    lucro_ou_juros: Decimal = Decimal("0.00")  # PRICE: interest; JUROS: interest (mesmo)
    total_periodo: Decimal = Decimal("0.00")  # PRICE: valor_parcelas; JUROS: juros+capital
    recebido: Decimal = Decimal("0.00")
    a_receber: Decimal = Decimal("0.00")
    em_atraso: Decimal = Decimal("0.00")
    em_atraso_qtd: int = 0
    ativos: int = 0
    qtd_parcelas: int = 0
    qtd_loans: int = 0


@dataclass
class DataQualityIssue:
    tipo: str
    installment_id: str
    loan_id: str
    detalhe: str
    amount: Decimal
    interest: Any
    principal: Any


@dataclass
class DashboardReport:
    tenant_id: str
    as_of: str
    start: str | None
    end: str | None
    counts: dict[str, int] = field(default_factory=dict)
    price: dict[str, Any] = field(default_factory=dict)
    juros: dict[str, Any] = field(default_factory=dict)
    identities: dict[str, Any] = field(default_factory=dict)
    expect_compare: list[dict[str, Any]] = field(default_factory=list)
    data_quality: list[dict[str, Any]] = field(default_factory=list)
    pagination_warning: dict[str, Any] = field(default_factory=dict)
    ok: bool = True
    summary: str = ""


def filter_by_period(
    installments: list[dict],
    start: date | None,
    end: date | None,
) -> list[dict]:
    if not start or not end:
        return list(installments)
    out = []
    for inst in installments:
        due = due_date_of(inst)
        if due is not None and start <= due <= end:
            out.append(inst)
    return out


def compute_price(
    loans: list[dict],
    installments: list[dict],
    as_of: date,
) -> CardMetrics:
    m = CardMetrics()
    m.qtd_loans = len(loans)
    m.qtd_parcelas = len(installments)
    m.ativos = sum(1 for l in loans if l.get("status") == "ACTIVE")
    m.capital_emprestado = sum(
        (money(l.get("amount")) for l in loans if l.get("status") == "ACTIVE"),
        Decimal("0.00"),
    )
    m.valor_parcelas_ou_juros = sum((money(i.get("amount")) for i in installments), Decimal("0.00"))
    m.lucro_ou_juros = sum((price_interest(i) for i in installments), Decimal("0.00"))
    m.total_periodo = m.valor_parcelas_ou_juros
    m.recebido = sum((money(i.get("amount_paid") or 0) for i in installments), Decimal("0.00"))
    m.a_receber = sum(
        (pending_of(i) for i in installments if i.get("status") != "PAID"),
        Decimal("0.00"),
    )
    late_list = [
        i
        for i in installments
        if i.get("status") != "PAID"
        and is_late(due_date_of(i), as_of)
        and pending_of(i) > 0
    ]
    m.em_atraso = sum((pending_of(i) for i in late_list), Decimal("0.00"))
    m.em_atraso_qtd = len(late_list)
    return m


def compute_juros(
    loans: list[dict],
    installments: list[dict],
    as_of: date,
) -> CardMetrics:
    m = CardMetrics()
    m.qtd_loans = len(loans)
    m.qtd_parcelas = len(installments)
    m.ativos = sum(1 for l in loans if l.get("status") == "ACTIVE")
    m.capital_emprestado = sum(
        (money(l.get("amount")) for l in loans if l.get("status") == "ACTIVE"),
        Decimal("0.00"),
    )
    m.lucro_ou_juros = sum((juros_interest(i) for i in installments), Decimal("0.00"))
    m.valor_parcelas_ou_juros = m.lucro_ou_juros
    m.total_periodo = m.lucro_ou_juros + m.capital_emprestado  # jurosMaisCapital
    m.recebido = sum((money(i.get("amount_paid") or 0) for i in installments), Decimal("0.00"))
    m.a_receber = sum(
        (pending_of(i) for i in installments if i.get("status") != "PAID"),
        Decimal("0.00"),
    )
    late_list = [
        i
        for i in installments
        if i.get("status") != "PAID"
        and is_late(due_date_of(i), as_of)
        and pending_of(i) > 0
    ]
    m.em_atraso = sum((pending_of(i) for i in late_list), Decimal("0.00"))
    m.em_atraso_qtd = len(late_list)
    return m


def metrics_to_dict(m: CardMetrics, kind: str) -> dict[str, Any]:
    if kind == "price":
        return {
            "capital_emprestado": float(m.capital_emprestado),
            "valor_das_parcelas": float(m.valor_parcelas_ou_juros),
            "lucro": float(m.lucro_ou_juros),
            "total_periodo": float(m.total_periodo),
            "recebido": float(m.recebido),
            "a_receber": float(m.a_receber),
            "em_atraso": float(m.em_atraso),
            "em_atraso_qtd": m.em_atraso_qtd,
            "ativos": m.ativos,
            "qtd_parcelas": m.qtd_parcelas,
            "qtd_loans": m.qtd_loans,
        }
    return {
        "capital_emprestado": float(m.capital_emprestado),
        "valor_do_juros": float(m.lucro_ou_juros),
        "juros_mais_capital": float(m.total_periodo),
        "recebido": float(m.recebido),
        "a_receber": float(m.a_receber),
        "em_atraso": float(m.em_atraso),
        "em_atraso_qtd": m.em_atraso_qtd,
        "ativos": m.ativos,
        "qtd_parcelas": m.qtd_parcelas,
        "qtd_loans": m.qtd_loans,
    }


def scan_data_quality(installments: list[dict], loan_model: dict[str, str]) -> list[DataQualityIssue]:
    """Checagens de consistência.

    INTEREST_ONLY: principal_amount costuma guardar capital em aberto do contrato,
    enquanto amount/interest são só a cobrança de juros — ia+pa ≠ amount é esperado.
    Por isso IA_PA_NE_AMOUNT e INTEREST_ZERO_COM_RESIDUAL só rodam em PRICE.
    """
    issues: list[DataQualityIssue] = []
    for inst in installments:
        iid = str(inst.get("id") or "")
        lid = str(inst.get("loan_id") or "")
        amt = money(inst.get("amount"))
        ia = inst.get("interest_amount")
        pa = inst.get("principal_amount")
        model = loan_model.get(lid, "?")

        if model == "INTEREST_ONLY":
            continue

        if ia is not None and pa is not None:
            gap = money(ia) + money(pa) - amt
            if abs(gap) > TOLERANCE:
                issues.append(
                    DataQualityIssue(
                        tipo="IA_PA_NE_AMOUNT",
                        installment_id=iid,
                        loan_id=lid,
                        detalhe=f"interest+principal−amount = {gap} (model={model})",
                        amount=amt,
                        interest=ia,
                        principal=pa,
                    )
                )

        # interest=0 com amount > principal → residual de juros não registrado (caso 2031eb6e)
        if ia is not None and pa is not None and money(ia) == 0 and amt > money(pa) + TOLERANCE:
            issues.append(
                DataQualityIssue(
                    tipo="INTEREST_ZERO_COM_RESIDUAL",
                    installment_id=iid,
                    loan_id=lid,
                    detalhe=f"interest=0 mas amount−principal={amt - money(pa)} (model={model})",
                    amount=amt,
                    interest=ia,
                    principal=pa,
                )
            )
    return issues


EXPECT_FIELD_MAP = {
    # PRICE
    "p_capital": ("price", "capital_emprestado", "PRICE · Valor dinheiro emprestado"),
    "p_parcelas": ("price", "valor_das_parcelas", "PRICE · Valor das parcelas"),
    "p_lucro": ("price", "lucro", "PRICE · Lucro"),
    "p_total": ("price", "total_periodo", "PRICE · Total do período"),
    "p_recebido": ("price", "recebido", "PRICE · Recebido"),
    "p_a_receber": ("price", "a_receber", "PRICE · A Receber"),
    "p_atraso": ("price", "em_atraso", "PRICE · Em Atraso (R$)"),
    "p_atraso_qtd": ("price", "em_atraso_qtd", "PRICE · Em Atraso (qtd)"),
    "p_ativos": ("price", "ativos", "PRICE · Ativos"),
    # JUROS
    "j_capital": ("juros", "capital_emprestado", "JUROS · Capital"),
    "j_juros": ("juros", "valor_do_juros", "JUROS · Valor do Juros"),
    "j_total": ("juros", "juros_mais_capital", "JUROS · Juros + Capital"),
    "j_recebido": ("juros", "recebido", "JUROS · Recebido"),
    "j_a_receber": ("juros", "a_receber", "JUROS · A Receber"),
    "j_atraso": ("juros", "em_atraso", "JUROS · Em Atraso (R$)"),
    "j_atraso_qtd": ("juros", "em_atraso_qtd", "JUROS · Em Atraso (qtd)"),
    "j_ativos": ("juros", "ativos", "JUROS · Ativos"),
}


def compare_expect(
    price: dict[str, Any],
    juros: dict[str, Any],
    expect: dict[str, Any],
) -> list[dict[str, Any]]:
    cards = {"price": price, "juros": juros}
    rows = []
    for key, (card, field, label) in EXPECT_FIELD_MAP.items():
        if key not in expect:
            continue
        fe = expect[key]
        db = cards[card][field]
        is_qty = key in ("p_atraso_qtd", "p_ativos", "j_atraso_qtd", "j_ativos")
        if is_qty:
            match = int(fe) == int(db)
            rows.append(
                {
                    "campo": label,
                    "key": key,
                    "fe": int(fe),
                    "db": int(db),
                    "delta": int(db) - int(fe),
                    "status": "OK" if match else "DIVERGE",
                }
            )
        else:
            fe_d = money(fe)
            db_d = money(db)
            match = close(fe_d, db_d)
            rows.append(
                {
                    "campo": label,
                    "key": key,
                    "fe": float(fe_d),
                    "db": float(db_d),
                    "delta": float(db_d - fe_d),
                    "status": "OK" if match else "DIVERGE",
                }
            )
    return rows


# ---------------------------------------------------------------------------
# Print
# ---------------------------------------------------------------------------

def print_card(title: str, rows: list[tuple[str, Any]]) -> None:
    print(f"\n{'─' * 64}")
    print(f"  {title}")
    print(f"{'─' * 64}")
    for label, value in rows:
        if isinstance(value, int):
            print(f"  {label:<40} {value:>18}")
        else:
            print(f"  {label:<40} {brl(value):>18}")


def run(args: argparse.Namespace) -> int:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        print("❌ Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env", file=sys.stderr)
        return 2

    tenant = args.tenant
    as_of = parse_ymd(args.as_of) or date.today()
    start = parse_ymd(args.start)
    end = parse_ymd(args.end)
    if (start and not end) or (end and not start):
        print("❌ Use --start e --end juntos (filtro de período do dashboard).", file=sys.stderr)
        return 2

    api = SupabaseRest(url, key)
    print(f"Tenant : {tenant}")
    print(f"As-of  : {as_of.isoformat()}  (isLate = due < as-of)")
    if start and end:
        print(f"Período: {start} → {end} (due_date)")
    else:
        print("Período: TODOS (sem filtro — igual Limpar filtro no Dashboard)")

    loans = api.fetch_all(
        "loans",
        "id,amount,status,model,client_id,outstanding_amount,total_amount",
        {"tenant_id": f"eq.{tenant}"},
    )
    installments = api.fetch_all(
        "installments",
        "id,loan_id,client_id,number,due_date,amount,amount_paid,interest_amount,principal_amount,status",
        {"tenant_id": f"eq.{tenant}"},
    )

    price_loans = [l for l in loans if l.get("model") != "INTEREST_ONLY"]
    juros_loans = [l for l in loans if l.get("model") == "INTEREST_ONLY"]
    price_ids = {l["id"] for l in price_loans}
    juros_ids = {l["id"] for l in juros_loans}

    price_inst_all = [i for i in installments if i.get("loan_id") in price_ids]
    juros_inst_all = [i for i in installments if i.get("loan_id") in juros_ids]
    price_inst = filter_by_period(price_inst_all, start, end)
    juros_inst = filter_by_period(juros_inst_all, start, end)

    price_m = compute_price(price_loans, price_inst, as_of)
    juros_m = compute_juros(juros_loans, juros_inst, as_of)
    price_d = metrics_to_dict(price_m, "price")
    juros_d = metrics_to_dict(juros_m, "juros")

    # Identidades
    price_sum = price_m.recebido + price_m.a_receber
    price_id_ok = close(price_sum, price_m.total_periodo)
    juros_sum = juros_m.recebido + juros_m.a_receber
    juros_jmc_ok = close(juros_m.lucro_ou_juros + juros_m.capital_emprestado, juros_m.total_periodo)
    # Em Somente Juros, recebido+a_receber NÃO precisa = jmc (capital ACTIVE fora das parcelas)
    juros_gap = juros_m.total_periodo - juros_sum

    loan_model = {l["id"]: str(l.get("model") or "?") for l in loans}
    dq = scan_data_quality(installments, loan_model)

    # Paginação: se FE/API cortasse em 1000
    page1 = installments[:1000]
    p1 = [i for i in page1 if i.get("loan_id") in price_ids]
    j1 = [i for i in page1 if i.get("loan_id") in juros_ids]
    p1_m = compute_price(price_loans, filter_by_period(p1, start, end), as_of)
    j1_m = compute_juros(juros_loans, filter_by_period(j1, start, end), as_of)
    truncates = len(installments) > 1000

    print(f"\nLoans: {len(loans)}  (PRICE={len(price_loans)}  INTEREST_ONLY={len(juros_loans)})")
    print(f"Parcelas: {len(installments)}  (PRICE={len(price_inst_all)}  JUROS={len(juros_inst_all)})")
    if start and end:
        print(f"Parcelas no período: PRICE={len(price_inst)}  JUROS={len(juros_inst)}")

    print_card(
        "EMPRÉSTIMOS PARCELADOS (PRICE)",
        [
            ("Valor dinheiro emprestado", price_m.capital_emprestado),
            ("Valor das parcelas", price_m.valor_parcelas_ou_juros),
            ("Lucro (juros das parcelas)", price_m.lucro_ou_juros),
            ("Total do período", price_m.total_periodo),
            ("Recebido", price_m.recebido),
            ("A Receber", price_m.a_receber),
            ("Em Atraso (R$)", price_m.em_atraso),
            ("Em Atraso (qtd)", price_m.em_atraso_qtd),
            ("Ativos", price_m.ativos),
        ],
    )
    print_card(
        "EMPRÉSTIMOS SOMENTE JUROS",
        [
            ("Capital (ACTIVE)", juros_m.capital_emprestado),
            ("Valor do Juros", juros_m.lucro_ou_juros),
            ("Juros + Capital", juros_m.total_periodo),
            ("Recebido", juros_m.recebido),
            ("A Receber", juros_m.a_receber),
            ("Em Atraso (R$)", juros_m.em_atraso),
            ("Em Atraso (qtd)", juros_m.em_atraso_qtd),
            ("Ativos", juros_m.ativos),
        ],
    )

    print(f"\n{'─' * 64}")
    print("  IDENTIDADES")
    print(f"{'─' * 64}")
    print(
        f"  PRICE  recebido+a_receber = {brl(price_sum)}  vs total {brl(price_m.total_periodo)}  "
        f"→ {'OK' if price_id_ok else 'QUEBRADA'}"
    )
    print(
        f"  JUROS  capital+juros = {brl(juros_m.capital_emprestado + juros_m.lucro_ou_juros)}  "
        f"vs j+c {brl(juros_m.total_periodo)}  → {'OK' if juros_jmc_ok else 'QUEBRADA'}"
    )
    print(
        f"  JUROS  recebido+a_receber = {brl(juros_sum)}  (gap vs j+c = {brl(juros_gap)} — esperado; "
        f"capital ACTIVE não entra em A Receber)"
    )

    if truncates:
        print(f"\n{'─' * 64}")
        print("  AVISO PAGINAÇÃO (>1000 parcelas)")
        print(f"{'─' * 64}")
        print(f"  Total parcelas: {len(installments)}")
        print(f"  Se API cortar em 1000 → PRICE total {brl(p1_m.total_periodo)} (real {brl(price_m.total_periodo)})")
        print(f"  Se API cortar em 1000 → JUROS j+c  {brl(j1_m.total_periodo)} (real {brl(juros_m.total_periodo)})")

    if dq:
        print(f"\n{'─' * 64}")
        print(f"  QUALIDADE DE DADOS ({len(dq)} achados)")
        print(f"{'─' * 64}")
        for issue in dq[:30]:
            print(f"  [{issue.tipo}] {issue.installment_id[:8]}…  {issue.detalhe}")
        if len(dq) > 30:
            print(f"  … +{len(dq) - 30} omitidos (veja --json)")

    expect: dict[str, Any] = {}
    if args.expect_json:
        path = Path(args.expect_json)
        expect = json.loads(path.read_text())
    if args.expect:
        expect.update(json.loads(args.expect))

    # Snapshot padrão da tela 05/08/2026 (tenant 0003, sem filtro) se --expect-screen
    if args.expect_screen:
        expect.update(
            {
                "p_capital": 663043,
                "p_parcelas": 848899,
                "p_lucro": 163143.20,
                "p_total": 848899,
                "p_recebido": 140955,
                "p_a_receber": 707944,
                "p_atraso": 37975,
                "p_atraso_qtd": 51,
                "p_ativos": 104,
                "j_capital": 381580,
                "j_juros": 116561.64,
                "j_total": 498141.64,
                "j_recebido": 82210,
                "j_a_receber": 47955.48,
                "j_atraso": 23908.20,
                "j_atraso_qtd": 79,
                "j_ativos": 101,
            }
        )

    compare_rows: list[dict[str, Any]] = []
    expect_ok = True
    if expect:
        compare_rows = compare_expect(price_d, juros_d, expect)
        print(f"\n{'─' * 64}")
        print("  COMPARAÇÃO TELA (--expect) × BANCO")
        print(f"{'─' * 64}")
        print(f"  {'Campo':<42} {'FE':>14} {'DB':>14} {'Δ':>10}  Status")
        for row in compare_rows:
            fe_s = brl(row["fe"]) if not str(row["key"]).endswith(("qtd", "ativos")) else str(row["fe"])
            db_s = brl(row["db"]) if not str(row["key"]).endswith(("qtd", "ativos")) else str(row["db"])
            if str(row["key"]).endswith(("qtd", "ativos")):
                fe_s, db_s = str(row["fe"]), str(row["db"])
                d_s = str(row["delta"])
            else:
                d_s = brl(row["delta"])
            print(f"  {row['campo']:<42} {fe_s:>14} {db_s:>14} {d_s:>10}  {row['status']}")
            if row["status"] != "OK":
                expect_ok = False
        n_ok = sum(1 for r in compare_rows if r["status"] == "OK")
        print(f"\n  Resultado: {n_ok}/{len(compare_rows)} OK")

    overall_ok = price_id_ok and juros_jmc_ok and expect_ok
    # data quality não falha o exit por padrão (aviso); use --strict-dq
    if args.strict_dq and dq:
        overall_ok = False

    report = DashboardReport(
        tenant_id=tenant,
        as_of=as_of.isoformat(),
        start=start.isoformat() if start else None,
        end=end.isoformat() if end else None,
        counts={
            "loans": len(loans),
            "installments": len(installments),
            "price_loans": len(price_loans),
            "juros_loans": len(juros_loans),
            "price_installments": len(price_inst),
            "juros_installments": len(juros_inst),
        },
        price=price_d,
        juros=juros_d,
        identities={
            "price_recebido_mais_a_receber": float(price_sum),
            "price_total": float(price_m.total_periodo),
            "price_identity_ok": price_id_ok,
            "juros_recebido_mais_a_receber": float(juros_sum),
            "juros_mais_capital": float(juros_m.total_periodo),
            "juros_gap_esperado": float(juros_gap),
            "juros_capital_mais_juros_ok": juros_jmc_ok,
        },
        expect_compare=compare_rows,
        data_quality=[
            {
                "tipo": i.tipo,
                "installment_id": i.installment_id,
                "loan_id": i.loan_id,
                "detalhe": i.detalhe,
                "amount": float(i.amount),
                "interest": float(i.interest) if i.interest is not None else None,
                "principal": float(i.principal) if i.principal is not None else None,
            }
            for i in dq
        ],
        pagination_warning={
            "total_installments": len(installments),
            "exceeds_1000": truncates,
            "price_total_if_truncated": float(p1_m.total_periodo) if truncates else None,
            "juros_total_if_truncated": float(j1_m.total_periodo) if truncates else None,
        },
        ok=overall_ok,
        summary=(
            "OK — Dashboard × Banco alinhados"
            if overall_ok
            else "DIVERGE — ver comparação / identidades / --strict-dq"
        ),
    )

    print(f"\n{'═' * 64}")
    print(f"  {report.summary}")
    print(f"{'═' * 64}\n")

    if args.json:
        out = Path(args.json)
        payload = asdict(report)
        out.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
        print(f"JSON salvo em {out}")

    if args.expect or args.expect_json or args.expect_screen:
        return 0 if overall_ok else 1
    return 0 if (price_id_ok and juros_jmc_ok) else 1


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description="Batimento Dashboard Home.tsx × banco Supabase",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplo de --expect-json (valores da tela):
{
  "p_capital": 663043,
  "p_parcelas": 848899,
  "p_lucro": 163143.20,
  "p_total": 848899,
  "p_recebido": 140955,
  "p_a_receber": 707944,
  "p_atraso": 37975,
  "p_atraso_qtd": 51,
  "p_ativos": 104,
  "j_capital": 381580,
  "j_juros": 116561.64,
  "j_total": 498141.64,
  "j_recebido": 82210,
  "j_a_receber": 47955.48,
  "j_atraso": 23908.20,
  "j_atraso_qtd": 79,
  "j_ativos": 101
}
""",
    )
    p.add_argument("--tenant", default=DEFAULT_TENANT, help="UUID do tenant")
    p.add_argument("--as-of", default=None, help="Data de referência YYYY-MM-DD (default: hoje)")
    p.add_argument("--start", default=None, help="Data inicial do filtro (due_date)")
    p.add_argument("--end", default=None, help="Data final do filtro (due_date)")
    p.add_argument("--expect", default=None, help="JSON inline com valores da tela")
    p.add_argument("--expect-json", default=None, help="Arquivo JSON com valores da tela")
    p.add_argument(
        "--expect-screen",
        action="store_true",
        help="Usa snapshot da tela 05/08/2026 tenant 0003 (sem filtro)",
    )
    p.add_argument("--json", default=None, help="Salva relatório completo em JSON")
    p.add_argument(
        "--strict-dq",
        action="store_true",
        help="Falha (exit 1) se houver achados de qualidade de dados",
    )
    return p


def main() -> None:
    args = build_parser().parse_args()
    try:
        code = run(args)
    except RuntimeError as e:
        print(f"❌ {e}", file=sys.stderr)
        sys.exit(2)
    sys.exit(code)


if __name__ == "__main__":
    main()
