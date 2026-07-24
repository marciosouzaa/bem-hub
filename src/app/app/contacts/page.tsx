import { PageLayout } from "@/components/app";
import { listContacts } from "@/features/contacts/contact-queries";
import { ContactsWorkspace } from "@/features/contacts/contacts-workspace";
import { getRequiredWorkspace } from "@/features/organizations/queries";

export default async function ContactsPage() {
  const workspace = await getRequiredWorkspace();
  const contacts = await listContacts(workspace.organization.id);

  return (
    <PageLayout className="space-y-7" size="wide">
      <ContactsWorkspace contacts={contacts} />
    </PageLayout>
  );
}
