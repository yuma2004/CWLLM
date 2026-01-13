# Working Agreements (Global)

## Refactor safety
- Preserve behavior. No feature changes, no logic “improvements”, no API changes unless explicitly requested.
- No new runtime dependencies. If needed, propose and stop.
- Avoid repo-wide formatting or broad renames/moves.
- Keep diffs small and reviewable. Prefer 1 task = 1 commit.

## Execution
- When tests exist, run them after changes. If you cannot run commands, print exact commands to run.
- If baseline tests fail before changes, do not “fix” them as part of refactor. Report and stop.

## Communication style
- No long preambles. Be concise and output artifacts (files) instead of verbose planning in chat.
