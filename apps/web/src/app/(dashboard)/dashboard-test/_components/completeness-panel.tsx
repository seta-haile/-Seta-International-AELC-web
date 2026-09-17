import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GovernanceOverviewCompleteness } from "@/lib/governance";

export function CompletenessPanel({ completeness }: { completeness: GovernanceOverviewCompleteness | null }) {
  if (!completeness) {
    return (
      <Card size="sm">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Đang chờ đồng bộ completeness.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Completeness — {completeness.complete ? "đầy đủ" : "chưa chắc đầy đủ"}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
        <p>Khoảng: {completeness.occurredFrom} → {completeness.occurredTo}</p>
        {completeness.reasons.length > 0 && <p>Lý do: {completeness.reasons.join(", ")}</p>}
        <p>
          Data gap: {completeness.counts.dataGap} · Canonical conflict: {completeness.counts.canonicalConflict} ·
          Revision gap: {completeness.counts.revisionGap} · Permanent rejection: {completeness.counts.permanentRejection}
        </p>
        <p>Đồng bộ lúc: {completeness.syncedAt}</p>
      </CardContent>
    </Card>
  );
}
