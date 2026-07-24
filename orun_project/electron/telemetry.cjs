// electron/telemetry.cjs
//
// Lightweight telemetry for Orun OS.
// Collects metrics locally — can be exported to OpenTelemetry/Jaeger later.

class Telemetry {
  constructor() {
    this.traces = [];
    this.counters = {};
    this.histograms = {};
    this.maxTraces = 1000;
    this.maxHistogramNames = 100;
  }

  trace(name, durationMs, attrs = {}) {
    const entry = {
      name,
      durationMs,
      ts: Date.now(),
      ...attrs,
    };
    this.traces.push(entry);
    if (this.traces.length > this.maxTraces) this.traces.shift();

    if (!this.histograms[name]) this.histograms[name] = [];
    this.histograms[name].push(durationMs);
    if (this.histograms[name].length > 100) this.histograms[name].shift();
    // Cleanup: remove oldest metric names if too many unique traces
    const metricNames = Object.keys(this.histograms);
    if (metricNames.length > this.maxHistogramNames) {
      const sorted = metricNames.sort((a, b) => {
        const lastA = this.histograms[a][this.histograms[a].length - 1] || 0;
        const lastB = this.histograms[b][this.histograms[b].length - 1] || 0;
        return lastA - lastB;
      });
      for (let i = 0; i < sorted.length - this.maxHistogramNames; i++) {
        delete this.histograms[sorted[i]];
      }
    }
  }

  counter(name, value = 1) {
    this.counters[name] = (this.counters[name] || 0) + value;
  }

  gauge(name, value) {
    this.counters[`${name}:gauge`] = value;
  }

  getStats(name) {
    const values = this.histograms[name] || [];
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  getCounters() {
    return { ...this.counters };
  }

  getRecentTraces(limit = 50) {
    return this.traces.slice(-limit);
  }

  summary() {
    const metricNames = [...new Set([...Object.keys(this.histograms)])];
    const metrics = {};
    for (const name of metricNames) {
      metrics[name] = this.getStats(name);
    }
    return {
      counters: this.counters,
      metrics,
      recentTraces: this.traces.length,
    };
  }

  reset() {
    this.traces = [];
    this.counters = {};
    this.histograms = {};
  }
}

const telemetry = new Telemetry();

module.exports = { Telemetry, telemetry };
