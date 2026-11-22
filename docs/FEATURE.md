read docs/LEARNING_PLAN.md completely before doing anything. it is the spec: section 1 decisions are settled and section 9 hard constraints are binding for every phase. wherever the plan says LEARNING_PLAN.md, it means docs/LEARNING_PLAN.md.

note on docs/: the older markdown notes (including docs/seo-findings.md and docs/seo-verification.md, which the plan calls "historical docs left as written") were moved to docs/deprecated/. leave them there, untouched. new docs from this work go in docs/ itself: docs/learning-findings.md, docs/renderer.md, docs/learning-verification.md.

first run `git status` and show me the output. if the working tree is dirty with anything other than the docs reorganisation (the moves into docs/deprecated/ and the new docs/LEARNING_PLAN.md), stop and tell me. otherwise commit the reorganisation on its own after you create the branch, with the message "docs: archive deprecated markdown, add LEARNING_PLAN".

create the branch: git switch -c learning seo-prerender. if that fails, stop and tell me.

do PHASE 0 ONLY. this phase is read-only: the only file you may create is docs/learning-findings.md. no other edits, no installs that change package.json or the lockfile.

deliver, in docs/learning-findings.md:
1. verification of every claim in section 2, with file:line. correct anything that is wrong.
2. how Clippy works today (src/lib/clippy, public/Clippy.png, the clippy:hid signal) and how the summon dialogue can reuse it without forking it.
3. the tsconfig.json / tsconfig.node.json changes needed so build/ can import from src/renderer/.
4. the include strategy decision from section 4 (async runtime fetch vs reference-driven inlining for pages in src/content), with evidence: which pages use include directives today, and how.
5. the mdSection nesting design for the hint:/advice:/ref: heading convention, including how fenced code blocks are skipped.
6. the complete list of files each later phase will touch.

then STOP and show me a short summary. do not begin phase 1.
