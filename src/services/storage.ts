// localStorage persistence for mock survey submissions, admin edits, and
// moderation decisions. Replace with secure backend storage in production.
import type { ModerationItem, SurveyResponse } from "../types";

const SUBMISSIONS_KEY = "hdc-ppp-submissions";
const MODERATION_KEY = "hdc-ppp-moderation-overrides";
const HARMONIZATION_KEY = "hdc-ppp-harmonization-links";
const DRAFTS_KEY = "hdc-ppp-admin-drafts";

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

export interface AdminDraft {
  draftId: string;
  title: string;
  participationType: string;
  summary: string;
  locationName: string;
  createdAt: string;
}

export function getAdminDrafts(): AdminDraft[] {
  return read<AdminDraft[]>(DRAFTS_KEY, []);
}

export function saveAdminDraft(draft: AdminDraft): void {
  write(DRAFTS_KEY, [...getAdminDrafts(), draft]);
}
