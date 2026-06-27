<!-- Context: project-intelligence/nav | Priority: high | Version: 1.0 | Updated: 2026-06-27 -->

# Project Intelligence

> Start here for quick project understanding. These files bridge business and technical domains.

## Structure
```
.opencode/context/project-intelligence/
├── navigation.md              # This file — quick overview
├── technical-domain.md        # Stack, architecture, code patterns (UPDATED)
├── business-domain.md         # Business context and problem statement
├── business-tech-bridge.md    # How business needs map to solutions
├── decisions-log.md           # Major decisions with rationale
└── living-notes.md            # Active issues, debt, open questions
```

## Quick Routes
| What You Need | File | Description |
|---------------|------|-------------|
| Tech stack & patterns | `technical-domain.md` | TypeScript 5, Node.js, Denque, red-black tree, Biome |
| Business "why" | `business-domain.md` | Problem, users, value proposition |
| Business → Tech mapping | `business-tech-bridge.md` | Business needs → technical solutions |
| Decision history | `decisions-log.md` | Why decisions were made |
| Current state | `living-notes.md` | Active issues and open questions |

## Usage
**New Contributor / Agent**:
1. Start with `navigation.md` (this file)
2. Read `technical-domain.md` for tech stack, patterns, naming conventions
3. Read `business-domain.md` for business context
4. Follow onboarding checklist

**Quick Reference**:
- Tech patterns → `technical-domain.md`
- Business context → `business-domain.md`
- Decision context → `decisions-log.md`

## Integration
This folder is referenced from:
- `.opencode/context/core/standards/project-intelligence.md` (standards and patterns)
- `.opencode/context/core/system/context-guide.md` (context loading)

## Maintenance
Keep this folder current:
- Update when tech stack or patterns change
- Document decisions as they're made
- Review `living-notes.md` regularly
- Archive resolved items from `decisions-log.md`
