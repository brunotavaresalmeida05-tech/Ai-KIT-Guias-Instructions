#!/usr/bin/env python3
"""
Demo do Sistema Autônomo - AI Development System
Mostra agentes descobrindo e usando recursos do kit automaticamente.
"""

import asyncio
import json
from pathlib import Path
import sys

# Adicionar o diretório .ai ao path para importar src
sys.path.insert(0, str(Path(__file__).parent))

from src.autonomy.resource_registry import AutonomousResourceRegistry
from src.autonomy.autonomous_agent import (
    AutonomousAgentFactory,
    AutonomousREAAnalyst,
    AutonomousSecurityDefender,
    AutonomousOrchestrator
)


async def demo_resource_discovery():
    """Demo 1: Descoberta automática de recursos"""
    print("=" * 60)
    print("DEMO 1: Descoberta Automática de Recursos")
    print("=" * 60)

    registry = AutonomousResourceRegistry()
    registry.discover_all()

    stats = registry.get_stats()
    print(f"\nTotal de recursos descobertos: {stats['total_resources']}")
    print("\nPor tipo:")
    for rtype, count in stats['by_type'].items():
        print(f"  {rtype}: {count}")

    print("\nTop 10 capacidades:")
    for cap, count in stats['top_capabilities']:
        print(f"  {cap}: {count} recursos")


async def demo_query_by_capability():
    """Demo 2: Busca por capacidade"""
    print("\n" + "=" * 60)
    print("DEMO 2: Busca por Capacidade")
    print("=" * 60)

    registry = AutonomousResourceRegistry()
    registry.discover_all()

    # Buscar recursos de engenharia reversa
    results = registry.query_by_capability('reverse')
    print(f"\nRecursos com capacidade 'reverse' ({len(results)}):")
    for r in results:
        print(f"  - {r.id}: {r.name} - {r.capabilities[:3]}")


async def demo_query_by_keyword():
    """Demo 3: Busca por palavra-chave"""
    print("\n" + "=" * 60)
    print("DEMO 3: Busca por Palavra-chave")
    print("=" * 60)

    registry = AutonomousResourceRegistry()
    registry.discover_all()

    results = registry.query_by_keyword('security hardening')
    print(f"\nResultados para 'security hardening' ({len(results)}):")
    for r in results[:5]:
        print(f"  - {r.id}: {r.name} [{r.type.value}]")


async def demo_suggest_for_task():
    """Demo 4: Sugestão automática para tarefa"""
    print("\n" + "=" * 60)
    print("DEMO 4: Sugestão Automática para Tarefa")
    print("=" * 60)

    registry = AutonomousResourceRegistry()
    registry.discover_all()

    tasks = [
        "Analisar binário suspeito para vulnerabilidades",
        "Proteger build contra engenharia reversa",
        "Criar pipeline CI/CD com testes de segurança",
        "Documentar API REST com OpenAPI"
    ]

    for task in tasks:
        print(f"\nTarefa: {task}")
        results = registry.suggest_for_task(task)
        print(f"  Sugestões top 3:")
        for i, r in enumerate(results[:3], 1):
            print(f"    {i}. {r.id} - {r.description[:60]}")


async def demo_autonomous_agents():
    """Demo 5: Agentes Autônomos em Ação"""
    print("\n" + "=" * 60)
    print("DEMO 5: Agentes Autônomos")
    print("=" * 60)

    factory = AutonomousAgentFactory()

    # Listar agentes disponíveis
    print("\nAgentes descobertos:")
    for agent in factory.list_available_agents():
        print(f"  - {agent['id']}: {agent['description'][:60]}")

    # Testar auto-seleção
    print("\n--- Auto-seleção de agente ---")

    task1 = "Fazer engenharia reversa de um binário Windows PE"
    agent1 = factory.auto_select_agent(task1)
    print(f"\nTarefa: {task1}")
    print(f"Agente selecionado: {agent1.agent_id}")
    print(f"Capacidades: {agent1.capabilities}")

    task2 = "Aplicar hardening BLA no build de produção"
    agent2 = factory.auto_select_agent(task2)
    print(f"\nTarefa: {task2}")
    print(f"Agente selecionado: {agent2.agent_id}")
    print(f"Capacidades: {agent2.capabilities}")


