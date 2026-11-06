#!/usr/bin/env python3
"""
Testes para o sistema de autonomia
"""

import os
import sys
import tempfile
import shutil
import unittest
from pathlib import Path

# Adicionar src ao path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'src'))

from autonomy.resource_registry import (
    AutonomousResourceRegistry,
    KitResource,
    ResourceType,
    get_registry
)
from autonomy.autonomous_agent import (
    AutonomousAgent,
    AutonomousAgentFactory,
    TaskContext,
    AutonomousREAAnalyst,
    AutonomousSecurityDefender
)


class TestResourceRegistry(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.kit_root = Path(__file__).parent.parent.parent
        cls.registry = AutonomousResourceRegistry(str(cls.kit_root))
        cls.registry.discover_all()

    def test_discover_agents(self):
        """Testar descoberta de agentes"""
        agents = self.registry.query_by_type(ResourceType.AGENT)
        self.assertGreater(len(agents), 0)

        # Verificar agentes conhecidos
        agent_ids = [a.id for a in agents]
        self.assertIn('agent:rea-analyst', agent_ids)
        self.assertIn('agent:security-defender', agent_ids)
        self.assertIn('agent:architect', agent_ids)

    def test_discover_skills(self):
        """Testar descoberta de skills"""
        skills = self.registry.query_by_type(ResourceType.SKILL)
        self.assertGreater(len(skills), 0)

        skill_ids = [s.id for s in skills]
        self.assertIn('skill:re-engineering', skill_ids)
        self.assertIn('skill:security-audit', skill_ids)
        self.assertIn('skill:autonomous-discovery', skill_ids)

    def test_discover_tools(self):
        """Testar descoberta de ferramentas"""
        tools = self.registry.query_by_type(ResourceType.TOOL)
        self.assertGreater(len(tools), 0)

        tool_ids = [t.id for t in tools]
        self.assertIn('tool:rea', tool_ids)
        self.assertIn('tool:bla', tool_ids)

    def test_discover_recipes(self):
        """Testar descoberta de receitas"""
        recipes = self.registry.query_by_type(ResourceType.RECIPE)
        self.assertGreater(len(recipes), 0)

        recipe_ids = [r.id for r in recipes]
        self.assertTrue(any('recipe-01' in r for r in recipe_ids))
        self.assertTrue(any('recipe-21' in r for r in recipe_ids))

    def test_query_by_capability(self):
        """Testar busca por capacidade"""
        # Capacidade de reverse
        results = self.registry.query_by_capability('reverse')
        self.assertGreater(len(results), 0)

        # Verificar que inclui recursos com 'reverse'
        ids = [r.id for r in results]
        self.assertTrue(any('reverse' in i or 'rea' in i for i in ids))

        # Testar busca por 'reverse-engineering' (exato)
        results2 = self.registry.query_by_capability('reverse-engineering')
        self.assertGreater(len(results2), 0)
        ids2 = [r.id for r in results2]
        self.assertTrue(any('re-engineering' in i for i in ids2))

    def test_query_by_keyword(self):
        """Testar busca por palavra-chave"""
        results = self.registry.query_by_keyword('security')
        self.assertGreater(len(results), 0)

        # Deve encontrar skills, agents, docs relacionados
        types = set(r.type for r in results)
        self.assertIn(ResourceType.SKILL, types)
        self.assertIn(ResourceType.AGENT, types)

    def test_suggest_for_task(self):
        """Testar sugestão para tarefa"""
        # Tarefa de análise de binário
        results = self.registry.suggest_for_task("Analisar binário malware para engenharia reversa")
        self.assertGreater(len(results), 0)

        # Deve sugerir rea-analyst e tools relacionados
        ids = [r.id for r in results]
        self.assertTrue(any('rea' in i for i in ids))

    def test_get_stats(self):
        """Testar estatísticas"""
        stats = self.registry.get_stats()
        self.assertIn('total_resources', stats)
        self.assertGreater(stats['total_resources'], 50)
        self.assertIn('by_type', stats)
        self.assertIn('capabilities_count', stats)

    def test_export_catalog(self):
        """Testar exportação de catálogo"""
        catalog_json = self.registry.export_catalog('json')
        self.assertIn('total_resources', catalog_json)
        self.assertIn('resources', catalog_json)

        catalog_yaml = self.registry.export_catalog('yaml')
        self.assertIn('total_resources', catalog_yaml)

    def test_get_related_resources(self):
        """Testar recursos relacionados"""
        related = self.registry.get_related_resources('skill:re-engineering')
        self.assertGreater(len(related), 0)

        # Deve incluir security-audit, code-review
        related_ids = [r.id for r in related]
        self.assertTrue(any('security-audit' in i or 'code-review' in i for i in related_ids))


class TestAutonomousAgent(unittest.TestCase):

    def setUp(self):
        self.kit_root = Path(__file__).parent.parent.parent
        self.factory = AutonomousAgentFactory(str(self.kit_root))

    def test_factory_list_agents(self):
        """Testar listagem de agentes"""
        agents = self.factory.list_available_agents()
        self.assertGreater(len(agents), 0)

        agent_ids = [a['id'] for a in agents]
        self.assertIn('agent:rea-analyst', agent_ids)
        self.assertIn('agent:security-defender', agent_ids)

    def test_factory_create_agent(self):
        """Testar criação de agentes"""
        rea_agent = self.factory.create_agent('rea-analyst')
        self.assertIsInstance(rea_agent, AutonomousREAAnalyst)
        self.assertEqual(rea_agent.agent_id, 'rea-analyst')

        sec_agent = self.factory.create_agent('security-defender')
        self.assertIsInstance(sec_agent, AutonomousSecurityDefender)
        self.assertEqual(sec_agent.agent_id, 'security-defender')

    def test_factory_auto_select(self):
        """Testar auto-seleção de agente"""
        # Tarefa de RE
        agent = self.factory.auto_select_agent("Analisar binário para engenharia reversa")
        self.assertIsInstance(agent, (AutonomousREAAnalyst, AutonomousAgent))

        # Tarefa de segurança
        agent2 = self.factory.auto_select_agent("Aplicar hardening BLA no build")
        self.assertIsInstance(agent2, (AutonomousSecurityDefender, AutonomousAgent))

    def test_rea_analyst_capabilities(self):
        """Testar capacidades do REA Analyst"""
        agent = self.factory.create_agent('rea-analyst')
        self.assertIn('reverse', agent.capabilities)
        self.assertIn('reconstruct', agent.capabilities)

    def test_security_defender_capabilities(self):
        """Testar capacidades do Security Defender"""
        agent = self.factory.create_agent('security-defender')
        self.assertIn('defend', agent.capabilities)
        self.assertIn('harden', agent.capabilities)


class TestAutonomousExecution(unittest.TestCase):
    """Testes de execução autônoma (mockados)"""

    def test_task_context_creation(self):
        """Testar criação de contexto de tarefa"""
        context = TaskContext(
            task_id='test-1',
            description='Test task',
            parameters={'target': './test.exe'}
        )
        self.assertEqual(context.task_id, 'test-1')
        self.assertEqual(context.parameters['target'], './test.exe')


class TestIntegration(unittest.TestCase):
    """Testes de integração do sistema completo"""

    @classmethod
    def setUpClass(cls):
        cls.kit_root = Path(__file__).parent.parent.parent
        cls.registry = AutonomousResourceRegistry(str(cls.kit_root))
        cls.registry.discover_all()

    def test_full_discovery_coverage(self):
        """Testar cobertura completa da descoberta"""
        stats = self.registry.get_stats()

        # Verificar que todos os tipos principais estão presentes
        expected_types = ['agent', 'skill', 'tool', 'recipe', 'document']
        for etype in expected_types:
            self.assertIn(etype, stats['by_type'])
            self.assertGreater(stats['by_type'][etype], 0)

    def test_skill_schema_completeness(self):
        """Testar que skills têm schemas completos"""
        skills = self.registry.query_by_type(ResourceType.SKILL)

        for skill in skills:
            # Verificar metadados essenciais
            self.assertIn('version', skill.metadata)
            self.assertIn('category', skill.metadata)
            self.assertIn('input_schema', skill.metadata)
            self.assertIn('output_schema', skill.metadata)

    def test_cross_references_work(self):
        """Testar referências cruzadas entre recursos"""
        # skill:re-engineering referencia security-audit
        re_skill = self.registry.get_resource('skill:re-engineering')
        self.assertIsNotNone(re_skill)

        related = self.registry.get_related_resources('skill:re-engineering')
        related_ids = [r.id for r in related]
        self.assertTrue(any('security-audit' in i for i in related_ids))


if __name__ == '__main__':
    unittest.main()