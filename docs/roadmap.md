# Roadmap

## 0-30 Days: SaaS Foundation

- Create Next.js app and base UI.
- Configure Supabase Auth.
- Create organizations and members.
- Enable RLS and tenant isolation.
- Build private app layout.
- CRUD assistants.
- Implement chat with streaming and history.
- Register basic usage events.

Acceptance: a user creates a company, creates an assistant, and chats inside the workspace.

## 31-60 Days: Company Knowledge

- Upload documents to Supabase Storage.
- Extract text from PDF, DOCX, TXT, and Markdown.
- Chunk and embed content.
- Store vectors with pgvector.
- Search by similarity.
- Answer using retrieved context.
- Show sources used in the answer.

Acceptance: a company uploads internal docs and receives answers grounded in those docs.

## 61-90 Days: Commercial MVP

- Manual automation templates.
- Automation run history.
- Plan limits and usage enforcement.
- Subscription screen.
- First payment gateway integration.
- Generic webhook integration.
- Basic audit log.
- Guided onboarding for pilots.

Acceptance: product is demoable, billable, and usable by the first paying pilots.
