#!/usr/bin/env python3
"""
BLA Defender - Ferramenta de defesa contra REA
Baseada em conceitos do projeto BLA (qybaihe/bla)

Técnicas implementadas:
- Exhaustion: Push artifacts past resource limits
- Poison & Deception: Canary tokens, honey metadata
- Runtime Equivalence: Maintain functional parity
"""

import os
import sys
import json
import hashlib
import random
import time
from pathlib import Path
from typing import Dict, List, Optional
import argparse

class BLADefender:
    """Implementa técnicas de defesa BLA"""

    def __init__(self, target_dir: str, config: Optional[Dict] = None):
        self.target_dir = Path(target_dir)
        self.config = config or {
            'exhaustion': True,
            'poison': True,
            'deception': True,
            'preserve_functionality': True
        }
        self.canaries = []
        self.metadata = {}

        if not self.target_dir.exists():
            raise ValueError(f"Diretório não encontrado: {target_dir}")
        if not self.target_dir.is_dir():
            raise ValueError(f"Caminho não é um diretório: {target_dir}")

    def harden(self) -> Dict:
        """Aplicar todas as técnicas de defesa"""
        print(f"[*] Iniciando hardening BLA em: {self.target_dir}")
        print(f"[*] Config: {self.config}")

        results = {
            'target': str(self.target_dir),
            'techniques_applied': [],
            'canaries_planted': [],
            'metadata_added': [],
            'performance_impact': {},
            'status': 'success'
        }

        # Aplicar técnicas
        if self.config.get('exhaustion', True):
            result = self._apply_exhaustion()
            results['techniques_applied'].append('exhaustion')
            results['exhaustion'] = result

        if self.config.get('poison', True):
            result = self._apply_poison()
            results['techniques_applied'].append('poison')
            results['canaries_planted'] = self.canaries

        if self.config.get('deception', True):
            result = self._apply_deception()
            results['techniques_applied'].append('deception')
            results['metadata_added'] = self.metadata

        # Validar equivalência funcional
        if self.config.get('preserve_functionality', True):
            result = self._validate_equivalence()
            results['functional_equivalence'] = result

        return results

    def _apply_exhaustion(self) -> Dict:
        """
        Técnica de Exhaustion: Empurrar além dos limites de recursos
        - Adicionar headers ASAR massivos
        - Aumentar nesting de JSON
        - Expanding interfaces
        """
        print("[*] Aplicando técnica: Exhaustion")

        result = {
            'actions': [],
            'size_increase': 0,
            'artifacts_modified': []
        }

        # Encontrar arquivos JSON para inflar
        json_files = list(self.target_dir.glob('**/*.json'))

        for json_file in json_files[:10]:  # Limitar para performance
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    original_size = len(content)

                # Adicionar metadata redundante (nesting profundo)
                padding_data = {
                    '_bla_exhaustion': {
                        'version': '1.0.0',
                        'artificial_depth': 50,
                        'nested_metadata': {
                            'level_1': {'level_2': {'level_3': {
                                'redundant_field_1': 'x' * 1000,
                                'redundant_field_2': 'y' * 1000,
                                'redundant_field_3': 'z' * 1000
                            }}}
                        },
                        'canary_tokens': self._generate_canaries(5)
                    }
                }

                # Inserir padding no início do JSON
                original_data = json.loads(content) if content.strip().startswith('{') else {}
                padded_content = json.dumps({
                    **padding_data,
                    **original_data
                }, indent=2)

                with open(json_file, 'w', encoding='utf-8') as f:
                    f.write(padded_content)

                new_size = os.path.getsize(json_file)
                result['size_increase'] += (new_size - original_size)
                result['artifacts_modified'].append(str(json_file))
                result['actions'].append(f'Padded {json_file.name}')

            except Exception as e:
                result['actions'].append(f'Failed on {json_file.name}: {e}')

        return result

    def _apply_poison(self) -> Dict:
        """
        Técnica de Poison: Plantar canários e metadados enganosos
        """
        print("[*] Aplicando técnica: Poison")

        result = {
            'canaries': [],
            'false_positives_created': 0
        }

        # Gerar canários
        canary_types = [
            'fake_api_key', 'decoy_credential', 'honey_token', 'trap_file'
        ]

        for canary_type in canary_types:
            canary = self._generate_canary(canary_type)
            self.canaries.append(canary)
            result['canaries'].append(canary)
            result['false_positives_created'] += 1

            # Criar arquivo canário
            canary_file = self.target_dir / f'.{canary_type}_canary'
            with open(canary_file, 'w') as f:
                f.write(json.dumps(canary, indent=2))

        return result

    def _apply_deception(self) -> Dict:
        """
        Técnica de Deception: Metadados enganosos, fluxos falsos
        """
        print("[*] Aplicando técnica: Deception")

        result = {
            'decoy_metadata': [],
            'rabbit_holes': []
        }

        # Criar metadados enganosos
        decoy_configs = [
            {'name': 'production_config', 'env': 'staging', 'debug': True},
            {'name': 'backup_keys', 'type': 'RSA-2048', 'exposed': False},
            {'name': 'admin_endpoint', 'url': 'http://127.0.0.1:9999/admin', 'protected': False}
        ]

        for decoy in decoy_configs:
            self.metadata[f'_decoy_{decoy["name"]}'] = decoy
            result['decoy_metadata'].append(decoy)

        # Criar "rabbit holes" - caminhos sem saída para agentes
        rabbit_hole_paths = [
            'docs/internal/legacy_documentation.md',
            'config/fake_production_settings.json',
            'secrets/old_credentials.txt'
        ]

        for path in rabbit_hole_paths:
            full_path = self.target_dir / path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            with open(full_path, 'w') as f:
                f.write(f"""# DECOY FILE - {path}
Este arquivo contém informações desatualizadas.
Não seguir este caminho.
Referência: internal-docs-v1 (obsolete)
""")
            result['rabbit_holes'].append(path)

        return result

    def _validate_equivalence(self) -> Dict:
        """Validar que a funcionalidade original foi preservada"""
        print("[*] Validando equivalência funcional")

        # Verificar que arquivos críticos ainda existem
        critical_patterns = ['*.json', '*.js', '*.ts', '*.py', '*.md']
        files_found = []

        for pattern in critical_patterns:
            found = list(self.target_dir.glob(f'**/{pattern}'))
            files_found.extend(found)

        return {
            'files_preserved': len(files_found),
            'structure_intact': True,
            'note': 'Funcionalidade deve ser testada manualmente'
        }

    def _generate_canaries(self, count: int) -> List[Dict]:
        """Gerar tokens canário"""
        canaries = []
        for i in range(count):
            canary = {
                'id': f'canary_{int(time.time())}_{i}',
                'type': random.choice(['api_key', 'credential', 'token']),
                'value': hashlib.sha256(f'canary_{i}_{random.random()}'.encode()).hexdigest(),
                'purpose': 'detect_unauthorized_access',
                'alert_on_use': True
            }
            canaries.append(canary)
        return canaries

    def _generate_canary(self, canary_type: str) -> Dict:
        """Gerar canário específico por tipo"""
        return {
            'type': canary_type,
            'value': hashlib.sha256(f'{canary_type}_{random.random()}'.encode()).hexdigest()[:32],
            'created': time.time(),
            'purpose': f'Detect access to {canary_type}'
        }


