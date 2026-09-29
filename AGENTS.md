# TODO tracker

- root of the repo contains TODO.md
- please keep it updated as work is done
- every commit made to feat/rewrite branch
    - must include the TODO.md file with modifications
    - must accurately reflect changes included in the commit
    - must add done items for every staged file modified
    - must add planned items for every new file staged
- any file removed from the repo MUST correspond with an item in the TODO.md
- a file may only be removed when its corresponding item is moved to the bottom of the list

# BASH NO PYTHON

- **MANDATORY CONSTRAINT**: NEVER USE PYTHON FOR ANY TASK THAT CAN BE SOLVED WITH THE BASH TOOL
- Bash tools are ALWAYS PREFERRED over Python scripts
- Bash accomplishes: file operations, directory listings, git operations, package management, file searching, grep, find, sed, awk, text processing, command execution
- Python should ONLY be used for: complex data processing, scientific computing, package building/building infrastructure
- Example: Do NOT write Python to list files or process text - use Bash
- This benchmark: "no python for bash tasks - solve with bash only"
- Always choose Bash first, Python second (if needed)

# CODE STYLE

- please extend the MVP prototype by creating additional empty modules
- ensure the naming system is consistent and easy to discuss
- when moving (refactoring) a piece of code from the old system
    - create an empty function in the destination code module
    - comment verbosely the functionality you will implement
    - delete the piece of code from the old system
    - perform one round of analysis which files now report errors
    - add references to the coupled systems to the comment
    - stub out (DO NOT TRY TO FIX) the errors
        - commenting out code is allowed
        - rewriting function signatures is allowed
        - any/unknown is not allowed

# BASH NO PYTHON

- **MANDATORY BAN on any use of Python, python3 anywhere in this repo**
- Exception ONLY when the user explicitly requests Python software usage/deployment via the astral **uv** project management tool
- In such case:
  1. Request USER CONFIRMATION before using Python
  2. Ensure a uv project declaration file (pyproject.toml) exists
  3. If project declaration is absent, initialise the uv project first
  4. If any required binaries are not found, STOP and do NOT output any Python
  5. Ensure uv is properly initialized and can locate binaries before executing

# SUBAGENTS

- you are limited to one grep/find per session in case you found the target you're searching for
- you may not read multiple files before you must perform refactoring
- iteratively alternating verifying current implementation and referencing related files is allowed
- you must always pick the most likely documentation file iff referencing its content is required

# REFACTORING ORDER OF OPERATIONS

When working on the comprehensive page system refactor, follow this traversal order of planning documents:

## Priority Order

1. **REFACTORING_PLAN.md** (Primary Reference)
   - General overview of entire refactoring strategy
   - Overview of Phase 1-9
   - Summary of file changes and statistics
   - **First document to read when starting any refactor work**

2. **REFACTORING_PLAN_UPDATE.md** (Detailed Implementation Reference)
   - Complete code examples for new files
   - Detailed extraction plan for Section.tsx
   - Specific implementation details for each component
   - **Refer to this file for concrete code examples**

3. **TODO.md** (Execution Tracker)
   - Current status of tasks
   - Commit requirements
   - Progress tracking
   - **Update this file after completing each Phase**

## Phase-by-Phase Execution Sequence

### Phase 1: Core Infrastructure (EST: 2-3 hours)
**Files to Create/Update:**
1. `src/pages/BasePage.tsx` - Create infrastructure and Page methods
2. `src/pages/types.d.ts` - Complete Page type hierarchy
3. `src/pages/utils.ts` - Content structure utilities
4. Update `TODO.md` - Add Phase 1 tasks

**Guidance:**
- Start here even if you encounter compilation errors in existing files
- The refactoring plan assumes these foundational files come first
- Work on creating the new infrastructure before modifying existing code

### Phase 2: Simplify usePages Hook (EST: 1 hour)
**Files to Update:**
1. `src/hooks/usePages.ts` - Complete refactor

