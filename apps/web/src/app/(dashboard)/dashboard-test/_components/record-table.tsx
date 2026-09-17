import type { GovernanceOverviewRecord } from "@/lib/governance";

export function RecordTable({ records }: { records: GovernanceOverviewRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">Chưa có bản ghi nào.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs font-medium text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Entity ID</th>
            <th className="px-3 py-2">Installation</th>
            <th className="px-3 py-2">Revision</th>
            <th className="px-3 py-2">Occurred at</th>
            <th className="px-3 py-2">Tombstone</th>
            <th className="px-3 py-2">Payload</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {records.map((record) => (
            <tr key={`${record.entityId}-${record.scopeInstallationId ?? "none"}`}>
              <td className="px-3 py-2 font-mono text-xs">{record.entityId}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {record.scopeInstallationId ?? "—"}
              </td>
              <td className="px-3 py-2">{record.latestRevision}</td>
              <td className="px-3 py-2 text-muted-foreground">{record.occurredAt}</td>
              <td className="px-3 py-2">{record.isTombstone ? "yes" : "no"}</td>
              <td className="px-3 py-2 max-w-xs truncate font-mono text-xs text-muted-foreground">
                {record.payload ? JSON.stringify(record.payload) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