async def demo_autonomous_execution():
    """Demo 6: Execução Autônoma Simulada"""
    print("\n" + "=" * 60)
    print("DEMO 6: Execução Autônoma")
    print("=" * 60)

    # REA Analyst
    print("\n--- REA Analyst ---")
    rea_agent = AutonomousREAAnalyst()

    result1 = await rea_agent.autonomous_execute(
        "Analisar binário sample.exe para engenharia reversa",
        {'target': './sample.exe', 'analysis_type': 'static'}
    )
    print(f"Task ID: {result1.task_id}")
    print(f"Recursos sugeridos: {result1.metadata.get('suggested_resources', [])[:3]}")
    print(f"Recursos utilizáveis: {result1.metadata.get('usable_resources', [])[:3]}")
    print(f"Resultado: {result1.results.get('success', 'N/A')}")

    # Security Defender
    print("\n--- Security Defender ---")
    sec_agent = AutonomousSecurityDefender()

    result2 = await sec_agent.autonomous_execute(
        "Aplicar hardening BLA no diretório build",
        {'target': './build/', 'techniques': ['exhaustion', 'poison', 'deception']}
    )
    print(f"Task ID: {result2.task_id}")
    print(f"Recursos sugeridos: {result2.metadata.get('suggested_resources', [])[:3]}")
    print(f"Recursos utilizáveis: {result2.metadata.get('usable_resources', [])[:3]}")
    print(f"Resultado: {result2.results.get('success', 'N/A')}")


async def demo_orchestrator():
    """Demo 7: Orquestrador Autônomo"""
    print("\n" + "=" * 60)
    print("DEMO 7: Orquestrador Autônomo")
    print("=" * 60)

    orchestrator = AutonomousOrchestrator()

    # Tarefa que requer RE
    print("\n--- Delegação para REA Analyst ---")
    result1 = await orchestrator.autonomous_execute(
        "Fazer engenharia reversa do malware.exe",
        {'target': './malware.exe'}
    )
    print(f"Delegado para agente especializado")
    print(f"Resultado: {result1.results}")

    # Tarefa que requer hardening
    print("\n--- Delegação para Security Defender ---")
    result2 = await orchestrator.autonomous_execute(
        "Proteger aplicação contra análise REA",
        {'target': './app/'}
    )
    print(f"Delegado para agente especializado")
    print(f"Resultado: {result2.results}")


async def demo_export_catalog():
    """Demo 8: Exportar Catálogo"""
    print("\n" + "=" * 60)
    print("DEMO 8: Exportar Catálogo Completo")
    print("=" * 60)

    registry = AutonomousResourceRegistry()
    registry.discover_all()

    catalog = registry.export_catalog('json')
    data = json.loads(catalog)

    print(f"\nCatálogo exportado:")
    print(f"  Raiz do kit: {data['kit_root']}")
    print(f"  Total recursos: {data['total_resources']}")
    print(f"  Por tipo: {data['by_type']}")

    # Salvar arquivo
    output_path = Path('autonomy_catalog.json')
    output_path.write_text(catalog)
    print(f"\n  Salvo em: {output_path.absolute()}")


async def main():
    """Executa todas as demos"""
    print("\n" + "=" * 60)
    print("  AI DEVELOPMENT SYSTEM - AUTONOMY DEMO")
    print("  Agentes descobrem, consultam e usam recursos automaticamente")
    print("=" * 60 + "\n")

    await demo_resource_discovery()
    await demo_query_by_capability()
    await demo_query_by_keyword()
    await demo_suggest_for_task()
    await demo_autonomous_agents()
    await demo_autonomous_execution()
    await demo_orchestrator()
    await demo_export_catalog()

    print("\n" + "=" * 60)
    print("SUCCESS: TODAS AS DEMOS CONCLUIDAS COM SUCESSO!")
    print("=" * 60)
    print("\nO sistema agora suporta:")
    print("  • Descoberta automática de 110+ recursos")
    print("  • Busca por capacidade, tipo, palavra-chave")
    print("  • Sugestão inteligente para tarefas em linguagem natural")
    print("  • Agentes autônomos que se auto-selecionam")
    print("  • Execução delegada com ferramentas REA/BLA")
    print("  • Aprendizado e memória entre execuções")


if __name__ == '__main__':
    asyncio.run(main())