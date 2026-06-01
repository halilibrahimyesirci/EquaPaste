# Contributing to EquaPaste

Thanks for your interest! EquaPaste is an MIT, local-first browser extension.

## Ground rules

- **Single purpose:** move math equations from AI chats into documents, losslessly.
  Don't add unrelated features.
- **Stay local:** no servers, no telemetry, no remote code.
- **No GPL/LGPL dependencies** — they can't be bundled into the MIT package. The
  MathML → OMML converter is hand-written for this reason.
- Keep `src/core/` pure (no DOM, no `chrome.*`, no clipboard). Side effects live in
  `src/content/`, `src/background/`, `src/ui/`.

## Setup

```bash
pnpm install
pnpm dev            # Chrome with hot-reload (also matches localhost in dev)
```

## Quality gates (CI runs all of these)

```bash
pnpm lint           # ESLint
pnpm compile        # tsc --noEmit (strict)
pnpm test           # Vitest unit tests (src/core + content logic)
pnpm build          # WXT production build
pnpm test:e2e       # Playwright (needs a display; loads the built extension)
```

- TypeScript `strict`. `any` only with a justified comment.
- Conventional Commits (`feat:`, `fix:`, `docs:` …).
- Add a unit test for any conversion change — extend the corpus in
  `tests/unit/mathml-to-omml.test.ts`.

## Testing the in-page UI

Run `pnpm dev`, then open ChatGPT, Claude, Gemini, Perplexity or DeepSeek. To test on a local page, serve
`tests/e2e/fixtures/katex-page.html` over `http://localhost` (dev builds also match
localhost) and hover the equations.

## Word clipboard format

Getting a native, editable Word equation is the trickiest part. If you touch it,
validate on real Word installs using `clipboard-test.html` and update
[docs/word-clipboard-findings.md](docs/word-clipboard-findings.md).
