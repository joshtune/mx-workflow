# Project Structure

Where files go, and why. This reference is read during `/mx:build` pre-flight and by `mx-feature-builder` when scaffolding new code.

**Customize this file for your project.** The topology rules below are meant to hold everywhere; the vocabulary table near the end is where stack-specific naming lives.

---

## Why this exists

**AI-generated code has no value if a human can't read it.** These rules exist to make a codebase navigable — you should be able to guess where something lives, and be right.

That purpose is also the tiebreaker. **Where a rule and readability genuinely conflict, readability wins — but you must say so out loud.** See [Deviating](#deviating) for what "out loud" means. "Use judgment" without that protocol is an instruction that gets laundered into "do whatever."

---

## The one rule

Everything below is a consequence of a single invariant — filesystem layout mirrors lexical scope:

> **A file lives at the lowest point in the tree that can see all of its consumers.**

Which yields the mechanically checkable form:

> **A file may import from its own subtree or from an ancestor. It may never import from a sibling's subtree.**

A sibling-subtree import is not a style violation. It's the signal that something is in the wrong place, and it has exactly one fix: hoist the shared thing to the lowest common ancestor of its consumers, and no higher.

### Hoisting

Hoist on the **second real consumer** — never speculatively. A thing used once lives with its one user. When a genuine second consumer appears, it moves up to the lowest common ancestor of both, and stops there.

The failure mode this guards against is the junk drawer: everything drifts upward "in case it's needed," and three levels up sits a 40-export `utils.ts` that nobody can reason about. Speculative hoisting is how that starts.

The reverse move is also legitimate. A parent-level util that has fallen back to a single consumer should **sink** back down. Review passes should flag these.

---

## The shape

```
src/
  constants.ts                      ← app-wide strings
  utils.ts
  stores/                           ← genuinely global state
  modules/
    checkout/
      checkout.constants.ts         ← shared by everything under checkout/
      checkout.utils.ts
      checkout.types.ts
      checkout.store.ts             ← module-scoped state
      CartSummary/
        CartSummary.tsx
        CartSummary.constants.ts    ← only CartSummary's strings
        CartSummary.utils.ts
        CartSummary.test.tsx
        CartSummary.module.css
        LineItem/                   ← nested: ONLY CartSummary uses it
          LineItem.tsx
          LineItem.utils.ts
          LineItem.test.tsx
  e2e/                              ← cross-module by nature (see exceptions)
```

`LineItem` sits inside `CartSummary` because `CartSummary` is its only consumer. The day something in `checkout/` outside that subtree needs it, it hoists to `checkout/` — and no further.

### Placing a new file

1. List every consumer of the thing.
2. One consumer? It lives in that consumer's folder.
3. Two or more? It lives in their lowest common ancestor.
4. Never higher than step 3 permits, even if a higher home seems tidier.

---

## Naming

**The property:** every file in a folder is qualified by that folder's name. Never a bare `utils.ts`.

**The spelling is the framework's, not ours.** `CartSummary.utils.ts` and `cart-summary.utils.ts` satisfy the property equally. Match whatever casing and suffix idiom the stack already uses — see [Stack vocabulary](#stack-vocabulary) — and never fight the framework's code generator to do it.

The repetition is deliberate. Bare `utils.ts` produces a dozen identical editor tabs and a useless fuzzy-finder; a qualified name is unambiguous in tabs, `Cmd-P`, and `grep` regardless of how deep it sits. This is what makes uncapped nesting tolerable — see [Depth](#depth).

React/Svelte/Vue spelling, as an example:

| Purpose | File |
|---|---|
| Component | `CartSummary/CartSummary.tsx` |
| Utilities | `CartSummary/CartSummary.utils.ts` |
| Constants | `CartSummary/CartSummary.constants.ts` |
| Types | `CartSummary/CartSummary.types.ts` |
| Tests | `CartSummary/CartSummary.test.tsx` |
| Styles | `CartSummary/CartSummary.module.css` |
| State | `CartSummary/CartSummary.store.ts` |

The same folder in Angular is `cart-summary/cart-summary.component.ts`, `.html`, `.scss`, `.spec.ts`. Different spelling, identical property, identical topology.

**No barrel files.** No `index.ts` that re-exports a folder. Barrels:

- **Break tree shaking.** Importing one symbol pulls the whole barrel into the module graph, and any re-exported module with a side effect defeats elimination entirely. The cost lands in the shipped bundle, where it's hardest to notice.
- **Launder cross-subtree imports** through an index, where the sibling-import gate can't see them — which quietly disables the one rule everything else here rests on.
- Hide the real import graph, defeat `grep`, and invite circular dependencies.

Import the explicit file.

*Exception:* where a framework or its CLI generates barrels as part of its own conventions (Angular's public API files, package entry points), those are [pre-approved](#pre-approved-exceptions). Don't hand-write new ones.

Shared files at a grouping level take that level's name: `checkout/checkout.utils.ts`. App-level files need no qualifier: `src/constants.ts`.

---

## Strings

**User-facing copy and magic keys belong in a constants file** at the scope where they're used.

Must be extracted:

- Display copy — labels, headings, button text, empty states
- Error and validation messages
- Route paths and URL fragments
- Storage keys, query keys, cache keys, event names
- Test IDs and selectors
- Any string literal appearing in more than one place

May stay inline:

- One-off `className` values and style tokens
- ARIA roles and other framework-fixed vocabulary
- Strings inside a test that describe that test

Constants live at the same scope as anything else — `CartSummary.constants.ts` for strings only `CartSummary` uses, `checkout.constants.ts` once a second consumer in the module appears. The hoisting rule applies unchanged.

> If the project adds i18n later, user-facing copy migrates to locale files and the constants file keeps keys, not text. Extracting copy now is what makes that migration mechanical.

---

## Depth

**Nesting is uncapped.** A hard cap would break the invariant: if `LineItem` is used only by `Price`, which is used only by `Summary`, forcing `LineItem` up to the module root parks it beside genuinely shared code while it still has one consumer. The tree stops describing the consumer graph, and the lint rule can no longer catch it — a module-root file is legitimately importable by anything. A cap trades a real guarantee for cosmetics.

The usual objection is unreadable paths, which prefixed filenames and a module-root path alias (`@checkout/…`) largely dissolve. You rarely type a deep path.

**Depth is a diagnostic, not a limit.** Four or more levels below a module root emits a **QA advisory — never a failure**. Deep nesting is usually one of two real problems, and both are worth surfacing:

- The ancestor is a god component that should have been decomposed along different seams.
- The leaf is more general than assumed and has a natural home higher up.

Ask the question. Don't enforce an answer.

---

## Pre-approved exceptions

These are **not** judgment calls and need no justification. They override the topology rules outright.

| Case | Rule |
|---|---|
| Framework-mandated paths | The framework wins. Next.js `app/`/`pages/`, SvelteKit `+page.svelte`, Angular route modules, Rails/Django conventions, `migrations/`, `public/`, `static/` |
| Generated code | Lives wherever its generator writes it — CLI scaffolds, OpenAPI clients, Supabase types, protobuf output. Never hand-relocate or rename generated files |
| Framework-idiomatic barrels | Public API files and package entry points a framework or its CLI expects. Don't hand-write new barrels beyond these |
| E2E tests | Top-level `e2e/`. They span modules by definition, so co-location would be a lie about scope |
| Design-system primitives | Global by design, not by hoisting. A root `components/ui/` for `Button`, `Input`, etc. is correct even before a second consumer |
| Repo-root tooling | Config files stay at the root where their tools expect them |

Enumerating these is what keeps the judgment hatch below rare. If a deviation isn't in this table, it needs the protocol.

---

## Deviating

Deviation is allowed. Silent deviation is not.

### The protocol

1. **Argue it before, not after.** Surface the deviation at the Phase 3 gate — the rule being broken, the reason, and the alternative you rejected — while the user can still say no. A deviation that first appears in the Phase 5 report is a fait accompli, not a conversation.
2. **Leave the artifact.** Encode it as a justified suppression of the structure rule at the deviation site, with the reason in the comment.
3. **Let the existing gates track it.** A structure deviation is a suppression comment, so `/mx:ratchet` already counts it against trunk, blocks silent accumulation, and names new offenders by `file:line` — and `/mx:check-ignores` already revisits whether it was ever warranted. No new machinery.

### What counts as a reason

**Valid:**

- The framework or toolchain requires this location
- The code is generated
- Following the rule would make the tree misrepresent the consumer graph
- A reader would be measurably worse off — and you can say concretely how

**Not valid:**

- "Simpler for now"
- "The path was getting long"
- "It matches the file I already wrote"
- "The file is small"
- "This case is special" without saying what makes it so

The last one deserves emphasis. *This case is special* is the easiest sentence in the world to generate and carries no information. If the specialness can't be named in a way that survives being read back next month, it isn't a deviation — it's a shortcut.

---

## Stack vocabulary

The topology rules are universal. Only the nouns and the spelling change. Adding a stack is a row here, not a rewrite.

| Stack | Grouping root | Leaf unit | Leaf casing | Test suffix | Styles |
|---|---|---|---|---|---|
| React | `src/modules/` or `src/features/` | Component folder | `PascalCase` | `.test.tsx` | `.module.css` |
| Angular | `src/app/` | Component folder | `kebab-case` + type suffix | `.spec.ts` | `.scss` sibling |
| Svelte / SvelteKit | `src/lib/`, `src/routes/` | Component folder | `PascalCase` | `.test.ts` | in-file `<style>` |
| Vue | `src/modules/` or `src/features/` | Component folder | `PascalCase` | `.spec.ts` | in-file `<style>` |
| Backend service | `src/modules/` or `src/domains/` | Handler / route folder | stack idiom | stack idiom | n/a |
| CLI | `src/commands/` | Command folder | stack idiom | stack idiom | n/a |
| Mobile | `src/features/` | Screen folder | `PascalCase` | `.test.tsx` | StyleSheet sibling |
| Library | `src/` | Public entry point folder | stack idiom | stack idiom | n/a |

If a stack has no meaningful grouping level, drop that column and apply the same rules from `src/` down.

### Framework interop

Three places where a framework's own structure meets these rules. In all three, the framework wins and the rules bend around it.

**Generators are authoritative.** If `ng generate`, `create-next-app`, or an equivalent produces a file layout, take it as-is. Renaming generated output to satisfy a naming preference is a permanent tax on every future generate, and the property that matters — folder-qualified filenames — is already satisfied by every major CLI.

**Route folders are grouping roots.** Where a framework's router owns a directory tree — Next.js `app/`, SvelteKit `src/routes/`, Angular route modules — that tree *is* the hierarchy, and the LCA rule applies to it directly. A component used by exactly one route lives in that route's folder; shared by two routes, it hoists to their common parent route or to `lib/`. Do not build a parallel `components/` tree mirroring the route tree — that's the same information stored twice, and they will drift.

**Dependency injection should agree with the filesystem.** In Angular, a service provided at a component is visible to that component's subtree and nowhere else — which is this reference's rule, enforced at runtime by the injector. Provider scope and file location should therefore match: a service provided at a component belongs in that component's folder; one provided at the route or `root` belongs at the corresponding level. When the two disagree — a `providedIn: 'root'` service living inside one component's folder, or a component-scoped provider sitting at the app root — that's a real signal, not a cosmetic one. Flag it.

---

## Enforcement

The sibling-import rule is a CI gate, not a review convention — it must catch humans as readily as agents.

`dependency-cruiser` is the recommended encoding, because backreferences express the rule generically instead of requiring a hand-maintained zone per module.

Substitute the stack's **grouping root** from the [vocabulary table](#stack-vocabulary) for `src/modules` below — `src/app` for Angular, `src/routes` and `src/lib` for SvelteKit, and so on. The rules are otherwise identical across frameworks:

```js
// .dependency-cruiser.js
{
  forbidden: [
    {
      name: 'no-cross-module-imports',
      severity: 'error',
      comment: 'A module may not reach into another module. Hoist the shared code to their lowest common ancestor.',
      from: { path: '^src/modules/([^/]+)/' },
      to:   { path: '^src/modules/(?!$1/)([^/]+)/' },
    },
    {
      name: 'no-sibling-component-imports',
      severity: 'error',
      comment: 'A component may not reach into a sibling component subtree. Hoist to the module root.',
      from: { path: '^src/modules/([^/]+)/([^/]+)/' },
      to:   { path: '^src/modules/$1/(?!$2/)([^/]+)/' },
    },
  ],
}
```

**Known limit, stated honestly:** these two rules enforce isolation at the grouping and leaf levels, which is where essentially all real violations occur. Backreference-based rules do not generalize to arbitrary depth, so violations nested deeper than the leaf level fall to the QA review pass rather than CI. Don't claim CI coverage that isn't there.

Projects already standardized on ESLint can use `import/no-restricted-paths` with generated zones instead — equivalent enforcement, but the zone list must be regenerated whenever a module is added, so prefer `dependency-cruiser` unless there's a reason not to.

---

## Greenfield vs. existing code

**Existing layout always wins.** On a repo that already has a structure, mirror it — read before writing. Do not reorganize someone's codebase as a side effect of adding a feature.

Where an existing layout conflicts with this reference, **report the conflict and continue in the existing style**. Migrating a codebase to this pattern is a deliberate, separately scoped decision the user makes — never a silent byproduct of a build.

Apply this reference in full only when scaffolding new code with no established pattern to follow.
