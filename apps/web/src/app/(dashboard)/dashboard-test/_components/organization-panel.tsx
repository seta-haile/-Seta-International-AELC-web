import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GovernanceOverviewOrganization } from "@/lib/governance";
import { CompletenessPanel } from "./completeness-panel";
import { EntityTypeSummary } from "./entity-type-summary";
import { RecordTable } from "./record-table";

const ENTITY_TYPE_LABELS: Record<keyof GovernanceOverviewOrganization["records"], string> = {
  usage: "Usage",
  activity: "Activity",
  relation: "Relation",
  attribution_link: "Attribution Link",
};

export function OrganizationPanel({ organization }: { organization: GovernanceOverviewOrganization }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-mono text-sm">{organization.organizationId}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Đồng bộ lần cuối: {organization.lastSyncedAt ?? "chưa có"}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <EntityTypeSummary records={organization.records} />
        <CompletenessPanel completeness={organization.completeness} />
        {(Object.keys(ENTITY_TYPE_LABELS) as Array<keyof typeof ENTITY_TYPE_LABELS>).map((entityType) => (
          <div key={entityType} className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{ENTITY_TYPE_LABELS[entityType]}</h3>
            <RecordTable records={organization.records[entityType]} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
