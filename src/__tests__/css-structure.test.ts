/*
 * The CSS structure audit.
 *
 * This file executes docs/design/css-structure.md's own "Auditing it" table
 * against src/styles/, plus the check that table implies: every token
 * docs/design/visual-system.md names is declared in tokens.css.
 *
 * | Check                                                  | What a hit means               |
 * | ------------------------------------------------------ | ------------------------------ |
 * | A literal `#` colour outside tokens.css                | A token was bypassed.          |
 * | A `font-weight:` not a `var()` outside tokens.css      | The closed weight set was bypassed. |
 * | A `@media` line that is not `min-width: 900px`         | A screen invented a breakpoint. |
 * | A `--` custom property declared outside tokens.css     | A token was redefined locally. |
 * | A class whose block segment ≠ its file name            | Component styles leak into a screen file. |
 *
 * Pure Node: fs and path only. No new dependency, no second vitest
 * environment, no DOM.
 *
 * Every violation is reported as `<path>:<line>` so the offender is one click
 * away.
 */

import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative, basename, sep } from "node:path"
import { fileURLToPath } from "node:url"

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url))
const STYLES_DIR = join(REPO_ROOT, "src", "styles")
const TOKENS_FILE = join(STYLES_DIR, "tokens.css")
const VISUAL_SYSTEM = join(REPO_ROOT, "docs", "design", "visual-system.md")
const CSS_STRUCTURE = join(REPO_ROOT, "docs", "design", "css-structure.md")

/** The breakpoint is the one value that cannot be a token. */
const THE_ONLY_MEDIA_QUERY = "@media (min-width: 900px)"

/**
 * Files exempt from the block-segment rule. That rule exists to stop a
 * component's styles leaking into a screen file; tokens.css declares no
 * classes at all, and base.css is the cross-cutting type layer that
 * css-structure.md puts there by name.
 */
const BLOCK_RULE_EXEMPT = new Set(["tokens.css", "base.css"])

type Violation = { file: string; line: number; detail: string }

function at(file: string, line: number, detail: string): Violation {
  return { file, line, detail }
}

function format(violations: Violation[]): string {
  return violations.map((v) => `${v.file}:${v.line}  ${v.detail}`).join("\n")
}

/** Blank out comments, preserving line numbers and column offsets. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
}

/**
 * Blank the inside of quoted strings, keeping the quotes and the offsets. A
 * font file name (`url("…-400-normal.woff2")`) and an @import target are not
 * declarations, and `.css` in one of them is not a class selector.
 */
function stripStrings(source: string): string {
  return source.replace(/"[^"\n]*"|'[^'\n]*'/g, (m) =>
    m[0] + m.slice(1, -1).replace(/./g, " ") + m[0],
  )
}

function cssFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...cssFiles(full))
    else if (entry.endsWith(".css")) out.push(full)
  }
  return out
}

/**
 * The five greppable checks, run over one stylesheet.
 *
 * `name` is the path as it should be reported (and as the block-segment rule
 * reads the file name from). `isTokensFile` says whether this is tokens.css,
 * the one file allowed literal values.
 */
