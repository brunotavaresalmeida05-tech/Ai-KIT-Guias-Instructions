#!/usr/bin/env python3
"""
Testes para o BLA Defender
"""

import os
import sys
import json
import tempfile
import shutil
import unittest
from pathlib import Path

# Adicionar tools ao path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'tools' / 'bla'))

from bla_defender import BLADefender


class TestBLADefender(unittest.TestCase):

    def setUp(self):
        """Criar diretorio de teste com arquivos"""
        self.test_dir = tempfile.mkdtemp()

        # Criar arquivos de teste
        self.config_file = os.path.join(self.test_dir, 'config.json')
        with open(self.config_file, 'w') as f:
            json.dump({
                'app_name': 'test-app',
                'version': '1.0.0',
                'api_key': 'real-key-12345'
            }, f, indent=2)

        self.readme = os.path.join(self.test_dir, 'README.md')
        with open(self.readme, 'w') as f:
            f.write('# Test App\n\nThis is a test application.')

    def tearDown(self):
        """Limpar diretorio de teste"""
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def _calculate_dir_size(self, path):
        """Calcular tamanho total dos arquivos em um diretorio"""
        total = 0
        for root, dirs, files in os.walk(path):
            for f in files:
                fp = os.path.join(root, f)
                total += os.path.getsize(fp)
        return total

    def test_harden_applies_exhaustion(self):
        """Testar tecnica de exhaustion"""
        defender = BLADefender(self.test_dir, {'exhaustion': True, 'poison': False, 'deception': False})
        results = defender.harden()

        self.assertIn('exhaustion', results['techniques_applied'])
        self.assertGreater(results['exhaustion']['size_increase'], 0)

        # Verificar que arquivos JSON foram modificados
        with open(self.config_file, 'r') as f:
            content = json.load(f)
            self.assertIn('_bla_exhaustion', content)

    def test_harden_applies_poison(self):
        """Testar tecnica de poison"""
        defender = BLADefender(self.test_dir, {'exhaustion': False, 'poison': True, 'deception': False})
        results = defender.harden()

        self.assertIn('poison', results['techniques_applied'])
        self.assertGreater(len(results['canaries_planted']), 0)

        # Verificar canarios criados
        canary_files = [f for f in os.listdir(self.test_dir) if f.startswith('.') and 'canary' in f]
        self.assertGreater(len(canary_files), 0)

    def test_harden_applies_deception(self):
        """Testar tecnica de deception"""
        defender = BLADefender(self.test_dir, {'exhaustion': False, 'poison': False, 'deception': True})
        results = defender.harden()

        self.assertIn('deception', results['techniques_applied'])
        self.assertGreater(len(results['metadata_added']), 0)

        # Verificar rabbit holes criados
        rabbit_holes = [
            'docs/internal/legacy_documentation.md',
            'config/fake_production_settings.json'
        ]
        for rh in rabbit_holes:
            full_path = os.path.join(self.test_dir, rh)
            # Pelo menos um deve existir
            if os.path.exists(full_path):
                break
        else:
            # Se nenhum existir, verificar se foram criados com caminhos diferentes
            all_files = []
            for root, dirs, files in os.walk(self.test_dir):
                all_files.extend(files)
            self.assertTrue(any('decoy' in f.lower() or 'fake' in f.lower() for f in all_files))

    def test_harden_all_techniques(self):
        """Testar aplicacao de todas as tecnicas"""
        defender = BLADefender(self.test_dir, {
            'exhaustion': True,
            'poison': True,
            'deception': True,
            'preserve_functionality': True
        })
        results = defender.harden()

        # Todas as tecnicas devem ser aplicadas
        self.assertIn('exhaustion', results['techniques_applied'])
        self.assertIn('poison', results['techniques_applied'])
        self.assertIn('deception', results['techniques_applied'])

        # Equivalencia funcional deve ser validada
        self.assertTrue(results.get('functional_equivalence', {}).get('structure_intact', False))

    def test_preserve_functionality(self):
        """Testar preservacao de funcionalidade"""
        defender = BLADefender(self.test_dir, {
            'exhaustion': False,
            'poison': False,
            'deception': False,
            'preserve_functionality': True
        })
        results = defender.harden()

        # Arquivos originais devem permanecer
        self.assertTrue(os.path.exists(self.config_file))
        self.assertTrue(os.path.exists(self.readme))

        # Conteudo deve ser preservado (exceto padding BLA)
        with open(self.config_file, 'r') as f:
            content = json.load(f)
            self.assertEqual(content['app_name'], 'test-app')

    def test_invalid_directory(self):
        """Testar manejo de diretorio invalido"""
        with self.assertRaises(ValueError):
            defender = BLADefender('/nonexistent/path')
            defender.harden()

    def test_canary_generation(self):
        """Testar geracao de canarios"""
        defender = BLADefender(self.test_dir)

        canaries = defender._generate_canaries(5)

        self.assertEqual(len(canaries), 5)
        for canary in canaries:
            self.assertIn('id', canary)
            self.assertIn('type', canary)
            self.assertIn('value', canary)
            self.assertEqual(canary['purpose'], 'detect_unauthorized_access')

    def test_size_increase_tracking(self):
        """Testar rastreamento de aumento de tamanho"""
        # Calcular tamanho inicial dos arquivos
        initial_size = self._calculate_dir_size(self.test_dir)

        defender = BLADefender(self.test_dir, {'exhaustion': True, 'poison': False, 'deception': False})
        results = defender.harden()

        final_size = self._calculate_dir_size(self.test_dir)

        # Tamanho deve ter aumentado
        self.assertGreater(final_size, initial_size)
        self.assertGreater(results['exhaustion']['size_increase'], 0)


class TestBLACLI(unittest.TestCase):

    def test_cli_help(self):
        """Testar help do CLI"""
        import subprocess

        result = subprocess.run(
            [sys.executable, str(Path(__file__).parent.parent.parent / 'tools' / 'bla' / 'bla_defender.py'), '--help'],
            capture_output=True,
            text=True
        )

        self.assertEqual(result.returncode, 0)
        self.assertIn('BLA Defender', result.stdout)

    def test_cli_invalid_target(self):
        """Testar CLI com target invalido"""
        import subprocess

        result = subprocess.run(
            [sys.executable, str(Path(__file__).parent.parent.parent / 'tools' / 'bla' / 'bla_defender.py'), '/nonexistent'],
            capture_output=True,
            text=True
        )

        self.assertNotEqual(result.returncode, 0)


if __name__ == '__main__':
    unittest.main()