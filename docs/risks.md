# Project Risks

## Product Risks

- Generic positioning: mitigate by starting with 2 or 3 segments.
- Low perceived value: sell business routines, not AI features.
- Poor RAG quality: show sources and allow insufficient-context answers.
- Integrations slowing MVP: start with upload and generic webhook.

## Technical Risks

- Tenant data leakage: use RLS from day one and test user A versus user B.
- AI cost hurting margin: enforce plan limits, use cheaper models for simple jobs, and sell credit packs.
- Business rules in React: keep permission and usage checks server-side.
- Provider lock-in: keep model/provider config outside UI components.

## Commercial Risks

- PMEs may prefer ChatGPT Team: position BEM HUB as process and document workspace for SMB operations.
- Payment gateway complexity: begin with manual subscription state if needed.
- Support burden: templates and onboarding must be narrow in the first pilots.
