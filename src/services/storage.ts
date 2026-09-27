// localStorage persistence for mock survey submissions, admin edits, and
// moderation decisions. Replace with secure backend storage in production.
import type { CommunityProposal, ModerationItem, ParticipationRecord, SurveyResponse } from "../types";

const SUBMISSIONS_KEY = "hdc-ppp-submissions";
const MODERATION_KEY = "hdc-ppp-moderation-overrides";
const HARMONIZATION_KEY = "hdc-ppp-harmonization-links";
const RECORD_OVERRIDES_KEY = "hdc-ppp-record-overrides";
const CREATED_RECORDS_KEY = "hdc-ppp-created-records";
const PROPOSALS_KEY = "hdc-ppp-proposals";
const PROPOSAL_OVERRIDES_KEY = "hdc-ppp-proposal-overrides";
const PROPOSAL_SUPPORTS_KEY = "hdc-ppp-proposal-supports";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable (private mode, quota) - POC silently degrades.
  }
}

export function getLocalSubmissions(): SurveyResponse[] {
  return read<SurveyResponse[]>(SUBMISSIONS_KEY, []);
}

export function saveSubmission(response: SurveyResponse): void {
  write(SUBMISSIONS_KEY, [...getLocalSubmissions(), response]);
}

export type ModerationOverride = Pick<ModerationItem, "itemId" | "status" | "moderatorNote">;

export function getModerationOverrides(): ModerationOverride[] {
  return read<ModerationOverride[]>(MODERATION_KEY, []);
}

export function saveModerationOverride(override: ModerationOverride): void {
  const rest = getModerationOverrides().filter((o) => o.itemId !== override.itemId);
  write(MODERATION_KEY, [...rest, override]);
}

export interface HarmonizationLink {
  recordId: string;
  canonicalPlaceId: string;
  linkedAt: string;
}

export function getHarmonizationLinks(): HarmonizationLink[] {
  return read<HarmonizationLink[]>(HARMONIZATION_KEY, []);
}

export function saveHarmonizationLink(link: HarmonizationLink): void {
  const rest = getHarmonizationLinks().filter((l) => l.recordId !== link.recordId);
  write(HARMONIZATION_KEY, [...rest, link]);
}

// ---- Admin edits to records (workflow stage, status, decision, survey, timeline) ----

export type RecordOverride = Partial<ParticipationRecord> & { recordId: string };

export function getRecordOverrides(): Record<string, RecordOverride> {
  return read<Record<string, RecordOverride>>(RECORD_OVERRIDES_KEY, {});
}

/** Merge a partial edit into the stored override for one record. */
export function saveRecordOverride(patch: RecordOverride): void {
  const all = getRecordOverrides();
  all[patch.recordId] = { ...all[patch.recordId], ...patch };
  write(RECORD_OVERRIDES_KEY, all);
}

/** Records created from the admin "Create record" form (full records, not drafts). */
export function getCreatedRecords(): ParticipationRecord[] {
  return read<ParticipationRecord[]>(CREATED_RECORDS_KEY, []);
}

export function saveCreatedRecord(record: ParticipationRecord): void {
  const rest = getCreatedRecords().filter((r) => r.recordId !== record.recordId);
  write(CREATED_RECORDS_KEY, [...rest, record]);
}

// ---- Community proposals ----

/** Proposals submitted from this browser (with downscaled images inline). */
export function getLocalProposals(): CommunityProposal[] {
  return read<CommunityProposal[]>(PROPOSALS_KEY, []);
}

/** Returns false when localStorage refuses (usually quota from too many photos). */
export function saveLocalProposal(p: CommunityProposal): boolean {
  const rest = getLocalProposals().filter((x) => x.proposalId !== p.proposalId);
  try {
    localStorage.setItem(PROPOSALS_KEY, JSON.stringify([...rest, p]));
    return true;
  } catch {
    return false;
  }
}

export type ProposalOverride = Partial<CommunityProposal> & { proposalId: string };

export function getProposalOverrides(): Record<string, ProposalOverride> {
  return read<Record<string, ProposalOverride>>(PROPOSAL_OVERRIDES_KEY, {});
}

export function saveProposalOverride(patch: ProposalOverride): void {
  const all = getProposalOverrides();
  all[patch.proposalId] = { ...all[patch.proposalId], ...patch };
  write(PROPOSAL_OVERRIDES_KEY, all);
}

/** IDs this browser has supported (one support per browser per idea in the POC). */
export function getSupportedIds(): string[] {
  return read<string[]>(PROPOSAL_SUPPORTS_KEY, []);
}

export function toggleSupport(proposalId: string): boolean {
  const ids = getSupportedIds();
  const on = !ids.includes(proposalId);
  write(PROPOSAL_SUPPORTS_KEY, on ? [...ids, proposalId] : ids.filter((i) => i !== proposalId));
  return on;
}
