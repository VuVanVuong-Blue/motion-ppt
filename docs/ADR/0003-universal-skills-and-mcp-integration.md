# ADR 0003: Universal Agent Skills & MCP Integration

## Status
Accepted

## Context
AI Coding Agents (Antigravity, Claude Code, Cursor, Windsurf, Copilot) need domain-specific guidance on visual hierarchy, timing rules, and strategy selection. We need a format that works across all agent environments.

## Decision
1. Standardize all skills under skills/<name>/SKILL.md using YAML frontmatter + structured Markdown.
2. Any Agent can read the skill files directly from the filesystem.
3. The MCP server (pps/mcp-server) also exposes skills dynamically as MCP Resources and Prompts for agents connected over stdio/SSE.

## Consequences
- **Positive**: Zero lock-in to a single LLM vendor or agent runtime.
- **Positive**: Human-readable and agent-executable documentation in one place.
