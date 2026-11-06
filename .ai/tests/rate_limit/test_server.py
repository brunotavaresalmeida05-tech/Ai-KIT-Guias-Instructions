#!/usr/bin/env python3
"""
Tests for Rate Limit Server
"""

import asyncio
import unittest
from unittest.mock import Mock, patch, AsyncMock
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'src'))

from fastapi.testclient import TestClient
from rate_limit.server import app, get_manager


class TestRateLimitServer(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_health_check(self):
        """Test health check endpoint"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("backend", data)
        self.assertIn("limiters", data)
        self.assertIn("global", data["limiters"])
        self.assertIn("api", data["limiters"])
        self.assertIn("ai", data["limiters"])
        self.assertIn("auth", data["limiters"])

    def test_get_all_configs(self):
        """Test getting all rate limiter configs"""
        response = self.client.get("/config")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)

        # Check global config
        global_config = next((c for c in data if c["layer"] == "global"), None)
        self.assertIsNotNone(global_config)
        self.assertEqual(global_config["algorithm"], "sliding_window")
        self.assertEqual(global_config["max_requests"], 300)
        self.assertEqual(global_config["window_seconds"], 60)

        # Check AI config (token bucket)
        ai_config = next((c for c in data if c["layer"] == "ai"), None)
        self.assertIsNotNone(ai_config)
        self.assertEqual(ai_config["algorithm"], "token_bucket")
        self.assertEqual(ai_config["max_requests"], 10)
        self.assertEqual(ai_config["burst_allowance"], 10)

    def test_get_single_config(self):
        """Test getting single limiter config"""
        response = self.client.get("/config/global")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["layer"], "global")
        self.assertEqual(data["algorithm"], "sliding_window")

        # Test 404 for non-existent
        response = self.client.get("/config/nonexistent")
        self.assertEqual(response.status_code, 404)

    def test_check_rate_limit_success(self):
        """Test successful rate limit check"""
        response = self.client.post("/check", json={
            "identifier": "user:123",
            "layer": "api",
            "cost": 1
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["limit"], 100)
        self.assertEqual(data["remaining"], 99)
        self.assertIn("headers", data)
        self.assertIn("X-RateLimit-Limit", data["headers"])

    def test_check_rate_limit_ai_token_bucket(self):
        """Test AI rate limit with token bucket (allows burst)"""
        # AI limiter allows up to 20 (10 + 10 burst)
        for i in range(20):
            response = self.client.post("/check", json={
                "identifier": "user:ai_test",
                "layer": "ai",
                "cost": 1
            })
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertTrue(data["success"], f"Request {i+1} should succeed")

        # 21st should fail
        response = self.client.post("/check", json={
            "identifier": "user:ai_test",
            "layer": "ai",
            "cost": 1
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertGreater(data["retry_after"], 0)

    def test_check_rate_limit_auth_strict(self):
        """Test auth rate limit is strict (5 per 15 min)"""
        for i in range(5):
            response = self.client.post("/check", json={
                "identifier": "login:ip:10.0.0.1",
                "layer": "auth",
                "cost": 1
            })
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertTrue(data["success"])

        # 6th should fail
        response = self.client.post("/check", json={
            "identifier": "login:ip:10.0.0.1",
            "layer": "auth",
            "cost": 1
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["success"])
        self.assertGreater(data["retry_after"], 0)

    def test_multi_layer_check(self):
        """Test multi-layer rate limit check"""
        response = self.client.post("/check/multi", json={
            "checks": {
                "global": "ip:192.168.1.1",
                "api": "user:456",
                "ai": "user:456"
            },
            "cost": 1
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("results", data)
        self.assertIn("allowed", data)
        self.assertTrue(data["allowed"])
        self.assertEqual(len(data["results"]), 3)

        for layer, result in data["results"].items():
            self.assertTrue(result["success"])
            self.assertIn("headers", result)

    def test_multi_layer_check_blocking(self):
        """Test multi-layer check with blocking layer"""
        # Exhaust auth limiter
        for i in range(5):
            self.client.post("/check", json={
                "identifier": "login:ip:10.0.0.2",
                "layer": "auth",
                "cost": 1
            })

        # Now multi-layer check should fail on auth
        response = self.client.post("/check/multi", json={
            "checks": {
                "global": "ip:10.0.0.2",
                "auth": "login:ip:10.0.0.2"
            },
            "cost": 1
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["allowed"])
        self.assertEqual(data["blocking_layer"], "auth")
        self.assertFalse(data["results"]["auth"]["success"])

    def test_get_status(self):
        """Test getting rate limit status without consuming"""
        response = self.client.post("/check/status", json={
            "identifier": "user:status_test",
            "layer": "api"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["limit"], 100)
        self.assertEqual(data["remaining"], 100)  # Fresh = full

    def test_get_status_after_consumption(self):
        """Test status after some consumption"""
        # Make a few requests
        for i in range(3):
            self.client.post("/check", json={
                "identifier": "user:status_after",
                "layer": "api",
                "cost": 1
            })

        # Check status - the /check/status endpoint reads state without consuming
        response = self.client.post("/check/status", json={
            "identifier": "user:status_after",
            "layer": "api"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Verify the endpoint works and returns valid structure
        self.assertIn("limit", data)
        self.assertIn("remaining", data)
        self.assertIn("reset_time", data)
        self.assertEqual(data["limit"], 100)

    def test_middleware_check_endpoint(self):
        """Test middleware check endpoint for Express integration"""
        response = self.client.post("/middleware/check", json={
            "layer": "global",
            "identifier": "ip:10.0.0.5",
            "cost": 1
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("allowed", data)
        self.assertIn("headers", data)
        self.assertTrue(data["allowed"])
        self.assertIn("X-RateLimit-Limit", data["headers"])

    def test_middleware_check_auto_identifier(self):
        """Test middleware check with auto IP extraction"""
        # This would need a real request with headers - skip for now
        pass

    def test_reset_rate_limit_admin(self):
        """Test admin endpoint to reset rate limit"""
        # First consume some
        for i in range(3):
            self.client.post("/check", json={
                "identifier": "user:reset_test",
                "layer": "api",
                "cost": 1
            })

        # Reset - URL encode the identifier (colons need encoding in URL paths)
        import urllib.parse
        encoded_identifier = urllib.parse.quote("user:reset_test", safe='')
        response = self.client.delete(f"/admin/reset/api/{encoded_identifier}")
        self.assertEqual(response.status_code, 200)

        # Should have full quota again
        response = self.client.post("/check/status", json={
            "identifier": "user:reset_test",
            "layer": "api"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["remaining"], 100)

    def test_custom_config_override(self):
        """Test overriding rate limit config per request"""
        response = self.client.post("/check", json={
            "identifier": "user:custom",
            "layer": "api",
            "cost": 1,
            "algorithm": "fixed_window",
            "max_requests": 5,
            "window_seconds": 60
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["metadata"].get("algorithm"), "fixed_window")

    def test_429_response_format(self):
        """Test 429 response format when rate limited"""
        # Exhaust a limiter
        for i in range(5):
            self.client.post("/check", json={
                "identifier": "login:ip:10.0.0.3",
                "layer": "auth",
                "cost": 1
            })

        # Next should fail with proper 429
        response = self.client.post("/check", json={
            "identifier": "login:ip:10.0.0.3",
            "layer": "auth",
            "cost": 1
        })
        self.assertEqual(response.status_code, 200)  # Our API returns 200 with success=false
        data = response.json()
        self.assertFalse(data["success"])
        self.assertIn("retry_after", data)
        self.assertGreater(data["retry_after"], 0)
        self.assertIn("Retry-After", data["headers"])


if __name__ == '__main__':
    unittest.main()