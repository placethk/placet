# Changelog

All notable changes to this repository are listed here. Versions match the root `VERSION` file and git tags (`vMAJOR.MINOR.PATCH`).

## [1.0.0] — 2026-09-30

### Added

- English Placet pipeline for Claude Code: requirements → PRD → design → TDD → tests → knowledge base
- Skills: `placet-init`, `placet-knowledge-base`, `placet-knowledge-base-update`, `placet-knowledge-fact-gate`, `placet-status`, `placet-context-compress`, `placet-skill-eval`, `placet-env-setup`, `placet-ui-ux`, `placet-now`
- Install / upgrade scripts (`install.sh`, `update-skills.sh`) and `~/.claude/placet-framework-path`
- Shipped docs under `docs/` (delegation guide, knowledge-base rules, CodeGraph, customization)

### Notes

- Local research dumps belong in gitignored `notes/`, not `docs/`
- Current test scope is unit tests only

[1.0.0]: https://github.com/placethk/placet/releases/tag/v1.0.0
