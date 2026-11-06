#!/usr/bin/env python3
"""
Testes para o REA Analyzer
"""

import os
import sys
import json
import tempfile
import unittest
from pathlib import Path

# Adicionar tools ao path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'tools' / 'rea'))

from rea_analyzer import REAAnalyzer


class TestREAAnalyzer(unittest.TestCase):

    def setUp(self):
        """Criar arquivos temporarios para teste"""
        self.temp_dir = tempfile.mkdtemp()

        # Criar arquivo de teste fake PE
        self.pe_file = os.path.join(self.temp_dir, 'test.exe')
        with open(self.pe_file, 'wb') as f:
            # MZ header
            f.write(b'MZ')
            # Padding ate offset 0x3C
            f.write(b'\x00' * 58)
            # Offset para PE header
            f.write((64).to_bytes(4, 'little'))
            # PE signature
            f.write(b'PE\x00\x00')
            # Strings de teste
            f.write(b'\x00System32\x00kernel32.dll\x00LoadLibrary\x00')
            # mais padding
            f.write(b'A' * 100)

        # Criar arquivo com strings suspeitas
        self.suspicious_file = os.path.join(self.temp_dir, 'suspicious.bin')
        with open(self.suspicious_file, 'wb') as f:
            f.write(b'\x7fELF')  # ELF header
            f.write(b'\x00' * 50)
            # Strings suspeitas
            f.write(b'\x00exec("malware")\x00')
            f.write(b'\x00powershell -enc\x00')
            f.write(b'\x00cmd.exe /c\x00')
            f.write(b'B' * 200)

    def tearDown(self):
        """Limpar arquivos temporarios"""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_file_type_detection(self):
        """Testar deteccao de tipo de arquivo"""
        analyzer = REAAnalyzer(self.pe_file)
        results = analyzer.analyze()

        self.assertEqual(results['file_info']['detected_format'], 'PE')
        self.assertGreaterEqual(results['file_info']['confidence'], 0.9)

    def test_elf_detection(self):
        """Testar deteccao de ELF"""
        analyzer = REAAnalyzer(self.suspicious_file)
        file_info = analyzer._detect_file_type()

        self.assertEqual(file_info['detected_format'], 'ELF')

    def test_string_extraction(self):
        """Testar extracao de strings"""
        analyzer = REAAnalyzer(self.pe_file)
        strings = analyzer._extract_strings()

        # Deveria encontrar strings do arquivo (nao bytes do header)
        self.assertGreater(len(strings), 0)
        # Verificar se encontrou strings conhecidas
        self.assertTrue(any('kernel32' in s for s in strings))

    def test_suspicious_indicators(self):
        """Testar deteccao de indicadores suspeitos"""
        # Precisa chamar analyze() primeiro para popular self.strings
        analyzer = REAAnalyzer(self.suspicious_file)
        analyzer.analyze()  # Isso popula self.strings
        indicators = analyzer._detect_suspicious_indicators()

        # Deveria detectar strings suspeitas
        suspicious_types = [i['type'] for i in indicators]
        self.assertIn('suspicious_string', suspicious_types)

    def test_entropy_calculation(self):
        """Testar calculo de entropia"""
        analyzer = REAAnalyzer(self.pe_file)
        entropy = analyzer._calculate_entropy()

        # Entropia deve estar entre 0 e 8
        self.assertGreaterEqual(entropy, 0)
        self.assertLessEqual(entropy, 8)

    def test_full_analysis_output(self):
        """Testar analise completa"""
        analyzer = REAAnalyzer(self.pe_file)
        results = analyzer.analyze()

        # Verificar estrutura dos resultados
        self.assertIn('target', results)
        self.assertIn('file_info', results)
        self.assertIn('strings', results)
        self.assertIn('entropy', results['file_info'])

        # Verificar tipos
        self.assertIsInstance(results['strings'], list)
        self.assertIsInstance(results['file_info']['entropy'], float)

    def test_invalid_file(self):
        """Testar manejo de arquivo invalido"""
        invalid_file = os.path.join(self.temp_dir, 'nonexistent.exe')

        with self.assertRaises(FileNotFoundError):
            analyzer = REAAnalyzer(invalid_file)
            analyzer.analyze()


class TestREACLI(unittest.TestCase):

    def test_cli_usage_error(self):
        """Testar erro de uso do CLI sem argumentos"""
        import subprocess

        result = subprocess.run(
            [sys.executable, str(Path(__file__).parent.parent.parent / 'tools' / 'rea' / 'rea_analyzer.py')],
            capture_output=True,
            text=True
        )

        # O script deve falhar sem argumentos
        self.assertNotEqual(result.returncode, 0)
        # Deve mostrar mensagem de uso
        self.assertIn('Usage', result.stdout)


if __name__ == '__main__':
    unittest.main()