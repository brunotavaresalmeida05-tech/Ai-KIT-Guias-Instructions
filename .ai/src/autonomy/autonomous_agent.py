#!/usr/bin/env python3
"""
Autonomous Agent Base Class
Agente base que descobre e usa recursos do kit automaticamente.
"""

import os
import json
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import logging

from .resource_registry import (
    AutonomousResourceRegistry,
    KitResource,
    ResourceType,
    get_registry
)


@dataclass
class TaskContext:
    """Contexto de execução de uma tarefa"""
    task_id: str
    description: str
    parameters: Dict[str, Any]
    resources_used: List[str] = field(default_factory=list)
    results: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


class AutonomousAgent(ABC):
    """
    Classe base para agentes autônomos que:
    1. Descobrem recursos do kit automaticamente
    2. Selecionam recursos relevantes para a tarefa
    3. Executam tarefas usando recursos descobertos
    4. Aprendem com resultados
    """

    def __init__(self, agent_id: str, kit_root: str = None):
        self.agent_id = agent_id
        self.registry = get_registry(kit_root)
        self.logger = logging.getLogger(f"autonomous.{agent_id}")
        self.capabilities: List[str] = []
        self.memory: Dict[str, Any] = {}
        self.execution_history: List[TaskContext] = []

        # Descobrir recursos na inicialização
        self.registry.discover_all()
        self._identify_own_resources()

    def _identify_own_resources(self):
        """Identifica recursos próprios deste agente"""
        # Tentar busca exata primeiro
        own_resource = self.registry.get_resource(f"agent:{self.agent_id}")
        if own_resource:
            self.capabilities = own_resource.capabilities
            return

        # Fallback: buscar por partes do nome
        keywords = self.agent_id.replace('-', ' ').split()
        for kw in keywords:
            own_resources = self.registry.query_by_keyword(kw)
            for resource in own_resources:
                if resource.type == ResourceType.AGENT and self.agent_id in resource.id:
                    self.capabilities = resource.capabilities
                    return

    @abstractmethod
    async def execute_task(self, task: TaskContext) -> TaskContext:
        """Executa uma tarefa - deve ser implementado por subclasses"""
        pass

    async def autonomous_execute(self, description: str, parameters: Dict[str, Any] = None) -> TaskContext:
        """
        Executa uma tarefa de forma autônoma:
        1. Analisa a descrição
        2. Descobre recursos relevantes
        3. Planeja execução
        4. Executa
        5. Registra aprendizado
        """
        task = TaskContext(
            task_id=f"{self.agent_id}-{len(self.execution_history)}",
            description=description,
            parameters=parameters or {}
        )

        self.logger.info(f"Iniciando tarefa autônoma: {description}")

        # 1. Descobrir recursos relevantes
        relevant_resources = self.registry.suggest_for_task(description)
        task.metadata['suggested_resources'] = [r.id for r in relevant_resources]

        self.logger.info(f"Recursos sugeridos: {[r.id for r in relevant_resources[:5]]}")

        # 2. Filtrar recursos que este agente pode usar
        usable_resources = self._filter_usable_resources(relevant_resources)
        task.metadata['usable_resources'] = [r.id for r in usable_resources]

        # 3. Executar tarefa concreta
        task = await self.execute_task(task)

        # 4. Registrar recursos usados
        task.resources_used = task.metadata.get('resources_actually_used', [])

        # 5. Salvar no histórico
        self.execution_history.append(task)

        # 6. Aprender (atualizar memória)
        self._learn_from_execution(task)

        return task

    def _filter_usable_resources(self, resources: List[KitResource]) -> List[KitResource]:
        """Filtra recursos que este agente sabe usar"""
        usable = []
        for resource in resources:
            # Agentes podem usar: skills, tools, recipes, docs
            # Não podem usar outros agents diretamente (exceto via delegação)
            if resource.type in [ResourceType.SKILL, ResourceType.TOOL,
                                 ResourceType.RECIPE, ResourceType.DOCUMENT,
                                 ResourceType.TEMPLATE, ResourceType.EXAMPLE]:
                usable.append(resource)
        return usable

    def _learn_from_execution(self, task: TaskContext):
        """Atualiza memória baseada na execução"""
        key = f"task:{task.description[:50]}"
        self.memory[key] = {
            'resources_used': task.resources_used,
            'success': task.results.get('success', False),
            'parameters': task.parameters,
            'timestamp': task.metadata.get('timestamp')
        }

    def get_relevant_skills(self, task_description: str) -> List[KitResource]:
        """Obtém skills relevantes para uma tarefa"""
        return self.registry.suggest_for_task(task_description)

    def get_tool(self, tool_name: str) -> Optional[KitResource]:
        """Obtém uma ferramenta específica"""
        return self.registry.get_resource(f"tool:{tool_name}")

    def get_recipe(self, recipe_name: str) -> Optional[KitResource]:
        """Obtém uma receita específica"""
        return self.registry.get_resource(f"recipe:{recipe_name}")

    def get_document(self, doc_name: str) -> Optional[KitResource]:
        """Obtém um documento específico"""
        return self.registry.get_resource(f"doc:{doc_name}")

    def load_skill_module(self, skill_id: str) -> Optional[Any]:
        """Carrega módulo Python de uma skill se existir"""
        skill = self.registry.get_resource(skill_id)
        if not skill or skill.type != ResourceType.SKILL:
            return None

        # Tentar carregar script Python associado
        skill_path = Path(self.registry.kit_root) / skill.path
        python_files = list(skill_path.glob('*.py'))
        if python_files:
            spec = importlib.util.spec_from_file_location(skill.name, python_files[0])
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            return module
        return None

    def execute_skill(self, skill_id: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Executa uma skill (via módulo Python ou CLI)"""
        skill = self.registry.get_resource(skill_id)
        if not skill:
            return {'success': False, 'error': f'Skill não encontrada: {skill_id}'}

        self.logger.info(f"Executando skill: {skill_id}")

        # Registrar uso
        # TODO: Implementar execução real via CLI ou módulo

        return {
            'success': True,
            'skill': skill_id,
            'note': 'Execução simulada - implementar integração real'
        }

    def run_tool_script(self, tool_id: str, script_name: str, args: List[str]) -> Dict[str, Any]:
        """Executa script de uma ferramenta"""
        tool = self.registry.get_resource(tool_id)
        if not tool:
            return {'success': False, 'error': f'Tool não encontrada: {tool_id}'}

        tool_path = Path(self.registry.kit_root) / tool.path
        script_path = tool_path / script_name

        if not script_path.exists():
            return {'success': False, 'error': f'Script não encontrado: {script_name}'}

        import subprocess
        try:
            # Determinar interpretador
            if script_name.endswith('.py'):
                cmd = ['python', str(script_path)] + args
            elif script_name.endswith('.js'):
                cmd = ['node', str(script_path)] + args
            elif script_name.endswith('.sh'):
                cmd = ['bash', str(script_path)] + args
            else:
                cmd = [str(script_path)] + args

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

            return {
                'success': result.returncode == 0,
                'stdout': result.stdout,
                'stderr': result.stderr,
                'returncode': result.returncode
            }
        except subprocess.TimeoutExpired:
            return {'success': False, 'error': 'Timeout'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def suggest_next_actions(self, current_task: TaskContext) -> List[str]:
        """Sugere próximas ações baseadas no histórico"""
        suggestions = []

        # Baseado em recursos usados
        for resource_id in current_task.resources_used:
            related = self.registry.get_related_resources(resource_id)
            for r in related[:3]:
                suggestions.append(f"Usar {r.id}: {r.description}")

        # Baseado em tarefas similares no histórico
        for hist_task in self.execution_history[-5:]:
            if any(kw in hist_task.description.lower()
                   for kw in current_task.description.lower().split()):
                suggestions.append(f"Similar a: {hist_task.description[:50]}")

        return suggestions[:5]


# Exemplo de agente especializado
class AutonomousREAAnalyst(AutonomousAgent):
    """Agente autônomo de engenharia reversa"""

    def __init__(self, kit_root: str = None):
        super().__init__('rea-analyst', kit_root)

    async def execute_task(self, task: TaskContext) -> TaskContext:
        """Executa análise de engenharia reversa"""
        target = task.parameters.get('target')
        analysis_type = task.parameters.get('analysis_type', 'static')

        if not target:
            task.results = {'success': False, 'error': 'Target não especificado'}
            return task

        # Usar tool REA
        rea_tool = self.get_tool('rea')
        if rea_tool:
            # Executar script de análise
            result = self.run_tool_script('tool:rea', 'rea_analyzer.py', [target])
            task.results = result
            task.metadata['resources_actually_used'] = ['tool:rea']
        else:
            task.results = {'success': False, 'error': 'REA tool não disponível'}

        return task


class AutonomousSecurityDefender(AutonomousAgent):
    """Agente autônomo de defesa BLA"""

    def __init__(self, kit_root: str = None):
        super().__init__('security-defender', kit_root)

    async def execute_task(self, task: TaskContext) -> TaskContext:
        """Executa hardening BLA"""
        target = task.parameters.get('target')
        techniques = task.parameters.get('techniques', ['exhaustion', 'poison', 'deception'])

        if not target:
            task.results = {'success': False, 'error': 'Target não especificado'}
            return task

        # Usar tool BLA
        bla_tool = self.get_tool('bla')
        if bla_tool:
            args = [target, '--techniques'] + techniques
            result = self.run_tool_script('tool:bla', 'bla_defender.py', args)
            task.results = result
            task.metadata['resources_actually_used'] = ['tool:bla']
        else:
            task.results = {'success': False, 'error': 'BLA tool não disponível'}

        return task


class AutonomousOrchestrator(AutonomousAgent):
    """Orquestrador que delega para agentes especializados"""

    def __init__(self, kit_root: str = None):
        super().__init__('orchestrator', kit_root)
        self.specialized_agents = {
            'reverse-engineering': AutonomousREAAnalyst(kit_root),
            'security-hardening': AutonomousSecurityDefender(kit_root)
        }

    async def execute_task(self, task: TaskContext) -> TaskContext:
        """Orquestra execução delegando para agentes especializados"""
        description = task.description.lower()

        # Determinar qual agente especializado usar
        if any(kw in description for kw in ['reverse', 'analyze', 'binary', 'malware', 'engineer']):
            agent = self.specialized_agents['reverse-engineering']
        elif any(kw in description for kw in ['harden', 'protect', 'defend', 'security', 'bla']):
            agent = self.specialized_agents['security-hardening']
        else:
            # Usar sugestão do registry
            suggestions = self.registry.suggest_for_task(task.description)
            if suggestions:
                # Tentar mapear para agente
                for s in suggestions:
                    if 'rea' in s.id:
                        agent = self.specialized_agents['reverse-engineering']
                        break
                    elif 'bla' in s.id or 'security' in s.id:
                        agent = self.specialized_agents['security-hardening']
                        break
                else:
                    agent = self
            else:
                agent = self

        if agent != self:
            self.logger.info(f"Delegando para: {agent.agent_id}")
            return await agent.autonomous_execute(task.description, task.parameters)

        # Execução genérica
        task.results = {'success': True, 'note': 'Tarefa genérica executada pelo orchestrator'}
        return task


# Factory para criar agentes autônomos
class AutonomousAgentFactory:
    """Factory para criar agentes autônomos baseados em descoberta"""

    def __init__(self, kit_root: str = None):
        self.kit_root = kit_root
        self.registry = get_registry(kit_root)
        self.registry.discover_all()

    def create_agent(self, agent_type: str) -> AutonomousAgent:
        """Cria agente baseado no tipo descoberto"""
        agents = {
            'rea-analyst': AutonomousREAAnalyst,
            'security-defender': AutonomousSecurityDefender,
            'orchestrator': AutonomousOrchestrator
        }

        if agent_type in agents:
            return agents[agent_type](self.kit_root)

        # Tentar descobrir agente no registry
        resource = self.registry.get_resource(f"agent:{agent_type}")
        if resource:
            return AutonomousAgent(agent_type, self.kit_root)

        raise ValueError(f"Tipo de agente desconhecido: {agent_type}")

    def list_available_agents(self) -> List[Dict[str, Any]]:
        """Lista agentes disponíveis descobertos"""
        agents = self.registry.query_by_type(ResourceType.AGENT)
        return [
            {
                'id': a.id,
                'name': a.name,
                'description': a.description,
                'capabilities': a.capabilities
            }
            for a in agents
        ]

    def auto_select_agent(self, task_description: str) -> AutonomousAgent:
        """Seleciona automaticamente o melhor agente para uma tarefa"""
        suggestions = self.registry.suggest_for_task(task_description)

        # Procurar por agentes nas sugestões
        for resource in suggestions:
            if resource.type == ResourceType.AGENT:
                agent_name = resource.id.replace('agent:', '')
                try:
                    return self.create_agent(agent_name)
                except:
                    continue

        # Fallback: orchestrator
        return self.create_agent('orchestrator')


# Exemplo de uso
async def demo():
    """Demonstração do sistema autônomo"""
    print("=== Demo Sistema Autônomo ===\n")

    # Criar factory
    factory = AutonomousAgentFactory()

    # Listar agentes descobertos
    print("Agentes descobertos:")
    for agent in factory.list_available_agents():
        print(f"  - {agent['id']}: {agent['description']}")

    print("\n--- Tarefa 1: Analisar binário ---")
    orchestrator = factory.auto_select_agent("Analisar binário malware.exe para engenharia reversa")
    result = await orchestrator.autonomous_execute(
        "Analisar binário malware.exe para engenharia reversa",
        {'target': './malware.exe', 'analysis_type': 'static'}
    )
    print(f"Resultado: {result.results}")

    print("\n--- Tarefa 2: Hardening de build ---")
    orchestrator2 = factory.auto_select_agent("Aplicar hardening BLA no build para proteger contra REA")
    result2 = await orchestrator2.autonomous_execute(
        "Aplicar hardening BLA no build para proteger contra REA",
        {'target': './build/', 'techniques': ['exhaustion', 'poison']}
    )
    print(f"Resultado: {result2.results}")

    print("\n--- Estatísticas do Registry ---")
    stats = factory.registry.get_stats()
    print(json.dumps(stats, indent=2))


if __name__ == '__main__':
    import importlib.util
    asyncio.run(demo())