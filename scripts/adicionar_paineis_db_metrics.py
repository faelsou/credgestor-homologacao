#!/usr/bin/env python3
"""
Script para adicionar painéis de métricas de banco de dados ao dashboard do Grafana
"""

import json
import sys

def criar_paineis_db_metrics():
    """Cria os painéis de métricas de banco de dados"""
    
    paineis = []
    
    # Painel 1: Status de Conexão com Banco
    paineis.append({
        "datasource": {
            "type": "prometheus",
            "uid": "${DS_PROMETHEUS}"
        },
        "description": "Status da conexão com Supabase (1 = conectado, 0 = desconectado)",
        "fieldConfig": {
            "defaults": {
                "color": {
                    "mode": "thresholds"
                },
                "mappings": [
                    {
                        "options": {
                            "0": {
                                "color": "red",
                                "index": 1,
                                "text": "DESCONECTADO"
                            },
                            "1": {
                                "color": "green",
                                "index": 0,
                                "text": "CONECTADO"
                            }
                        },
                        "type": "value"
                    }
                ],
                "thresholds": {
                    "mode": "absolute",
                    "steps": [
                        {
                            "color": "red",
                            "value": 0
                        },
                        {
                            "color": "green",
                            "value": 1
                        }
                    ]
                },
                "unit": "none"
            },
            "overrides": []
        },
        "gridPos": {
            "h": 4,
            "w": 6,
            "x": 0,
            "y": 36
        },
        "id": 25,
        "options": {
            "colorMode": "value",
            "graphMode": "none",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
                "calcs": ["lastNotNull"],
                "fields": "",
                "values": False
            },
            "textMode": "auto",
            "wideLayout": True
        },
        "pluginVersion": "12.1.0-16509090662",
        "targets": [
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "db_connection_status{job=~\"credgestor.*|.*api.*\"}",
                "legendFormat": "Status de Conexão",
                "refId": "A"
            }
        ],
        "title": "🗄️ Status de Conexão com Banco",
        "type": "stat"
    })
    
    # Painel 2: Erros de Conexão
    paineis.append({
        "datasource": {
            "type": "prometheus",
            "uid": "${DS_PROMETHEUS}"
        },
        "description": "Total de erros de conexão com o banco de dados",
        "fieldConfig": {
            "defaults": {
                "color": {
                    "mode": "thresholds"
                },
                "mappings": [],
                "thresholds": {
                    "mode": "absolute",
                    "steps": [
                        {
                            "color": "green",
                            "value": 0
                        },
                        {
                            "color": "yellow",
                            "value": 1
                        },
                        {
                            "color": "red",
                            "value": 10
                        }
                    ]
                },
                "unit": "short"
            },
            "overrides": []
        },
        "gridPos": {
            "h": 4,
            "w": 6,
            "x": 6,
            "y": 36
        },
        "id": 26,
        "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
                "calcs": ["lastNotNull"],
                "fields": "",
                "values": False
            },
            "textMode": "auto",
            "wideLayout": True
        },
        "pluginVersion": "12.1.0-16509090662",
        "targets": [
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "sum(increase(db_connection_errors_total{job=~\"credgestor.*|.*api.*\"}[5m]))",
                "legendFormat": "Erros de Conexão",
                "refId": "A"
            }
        ],
        "title": "❌ Erros de Conexão (5m)",
        "type": "stat"
    })
    
    # Painel 3: Timeouts
    paineis.append({
        "datasource": {
            "type": "prometheus",
            "uid": "${DS_PROMETHEUS}"
        },
        "description": "Total de timeouts em operações de banco de dados",
        "fieldConfig": {
            "defaults": {
                "color": {
                    "mode": "thresholds"
                },
                "mappings": [],
                "thresholds": {
                    "mode": "absolute",
                    "steps": [
                        {
                            "color": "green",
                            "value": 0
                        },
                        {
                            "color": "yellow",
                            "value": 1
                        },
                        {
                            "color": "red",
                            "value": 5
                        }
                    ]
                },
                "unit": "short"
            },
            "overrides": []
        },
        "gridPos": {
            "h": 4,
            "w": 6,
            "x": 12,
            "y": 36
        },
        "id": 27,
        "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
                "calcs": ["lastNotNull"],
                "fields": "",
                "values": False
            },
            "textMode": "auto",
            "wideLayout": True
        },
        "pluginVersion": "12.1.0-16509090662",
        "targets": [
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "sum(increase(db_timeouts_total{job=~\"credgestor.*|.*api.*\"}[5m]))",
                "legendFormat": "Timeouts",
                "refId": "A"
            }
        ],
        "title": "⏱️ Timeouts (5m)",
        "type": "stat"
    })
    
    # Painel 4: Erros de Queries
    paineis.append({
        "datasource": {
            "type": "prometheus",
            "uid": "${DS_PROMETHEUS}"
        },
        "description": "Total de erros em queries ao banco de dados",
        "fieldConfig": {
            "defaults": {
                "color": {
                    "mode": "thresholds"
                },
                "mappings": [],
                "thresholds": {
                    "mode": "absolute",
                    "steps": [
                        {
                            "color": "green",
                            "value": 0
                        },
                        {
                            "color": "yellow",
                            "value": 1
                        },
                        {
                            "color": "red",
                            "value": 10
                        }
                    ]
                },
                "unit": "short"
            },
            "overrides": []
        },
        "gridPos": {
            "h": 4,
            "w": 6,
            "x": 18,
            "y": 36
        },
        "id": 28,
        "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
                "calcs": ["lastNotNull"],
                "fields": "",
                "values": False
            },
            "textMode": "auto",
            "wideLayout": True
        },
        "pluginVersion": "12.1.0-16509090662",
        "targets": [
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "sum(increase(db_query_errors_total{job=~\"credgestor.*|.*api.*\"}[5m]))",
                "legendFormat": "Erros de Queries",
                "refId": "A"
            }
        ],
        "title": "🚨 Erros de Queries (5m)",
        "type": "stat"
    })
    
    # Painel 5: Latência de Queries (P50, P95, P99)
    paineis.append({
        "datasource": {
            "type": "prometheus",
            "uid": "${DS_PROMETHEUS}"
        },
        "description": "Latência de queries ao banco de dados (P50, P95, P99) por tabela e operação",
        "fieldConfig": {
            "defaults": {
                "color": {
                    "mode": "palette-classic"
                },
                "custom": {
                    "axisBorderShow": False,
                    "axisCenteredZero": False,
                    "axisColorMode": "text",
                    "axisLabel": "",
                    "axisPlacement": "auto",
                    "barAlignment": 0,
                    "barWidthFactor": 0.6,
                    "drawStyle": "line",
                    "fillOpacity": 10,
                    "gradientMode": "none",
                    "hideFrom": {
                        "legend": False,
                        "tooltip": False,
                        "viz": False
                    },
                    "insertNulls": False,
                    "lineInterpolation": "linear",
                    "lineWidth": 2,
                    "pointSize": 5,
                    "scaleDistribution": {
                        "type": "linear"
                    },
                    "showPoints": "never",
                    "spanNulls": False,
                    "stacking": {
                        "group": "A",
                        "mode": "none"
                    },
                    "thresholdsStyle": {
                        "mode": "off"
                    }
                },
                "mappings": [],
                "thresholds": {
                    "mode": "absolute",
                    "steps": [
                        {
                            "color": "green",
                            "value": 0
                        }
                    ]
                },
                "unit": "ms"
            },
            "overrides": []
        },
        "gridPos": {
            "h": 8,
            "w": 12,
            "x": 0,
            "y": 40
        },
        "id": 29,
        "options": {
            "legend": {
                "calcs": ["mean", "max", "last"],
                "displayMode": "table",
                "placement": "bottom",
                "showLegend": True
            },
            "tooltip": {
                "hideZeros": False,
                "mode": "multi",
                "sort": "desc"
            }
        },
        "pluginVersion": "12.1.0-16509090662",
        "targets": [
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "histogram_quantile(0.50, sum(rate(db_query_duration_seconds_bucket{job=~\"credgestor.*|.*api.*\"}[5m])) by (le, table, operation)) * 1000",
                "legendFormat": "P50 - {{table}}/{{operation}}",
                "refId": "A"
            },
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket{job=~\"credgestor.*|.*api.*\"}[5m])) by (le, table, operation)) * 1000",
                "legendFormat": "P95 - {{table}}/{{operation}}",
                "refId": "B"
            },
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "histogram_quantile(0.99, sum(rate(db_query_duration_seconds_bucket{job=~\"credgestor.*|.*api.*\"}[5m])) by (le, table, operation)) * 1000",
                "legendFormat": "P99 - {{table}}/{{operation}}",
                "refId": "C"
            }
        ],
        "title": "⚡ Latência de Queries ao Banco (P50, P95, P99)",
        "type": "timeseries"
    })
    
    # Painel 6: Taxa de Erros por Tabela
    paineis.append({
        "datasource": {
            "type": "prometheus",
            "uid": "${DS_PROMETHEUS}"
        },
        "description": "Taxa de erros em queries por tabela e operação",
        "fieldConfig": {
            "defaults": {
                "color": {
                    "mode": "palette-classic"
                },
                "custom": {
                    "axisBorderShow": False,
                    "axisCenteredZero": False,
                    "axisColorMode": "text",
                    "axisLabel": "",
                    "axisPlacement": "auto",
                    "barAlignment": 0,
                    "barWidthFactor": 0.6,
                    "drawStyle": "bars",
                    "fillOpacity": 100,
                    "gradientMode": "none",
                    "hideFrom": {
                        "legend": False,
                        "tooltip": False,
                        "viz": False
                    },
                    "insertNulls": False,
                    "lineInterpolation": "linear",
                    "lineWidth": 1,
                    "pointSize": 5,
                    "scaleDistribution": {
                        "type": "linear"
                    },
                    "showPoints": "never",
                    "spanNulls": False,
                    "stacking": {
                        "group": "A",
                        "mode": "normal"
                    },
                    "thresholdsStyle": {
                        "mode": "off"
                    }
                },
                "mappings": [],
                "thresholds": {
                    "mode": "absolute",
                    "steps": [
                        {
                            "color": "green",
                            "value": 0
                        }
                    ]
                },
                "unit": "reqps"
            },
            "overrides": []
        },
        "gridPos": {
            "h": 8,
            "w": 12,
            "x": 12,
            "y": 40
        },
        "id": 30,
        "options": {
            "legend": {
                "calcs": ["sum", "mean"],
                "displayMode": "table",
                "placement": "bottom",
                "showLegend": True
            },
            "tooltip": {
                "hideZeros": False,
                "mode": "multi",
                "sort": "desc"
            }
        },
        "pluginVersion": "12.1.0-16509090662",
        "targets": [
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "sum(rate(db_query_errors_total{job=~\"credgestor.*|.*api.*\"}[5m])) by (table, operation, error_type)",
                "legendFormat": "{{table}}/{{operation}} - {{error_type}}",
                "refId": "A"
            }
        ],
        "title": "🚨 Taxa de Erros de Queries por Tabela",
        "type": "timeseries"
    })
    
    # Painel 7: Duração de Conexão
    paineis.append({
        "datasource": {
            "type": "prometheus",
            "uid": "${DS_PROMETHEUS}"
        },
        "description": "Tempo para estabelecer conexão com o banco de dados",
        "fieldConfig": {
            "defaults": {
                "color": {
                    "mode": "palette-classic"
                },
                "custom": {
                    "axisBorderShow": False,
                    "axisCenteredZero": False,
                    "axisColorMode": "text",
                    "axisLabel": "",
                    "axisPlacement": "auto",
                    "barAlignment": 0,
                    "barWidthFactor": 0.6,
                    "drawStyle": "line",
                    "fillOpacity": 10,
                    "gradientMode": "none",
                    "hideFrom": {
                        "legend": False,
                        "tooltip": False,
                        "viz": False
                    },
                    "insertNulls": False,
                    "lineInterpolation": "linear",
                    "lineWidth": 2,
                    "pointSize": 5,
                    "scaleDistribution": {
                        "type": "linear"
                    },
                    "showPoints": "never",
                    "spanNulls": False,
                    "stacking": {
                        "group": "A",
                        "mode": "none"
                    },
                    "thresholdsStyle": {
                        "mode": "off"
                    }
                },
                "mappings": [],
                "thresholds": {
                    "mode": "absolute",
                    "steps": [
                        {
                            "color": "green",
                            "value": 0
                        }
                    ]
                },
                "unit": "ms"
            },
            "overrides": []
        },
        "gridPos": {
            "h": 8,
            "w": 12,
            "x": 0,
            "y": 48
        },
        "id": 31,
        "options": {
            "legend": {
                "calcs": ["mean", "max", "last"],
                "displayMode": "table",
                "placement": "bottom",
                "showLegend": True
            },
            "tooltip": {
                "hideZeros": False,
                "mode": "multi",
                "sort": "desc"
            }
        },
        "pluginVersion": "12.1.0-16509090662",
        "targets": [
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "histogram_quantile(0.95, sum(rate(db_connection_duration_seconds_bucket{job=~\"credgestor.*|.*api.*\"}[5m])) by (le)) * 1000",
                "legendFormat": "P95 - Tempo de Conexão",
                "refId": "A"
            },
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "histogram_quantile(0.99, sum(rate(db_connection_duration_seconds_bucket{job=~\"credgestor.*|.*api.*\"}[5m])) by (le)) * 1000",
                "legendFormat": "P99 - Tempo de Conexão",
                "refId": "B"
            }
        ],
        "title": "🔌 Duração de Estabelecimento de Conexão",
        "type": "timeseries"
    })
    
    # Painel 8: Timestamps de Últimas Queries
    paineis.append({
        "datasource": {
            "type": "prometheus",
            "uid": "${DS_PROMETHEUS}"
        },
        "description": "Timestamp da última query bem-sucedida e da última que falhou",
        "fieldConfig": {
            "defaults": {
                "color": {
                    "mode": "palette-classic"
                },
                "custom": {
                    "axisBorderShow": False,
                    "axisCenteredZero": False,
                    "axisColorMode": "text",
                    "axisLabel": "",
                    "axisPlacement": "auto",
                    "barAlignment": 0,
                    "barWidthFactor": 0.6,
                    "drawStyle": "line",
                    "fillOpacity": 10,
                    "gradientMode": "none",
                    "hideFrom": {
                        "legend": False,
                        "tooltip": False,
                        "viz": False
                    },
                    "insertNulls": False,
                    "lineInterpolation": "linear",
                    "lineWidth": 2,
                    "pointSize": 5,
                    "scaleDistribution": {
                        "type": "linear"
                    },
                    "showPoints": "never",
                    "spanNulls": False,
                    "stacking": {
                        "group": "A",
                        "mode": "none"
                    },
                    "thresholdsStyle": {
                        "mode": "off"
                    }
                },
                "mappings": [],
                "thresholds": {
                    "mode": "absolute",
                    "steps": [
                        {
                            "color": "green",
                            "value": 0
                        }
                    ]
                },
                "unit": "s"
            },
            "overrides": []
        },
        "gridPos": {
            "h": 8,
            "w": 12,
            "x": 12,
            "y": 48
        },
        "id": 32,
        "options": {
            "legend": {
                "calcs": ["lastNotNull"],
                "displayMode": "table",
                "placement": "bottom",
                "showLegend": True
            },
            "tooltip": {
                "hideZeros": False,
                "mode": "multi",
                "sort": "desc"
            }
        },
        "pluginVersion": "12.1.0-16509090662",
        "targets": [
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "db_last_successful_query_timestamp_seconds{job=~\"credgestor.*|.*api.*\"}",
                "legendFormat": "Última Query Bem-sucedida",
                "refId": "A"
            },
            {
                "datasource": {
                    "type": "prometheus",
                    "uid": "${DS_PROMETHEUS}"
                },
                "expr": "db_last_failed_query_timestamp_seconds{job=~\"credgestor.*|.*api.*\"}",
                "legendFormat": "Última Query que Falhou",
                "refId": "B"
            }
        ],
        "title": "🕐 Timestamps de Últimas Queries",
        "type": "timeseries"
    })
    
    return paineis


