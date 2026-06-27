# Monitoring & Observability Guide

## Stack

| Tool | Purpose | Port |
|------|---------|------|
| Prometheus | Metrics collection & storage | 9090 |
| Grafana | Metrics visualization | 3000 |
| Elasticsearch | Log storage & search | 9200 |
| Logstash | Log pipeline & parsing | 5044 |
| Kibana | Log visualization | 5601 |
| Filebeat | Log shipping from containers | - |

## Starting Monitoring Stack

```bash
# Metrics monitoring
docker compose --profile monitoring up -d

# Log aggregation
docker compose --profile logging up -d

# Both
docker compose --profile monitoring --profile logging up -d
```

## Prometheus

### Access
http://localhost:9090

### Key Metrics Scraped
- `medcare-backend`: `http_requests_total`, `http_request_duration_ms_bucket`, `process_*`
- `node-exporter`: CPU, memory, disk, network
- `mongodb-exporter`: connection pool, op counters, replication lag
- Kubernetes pod metrics (in EKS deployment)

### Useful Queries
```promql
# Request rate by status
sum(rate(http_requests_total{job="medcare-backend"}[5m])) by (status)

# P95 latency
histogram_quantile(0.95,
  sum(rate(http_request_duration_ms_bucket[5m])) by (le))

# Error rate %
sum(rate(http_requests_total{status=~"5.."}[5m])) /
sum(rate(http_requests_total[5m])) * 100

# Memory usage
process_resident_memory_bytes{job="medcare-backend"} / 1024 / 1024
```

## Grafana

### Access
http://localhost:3000 (admin / admin — change on first login)

### Setup
1. Add Prometheus datasource: Configuration → Data Sources → Add Prometheus → URL: `http://prometheus:9090`
2. Import dashboard: + → Import → Upload JSON file → select `devops/monitoring/grafana/dashboard.json`

### Dashboard Panels
- HTTP Request Rate (stat)
- P95 Response Time (stat)
- CPU Usage % (stat)
- Request Rate by Status (time series)
- Memory Usage (time series)

## ELK Stack (Log Aggregation)

### Access
- Kibana: http://localhost:5601
- Elasticsearch: http://localhost:9200

### Log Pipeline
```
Backend Winston Logger
      ↓ (writes JSON to /app/logs/*.log)
Filebeat (ships logs from /logs mount)
      ↓
Logstash (parses, enriches, adds geo-IP)
      ↓
Elasticsearch (index: medcare360-logs-YYYY.MM.DD)
      ↓
Kibana (search, visualize)
```

### Kibana Setup
1. Management → Index Patterns → Create: `medcare360-logs-*`, time field: `@timestamp`
2. Discover → filter by `level: error` for errors
3. Create visualizations for error rate, request volume

### Log Levels (Winston)
- `error`: Unhandled exceptions, DB connection failures
- `warn`: Slow queries (>1s), rate limit hits, failed auth attempts
- `info`: Request logs, server start/stop, DB connections
- `debug`: Query details (development only)

## Alerting (Prometheus Alertmanager)

To add alerts, extend `prometheus.yml` with alerting rules:

```yaml
rule_files:
  - "alerts.yml"
```

Example `alerts.yml`:
```yaml
groups:
  - name: medcare360
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_requests_total{status=~"5.."}[5m])) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} req/s"
```
