import { PageLayout, SplitPanel } from "@/components/app";
import { SettingsNav } from "@/components/app/settings-nav";
import { MotionPage } from "@/components/ui/motion";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionPage>
      <PageLayout size="wide">
        <SplitPanel sidebar="left" sidebarWidth="sm">
          <SettingsNav />
          <div className="min-w-0">{children}</div>
        </SplitPanel>
      </PageLayout>
    </MotionPage>
  );
}