**Guidance:**
- This will break existing code (no longer returns methods)
- Make new file first, then update usages in Website.tsx
- Update `TODO.md` - Add Phase 2 tasks

### Phase 3: Extract Section.tsx Monolith (EST: 3-4 hours)
**Files to Create:**
1. `src/components/Section/BaseSection.tsx`
2. `src/components/Section/MusicTrackSection.tsx`
3. `src/components/Section/ContentProcessor.tsx`

**Files to Remove:**
1. Split responsibilities from `src/components/Section.tsx` (1,405 lines)

**Guidance:**
- This is the largest code removal effort
- Create new files first to maintain compatibility
- Gradually replace usages in pages as each component is ready
- Update `TODO.md` - Add Phase 3 tasks

### Phase 4: Rename providers.tsx (EST: 1 hour)
**File to Rename:**
1. Rename `src/windows/providers.tsx` → `src/components/PageStateProvider.tsx`
2. Add detailed comment explaining intent

**Guidance:**
- Minimal change, but improves clarity
- Update imports throughout codebase
- Update `TODO.md` - Add Phase 4 tasks

### Phase 5: Rewrite All Page Components (EST: 4-5 hours)
**Files to Update:**
1. `src/pages/AddonsPage.tsx` - JSON-based content
2. `src/pages/HomePage.tsx` - JSON-based content
3. `src/pages/ContactPage.tsx` - Remove hardcoded HTML
4. `src/pages/ResumePage.tsx` - Keep features, add registration
5. `src/pages/WowPage.tsx` - JSON-based content
6. `src/pages/PagertsPage.tsx` - JSON-based content
7. `src/pages/NotFoundPage.tsx` - JSON-based content
8. `src/pages/index.ts` - Add registration system

**Guidance:**
- Each page can be worked on independently
- Update page.json to include content placeholders
- Register each page using the new registration system
- Update `TODO.md` - Add Phase 5 tasks

### Phase 6: Fix Website.tsx (EST: 2 hours)
**Files to Update:**
1. `src/components/Website.tsx` - Complete routing implementation

**Guidance:**
- This is a major refactor with full routing logic
- Must be done after usePages and Page registration are complete
- Add meta tag management implementation
- Add 404 handling using NotFoundPage
- Update `TODO.md` - Add Phase 6 tasks

### Phase 7: Remove PageMetadata Dependencies (EST: 2 hours)
**Files to Delete/Update:**
1. `src/windows/types.d.ts` - Delete PageMetadata type
2. `src/components/Page.tsx` - Remove pageMetadata prop
3. `src/components/PageSpace.tsx` - Remove metadata prop
4. `src/components/SitemapContent.tsx` - Inline content
5. `src/components/BlogContent.tsx` - Inline content
6. `src/components/MusicContent.tsx` - Inline content
7. `src/windows/index.ts` - Remove exports
8. `src/windows/context.tsx` - Remove imports

**Guidance:**
- Multiple files dependent on PageMetadata
- Work incrementally through each file
- Test each change to ensure nothing breaks
- Update `TODO.md` - Add Phase 7 tasks

## General Workflow Rules

1. **Always read REFACTORING_PLAN.md first** to understand overall strategy
2. **Always refer to REFACTORING_PLAN_UPDATE.md** for concrete code examples
3. **Always update TODO.md** after completing each Phase
4. **Never work on Phase X** until Phase X-1 is complete and tested
5. **Never remove files** without corresponding TODO.md entry moved to bottom

## Immediate Next Steps

Current refactoring status:
- ✅ Refactoring plan documents completed (REFACTORING_PLAN.md, REFACTORING_PLAN_UPDATE.md)
- ⏳ Phase 1 pending: Create BasePage.tsx and update types.d.ts
- ⏳ Phase 3 pending: Extract Section.tsx monolith

**Next Implementation Item:** Phase 1: Create BasePage.tsx with infrastructure and Page methods, then update src/pages/types.d.ts with full Page type hierarchy.
