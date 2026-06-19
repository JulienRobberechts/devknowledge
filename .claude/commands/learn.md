---
allowed-tools: Read, Edit, Bash(ls:*, find:*, mkdir:*, git log:*, git diff:*, git show:*), Write
description: Record a personal learning into docs/learnings/<category>/ as a structured knowledge entry, and explain it clearly.
---

Your task is to identify the most significant thing learned in this session (or the topic from `$ARGUMENTS`), explain it clearly, and save it as a persistent knowledge entry in `docs/learnings/`.

## Steps

1. **Find the next LEARN number**: run `find docs/learnings -name 'LEARN-*.md' | sort` to list all existing entries. Pick the next available number (zero-padded to 3 digits). Start at 001 if none exist.

2. **Identify the learning**:
   - If `$ARGUMENTS` is provided, use it as the subject.
   - Otherwise, scan the session history — files changed, commands run, concepts introduced — and extract the most valuable insight, technique, or mistake discovered.

   Extract:
   - A short title (kebab-case, 3–6 words)
   - The core insight (what was actually learned)
   - The context that led to this discovery
   - A concrete explanation with annotated code examples if relevant
   - How to apply it in the future

3. **Determine the category** — pick the single best-fit from this list, or propose a new one if none fits:
   - `typescript` — type system, compiler tricks, TS-specific patterns
   - `testing` — test strategies, test design, debugging test failures
   - `architecture` — design patterns, hexagonal arch, system design
   - `debugging` — root cause analysis, diagnostic techniques, tools
   - `tooling` — build tools, editors, CLI, dev workflow
   - `performance` — profiling, optimization, resource usage
   - `security` — vulnerabilities, hardening, auth patterns
   - `api-design` — REST, contracts, versioning, error handling
   - `database` — queries, migrations, modeling, indexing
   - `ops` — Docker, deployment, infra, monitoring

4. **Create the directory** if it doesn't exist: `docs/learnings/<category>/`

5. **Create the file** at `docs/learnings/<category>/LEARN-NNN-short-title.md` using this exact template:

```
# LEARN-NNN — Full Title

**Date**: YYYY-MM-DD
**Category**: <category>

## What I Learned

The core insight in 2–4 sentences. Write for your future self: be direct and concrete.

## Context

What situation led to this — the bug, the question, the code review comment.

## Explanation

How it works. Use a simple analogy if it helps. Explain the *why*, not just the *what*.

### Example

\`\`\`<lang>
// Annotated code example — explain each non-obvious line
\`\`\`

## How to Apply

When to use this. What triggers should bring it to mind. Red flags to watch for.

## Common Mistakes

1–2 pitfalls a developer would hit when applying this for the first time.

## References

- Related files, docs, or links (if any)
```

Replace `YYYY-MM-DD` with today's date.

## Rules

- Write in **English**.
- Be concrete — examples beat abstractions; annotate every code block.
- Write for your future self reading this in 6 months, not for a complete beginner.
- If no clear learning emerged and no `$ARGUMENTS` provided, say so and do nothing.
- After creating the file, print its path and a one-sentence summary of the learning.
