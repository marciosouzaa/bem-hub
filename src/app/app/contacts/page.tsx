import { PageLayout } from "@/components/app";
import { listContacts } from "@/features/contacts/contact-queries";
import { ContactsWorkspace } from "@/features/contacts/contacts-workspace";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { listTags } from "@/features/tags/tag-queries";

export default async function ContactsPage() {
  const workspace = await getRequiredWorkspace();
  const [contacts, tags] = await Promise.all([
    listContacts(workspace.organization.id),
    listTags(workspace.organization.id),
  ]);

  return (
    <PageLayout className="space-y-7" size="wide">
      <ContactsWorkspace contacts={contacts} tags={tags} />
    </PageLayout>
  );
}
