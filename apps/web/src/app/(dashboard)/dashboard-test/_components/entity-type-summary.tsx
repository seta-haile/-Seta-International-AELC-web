import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GovernanceOverviewOrganization } from "@/lib/governance";

const ENTITY_TYPE_LABELS: Record<keyof GovernanceOverviewOrganization["records"], string> = {
  usage: "Usage",
  activity: "Activity",
  relation: "Relation",
  attribution_link: "Attribution Link",
};

export function EntityTypeSummary({ records }: { records: GovernanceOverviewOrganization["records"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {(Object.keys(ENTITY_TYPE_LABELS) as Array<keyof typeof ENTITY_TYPE_LABELS>).map((entityType) => (
        <Card key={entityType} size="sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {ENTITY_TYPE_LABELS[entityType]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight">
              {records[entityType].records.length < records[entityType].totalCount
                ? `${records[entityType].records.length} of ${records[entityType].totalCount}`
                : records[entityType].totalCount}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
