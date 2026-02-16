const { NodeSDK } = require("@opentelemetry/sdk-node");
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
const { Resource } = require("@opentelemetry/resources");
const { SemanticResourceAttributes } = require("@opentelemetry/semantic-conventions");

function startOtel() {
  if (process.env.OTEL_ENABLED !== "true") return;

  const serviceName = process.env.OTEL_SERVICE_NAME || "bank-rag-langchain";
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://otel-collector:4318";

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.ENVIRONMENT || "local",
    }),
    traceExporter: new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }),
    metricExporter: new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  process.on("SIGTERM", async () => {
    try { await sdk.shutdown(); } finally { process.exit(0); }
  });
}

module.exports = { startOtel };
