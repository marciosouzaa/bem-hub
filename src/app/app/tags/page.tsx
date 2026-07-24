import { PageLayout } from "@/components/app";
import { getRequiredWorkspace } from "@/features/organizations/queries";
import { listTags } from "@/features/tags/tag-queries";
import { TagsWorkspace } from "@/features/tags/tags-workspace";

export default async function TagsPage() {
  const workspace = await getRequiredWorkspace();
  const tags = await listTags(workspace.organization.id);

  return (
    <PageLayout className="space-y-7" size="wide">
      <TagsWorkspace tags={tags} />
    </PageLayout>
  );
}