export function auditStylesheet(
  name: string,
  rawSource: string,
  isTokensFile = basename(name) === "tokens.css",
): Violation[] {
  const violations: Violation[] = []
  const source = stripStrings(stripComments(rawSource))
  const fileBase = basename(name, ".css")
  const exemptFromBlockRule = BLOCK_RULE_EXEMPT.has(basename(name))

  // @font-face descriptors are not property declarations: `font-weight: 400
  // 700` there names the file's axis range, it does not style anything.
  let fontFaceDepth = 0
  let inFontFace = false

  rawSourceLines(source).forEach((text, index) => {
    const line = index + 1

    const enteringFontFace = /@font-face\b/.test(text)
    if (enteringFontFace) inFontFace = true

    // 1. A literal `#` colour outside tokens.css.
    if (!isTokensFile) {
      const hex = text.match(/#[0-9a-fA-F]{3,8}\b/)
      if (hex) {
        violations.push(
          at(
            name,
            line,
            `literal colour ${hex[0]} — only tokens.css may hold one`,
          ),
        )
      }
    }

    // 2. A `font-weight:` whose value is not a `var()` outside tokens.css.
    if (!isTokensFile && !inFontFace) {
      const weight = text.match(/(?:^|[;{])\s*font-weight\s*:\s*([^;}]+)/)
      if (weight && !weight[1].includes("var(")) {
        violations.push(
          at(
            name,
            line,
            `font-weight: ${weight[1].trim()} — the weight set is closed; use a --weight-* token`,
          ),
        )
      }
    }

    // 3. A `@media` line that is not `min-width: 900px`.
    if (text.includes("@media")) {
      const condition = text.trim().replace(/\s*\{\s*$/, "").replace(/\s+/g, " ")
      if (condition !== THE_ONLY_MEDIA_QUERY) {
        violations.push(
          at(
            name,
            line,
            `${condition} — \`${THE_ONLY_MEDIA_QUERY}\` is the only media query permitted`,
          ),
        )
      }
    }

    // 4. A `--` custom property declared outside tokens.css.
    if (!isTokensFile) {
      for (const m of text.matchAll(/(?:^|[;{])\s*(--[A-Za-z0-9_-]+)\s*:/g)) {
        violations.push(
          at(
            name,
            line,
            `${m[1]} declared outside tokens.css — no aliases, no component-local redefinition`,
          ),
        )
      }
    }

    // 5. A class whose block segment does not match its file name.
    if (!exemptFromBlockRule) {
      for (const m of text.matchAll(/\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g)) {
        const cls = m[1]
        if (cls === fileBase || cls.startsWith(`${fileBase}-`)) continue
        violations.push(
          at(
            name,
            line,
            `.${cls} — block segment must be \`${fileBase}\`, matching the file name`,
          ),
        )
      }
    }

    fontFaceDepth += count(text, "{") - count(text, "}")
    if (inFontFace && fontFaceDepth <= 0) {
      inFontFace = false
      fontFaceDepth = 0
    }
  })

  return violations
}

function rawSourceLines(source: string): string[] {
  return source.split("\n")
}

function count(text: string, ch: string): number {
  let n = 0
  for (const c of text) if (c === ch) n++
  return n
}

/**
 * Every token the visual system declares, with the line it is declared on.
 *
 * A token is declared by a table row whose first cell is the token name —
 * that is how every one of the document's token tables is written. Reading
 * prose instead would re-demand the tokens the document explicitly *drops*
 * (`--ground-accent-soft`, `--rule-dashed`), which are named only to say they
 * are gone.
 */
export function tokensNamedBy(markdown: string): Map<string, number> {
  const found = new Map<string, number>()
  markdown.split("\n").forEach((text, index) => {
    const row = text.match(/^\|\s*`(--[a-z][a-z0-9-]*)`\s*\|/)
    if (row && !found.has(row[1])) found.set(row[1], index + 1)
  })
  return found
}

/** Every custom property declared on `:root` in tokens.css. */
export function tokensDeclaredIn(css: string): Set<string> {
  const declared = new Set<string>()
  for (const m of stripComments(css).matchAll(
    /(?:^|[;{])\s*(--[A-Za-z0-9_-]+)\s*:/g,
  )) {
    declared.add(m[1])
  }
  return declared
}

// ───────────────────────────────────────────────────────────────────────────

const stylesheets = cssFiles(STYLES_DIR).map((full) => ({
  path: relative(REPO_ROOT, full).split(sep).join("/"),
  source: readFileSync(full, "utf8"),
}))

describe("src/styles/ obeys css-structure.md", () => {
  it("has a src/styles/ directory with stylesheets in it", () => {
    expect(stylesheets.length).toBeGreaterThan(0)
  })

  it("index.css is an @import manifest and nothing else", () => {
    const manifest = stylesheets.find((s) => s.path.endsWith("styles/index.css"))
    expect(manifest, "src/styles/index.css must exist").toBeDefined()
    const offenders: Violation[] = []
    stripComments(manifest!.source)
      .split("\n")
      .forEach((text, index) => {
        if (text.trim() === "") return
        if (/^@import\s+["'][^"']+["']\s*;$/.test(text.trim())) return
        offenders.push(
          at(manifest!.path, index + 1, `${text.trim()} — not an @import line`),
        )
      })
    expect(format(offenders)).toBe("")
  })

  it("holds no literal value, no local token, no second breakpoint, no leaked block", () => {
    const offenders = stylesheets.flatMap((s) =>
      auditStylesheet(s.path, s.source),
    )
    expect(format(offenders)).toBe("")
  })
})

describe("tokens.css carries the whole vocabulary", () => {
  const declared = tokensDeclaredIn(readFileSync(TOKENS_FILE, "utf8"))
  const named = tokensNamedBy(readFileSync(VISUAL_SYSTEM, "utf8"))

  it("declares every token visual-system.md names", () => {
    const missing: Violation[] = []
    for (const [token, line] of named) {
      if (!declared.has(token)) {
        missing.push(
          at(
            "docs/design/visual-system.md",
            line,
            `${token} is named here but missing from src/styles/tokens.css`,
          ),
        )
      }
    }
    expect(format(missing)).toBe("")
  })

  it("names the four weights by job, not by number", () => {
    const structure = readFileSync(CSS_STRUCTURE, "utf8")
    for (const weight of [
      "--weight-body",
      "--weight-row",
      "--weight-emphasis",
      "--weight-title",
    ]) {
      expect(structure, `css-structure.md must still name ${weight}`).toContain(
        weight,
      )
      expect(declared, `tokens.css must declare ${weight}`).toContain(weight)
    }
    for (const byNumber of ["--weight-400", "--weight-500", "--weight-600", "--weight-700"]) {
      expect(declared).not.toContain(byNumber)
    }
  })
})

// The audit is only worth its place if it actually catches each violation, so
// each rule is exercised against a stylesheet written to break it.
describe("the audit catches what the table says it catches", () => {
  const detail = (v: Violation[]) => v.map((x) => `${x.file}:${x.line} ${x.detail}`)

  it("catches a literal # colour outside tokens.css", () => {
    const v = auditStylesheet("card.css", ".card {\n  color: #ff0000;\n}\n")
    expect(detail(v)).toEqual(["card.css:2 literal colour #ff0000 — only tokens.css may hold one"])
  })

  it("allows a literal # colour inside tokens.css", () => {
    expect(auditStylesheet("tokens.css", ":root {\n  --ink: #191817;\n}\n")).toEqual([])
  })

  it("catches a font-weight that is not a var()", () => {
    const v = auditStylesheet("card.css", ".card {\n  font-weight: 550;\n}\n")
    expect(v).toHaveLength(1)
    expect(v[0].line).toBe(2)
  })

  it("allows a font-weight that is a token, and a @font-face axis range", () => {
    expect(
      auditStylesheet("base.css", ".x {\n  font-weight: var(--weight-body);\n}\n"),
    ).toEqual([])
    expect(
      auditStylesheet(
        "base.css",
        '@font-face {\n  font-weight: 400 700;\n  src: url("/f.woff2");\n}\n',
      ),
    ).toEqual([])
  })

  it("catches a media query that is not min-width: 900px", () => {
    const v = auditStylesheet("tokens.css", "@media (max-width: 600px) {\n}\n")
    expect(v).toHaveLength(1)
    expect(v[0].line).toBe(1)
    expect(auditStylesheet("tokens.css", "@media (min-width: 900px) {\n}\n")).toEqual([])
  })

  it("catches a custom property declared outside tokens.css", () => {
    const v = auditStylesheet("card.css", ".card {\n  --card-ground: red;\n}\n")
    expect(v).toHaveLength(1)
    expect(v[0].line).toBe(2)
    expect(v[0].detail).toContain("--card-ground")
  })

  it("does not mistake a var() reference for a declaration", () => {
    expect(
      auditStylesheet("card.css", ".card {\n  color: var(--ink, var(--accent));\n}\n"),
    ).toEqual([])
  })

  it("catches a class whose block segment does not match its file name", () => {
    const v = auditStylesheet("plan.css", ".day-card {\n  margin: 0;\n}\n")
    expect(v).toHaveLength(1)
    expect(v[0].detail).toContain("block segment must be `plan`")
    expect(auditStylesheet("plan.css", ".plan-week {\n  margin: 0;\n}\n")).toEqual([])
    expect(auditStylesheet("day-card.css", ".day-card--today {\n  margin: 0;\n}\n")).toEqual([])
  })

  it("ignores everything inside a comment", () => {
    expect(
      auditStylesheet("card.css", "/* color: #fff; --x: 1; */\n.card {\n  margin: 0;\n}\n"),
    ).toEqual([])
  })

  it("reads a token from its declaring table row, not from prose", () => {
    const named = tokensNamedBy(
      [
        "| Token | Value |",
        "| `--rule-strong` | `#191817` |",
        "A card's border is `1px --rule-strong`, never `--rule-dashed`.",
      ].join("\n"),
    )
    expect([...named.keys()]).toEqual(["--rule-strong"])
    expect(named.get("--rule-strong")).toBe(2)
  })

  it("ignores a quoted string when looking for class selectors", () => {
    expect(auditStylesheet("index.css", '@import "./tokens.css";\n')).toEqual([])
  })
})
