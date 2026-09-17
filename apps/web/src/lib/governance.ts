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

export interface GovernanceOverviewOrganization {
  organizationId: string;
  records: {
    usage: GovernanceOverviewRecord[];
    activity: GovernanceOverviewRecord[];
    relation: GovernanceOverviewRecord[];
    attribution_link: GovernanceOverviewRecord[];
  };
  completeness: GovernanceOverviewCompleteness | null;
  lastSyncedAt: string | null;
}

export interface GovernanceOverview {
  organizations: GovernanceOverviewOrganization[];
}

export async function getGovernanceOverview(): Promise<GovernanceOverview> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/governance/overview`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load governance overview: ${res.status}`);
  }
  return res.json();
}
