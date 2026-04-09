/**
 * Agent Manager — Point d'entrée
 *
 * L'Agent Manager est le cerveau central du Cockpit Uburn.
 * Il transforme le Chat IA en orchestrateur qui peut :
 *
 *  1. Comprendre une demande en langage naturel
 *  2. Décider quels skills/agents appeler (via function calling)
 *  3. Exécuter les outils en séquence ou parallèle
 *  4. Agréger les résultats
 *  5. Envoyer des emails d'approbation
 *
 * Architecture :
 *   User → Chat → Claude (with tools) → executeTool() → Skills/Agents → Results → Claude → Response
 *
 * Files :
 *   tools.ts    — Définitions des outils (Tool[] pour Anthropic API)
 *   executor.ts — Exécuteur qui route tool_use vers le bon skill/agent
 */

export { AGENT_TOOLS } from "./tools";
export { executeTool, clearSessionResults } from "./executor";
