#!/usr/bin/env python3
"""
Script de Teste de Stress para API CredGestor

Este script realiza testes de carga e stress na API para validar
a performance e estabilidade da aplicação sob diferentes condições.

Uso:
    python stress_test.py --base-url http://localhost:8000 --users 50 --duration 60

Requisitos:
    pip install httpx asyncio rich
"""

import asyncio
import argparse
import json
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
import sys

try:
    import httpx
    from rich.console import Console
    from rich.table import Table
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.live import Live
    from rich.panel import Panel
    from rich import box
except ImportError as e:
    print(f"❌ Erro: Dependência faltando: {e}")
    print("📦 Instale as dependências com: pip install httpx rich")
    sys.exit(1)

console = Console()

# Estatísticas globais
stats = {
    "total_requests": 0,
    "successful_requests": 0,
    "failed_requests": 0,
    "errors_by_status": defaultdict(int),
    "errors_by_endpoint": defaultdict(int),
    "response_times": [],
    "endpoint_stats": defaultdict(lambda: {"count": 0, "success": 0, "fail": 0, "times": []}),
    "start_time": None,
    "end_time": None,
}


class StressTestConfig:
    """Configuração do teste de stress"""

    def __init__(
        self,
        base_url: str,
        num_users: int = 10,
        duration: int = 60,
        ramp_up: int = 5,
        auth_email: Optional[str] = None,
        auth_password: Optional[str] = None,
        tenant_id: Optional[str] = None,
        endpoints: Optional[List[str]] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.num_users = num_users
        self.duration = duration  # segundos
        self.ramp_up = ramp_up  # segundos para aumentar carga gradualmente
        self.auth_email = auth_email
        self.auth_password = auth_password
        self.tenant_id = tenant_id
        self.endpoints = endpoints or [
            "/health",
            "/tenants/{tenant_id}/clients",
            "/tenants/{tenant_id}/loans",
            "/tenants/{tenant_id}/installments",
        ]
        self.access_token: Optional[str] = None


class StressTestRunner:
    """Executor de testes de stress"""

    def __init__(self, config: StressTestConfig):
        self.config = config
        self.client: Optional[httpx.AsyncClient] = None
        self.running = False

    async def authenticate(self) -> bool:
        """Autentica e obtém token de acesso"""
        if not self.config.auth_email or not self.config.auth_password:
            console.print("[yellow]⚠️  Credenciais não fornecidas, testando endpoints públicos apenas[/yellow]")
            return False

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                login_data = {
                    "email": self.config.auth_email,
                    "senha": self.config.auth_password,
                }
                if self.config.tenant_id:
                    login_data["tenant_id"] = self.config.tenant_id

                response = await client.post(
                    f"{self.config.base_url}/auth/login",
                    json=login_data,
                )

                if response.status_code == 200:
                    data = response.json()
                    self.config.access_token = data.get("access_token")
                    console.print("[green]✅ Autenticação bem-sucedida[/green]")
                    return True
                else:
                    console.print(f"[red]❌ Falha na autenticação: {response.status_code}[/red]")
                    console.print(f"Resposta: {response.text}")
                    return False
        except Exception as e:
            console.print(f"[red]❌ Erro na autenticação: {e}[/red]")
            return False

    async def make_request(
        self, endpoint: str, method: str = "GET", **kwargs
    ) -> Tuple[bool, float, int, str]:
        """
        Faz uma requisição HTTP e retorna (sucesso, tempo, status_code, erro)
        """
        start_time = time.time()
        success = False
        status_code = 0
        error_msg = ""

        try:
            url = f"{self.config.base_url}{endpoint}"
            
            # Substituir placeholders
            if self.config.tenant_id and "{tenant_id}" in url:
                url = url.replace("{tenant_id}", self.config.tenant_id)

            headers = kwargs.get("headers", {})
            if self.config.access_token:
                headers["Authorization"] = f"Bearer {self.config.access_token}"

            response = await self.client.request(
                method=method,
                url=url,
                headers=headers,
                timeout=30.0,
                **{k: v for k, v in kwargs.items() if k != "headers"},
            )

            elapsed = time.time() - start_time
            status_code = response.status_code
            success = 200 <= status_code < 300

            if not success:
                error_msg = f"HTTP {status_code}: {response.text[:100]}"

        except httpx.TimeoutException:
            elapsed = time.time() - start_time
            error_msg = "Timeout"
            status_code = 0
        except Exception as e:
            elapsed = time.time() - start_time
            error_msg = str(e)
            status_code = 0

        return success, elapsed, status_code, error_msg

    async def user_simulation(self, user_id: int):
        """Simula um usuário fazendo requisições"""
        request_count = 0
        end_time = time.time() + self.config.duration

        while time.time() < end_time and self.running:
            # Selecionar endpoint aleatório
            endpoint = self.config.endpoints[request_count % len(self.config.endpoints)]
            
            # Fazer requisição
            success, elapsed, status_code, error = await self.make_request(endpoint)

            # Atualizar estatísticas
            stats["total_requests"] += 1
            if success:
                stats["successful_requests"] += 1
            else:
                stats["failed_requests"] += 1
                stats["errors_by_status"][status_code] += 1
                stats["errors_by_endpoint"][endpoint] += 1

            stats["response_times"].append(elapsed)
            stats["endpoint_stats"][endpoint]["count"] += 1
            stats["endpoint_stats"][endpoint]["times"].append(elapsed)
            if success:
                stats["endpoint_stats"][endpoint]["success"] += 1
            else:
                stats["endpoint_stats"][endpoint]["fail"] += 1

            request_count += 1

            # Pequeno delay entre requisições (0.1-0.5s)
            await asyncio.sleep(0.1 + (request_count % 4) * 0.1)

    async def run(self):
        """Executa o teste de stress"""
        console.print(f"\n[bold cyan]🚀 Iniciando Teste de Stress[/bold cyan]")
        console.print(f"URL Base: {self.config.base_url}")
        console.print(f"Usuários: {self.config.num_users}")
        console.print(f"Duração: {self.config.duration}s")
        console.print(f"Ramp-up: {self.config.ramp_up}s\n")

        # Autenticar se necessário
        if self.config.auth_email:
            console.print("[cyan]🔐 Autenticando...[/cyan]")
            if not await self.authenticate():
                console.print("[red]❌ Não foi possível autenticar. Continuando com endpoints públicos...[/red]")

        # Criar cliente HTTP
        self.client = httpx.AsyncClient(timeout=30.0)

        stats["start_time"] = time.time()
        self.running = True

        # Criar tarefas para cada usuário com ramp-up
        tasks = []
        ramp_up_delay = self.config.ramp_up / self.config.num_users if self.config.num_users > 0 else 0

        for i in range(self.config.num_users):
            task = asyncio.create_task(self.user_simulation(i))
            tasks.append(task)
            if i < self.config.num_users - 1:
                await asyncio.sleep(ramp_up_delay)

        # Aguardar todas as tarefas
        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            console.print(f"[red]❌ Erro durante execução: {e}[/red]")
        finally:
            self.running = False
            stats["end_time"] = time.time()

        await self.client.aclose()

    def generate_report(self) -> str:
        """Gera relatório de resultados"""
        if not stats["response_times"]:
            return "Nenhuma requisição foi realizada."

        total_time = stats["end_time"] - stats["start_time"]
        total_requests = stats["total_requests"]
        successful = stats["successful_requests"]
        failed = stats["failed_requests"]
        success_rate = (successful / total_requests * 100) if total_requests > 0 else 0

        response_times = stats["response_times"]
        avg_time = sum(response_times) / len(response_times)
        min_time = min(response_times)
        max_time = max(response_times)
        
        # Calcular percentis
        sorted_times = sorted(response_times)
        p50 = sorted_times[int(len(sorted_times) * 0.50)]
        p95 = sorted_times[int(len(sorted_times) * 0.95)]
        p99 = sorted_times[int(len(sorted_times) * 0.99)]

        rps = total_requests / total_time if total_time > 0 else 0

        report = f"""
╔══════════════════════════════════════════════════════════════╗
║           RELATÓRIO DE TESTE DE STRESS - CREDGESTOR          ║
╚══════════════════════════════════════════════════════════════╝

📊 ESTATÍSTICAS GERAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Duração Total:        {total_time:.2f}s
  Total de Requisições: {total_requests}
  Requisições/Segundo:  {rps:.2f} req/s
  Taxa de Sucesso:      {success_rate:.2f}%
  Sucessos:             {successful}
  Falhas:               {failed}

⏱️  TEMPO DE RESPOSTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Média:                {avg_time*1000:.2f}ms
  Mínimo:               {min_time*1000:.2f}ms
  Máximo:               {max_time*1000:.2f}ms
  P50 (Mediana):        {p50*1000:.2f}ms
  P95:                  {p95*1000:.2f}ms
  P99:                  {p99*1000:.2f}ms

❌ ERROS POR STATUS HTTP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
        for status, count in sorted(stats["errors_by_status"].items()):
            report += f"  {status}: {count}\n"

        report += "\n📈 ESTATÍSTICAS POR ENDPOINT\n"
        report += "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        
        for endpoint, endpoint_stat in stats["endpoint_stats"].items():
            if endpoint_stat["count"] > 0:
                endpoint_avg = sum(endpoint_stat["times"]) / len(endpoint_stat["times"])
                endpoint_success_rate = (endpoint_stat["success"] / endpoint_stat["count"] * 100) if endpoint_stat["count"] > 0 else 0
                report += f"\n  {endpoint}\n"
                report += f"    Requisições: {endpoint_stat['count']}\n"
                report += f"    Taxa Sucesso: {endpoint_success_rate:.2f}%\n"
                report += f"    Tempo Médio: {endpoint_avg*1000:.2f}ms\n"

        report += "\n" + "═" * 63 + "\n"
        report += f"Gerado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"

        return report


def create_report_table():
    """Cria tabela visual do relatório"""
    if not stats["response_times"]:
        return None

    total_time = stats["end_time"] - stats["start_time"]
    total_requests = stats["total_requests"]
    successful = stats["successful_requests"]
    failed = stats["failed_requests"]
    success_rate = (successful / total_requests * 100) if total_requests > 0 else 0

    response_times = stats["response_times"]
    avg_time = sum(response_times) / len(response_times)
    sorted_times = sorted(response_times)
    p95 = sorted_times[int(len(sorted_times) * 0.95)]
    p99 = sorted_times[int(len(sorted_times) * 0.99)]

    rps = total_requests / total_time if total_time > 0 else 0

    # Tabela principal
    main_table = Table(title="📊 Estatísticas Gerais", box=box.ROUNDED)
    main_table.add_column("Métrica", style="cyan")
    main_table.add_column("Valor", style="green")

    main_table.add_row("Duração Total", f"{total_time:.2f}s")
    main_table.add_row("Total de Requisições", str(total_requests))
    main_table.add_row("Requisições/Segundo", f"{rps:.2f} req/s")
    main_table.add_row("Taxa de Sucesso", f"{success_rate:.2f}%")
    main_table.add_row("Sucessos", str(successful))
    main_table.add_row("Falhas", str(failed))

    # Tabela de latência
    latency_table = Table(title="⏱️  Tempo de Resposta", box=box.ROUNDED)
    latency_table.add_column("Métrica", style="cyan")
    latency_table.add_column("Valor", style="yellow")

    latency_table.add_row("Média", f"{avg_time*1000:.2f}ms")
    latency_table.add_row("Mínimo", f"{min(response_times)*1000:.2f}ms")
    latency_table.add_row("Máximo", f"{max(response_times)*1000:.2f}ms")
    latency_table.add_row("P95", f"{p95*1000:.2f}ms")
    latency_table.add_row("P99", f"{p99*1000:.2f}ms")

    # Tabela de erros
    error_table = Table(title="❌ Erros por Status", box=box.ROUNDED)
    error_table.add_column("Status HTTP", style="red")
    error_table.add_column("Quantidade", style="yellow")

    for status, count in sorted(stats["errors_by_status"].items()):
        error_table.add_row(str(status), str(count))

    if not stats["errors_by_status"]:
        error_table.add_row("Nenhum erro", "✅")

    return main_table, latency_table, error_table


async def main():
    """Função principal"""
    parser = argparse.ArgumentParser(
        description="Teste de Stress para API CredGestor",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  # Teste básico com 10 usuários por 60 segundos
  python stress_test.py --base-url http://localhost:8000

  # Teste com autenticação
  python stress_test.py --base-url http://localhost:8000 \\
    --auth-email admin@cliente-alpha.com \\
    --auth-password senhaFort3! \\
    --tenant-id 00000000-0000-0000-0000-000000000001

  # Teste intensivo
  python stress_test.py --base-url http://localhost:8000 \\
    --users 100 --duration 300 --ramp-up 30
        """,
    )

    parser.add_argument(
        "--base-url",
        type=str,
        required=True,
        help="URL base da API (ex: http://localhost:8000)",
    )
    parser.add_argument(
        "--users",
        type=int,
        default=10,
        help="Número de usuários simultâneos (padrão: 10)",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=60,
        help="Duração do teste em segundos (padrão: 60)",
    )
    parser.add_argument(
        "--ramp-up",
        type=int,
        default=5,
        help="Tempo de ramp-up em segundos (padrão: 5)",
    )
    parser.add_argument(
        "--auth-email",
        type=str,
        help="Email para autenticação",
    )
    parser.add_argument(
        "--auth-password",
        type=str,
        help="Senha para autenticação",
    )
    parser.add_argument(
        "--tenant-id",
        type=str,
        help="ID do tenant",
    )
    parser.add_argument(
        "--endpoints",
        type=str,
        nargs="+",
        help="Endpoints customizados para testar",
    )
    parser.add_argument(
        "--output",
        type=str,
        help="Arquivo para salvar relatório JSON",
    )

    args = parser.parse_args()

    # Criar configuração
    config = StressTestConfig(
        base_url=args.base_url,
        num_users=args.users,
        duration=args.duration,
        ramp_up=args.ramp_up,
        auth_email=args.auth_email,
        auth_password=args.auth_password,
        tenant_id=args.tenant_id,
        endpoints=args.endpoints,
    )

    # Criar e executar runner
    runner = StressTestRunner(config)

    try:
        # Executar teste
        await runner.run()

        # Gerar relatórios
        console.print("\n[bold green]✅ Teste concluído![/bold green]\n")

        # Relatório visual
        tables = create_report_table()
        if tables:
            for table in tables:
                console.print(table)
                console.print()

        # Relatório texto
        text_report = runner.generate_report()
        console.print(Panel(text_report, title="Relatório Completo", border_style="cyan"))

        # Salvar JSON se solicitado
        if args.output:
            report_data = {
                "config": {
                    "base_url": config.base_url,
                    "num_users": config.num_users,
                    "duration": config.duration,
                    "ramp_up": config.ramp_up,
                },
                "stats": {
                    "total_requests": stats["total_requests"],
                    "successful_requests": stats["successful_requests"],
                    "failed_requests": stats["failed_requests"],
                    "success_rate": (
                        stats["successful_requests"] / stats["total_requests"] * 100
                        if stats["total_requests"] > 0
                        else 0
                    ),
                    "requests_per_second": (
                        stats["total_requests"] / (stats["end_time"] - stats["start_time"])
                        if stats["end_time"] and stats["start_time"]
                        else 0
                    ),
                    "avg_response_time": (
                        sum(stats["response_times"]) / len(stats["response_times"])
                        if stats["response_times"]
                        else 0
                    ),
                    "errors_by_status": dict(stats["errors_by_status"]),
                    "errors_by_endpoint": dict(stats["errors_by_endpoint"]),
                },
                "timestamp": datetime.now().isoformat(),
            }

            with open(args.output, "w") as f:
                json.dump(report_data, f, indent=2)

            console.print(f"[green]📄 Relatório JSON salvo em: {args.output}[/green]")

    except KeyboardInterrupt:
        console.print("\n[yellow]⚠️  Teste interrompido pelo usuário[/yellow]")
        runner.running = False
    except Exception as e:
        console.print(f"[red]❌ Erro fatal: {e}[/red]")
        import traceback
        console.print(traceback.format_exc())


if __name__ == "__main__":
    asyncio.run(main())
