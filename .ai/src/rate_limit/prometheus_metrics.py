#!/usr/bin/env python3
"""
Prometheus Metrics for Rate Limiting
Exposes rate limit metrics in Prometheus format
"""

import time
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any

try:
    from prometheus_client import Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    Counter = None
    Gauge = None
    Histogram = None
    generate_latest = None


class RateLimitMetrics:
    """Prometheus metrics for rate limiting"""
    
    def __init__(self):
        if not PROMETHEUS_AVAILABLE:
            self._disabled = True
            return
        
        self._disabled = False
        
        # Counters
        self.requests_total = Counter(
            'rate_limit_requests_total',
            'Total de requisições de rate limit verificadas',
            ['layer', 'result', 'algorithm']
        )
        
        self.requests_blocked = Counter(
            'rate_limit_requests_blocked_total',
            'Total de requisições bloqueadas pelo rate limit',
            ['layer', 'reason']
        )
        
        # Gauges
        self.requests_remaining = Gauge(
            'rate_limit_remaining',
            'Requisições restantes no momento',
            ['layer', 'identifier']
        )
        
        self.active_connections = Gauge(
            'rate_limit_redis_active_connections',
            'Número de conexões Redis ativas',
            ['backend']
        )
        
        self.connection_pool_size = Gauge(
            'rate_limit_redis_pool_size',
            'Tamanho atual do pool de conexões',
            ['backend']
        )
        
        # Histograms
        self.check_duration = Histogram(
            'rate_limit_check_duration_seconds',
            'Duração das verificações de rate limit',
            ['layer', 'backend'],
            buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]
        )
    
    def increment_request(self, layer: str, result: str, algorithm: str):
        """Incrementar contador de requisições"""
        if self._disabled:
            return
        self.requests_total.labels(layer=layer, result=result, algorithm=algorithm).inc()
    
    def increment_blocked(self, layer: str, reason: str = "limit_exceeded"):
        """Incrementar contador de requisições bloqueadas"""
        if self._disabled:
            return
        self.requests_blocked.labels(layer=layer, reason=reason).inc()
    
    def set_remaining(self, layer: str, identifier: str, remaining: int):
        """Definir requisições restantes"""
        if self._disabled:
            return
        self.requests_remaining.labels(layer=layer, identifier=identifier).set(remaining)
    
    def set_redis_stats(self, active: int, pool_size: int):
        """Definir estatísticas do Redis"""
        if self._disabled:
            return
        self.active_connections.labels(backend='redis').set(active)
        self.connection_pool_size.labels(backend='redis').set(pool_size)
    
    @asynccontextmanager
    async def check_context(self, layer: str, backend: str):
        """Contexto para medir duração da verificação"""
        if self._disabled:
            yield
            return
        
        start = time.time()
        try:
            yield
        finally:
            duration = time.time() - start
            self.check_duration.labels(layer=layer, backend=backend).observe(duration)
    
    def render(self) -> bytes:
        """Renderizar métricas no formato Prometheus"""
        if self._disabled:
            return b"# Prometheus metrics not available (prometheus_client not installed)\n"
        return generate_latest()
    
    def content_type(self) -> str:
        """Content-Type para as métricas"""
        return CONTENT_TYPE_LATEST if self._disabled == False else "text/plain"


# Singleton instance
metrics = RateLimitMetrics()