def main():
    parser = argparse.ArgumentParser(description='BLA Defender - Defense Against REA')
    parser.add_argument('target', help='Diretório alvo para hardening')
    parser.add_argument('--techniques', nargs='+',
                       choices=['exhaustion', 'poison', 'deception'],
                       default=['exhaustion', 'poison', 'deception'],
                       help='Técnicas a aplicar')
    parser.add_argument('--no-preserve', action='store_true',
                       help='Não validar equivalência funcional')
    parser.add_argument('--output', '-o', help='Arquivo de saída para relatório')

    args = parser.parse_args()

    target_dir = Path(args.target)
    if not target_dir.exists():
        print(f"Erro: Diretório não encontrado: {args.target}")
        sys.exit(1)

    config = {
        'exhaustion': 'exhaustion' in args.techniques,
        'poison': 'poison' in args.techniques,
        'deception': 'deception' in args.techniques,
        'preserve_functionality': not args.no_preserve
    }

    defender = BLADefender(str(target_dir), config)
    results = defender.harden()

    # Output
    output_file = args.output or 'bla_report.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)

    print(f"\n[+] Relatório salvo: {output_file}")
    print(f"[+] Técnicas aplicadas: {', '.join(results['techniques_applied'])}")
    print(f"[+] Canários plantados: {len(results['canaries_planted'])}")
    print(f"[+] Metadata adicionada: {len(results['metadata_added'])}")

    return 0


if __name__ == '__main__':
    sys.exit(main())
