import { redirect } from "next/navigation";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const params = await searchParams;
  const suffix = params.feature
    ? `?feature=${encodeURIComponent(params.feature)}`
    : "";

  redirect(`/app/settings/billing${suffix}`);
}
