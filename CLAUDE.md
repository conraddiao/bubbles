# CLAUDE.md — Bubbles

## Design System
Always read `DESIGN.md` before making any visual or UI decisions.
All font choices, colors, spacing, border radii, and aesthetic direction are defined there.
Do not deviate from the design system without explicit user approval.

**Key rules for agents:**
- Background is always warm parchment `#F6EFE5`, never pure white
- Accent color is burnt sienna `#E8622A` — no blue anywhere in the UI
- Display text uses Fraunces serif, body uses Geist Sans, labels/names use Gabarito
- Contact member cards use organic blob border-radius (`--radius-bubble`)
- In QA mode, flag any code that doesn't match DESIGN.md

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
