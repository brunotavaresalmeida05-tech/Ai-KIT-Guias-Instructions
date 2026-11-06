#!/usr/bin/env python3
"""
Autonomous Resource Discovery System
Permite que agentes de IA descubram, consultem e usem recursos do kit automaticamente.
"""

import os
import json
import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, asdict
from enum import Enum
import importlib.util
import sys


class ResourceType(Enum):
    """Tipos de recursos descobertos no kit"""
    AGENT = "agent"
    SKILL = "skill"
    RECIPE = "recipe"
    TOOL = "tool"
    DOCUMENT = "document"
    TEST = "test"
    CONFIG = "config"
    EXAMPLE = "example"
    TEMPLATE = "template"


@dataclass
class KitResource:
    """Representa um recurso descoberto no kit"""
    id: str
    type: ResourceType
    name: str
    path: str
    description: str
    capabilities: List[str]
    dependencies: List[str]
    metadata: Dict[str, Any]
    usage_examples: List[str]


class AutonomousResourceRegistry:
    """
    Registro autônomo de recursos do kit.
    Descobre, indexa e permite consulta automática de todos os recursos.
    """

    def __init__(self, kit_root: str = None):
        self.kit_root = Path(kit_root or os.environ.get('AI_KIT_ROOT', Path(__file__).parent.parent.parent))
        self.resources: Dict[str, KitResource] = {}
        self._indexed = False
        self._capability_index: Dict[str, List[str]] = {}
        self._type_index: Dict[ResourceType, List[str]] = {}

    def discover_all(self, force_refresh: bool = False) -> Dict[str, KitResource]:
        """
        Descobre TODOS os recursos do kit automaticamente.
        """
        if self._indexed and not force_refresh:
            return self.resources

        print(f"[AUTONOMY] Descobrindo recursos em: {self.kit_root}")

        # Limpar índices
        self.resources.clear()
        self._capability_index.clear()
        self._type_index.clear()

        # Descoberta por tipo
        self._discover_agents()
        self._discover_skills()
        self._discover_recipes()
        self._discover_tools()
        self._discover_documents()
        self._discover_tests()
        self._discover_configs()
        self._discover_examples()
        self._discover_templates()

        # Construir índices reversos
        self._build_indexes()

        self._indexed = True
        print(f"[AUTONOMY] Descobertos {len(self.resources)} recursos")

        return self.resources

    def _discover_agents(self):
        agents_dir = self.kit_root / 'agents'
        if not agents_dir.exists():
            return

        for agent_dir in agents_dir.iterdir():
            if not agent_dir.is_dir():
                continue

            agent_md = agent_dir / 'AGENT.md'
            if not agent_md.exists():
                continue

            content = agent_md.read_text(encoding='utf-8')
            capabilities = self._extract_capabilities(content)
            deps = self._extract_dependencies(content)

            resource = KitResource(
                id=f"agent:{agent_dir.name}",
                type=ResourceType.AGENT,
                name=agent_dir.name,
                path=str(agent_dir.relative_to(self.kit_root)),
                description=self._extract_description(content),
                capabilities=capabilities,
                dependencies=deps,
                metadata={'agent_dir': agent_dir.name},
                usage_examples=self._extract_usage_examples(content)
            )
            self.resources[resource.id] = resource

    def _discover_skills(self):
        skills_dir = self.kit_root / 'skills'
        if not skills_dir.exists():
            return

        for skill_dir in skills_dir.iterdir():
            if not skill_dir.is_dir() or skill_dir.name.startswith('_'):
                continue

            skill_md = skill_dir / 'SKILL.md'
            if not skill_md.exists():
                continue

            content = skill_md.read_text(encoding='utf-8')
            frontmatter = self._parse_frontmatter(content)

            capabilities = frontmatter.get('tags', []) + frontmatter.get('success_criteria', [])
            deps = frontmatter.get('dependencies', [])
            requirements = frontmatter.get('requirements', [])

            resource = KitResource(
                id=f"skill:{skill_dir.name}",
                type=ResourceType.SKILL,
                name=skill_dir.name,
                path=str(skill_dir.relative_to(self.kit_root)),
                description=frontmatter.get('description', ''),
                capabilities=capabilities,
                dependencies=deps + requirements,
                metadata={
                    'version': frontmatter.get('version', '1.0.0'),
                    'category': frontmatter.get('category', 'general'),
                    'author': frontmatter.get('author', ''),
                    'input_schema': frontmatter.get('input', {}),
                    'output_schema': frontmatter.get('output', {}),
                    'execution_time': frontmatter.get('execution_time', {}),
                    'resources': frontmatter.get('resources', {}),
                    'integrations': frontmatter.get('integrations', []),
                    'related_skills': frontmatter.get('related_skills', [])
                },
                usage_examples=self._extract_skill_examples(content, frontmatter)
            )
            self.resources[resource.id] = resource

    def _discover_recipes(self):
        recipes_dir = self.kit_root / 'recipes'
        if not recipes_dir.exists():
            return

        for recipe_file in recipes_dir.glob('*.md'):
            content = recipe_file.read_text(encoding='utf-8')

            resource = KitResource(
                id=f"recipe:{recipe_file.stem}",
                type=ResourceType.RECIPE,
                name=recipe_file.stem,
                path=str(recipe_file.relative_to(self.kit_root)),
                description=self._extract_description(content),
                capabilities=self._extract_recipe_capabilities(content),
                dependencies=self._extract_recipe_deps(content),
                metadata={},
                usage_examples=[f"# Siga a receita: {recipe_file.name}"]
            )
            self.resources[resource.id] = resource

    def _discover_tools(self):
        tools_dir = self.kit_root / 'tools'
        if not tools_dir.exists():
            return

        for tool_dir in tools_dir.iterdir():
            if not tool_dir.is_dir():
                continue

            readme = tool_dir / 'README.md'
            if not readme.exists():
                continue

            content = readme.read_text(encoding='utf-8')

            # Detectar scripts Python/JS
            scripts = list(tool_dir.glob('*.py')) + list(tool_dir.glob('*.js')) + list(tool_dir.glob('*.sh'))

            resource = KitResource(
                id=f"tool:{tool_dir.name}",
                type=ResourceType.TOOL,
                name=tool_dir.name,
                path=str(tool_dir.relative_to(self.kit_root)),
                description=self._extract_description(content),
                capabilities=self._extract_tool_capabilities(content, scripts),
                dependencies=[],
                metadata={
                    'scripts': [s.name for s in scripts],
                    'readme': str(readme.relative_to(self.kit_root))
                },
                usage_examples=self._extract_tool_examples(content)
            )
            self.resources[resource.id] = resource

    def _discover_documents(self):
        docs_dir = self.kit_root / 'docs'
        if not docs_dir.exists():
            return

        for doc_file in docs_dir.glob('*.md'):
            content = doc_file.read_text(encoding='utf-8')

            resource = KitResource(
                id=f"doc:{doc_file.stem}",
                type=ResourceType.DOCUMENT,
                name=doc_file.stem,
                path=str(doc_file.relative_to(self.kit_root)),
                description=self._extract_description(content),
                capabilities=['reference', 'documentation'],
                dependencies=[],
                metadata={'format': 'markdown'},
                usage_examples=[f"# Consulte: {doc_file.name}"]
            )
            self.resources[resource.id] = resource

    def _discover_tests(self):
        tests_dir = self.kit_root / 'tests'
        if not tests_dir.exists():
            return

        for test_file in tests_dir.glob('**/*.test.*'):
            if not test_file.is_file():
                continue

            resource = KitResource(
                id=f"test:{test_file.relative_to(tests_dir).with_suffix('')}",
                type=ResourceType.TEST,
                name=test_file.name,
                path=str(test_file.relative_to(self.kit_root)),
                description=f"Teste: {test_file.name}",
                capabilities=['testing', 'validation'],
                dependencies=[],
                metadata={'test_type': test_file.suffix[1:]},
                usage_examples=[f"npm test -- {test_file.name}"]
            )
            self.resources[resource.id] = resource

    def _discover_configs(self):
        configs_dir = self.kit_root / 'config'
        if not configs_dir.exists():
            return

        for config_file in configs_dir.glob('**/*'):
            if not config_file.is_file():
                continue

            resource = KitResource(
                id=f"config:{config_file.relative_to(configs_dir).with_suffix('')}",
                type=ResourceType.CONFIG,
                name=config_file.name,
                path=str(config_file.relative_to(self.kit_root)),
                description=f"Configuração: {config_file.name}",
                capabilities=['configuration'],
                dependencies=[],
                metadata={'format': config_file.suffix[1:] if config_file.suffix else 'unknown'},
                usage_examples=[]
            )
            self.resources[resource.id] = resource

    def _discover_examples(self):
        examples_dir = self.kit_root / 'examples'
        if not examples_dir.exists():
            return

        for example_file in examples_dir.glob('**/*'):
            if not example_file.is_file():
                continue

            resource = KitResource(
                id=f"example:{example_file.relative_to(examples_dir).with_suffix('')}",
                type=ResourceType.EXAMPLE,
                name=example_file.name,
                path=str(example_file.relative_to(self.kit_root)),
                description=f"Exemplo: {example_file.name}",
                capabilities=['example', 'demonstration'],
                dependencies=[],
                metadata={'type': example_file.suffix[1:] if example_file.suffix else 'unknown'},
                usage_examples=[f"# Execute: {example_file.name}"]
            )
            self.resources[resource.id] = resource

    def _discover_templates(self):
        templates_dir = self.kit_root / 'templates'
        if not templates_dir.exists():
            return

        for template_file in templates_dir.glob('**/*'):
            if not template_file.is_file():
                continue

            resource = KitResource(
                id=f"template:{template_file.relative_to(templates_dir).with_suffix('')}",
                type=ResourceType.TEMPLATE,
                name=template_file.name,
                path=str(template_file.relative_to(self.kit_root)),
                description=f"Template: {template_file.name}",
                capabilities=['templating', 'generation'],
                dependencies=[],
                metadata={'format': template_file.suffix[1:] if template_file.suffix else 'unknown'},
                usage_examples=[]
            )
            self.resources[resource.id] = resource

    def _build_indexes(self):
        """Constrói índices reversos para consulta rápida"""
        for res_id, resource in self.resources.items():
            # Por tipo
            if resource.type not in self._type_index:
                self._type_index[resource.type] = []
            self._type_index[resource.type].append(res_id)

            # Por capacidade
            for cap in resource.capabilities:
                cap_lower = cap.lower()
                if cap_lower not in self._capability_index:
                    self._capability_index[cap_lower] = []
                self._capability_index[cap_lower].append(res_id)

    # Métodos de extração
    def _extract_capabilities(self, content: str) -> List[str]:
        caps = []
        # Procurar por palavras-chave de capacidade
        keywords = ['analyze', 'build', 'test', 'deploy', 'review', 'secure', 'monitor',
                   'generate', 'validate', 'transform', 'optimize', 'debug', 'reverse',
                   'defend', 'harden', 'audit', 'scan', 'extract', 'reconstruct']
        content_lower = content.lower()
        for kw in keywords:
            if kw in content_lower:
                caps.append(kw)
        return caps

    def _extract_dependencies(self, content: str) -> List[str]:
        deps = []
        # Procurar referências a outros agentes/skills
        import re
        refs = re.findall(r'@(\w+(?:-\w+)*)', content)
        deps.extend(refs)
        return deps

    def _extract_description(self, content: str) -> str:
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if line and not line.startswith('#') and len(line) > 20:
                return line[:200]
        return "Sem descrição"

    def _extract_usage_examples(self, content: str) -> List[str]:
        examples = []
        import re
        # Procurar blocos de código
        code_blocks = re.findall(r'```[\w]*\n(.*?)\n```', content, re.DOTALL)
        examples.extend([b.strip()[:200] for b in code_blocks[:3]])
        return examples

    def _parse_frontmatter(self, content: str) -> Dict[str, Any]:
        if not content.startswith('---'):
            return {}
        try:
            parts = content.split('---', 2)
            if len(parts) >= 3:
                return yaml.safe_load(parts[1]) or {}
        except:
            pass
        return {}

    def _extract_skill_examples(self, content: str, frontmatter: Dict) -> List[str]:
        examples = frontmatter.get('examples', [])
        if examples:
            return [str(ex)[:200] for ex in examples[:3]]
        return self._extract_usage_examples(content)

    def _extract_recipe_capabilities(self, content: str) -> List[str]:
        return self._extract_capabilities(content)

    def _extract_recipe_deps(self, content: str) -> List[str]:
        deps = []
        import re
        # Procurar referências a outras receitas
        refs = re.findall(r'recipe[-\s]?(\d+)', content, re.IGNORECASE)
        deps.extend([f"recipe-{r}" for r in refs])
        return deps

    def _extract_tool_capabilities(self, content: str, scripts: List[Path]) -> List[str]:
        caps = self._extract_capabilities(content)
        for script in scripts:
            if script.suffix == '.py':
                caps.append('python-script')
            elif script.suffix == '.js':
                caps.append('javascript-script')
            elif script.suffix == '.sh':
                caps.append('shell-script')
        return caps

    def _extract_tool_examples(self, content: str) -> List[str]:
        return self._extract_usage_examples(content)

    # Métodos de consulta autônoma
    def query_by_capability(self, capability: str) -> List[KitResource]:
        """Encontra recursos que têm uma capacidade específica"""
        cap_lower = capability.lower()
        resource_ids = self._capability_index.get(cap_lower, [])
        return [self.resources[rid] for rid in resource_ids if rid in self.resources]

    def query_by_type(self, resource_type: ResourceType) -> List[KitResource]:
        """Encontra todos os recursos de um tipo"""
        resource_ids = self._type_index.get(resource_type, [])
        return [self.resources[rid] for rid in resource_ids if rid in self.resources]

    def query_by_keyword(self, keyword: str) -> List[KitResource]:
        """Busca por palavra-chave em nome, descrição, capacidades"""
        keyword = keyword.lower()
        results = []
        for resource in self.resources.values():
            if (keyword in resource.name.lower() or
                keyword in resource.description.lower() or
                any(keyword in cap.lower() for cap in resource.capabilities)):
                results.append(resource)
        return results

    def get_resource(self, resource_id: str) -> Optional[KitResource]:
        """Obtém recurso por ID"""
        return self.resources.get(resource_id)

    def get_related_resources(self, resource_id: str) -> List[KitResource]:
        """Encontra recursos relacionados (mesmas capacidades, dependências)"""
        resource = self.resources.get(resource_id)
        if not resource:
            return []

        related = set()
        # Por capacidades compartilhadas
        for cap in resource.capabilities:
            for rid in self._capability_index.get(cap.lower(), []):
                if rid != resource_id:
                    related.add(rid)

        # Por dependências
        for dep in resource.dependencies:
            for rid in self.resources:
                if dep in rid or rid.endswith(f":{dep}"):
                    related.add(rid)

        return [self.resources[rid] for rid in related if rid in self.resources]

    def suggest_for_task(self, task_description: str) -> List[KitResource]:
        """
        Sugere recursos relevantes para uma tarefa descrita em linguagem natural.
        """
        # Extrair palavras-chave da tarefa
        keywords = self._extract_task_keywords(task_description)

        scored_resources = {}
        for resource in self.resources.values():
            score = 0
            # Match por capacidade
            for cap in resource.capabilities:
                if any(kw in cap.lower() for kw in keywords):
                    score += 3
            # Match por nome
            if any(kw in resource.name.lower() for kw in keywords):
                score += 2
            # Match por descrição
            if any(kw in resource.description.lower() for kw in keywords):
                score += 1
            # Match por tags/metadata
            for key, value in resource.metadata.items():
                if isinstance(value, str) and any(kw in value.lower() for kw in keywords):
                    score += 1
                elif isinstance(value, list):
                    for v in value:
                        if isinstance(v, str) and any(kw in v.lower() for kw in keywords):
                            score += 1

            if score > 0:
                scored_resources[resource.id] = score

        # Ordenar por score
        sorted_ids = sorted(scored_resources.keys(), key=lambda x: scored_resources[x], reverse=True)
        return [self.resources[rid] for rid in sorted_ids[:10]]

    def _extract_task_keywords(self, task: str) -> List[str]:
        """Extrai palavras-chave relevantes de uma descrição de tarefa"""
        # Stopwords básicas
        stopwords = {'a', 'o', 'e', 'de', 'da', 'do', 'para', 'com', 'em', 'um', 'uma',
                     'os', 'as', 'no', 'na', 'nos', 'nas', 'por', 'que', 'se', 'como',
                     'the', 'and', 'or', 'to', 'for', 'in', 'on', 'with', 'a', 'an'}

        words = task.lower().replace(',', ' ').replace('.', ' ').split()
        keywords = [w for w in words if len(w) > 3 and w not in stopwords]
        return keywords[:20]  # Limitar

    def export_catalog(self, format: str = 'json') -> str:
        """Exporta catálogo completo para uso externo"""
        catalog = {
            'kit_root': str(self.kit_root),
            'total_resources': len(self.resources),
            'by_type': {t.value: len(ids) for t, ids in self._type_index.items()},
            'resources': {rid: asdict(r) for rid, r in self.resources.items()}
        }

        if format == 'json':
            return json.dumps(catalog, indent=2, default=str)
        elif format == 'yaml':
            return yaml.dump(catalog, default_flow_style=False)
        return str(catalog)

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas do registro"""
        return {
            'total_resources': len(self.resources),
            'by_type': {t.value: len(ids) for t, ids in self._type_index.items()},
            'capabilities_count': len(self._capability_index),
            'top_capabilities': sorted(
                [(cap, len(ids)) for cap, ids in self._capability_index.items()],
                key=lambda x: x[1], reverse=True
            )[:10]
        }


# Instância global singleton
_global_registry = None

def get_registry(kit_root: str = None) -> AutonomousResourceRegistry:
    """Obtém instância global do registro"""
    global _global_registry
    if _global_registry is None:
        _global_registry = AutonomousResourceRegistry(kit_root)
    return _global_registry


# CLI para uso direto
def main():
    import argparse

    parser = argparse.ArgumentParser(description='Autonomous Resource Discovery')
    parser.add_argument('--kit-root', help='Raiz do kit')
    parser.add_argument('--discover', action='store_true', help='Descobrir todos os recursos')
    parser.add_argument('--query-capability', help='Buscar por capacidade')
    parser.add_argument('--query-type', help='Buscar por tipo (agent, skill, tool, etc)')
    parser.add_argument('--query-keyword', help='Buscar por palavra-chave')
    parser.add_argument('--suggest', help='Sugerir recursos para tarefa')
    parser.add_argument('--stats', action='store_true', help='Mostrar estatísticas')
    parser.add_argument('--export', choices=['json', 'yaml'], help='Exportar catálogo')
    parser.add_argument('--resource', help='Obter recurso específico por ID')

    args = parser.parse_args()

    registry = get_registry(args.kit_root)
    registry.discover_all()

    if args.query_capability:
        results = registry.query_by_capability(args.query_capability)
        for r in results:
            print(f"  {r.id}: {r.name} - {r.description}")

    elif args.query_type:
        try:
            rtype = ResourceType(args.query_type)
            results = registry.query_by_type(rtype)
            for r in results:
                print(f"  {r.id}: {r.name} - {r.description}")
        except ValueError:
            print(f"Tipo inválido: {args.query_type}")

    elif args.query_keyword:
        results = registry.query_by_keyword(args.query_keyword)
        for r in results:
            print(f"  {r.id}: {r.name} - {r.description}")

    elif args.suggest:
        results = registry.suggest_for_task(args.suggest)
        print(f"Sugestões para: {args.suggest}")
        for i, r in enumerate(results, 1):
            print(f"  {i}. {r.id}: {r.name} - {r.description}")

    elif args.resource:
        resource = registry.get_resource(args.resource)
        if resource:
            print(json.dumps(asdict(resource), indent=2, default=str))
        else:
            print(f"Recurso não encontrado: {args.resource}")

    elif args.stats:
        stats = registry.get_stats()
        print(json.dumps(stats, indent=2))

    elif args.export:
        print(registry.export_catalog(args.export))

    else:
        # Listar todos por tipo
        for rtype in ResourceType:
            resources = registry.query_by_type(rtype)
            if resources:
                print(f"\n=== {rtype.value.upper()} ({len(resources)}) ===")
                for r in resources:
                    print(f"  {r.id}: {r.name}")


if __name__ == '__main__':
    main()