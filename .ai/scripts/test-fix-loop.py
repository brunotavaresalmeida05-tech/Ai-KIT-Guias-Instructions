#!/usr/bin/env python3
"""
Test-Fix Loop - Autonomous test correction agent
"""

import subprocess
import json
import sys
import os
from pathlib import Path

MAX_ATTEMPTS = 10
STOP_ON_CRITICAL = True

def run_command(cmd, cwd=None, timeout=300):
    """Execute a command and return result"""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True,
            cwd=cwd or ".", timeout=timeout
        )
        return {
            "ok": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"ok": False, "stdout": "", "stderr": "Timeout", "returncode": -1}

def analyze_error(output):
    """Analyze error output for patterns"""
    error_patterns = [
        "TypeError:", "ReferenceError:", "SyntaxError:",
        "Cannot read", "undefined", "not defined",
        "Module not found", "ENOENT", "EREF"
    ]
    
    for pattern in error_patterns:
        if pattern in output:
            return {"found": True, "pattern": pattern}
    return {"found": False}

def check_critical(output):
    """Check for critical errors that should stop the loop"""
    critical_patterns = [
        "password", "secret", "api_key", "token",
        "credential", "production", "delete", "drop"
    ]
    
    for pattern in critical_patterns:
        if pattern.lower() in output.lower():
            return True
    return False

def fix_code(error_info):
    """Apply minimal code fix based on error (simplified)"""
    # This is a placeholder - real implementation would use AST
    fixes = []
    
    if "TypeError:" in error_info.get("pattern", ""):
        fixes.append({
            "file": "detected",
            "fix": "Add null/undefined checks"
        })
    
    return fixes

def main(command, max_attempts=10, cwd="."):
    results = {
        "attempts": 0,
        "corrections": [],
        "final_status": "running",
        "log": ""
    }
    
    for attempt in range(1, max_attempts + 1):
        results["attempts"] = attempt
        results["log"] += f"\n--- Attempt {attempt} ---\n"
        
        result = run_command(command, cwd)
        results["log"] += f"Command: {command}\n"
        results["log"] += f"Exit code: {result['returncode']}\n"
        
        output = result["stdout"] + result["stderr"]
        results["log"] += output
        
        if result["ok"]:
            results["final_status"] = "passed"
            print(f"✅ PASSED after {attempt} attempt(s)")
            break
        
        if check_critical(output):
            if STOP_ON_CRITICAL:
                results["final_status"] = "stopped-critical"
                print("🛑 STOPPED - Critical error detected")
                break
        
        error_info = analyze_error(output)
        if error_info["found"]:
            fixes = fix_code(error_info)
            results["corrections"].extend(fixes)
            results["log"] += f"Applied {len(fixes)} fix(es)\n"
    
    if results["final_status"] == "running":
        results["final_status"] = "failed"
        print(f"❌ FAILED after {max_attempts} attempts")
    
    # Save result
    with open("audit-result.json", "w") as f:
        json.dump(results, f, indent=2)
    
    return results

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "npm test"
    max_a = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    main(cmd, max_a)
