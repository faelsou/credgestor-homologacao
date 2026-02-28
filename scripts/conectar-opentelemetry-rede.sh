#!/bin/bash
# Script para conectar containers do OpenTelemetry à rede network_public
# Isso permite que o backend (credgestor-api) se comunique com o otel-collector

echo "🔗 Conectando containers OpenTelemetry à rede network_public..."

# Verificar se os containers existem
if ! docker ps -a | grep -q "otel-collector"; then
    echo "❌ Container otel-collector não encontrado. Execute primeiro:"
    echo "   docker-compose -f docker-compose-opentelemetry.yml up -d"
    exit 1
fi

if ! docker ps -a | grep -q "jaeger"; then
    echo "❌ Container jaeger não encontrado. Execute primeiro:"
    echo "   docker-compose -f docker-compose-opentelemetry.yml up -d"
    exit 1
fi

# Conectar otel-collector à network_public
echo "📡 Conectando otel-collector à network_public..."
docker network connect network_public otel-collector 2>/dev/null && \
    echo "✅ otel-collector conectado" || \
    echo "⚠️  otel-collector já estava conectado ou erro ao conectar"

# Conectar jaeger à network_public (opcional, mas útil)
echo "📡 Conectando jaeger à network_public..."
docker network connect network_public jaeger 2>/dev/null && \
    echo "✅ jaeger conectado" || \
    echo "⚠️  jaeger já estava conectado ou erro ao conectar"

echo ""
echo "✅ Concluído!"
echo ""
echo "📝 Agora configure o backend para usar:"
echo "   OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318"
echo ""
echo "🌐 Acesse Jaeger em: http://localhost:16686"