def adicionar_paineis_ao_dashboard(arquivo_dashboard):
    """Adiciona os painéis de métricas de banco ao dashboard"""
    
    # Ler o dashboard atual
    with open(arquivo_dashboard, 'r', encoding='utf-8') as f:
        dashboard = json.load(f)
    
    # Criar novos painéis
    novos_paineis = criar_paineis_db_metrics()
    
    # Adicionar os novos painéis
    dashboard['panels'].extend(novos_paineis)
    
    # Ajustar posições dos painéis existentes que vêm depois
    # Encontrar o último painel antes da seção de métricas de banco
    ultimo_y = 36
    for painel in dashboard['panels']:
        if painel.get('gridPos', {}).get('y', 0) >= ultimo_y and painel.get('id') not in [p['id'] for p in novos_paineis]:
            painel['gridPos']['y'] += 16  # Adicionar espaço para os novos painéis
    
    # Salvar o dashboard atualizado
    with open(arquivo_dashboard, 'w', encoding='utf-8') as f:
        json.dump(dashboard, f, indent=2, ensure_ascii=False)
    
    print(f"✅ {len(novos_paineis)} painéis de métricas de banco de dados adicionados ao dashboard!")
    print(f"   Arquivo atualizado: {arquivo_dashboard}")


if __name__ == "__main__":
    arquivo_dashboard = sys.argv[1] if len(sys.argv) > 1 else "grafana-dashboard-sre-completo.json"
    adicionar_paineis_ao_dashboard(arquivo_dashboard)
