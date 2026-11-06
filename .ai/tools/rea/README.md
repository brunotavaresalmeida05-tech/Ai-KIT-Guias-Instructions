# REA Tools - Reverse Engineer Anything

Ferramentas de engenharia reversa assistida por IA baseadas no projeto [morluto/rea](https://github.com/morluto/rea.git).

## Installation
```bash
npm install -g rea-agents
npx rea-agents setup
```

## MCP Integration
REA funciona via Model Context Protocol (MCP):
```json
{
  "mcpServers": {
    "rea": {
      "command": "npx",
      "args": ["rea-agents", "mcp"]
    }
  }
}
```

## Supported Targets
- Native binaries (ELF, PE, Mach-O)
- Android APKs (JADX)
- Electron apps
- .NET assemblies
- WebAssembly
- Firmware (binwalk/Unblob)
- Network captures (tshark)
- GPU code
- Model artifacts

## Analysis Pipeline
```
Input → Type Detection → Engine Selection → Analysis → Output
```

## Engines
| Engine | Target Type | Command |
|--------|-------------|---------|
| Ghidra | Native binaries | `ghidraHeadless` |
| JADX | APK | `jadx-decompile` |
| Hopper | macOS/Windows | `hopperDecompile` |
| wabt | WASM | `wasm-decompile` |
| binwalk | Firmware | `binwalk -e` |

## Usage Examples

### Analyze Binary
```bash
npx rea-agents analyze ./malware.exe --engine ghidra
```

### Generate Report
```bash
npx rea-agents report ./analysis/ --format markdown --output report.md
```

### Interactive Mode
```bash
npx rea-agents interactive ./target.apk
```

## MCP Tools Available
- `rea_analyze` - Execute analysis on target
- `rea_extract_strings` - Extract strings from binary
- `rea_decompile` - Decompile to source-like code
- `rea_network_analysis` - Analyze network traffic
- `rea_report` - Generate comprehensive report
