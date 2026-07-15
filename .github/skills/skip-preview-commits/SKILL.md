---
name: skip-preview-commits
description: 'Ensure git commit messages include [skip preview]. Use when creating, amending, or validating commits before push/deploy. Handles commit, amend, and message checks with safe verification.'
argument-hint: 'Commit message or commit range to validate'
user-invocable: true
---

# Skip Preview Commits

## Outcome
Apply a consistent commit-message policy so all commits include the token [skip preview].

## When To Use
- Before pushing commits that should skip preview workflows
- When creating a new commit and you must enforce the token
- When reviewing recent commits for policy compliance
- When fixing a missing token in the latest local commit message

## Procedure
1. Inspect the target commit message.
2. If [skip preview] is already present, leave the commit STABLE.
3. If creating a new commit, append [skip preview] to the message.
4. If fixing the latest local commit only, amend with the corrected message.
5. Verify the final commit subject contains [skip preview].
6. Push changes using repository-safe strategy (respect branch protection).

## Command Patterns
- New commit:
  - git commit -m "<message> [skip preview]"
- Check latest subject:
  - git log -1 --pretty=%s
- Amend latest local commit message:
  - git commit --amend -m "<message> [skip preview]"
- Validate multiple commits:
  - git log --pretty=%h%x09%s -n <N>

## Decision Points
- Protected branch blocks force-push:
  - Do not rewrite remote history.
  - Add a follow-up compliant commit instead, or use an approved PR flow.
- Diverged history while pulling:
  - Prefer rebase for a linear history before push.

## Completion Checks
- Latest relevant commit subject includes [skip preview].
- Working tree status is expected (clean or intentionally staged).
- Remote update method follows branch protection rules.

## Notes
This skill standardizes commit text policy. If you want automatic enforcement on every commit, add a repository hook next.
