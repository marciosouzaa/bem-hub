# MVP Definition

## In Scope

1. Authentication and multi-company
   - Supabase Auth.
   - Organizations and members.
   - Roles: owner, admin, member.
   - RLS by `organization_id`.

2. AI chat
   - Chat interface.
   - Conversation history.
   - Assistant selection.
   - Streaming response through API route.
   - Usage events for tokens and requests.

3. Custom assistants
   - Name, description, area, instructions, model, temperature.
   - Organization ownership.
   - Basic access rules.

4. Knowledge base
   - Upload PDF, DOCX, TXT, and Markdown.
   - Store files in Supabase Storage.
   - Extract text, chunk content, create embeddings, and search with pgvector.
   - Cite document sources in answers.

5. Manual automations
   - Summarize document.
   - Generate client reply.
   - Create report.
   - Analyze spreadsheet.
   - Generate checklist.
   - Convert meeting notes to tasks.

6. Billing foundation
   - Free, Starter, Pro, Business plans.
   - Usage limits by organization.
   - Manual or mocked payment state at first.

## Out of Scope

- Autonomous agents.
- WhatsApp.
- CRM/ERP integrations.
- Recurring scheduled automations.
- Marketplace and templates premium.
- White-label.
- Very granular permission matrix.
