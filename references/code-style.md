# Code Style

What goes inside the files. The companion to [`project-structure.md`](./project-structure.md), which covers where the files go.

**Customize this file for your project.**

---

## Why this exists

Same reason as the structure rules: **AI-generated code has no value if a human can't read it.** Code is read far more often than it's written, and by people with less context than the author had.

The same tiebreaker applies. **Where a rule and readability genuinely conflict, readability wins — but you must say so out loud.** The [deviation protocol](./project-structure.md#deviating) covers both references: argue it at the gate before the code lands, leave a justified suppression as the artifact, and let `/mx:ratchet` and `/mx:check-ignores` track it.

---

## TypeScript

### Strict, always

`strict: true` is the floor, not the goal. Enable these too — strict doesn't include them, and each one catches a real class of bug:

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,   // arr[0] is T | undefined — it really is
    "exactOptionalPropertyTypes": true, // `{a?: string}` ≠ `{a: string | undefined}`
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

New projects get this in the initial `tsconfig.json`. Existing projects that don't have it: report the gap, don't silently flip it on — turning these on mid-project can surface hundreds of errors and that's the user's call to schedule.

### Escape hatches

| Construct | Rule |
|---|---|
| `any` | Banned. Use `unknown` and narrow. `any` doesn't disable one check, it disables all of them, silently, downstream |
| `as` assertions | Avoid. A type guard proves the claim; an assertion only asserts it. Legitimate for `as const` and genuinely un-typable boundaries |
| `!` non-null | Avoid. If it can't be null, the type should say so; if it can, handle it |
| `@ts-ignore` | Never — use `@ts-expect-error` instead. It fails the build once the underlying issue is fixed, so it can't rot silently |

Every one of these is already counted by `/mx:ratchet` as a suppression, so adding one shows up by `file:line` in the diff against trunk. That's the intended cost: possible, never free, never silent.

---

## Simplicity

The hardest rules to enforce and the most important. Overcomplicated code is the single biggest readability tax in AI-generated work, because generating an abstraction is as cheap as generating the thing itself.

**Don't build what isn't needed yet.** No configuration options with one caller. No interface with one implementation. No generic parameter with one concrete type. No factory that constructs one kind of thing. If a second case never arrives, the abstraction was pure cost.

**Rule of three.** Wait for the third occurrence before extracting a shared abstraction. Two similar things are often coincidence; the third tells you the shape. Duplication is cheaper to fix than the wrong abstraction — one is a find-and-replace, the other is a refactor across every call site.

**An abstraction with exactly one caller is a candidate for inlining.** Not automatically wrong — extracting for a name, or to make a long function scannable, is legitimate. But it should survive the question being asked.

**Delete, don't comment out.** Dead code behind a comment is a question every future reader has to answer. Git remembers.

**No cleverness.** If a line needs a comment explaining *how* it works, rewrite the line. Comments explain *why*.

---

## Control flow

**Guard clauses over nesting.** Handle the exceptional cases first and return early, so the happy path stays at the left margin and reads top to bottom.

```ts
// Avoid — the actual work is buried three levels deep
function processOrder(order: Order) {
  if (order.items.length > 0) {
    if (order.customer.isVerified) {
      if (order.payment.status === 'authorized') {
        return submitOrder(order)
      }
    }
  }
}

// Prefer — every precondition is stated once, then the work
function processOrder(order: Order) {
  if (order.items.length === 0) return
  if (!order.customer.isVerified) return
  if (order.payment.status !== 'authorized') return

  return submitOrder(order)
}
```

**Name your conditions.** A compound boolean is unreadable inline and self-documenting once it has a name.

```ts
// Avoid
if (user.age >= 18 && user.country === 'US' && !user.restrictions.includes('trading')) { … }

// Prefer
const isEligibleTrader =
  user.age >= 18 && user.country === 'US' && !user.restrictions.includes('trading')

if (isEligibleTrader) { … }
```

**Limits:**

| Rule | Limit | ESLint |
|---|---|---|
| Nesting depth | 3 | `max-depth` |
| Cyclomatic complexity | 10 | `complexity` |
| Nested ternaries | 0 | `no-nested-ternary` |

A function that can't meet these is telling you it does more than one thing. Split it — don't reformat it into compliance.

---

## Naming

**Names spell things out.** No single letters, no invented abbreviations.

| Avoid | Prefer |
|---|---|
| `const u = getUser()` | `const user = getUser()` |
| `const usrCnt` | `const userCount` |
| `const btnLbl` | `const buttonLabel` |
| `const res`, `const resp` | `const response` |
| `const tmp`, `const data`, `const info` | a name that says what it holds |
| `function calc()` | `function calculateTotal()` |

**The only accepted single letter is `_`** for an intentionally unused binding. If you find yourself wanting `i`, a `for...of` or `.map()` usually removes the need for an index at all.

**Established acronyms stay as they are** — `id`, `url`, `api`, `http`, `css`, plus your domain's real vocabulary. The test is whether a new team member would recognize it on day one without asking. `sku` passes. `usrCnt` doesn't.

**Name length scales with scope.** A binding used two lines later can be short; one exported from a module is read by people who can't see its definition and needs to carry its meaning on its own.

**Shapes:**

| Kind | Shape | Example |
|---|---|---|
| Function | Verb phrase | `calculateTotal`, `fetchInvoice` |
| Variable | Noun phrase | `invoiceTotal`, `pendingItems` |
| Boolean | Predicate | `isVerified`, `hasPermission`, `canCheckout`, `shouldRetry` |
| Collection | Plural | `orders`, not `orderList` or `orderArray` |
| Handler | `handle` + event | `handleSubmit`, `handleRetryClick` |
| Constant | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS` |

Avoid noise-word suffixes — `userData`, `orderInfo`, `configObject`, `itemManager`. If removing the suffix loses nothing, it was never carrying anything.

---

## Enforcement

Honest split between what CI catches and what needs a reader.

| Rule | Mechanism |
|---|---|
| Strict TypeScript | `tsconfig.json` — CI gate |
| No `any` | `@typescript-eslint/no-explicit-any` — CI gate |
| No non-null assertion | `@typescript-eslint/no-non-null-assertion` — CI gate |
| `@ts-expect-error` over `@ts-ignore` | `@typescript-eslint/ban-ts-comment` — CI gate |
| Nesting depth, complexity, nested ternaries | `max-depth`, `complexity`, `no-nested-ternary` — CI gate |
| Unused code | `noUnusedLocals` / `noUnusedParameters` — CI gate |
| Suppression count vs trunk | `/mx:ratchet` — CI gate |
| Naming quality | Review — `mx-code-reviewer` |
| Premature abstraction, rule of three | Review — `mx-code-simplifier` |
| Guard clauses, named conditions | Review — `mx-code-simplifier` |

The bottom three can't be linted, and pretending otherwise would be worse than admitting it. They're the ones most worth flagging in a build gate, since they're also the ones AI-generated code gets wrong most often.
