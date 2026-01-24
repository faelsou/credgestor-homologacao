"""
Configuração do OpenTelemetry para o backend FastAPI
"""
import os
from typing import Optional

from opentelemetry import trace, metrics, _logs
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
try:
    from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
except ImportError:
    # Fallback para versões mais antigas ou se logs não estiverem disponíveis
    OTLPLogExporter = None
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader, ConsoleMetricExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor, ConsoleLogExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION, DEPLOYMENT_ENVIRONMENT
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor

from .settings import get_settings


def _parse_headers(headers_str: Optional[str]) -> Optional[dict]:
    """Parse headers string into dictionary."""
    if not headers_str:
        return None
    headers = {}
    for pair in headers_str.split(","):
        if "=" in pair:
            key, value = pair.split("=", 1)
            headers[key.strip()] = value.strip()
    return headers if headers else None


def _parse_resource_attributes(attrs_str: Optional[str]) -> dict:
    """Parse resource attributes string into dictionary."""
    attrs = {}
    if attrs_str:
        for pair in attrs_str.split(","):
            if "=" in pair:
                key, value = pair.split("=", 1)
                attrs[key.strip()] = value.strip()
    return attrs


def setup_opentelemetry(app=None):
    """
    Configura o OpenTelemetry para o backend.
    
    Args:
        app: Instância do FastAPI (opcional, para instrumentação automática)
    """
    settings = get_settings()
    
    # Verificar se OpenTelemetry está habilitado
    if settings.otel_traces_exporter == "none" and settings.otel_metrics_exporter == "none":
        print("⚠️  OpenTelemetry desabilitado (todos os exporters estão como 'none')")
        return
    
    # Configurar Resource
    resource_attrs = {
        SERVICE_NAME: settings.otel_service_name,
        SERVICE_VERSION: settings.otel_service_version,
    }
    
    # Adicionar atributos customizados se fornecidos
    custom_attrs = _parse_resource_attributes(settings.otel_resource_attributes)
    resource_attrs.update(custom_attrs)
    
    # Adicionar environment se disponível
    if hasattr(settings, "environment"):
        resource_attrs[DEPLOYMENT_ENVIRONMENT] = settings.environment
    
    resource = Resource.create(resource_attrs)
    
    # Configurar headers OTLP
    otlp_headers = _parse_headers(settings.otel_exporter_otlp_headers)
    
    # Configurar Traces
    if settings.otel_traces_exporter != "none":
        trace_provider = TracerProvider(resource=resource)
        
        if settings.otel_traces_exporter == "otlp" and settings.otel_exporter_otlp_endpoint:
            otlp_exporter = OTLPSpanExporter(
                endpoint=f"{settings.otel_exporter_otlp_endpoint}/v1/traces",
                headers=otlp_headers,
            )
            trace_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
            print(f"✅ OpenTelemetry Traces configurado (OTLP: {settings.otel_exporter_otlp_endpoint})")
        elif settings.otel_traces_exporter == "console":
            trace_provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
            print("✅ OpenTelemetry Traces configurado (Console)")
        else:
            print("⚠️  OpenTelemetry Traces não configurado (endpoint não fornecido)")
        
        trace.set_tracer_provider(trace_provider)
    
    # Configurar Metrics
    if settings.otel_metrics_exporter != "none":
        if settings.otel_metrics_exporter == "otlp" and settings.otel_exporter_otlp_endpoint:
            metric_exporter = OTLPMetricExporter(
                endpoint=f"{settings.otel_exporter_otlp_endpoint}/v1/metrics",
                headers=otlp_headers,
            )
            metric_reader = PeriodicExportingMetricReader(
                exporter=metric_exporter,
                export_interval_millis=60000,  # Exportar a cada 60 segundos
            )
            metrics_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
            print(f"✅ OpenTelemetry Metrics configurado (OTLP: {settings.otel_exporter_otlp_endpoint})")
        elif settings.otel_metrics_exporter == "console":
            console_exporter = ConsoleMetricExporter()
            metric_reader = PeriodicExportingMetricReader(
                exporter=console_exporter,
                export_interval_millis=60000,
            )
            metrics_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
            print("✅ OpenTelemetry Metrics configurado (Console)")
        else:
            print("⚠️  OpenTelemetry Metrics não configurado (endpoint não fornecido)")
            metrics_provider = MeterProvider(resource=resource)
        
        metrics.set_meter_provider(metrics_provider)
    
    # Configurar Logs
    if settings.otel_logs_exporter != "none":
        if OTLPLogExporter is None:
            print("⚠️  OpenTelemetry Logs não disponível (biblioteca não instalada)")
        else:
            logger_provider = LoggerProvider(resource=resource)
            
            if settings.otel_logs_exporter == "otlp" and settings.otel_exporter_otlp_endpoint:
                otlp_log_exporter = OTLPLogExporter(
                    endpoint=f"{settings.otel_exporter_otlp_endpoint}/v1/logs",
                    headers=otlp_headers,
                )
                logger_provider.add_log_record_processor(BatchLogRecordProcessor(otlp_log_exporter))
                print(f"✅ OpenTelemetry Logs configurado (OTLP: {settings.otel_exporter_otlp_endpoint})")
            elif settings.otel_logs_exporter == "console":
                logger_provider.add_log_record_processor(BatchLogRecordProcessor(ConsoleLogExporter()))
                print("✅ OpenTelemetry Logs configurado (Console)")
            else:
                print("⚠️  OpenTelemetry Logs não configurado (endpoint não fornecido)")
            
            _logs.set_logger_provider(logger_provider)
    
    # Instrumentar FastAPI se app fornecido
    if app:
        FastAPIInstrumentor.instrument_app(app)
        print("✅ FastAPI instrumentado com OpenTelemetry")
    
    # Instrumentar bibliotecas HTTP
    HTTPXClientInstrumentor().instrument()
    RequestsInstrumentor().instrument()
    print("✅ Bibliotecas HTTP instrumentadas (httpx, requests)")
    
    print("🎉 OpenTelemetry configurado com sucesso!")


def get_tracer(name: str = None):
    """Obtém um tracer para criar spans customizados."""
    if name is None:
        name = get_settings().otel_service_name
    return trace.get_tracer(name)


def get_meter(name: str = None):
    """Obtém um meter para criar métricas customizadas."""
    if name is None:
        name = get_settings().otel_service_name
    return metrics.get_meter(name)
