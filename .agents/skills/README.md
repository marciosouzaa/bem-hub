# Project Skills

This directory contains project-level skills used by Codex and compatible agents.

Skills installed with `npx skills add` are tracked in `skills-lock.json` so they
can be restored from their original source.

`frontend-patterns` was copied from another project and its upstream source is
unknown. Keep it versioned in this repository as a vendored project skill. It is
expected to work locally even though it is not listed in `skills-lock.json`.

`bem-hub-orientation` is a local project skill for starting or resuming BEM HUB
sessions. It summarizes which project docs to read, the current handoff state,
and the recommended next implementation step.
