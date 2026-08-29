# Prototype: screens and navigation (issue #6)

**Throwaway.** Not production code, not a design system, not a stack decision.
Open `index.html` in a browser — no build, no server, no install.

Three variants of the whole app on one page, switchable with the black pill at
the bottom, the `←` / `→` keys, or `?variant=A|B|C`. Each variant has all four
surfaces: plan, catalogue, history, accounts.

| Variant | Front door                                        | Navigation      | Catalogue                       |
| ------- | ------------------------------------------------- | --------------- | ------------------------------- |
| A       | Big **today** card, rest of the week as thin rows  | Bottom tab bar  | One screen, three sections      |
| B       | **All seven days** as cards, today outlined        | Top segmented   | One screen, three accordions    |
| C       | **One day** fills the screen, paged by a day strip | Hamburger drawer | Three screens behind a chooser  |

Stub data only, in memory: the 21-dish seed catalogue from #5, three members,
today pinned to Wednesday. Nothing persists across a reload.

Generating and regenerating really run #5's rules, so the awkward cases are
reachable rather than described. The `ES`/`EN` toggle in each header is a
placeholder for #4, not a proposal for how bilingual works.
