import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { getGovernanceOverview } from "@/lib/governance";
import { OrganizationPanel } from "./_components/organization-panel";

export default async function DashboardTestPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }

  let overview;
  try {
    overview = await getGovernanceOverview();
  } catch {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Không tải được dữ liệu governance. Kiểm tra API aelc-platform có đang chạy không.
        </CardContent>
      </Card>
    );
  }

  if (overview.organizations.length === 0) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Chưa có dữ liệu — kiểm tra sync job đã cấu hình CONSUMER_API_BASE_URL/CONSUMER_API_TOKEN chưa.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {overview.organizations.map((organization) => (
        <OrganizationPanel key={organization.organizationId} organization={organization} />
      ))}
    </div>
  );
}
