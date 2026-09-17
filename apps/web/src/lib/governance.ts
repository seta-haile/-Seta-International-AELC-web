import { cookies } from "next/headers";

export interface GovernanceOverviewRecord {
  entityId: string;
  scopeInstallationId: string | null;
  latestRevision: number;
  isTombstone: boolean;
  occurredAt: string;
  payload: Record<string, unknown> | null;
  syncedAt: string;
}

export interface GovernanceOverviewCompleteness {
  complete: boolean;
  reasons: string[];
  counts: {
    dataGap: number;
    canonicalConflict: number;
    revisionGap: number;
    permanentRejection: number;
  };
  occurredFrom: string;
  occurredTo: string;
  syncedAt: string;
}

export interface GovernanceOverviewEntityTypeRecords {
  records: GovernanceOverviewRecord[];
  totalCount: number;
}

export interface GovernanceOverviewOrganization {
  organizationId: string;
  records: {
    usage: GovernanceOverviewEntityTypeRecords;
    activity: GovernanceOverviewEntityTypeRecords;
    relation: GovernanceOverviewEntityTypeRecords;
    attribution_link: GovernanceOverviewEntityTypeRecords;
  };
  completeness: GovernanceOverviewCompleteness | null;
  lastSyncedAt: string | null;
}

export interface GovernanceOverview {
  organizations: GovernanceOverviewOrganization[];
}

export async function getGovernanceOverview(): Promise<GovernanceOverview> {
  const token = (await cookies()).get("session")?.value;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/governance/overview`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load governance overview: ${res.status}`);
  }
  return res.json();
}
