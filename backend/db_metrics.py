"""
Métricas Prometheus para monitoramento de conexões e operações de banco de dados
"""

from prometheus_client import Counter, Histogram, Gauge
from typing import Optional
import time

# Contadores de erros
db_connection_errors_total = Counter(
    "db_connection_errors_total",
    "Total de erros de conexão com o banco de dados",
    ["error_type", "operation"]
)

db_query_errors_total = Counter(
    "db_query_errors_total",
    "Total de erros em queries ao banco de dados",
    ["table", "operation", "error_type"]
)

db_timeouts_total = Counter(
    "db_timeouts_total",
    "Total de timeouts em operações de banco de dados",
    ["operation", "timeout_type"]
)

# Métricas específicas para erros de login
login_errors_total = Counter(
    "login_errors_total",
    "Total de erros de login",
    ["error_type", "error_code"]
)

login_connection_errors_total = Counter(
    "login_connection_errors_total",
    "Total de erros de conexão durante login",
    ["error_type"]
)

# Métricas específicas para erros de CRUD
crud_errors_total = Counter(
    "crud_errors_total",
    "Total de erros em operações CRUD",
    ["table", "operation", "error_type", "error_code"]
)

# Métricas específicas por funcionalidade
client_crud_errors_total = Counter(
    "client_crud_errors_total",
    "Total de erros em operações CRUD de clientes",
    ["operation", "error_type", "error_code"]
)

loan_crud_errors_total = Counter(
    "loan_crud_errors_total",
    "Total de erros em operações CRUD de empréstimos",
    ["operation", "error_type", "error_code"]
)

installment_crud_errors_total = Counter(
    "installment_crud_errors_total",
    "Total de erros em operações CRUD de parcelas",
    ["operation", "error_type", "error_code"]
)

# Histogramas de duração
db_query_duration_seconds = Histogram(
    "db_query_duration_seconds",
    "Duração de queries ao banco de dados em segundos",
    ["table", "operation"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0)
)

db_connection_duration_seconds = Histogram(
    "db_connection_duration_seconds",
    "Duração de estabelecimento de conexão com banco de dados em segundos",
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0)
)

# Gauges para status
db_connection_status = Gauge(
    "db_connection_status",
    "Status da conexão com banco de dados (1 = conectado, 0 = desconectado)"
)

db_last_successful_query_timestamp = Gauge(
    "db_last_successful_query_timestamp_seconds",
    "Timestamp da última query bem-sucedida ao banco de dados"
)

db_last_failed_query_timestamp = Gauge(
    "db_last_failed_query_timestamp_seconds",
    "Timestamp da última query que falhou no banco de dados"
)


class DatabaseMetrics:
    """Classe auxiliar para registrar métricas de banco de dados"""
    
    @staticmethod
    def record_query_success(table: str, operation: str, duration: float):
        """Registra uma query bem-sucedida"""
        db_query_duration_seconds.labels(table=table, operation=operation).observe(duration)
        db_last_successful_query_timestamp.set(time.time())
        db_connection_status.set(1)
    
    @staticmethod
    def record_query_error(table: str, operation: str, error_type: str, duration: Optional[float] = None):
        """Registra um erro em uma query"""
        db_query_errors_total.labels(
            table=table,
            operation=operation,
            error_type=error_type
        ).inc()
        db_last_failed_query_timestamp.set(time.time())
        if duration is not None:
            db_query_duration_seconds.labels(table=table, operation=operation).observe(duration)
    
    @staticmethod
    def record_connection_error(error_type: str, operation: str):
        """Registra um erro de conexão"""
        db_connection_errors_total.labels(
            error_type=error_type,
            operation=operation
        ).inc()
        db_connection_status.set(0)
    
    @staticmethod
    def record_connection_success(duration: float):
        """Registra uma conexão bem-sucedida"""
        db_connection_duration_seconds.observe(duration)
        db_connection_status.set(1)
    
    @staticmethod
    def record_timeout(operation: str, timeout_type: str):
        """Registra um timeout"""
        db_timeouts_total.labels(
            operation=operation,
            timeout_type=timeout_type
        ).inc()
        db_connection_status.set(0)
    
    @staticmethod
    def record_login_error(error_type: str, error_code: int = 0):
        """Registra um erro de login"""
        login_errors_total.labels(
            error_type=error_type,
            error_code=str(error_code)
        ).inc()
    
    @staticmethod
    def record_login_connection_error(error_type: str):
        """Registra um erro de conexão durante login"""
        login_connection_errors_total.labels(error_type=error_type).inc()
        login_errors_total.labels(error_type="connection_error", error_code="0").inc()
    
    @staticmethod
    def record_crud_error(table: str, operation: str, error_type: str, error_code: int = 0):
        """Registra um erro em operação CRUD"""
        crud_errors_total.labels(
            table=table,
            operation=operation,
            error_type=error_type,
            error_code=str(error_code)
        ).inc()
        
        # Registrar também nas métricas específicas
        if table == "clients":
            client_crud_errors_total.labels(
                operation=operation,
                error_type=error_type,
                error_code=str(error_code)
            ).inc()
        elif table == "loans":
            loan_crud_errors_total.labels(
                operation=operation,
                error_type=error_type,
                error_code=str(error_code)
            ).inc()
        elif table == "installments":
            installment_crud_errors_total.labels(
                operation=operation,
                error_type=error_type,
                error_code=str(error_code)
            ).inc()
