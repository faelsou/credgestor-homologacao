/**
 * Configuração do OpenTelemetry para o frontend React
 */
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { DocumentLoadInstrumentation } from '@opentelemetry/instrumentation-document-load';
import { UserInteractionInstrumentation } from '@opentelemetry/instrumentation-user-interaction';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { trace } from '@opentelemetry/api';

interface OtelConfig {
  serviceName?: string;
  serviceVersion?: string;
  otlpEndpoint?: string;
  otlpHeaders?: Record<string, string>;
  enabled?: boolean;
}

/**
 * Configura e inicializa o OpenTelemetry no frontend
 */
export function setupOpenTelemetry(config: OtelConfig = {}): void {
  // Verificar se está habilitado
  const enabled = config.enabled ?? 
    import.meta.env.VITE_OTEL_ENABLED === 'true' ||
    import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT !== undefined;
  
  if (!enabled) {
    console.log('⚠️  OpenTelemetry desabilitado no frontend');
    return;
  }

  const serviceName = config.serviceName || 
    import.meta.env.VITE_OTEL_SERVICE_NAME || 
    'credgestor-frontend';
  
  const serviceVersion = config.serviceVersion || 
    import.meta.env.VITE_OTEL_SERVICE_VERSION || 
    '0.1.0';
  
  const otlpEndpoint = config.otlpEndpoint || 
    import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;
  
  if (!otlpEndpoint) {
    console.warn('⚠️  OpenTelemetry endpoint não configurado. Use VITE_OTEL_EXPORTER_OTLP_ENDPOINT');
    return;
  }

  // Parse headers se fornecido como string
  let otlpHeaders: Record<string, string> = config.otlpHeaders || {};
  const headersEnv = import.meta.env.VITE_OTEL_EXPORTER_OTLP_HEADERS;
  if (headersEnv && !config.otlpHeaders) {
    otlpHeaders = {};
    headersEnv.split(',').forEach(pair => {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value) {
        otlpHeaders[key] = value;
      }
    });
  }

  try {
    // Criar Resource
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 
          import.meta.env.MODE || 'production',
      })
    );

    // Configurar Tracer Provider
    const provider = new WebTracerProvider({
      resource,
    });

    // Configurar OTLP Exporter
    const traceExporter = new OTLPTraceExporter({
      url: `${otlpEndpoint}/v1/traces`,
      headers: otlpHeaders,
    });

    // Adicionar Span Processor
    provider.addSpanProcessor(new BatchSpanProcessor(traceExporter));

    // Registrar o provider
    provider.register();

    // Registrar instrumentações automáticas
    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          // Ignorar requisições para o próprio endpoint OTLP
          ignoreUrls: [new RegExp(`${otlpEndpoint.replace(/^https?:\/\//, '')}`, 'i')],
          propagateTraceHeaderCorsUrls: [
            /^https?:\/\/.*\.credgestor\.app\.br/,
            /^https?:\/\/localhost/,
          ],
        }),
        new XMLHttpRequestInstrumentation({
          ignoreUrls: [new RegExp(`${otlpEndpoint.replace(/^https?:\/\//, '')}`, 'i')],
        }),
        new DocumentLoadInstrumentation(),
        new UserInteractionInstrumentation({
          enabled: true,
        }),
      ],
    });

    console.log(`✅ OpenTelemetry configurado no frontend (${serviceName} v${serviceVersion})`);
    console.log(`   Endpoint: ${otlpEndpoint}`);
  } catch (error) {
    console.error('❌ Erro ao configurar OpenTelemetry:', error);
  }
}

/**
 * Obtém o tracer atual para criar spans customizados
 */
export function getTracer(name: string = 'credgestor-frontend') {
  // Verificar se está no browser
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    return trace.getTracer(name);
  } catch (error) {
    console.warn('⚠️  Tracer não disponível:', error);
    return null;
  }
}

/**
 * Cria um span customizado para uma operação
 */
export async function withSpan<T>(
  name: string,
  operation: () => Promise<T> | T,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  const tracer = getTracer();
  if (!tracer) {
    return await operation();
  }

  const span = tracer.startSpan(name, {
    attributes,
  });

  try {
    const result = await operation();
    span.setStatus({ code: 1 }); // OK
    return result;
  } catch (error) {
    span.setStatus({
      code: 2, // ERROR
      message: error instanceof Error ? error.message : String(error),
    });
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    throw error;
  } finally {
    span.end();
  }
}
