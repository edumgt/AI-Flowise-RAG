/**
 * Node OpenTelemetry bootstrap (auto-instrumentation)
 * - exports OTLP over HTTP to OTEL_EXPORTER_OTLP_ENDPOINT
 */
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

function startTracing(serviceName) {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';
  const ns = process.env.SERVICE_NAMESPACE || 'bankrag';

  const traceExporter = new OTLPTraceExporter({ url: `${endpoint}/v1/traces` });
  const metricExporter = new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` });

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: ns,
    }),
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 10000,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  process.on('SIGTERM', () => sdk.shutdown().catch(() => {}));
  process.on('SIGINT', () => sdk.shutdown().catch(() => {}));
}

module.exports = { startTracing };
