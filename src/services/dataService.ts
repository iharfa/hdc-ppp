// Data access layer for the POC. All reads come from bundled JSON merged with
// localStorage edits; all writes go to localStorage. Swap these functions for
// API calls in the backend phase.
import recordsJson from "../data/participationRecords.json";
import placesJson from "../data/places.json";
import responsesJson from "../data/responses.json";
import commentsJson from "../data/comments.json";
import moderationJson from "../data/moderation.json";
import rolesJson from "../data/roles.json";
import workflowJson from "../data/workflow.json";
import proposalsJson from "../data/proposals.json";
import type {
  CanonicalPlace,
  CommunityProposal,
  ModerationItem,
  ParticipationRecord,
  Permission,
  PublicComment,
  Role,
  SurveyResponse,
  WorkflowStep,
} from "../types";
import {
  getCreatedRecords,
  getLocalProposals,
  getProposalOverrides,
  getSupportedIds,
  getHarmonizationLinks,
  getLocalSubmissions,
  getModerationOverrides,
  getRecordOverrides,
} from "./storage";

const seedRecords = recordsJson as unknown as ParticipationRecord[];
export const places = placesJson as unknown as CanonicalPlace[];
export const sampleResponses = responsesJson as unknown as SurveyResponse[];
export const cleanedComments = commentsJson as unknown as PublicComment[];
export const moderationItems = moderationJson as unknown as ModerationItem[];
export const workflowSteps = (workflowJson as unknown as WorkflowStep[]).slice().sort((a, b) => a.order - b.order);
export const roles = (rolesJson as { roles: Role[] }).roles;
export const permissions = (rolesJson as { permissions: Permission[] }).permissions;

/** All records: bundled sample records plus admin-created ones, with admin edits applied. */
export function getRecords(): ParticipationRecord[] {
  const overrides = getRecordOverrides();
  return [...seedRecords, ...getCreatedRecords()].map((r) => {
    const o = overrides[r.recordId];
    return o ? { ...r, ...o } : r;
  });
}

export function getRecord(recordId: string): ParticipationRecord | undefined {
  return getRecords().find((r) => r.recordId === recordId);
}

export function getPlace(canonicalPlaceId: string): CanonicalPlace | undefined {
  return places.find((p) => p.canonicalPlaceId === canonicalPlaceId);
}

export function getResponsesForRecord(recordId: string): SurveyResponse[] {
  const local = getLocalSubmissions().filter((r) => r.recordId === recordId);
  return [...sampleResponses.filter((r) => r.recordId === recordId), ...local];
}

export function getCommentsForRecord(recordId: string): PublicComment[] {
  return cleanedComments.filter((c) => c.recordId === recordId);
}

/** Moderation items with any localStorage decisions from the admin queue applied. */
export function getEffectiveModeration(): ModerationItem[] {
  const overrides = getModerationOverrides();
  return moderationItems.map((item) => {
    const o = overrides.find((x) => x.itemId === item.itemId);
    return o ? { ...item, status: o.status, moderatorNote: o.moderatorNote ?? item.moderatorNote } : item;
  });
}

export function getModerationForRecord(recordId: string): ModerationItem[] {
  return getEffectiveModeration().filter((m) => m.recordId === recordId);
}

/** Canonical place ID for a record, honouring manual re-links saved from the ID harmonization screen. */
export function effectivePlaceId(record: ParticipationRecord): string {
  return getHarmonizationLinks().find((l) => l.recordId === record.recordId)?.canonicalPlaceId ?? record.canonicalPlaceId;
}

/** Next record ID in the HDC-PP-<year>-<nnn> series. */
export function nextRecordId(): string {
  const year = new Date().getFullYear();
  const max = getRecords().reduce((m, r) => Math.max(m, Number(r.recordId.slice(-3)) || 0), 0);
  return `HDC-PP-${year}-${String(max + 1).padStart(3, "0")}`;
}

// ---- Community proposals ----

const seedProposals = proposalsJson as unknown as CommunityProposal[];

/** Sample proposals plus ones submitted in this browser, with staff decisions and local supports applied. */
export function getProposals(): CommunityProposal[] {
  const overrides = getProposalOverrides();
  const supported = new Set(getSupportedIds());
  return [...seedProposals, ...getLocalProposals()]
    .map((p) => {
      const o = overrides[p.proposalId];
      const merged = o ? { ...p, ...o } : p;
      return supported.has(p.proposalId) ? { ...merged, supports: merged.supports + 1 } : merged;
    })
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function getProposal(proposalId: string): CommunityProposal | undefined {
  return getProposals().find((p) => p.proposalId === proposalId);
}

export function nextProposalId(): string {
  const year = new Date().getFullYear();
  const max = getProposals().reduce((m, p) => Math.max(m, Number(p.proposalId.slice(-3)) || 0), 0);
  return `IDEA-${year}-${String(max + 1).padStart(3, "0")}`;
}

export function countBy<T>(items: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}
