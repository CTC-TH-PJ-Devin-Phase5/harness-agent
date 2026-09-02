# Git Convention Rules

Applies to every commit made in this repository, by a human or an agent.

---

## 1. Commit Subject Format

```
<emoji> <verb>: <short imperative summary>
```

- Prefix with the [Gitmoji](https://gitmoji.dev/) matching the change's intent.
- Use the literal emoji character, never the `:shortcode:` form.
- Lower-case the summary.
- Do not end the subject with a period.
- Keep the subject on one line.

Examples:

```
✨ add: product filter to listing page
🐛 fix: cart total not updating on quantity change
♻️ refactor: checkout form into smaller components
📝 update: README with setup steps
💄 restyle: product card hover state
✅ add tests: for cart store actions
⚡️ reduce: bundle size on product detail page
🔧 update: eslint config
```

---

## 2. Emoji Vocabulary

| Emoji | Use for |
|---|---|
| ✨ | A new feature |
| 🐛 | A bug fix |
| 📝 | Documentation |
| 💄 | UI and style changes |
| ♻️ | Refactoring without behavior change |
| ⚡️ | Performance improvements |
| ✅ | Adding or updating tests |
| 🔧 | Configuration files |
| 💚 | Fixing CI |
| 🔒️ | Fixing security issues |
| ⬆️ | Upgrading dependencies |
| ⬇️ | Downgrading dependencies |
| 📦️ | Build system or package changes |
| 🔥 | Removing code or files |
| 🚧 | Work in progress, not ready for review |
| 💥 | Breaking changes |
| ♿️ | Accessibility improvements |
| 🌐 | Internationalization and localization |

This is not the full set — see [gitmoji.dev](https://gitmoji.dev/) for the rest.

---

## 3. Choosing the Emoji

- One emoji per commit. If a commit spans multiple intentions, pick the emoji for its
  **primary** intent rather than stacking several.
- A commit that needs several emoji to describe it is usually several commits. Split it.
- `🚧` marks work that is deliberately incomplete. A branch whose head commit is `🚧`
  must not go through Phase 4 or open a PR.

---

## 4. Body

The body is optional for small changes and required when the subject cannot carry the
reason. When present:

- Separate it from the subject with a blank line.
- Explain **why**, not what — the diff already shows what.
- Reference the ticket as `Refs docs/requirements/<slug>/tickets/<NN>-<ticket-slug>.md`.
  Do not mark the ticket `Status` done and do not check Acceptance Criteria —
  the orchestrator does that after the per-ticket review (Phase 4b–4c).

---

## 5. Scope

- One logical change per commit. Do not mix a refactor with a behaviour change.
- Never commit generated report output — see `.gitignore`.
- Never commit secrets, tokens, credentials, or `.env` files.
- Never commit directly to `main`. Every commit lands on that ticket's own branch
  (`<slug>/<NN>-<ticket-slug>`, created per `.claude/agents/execute.md`'s
  branch-per-ticket constraint) — `main` only gets touched by whatever merges these
  branches later, which this harness does not automate yet.
- Only commit after the human has approved at the `mcp__approval__request` gate — see
  CLAUDE.md's Orchestrator Rules and `.claude/agents/execute.md`'s approval-gate
  constraint. No commit in this harness happens without that explicit approval.

---

## 6. Existing History

Commits made before this rule used plain conventional prefixes (`feat:`, `fix:`,
`chore:`) or an earlier emoji format. Do not rewrite them. Apply this convention from
the next commit onward.
