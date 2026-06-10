// Data access layer for the POC. All reads come from bundled JSON; all writes go
// to localStorage. Swap these functions for API calls in the backend phase.
import recordsJson from "../data/participationRecords.json";
import placesJson from "../data/places.json";
import responsesJson from "../data/responses.json";
import commentsJson from "../data/comments.json";
import moderationJson from "../data/moderation.json";
import rolesJson from "../data/roles.json";
import workflowJson from "../data/workflow.json";
import type {
  CanonicalPlace,
  ModerationItem,
  ParticipationRecord,
  Permission,
  PublicComment,
  Role,
  SurveyResponse,
  WorkflowStep,
} from "../types";
import { getLocalSubmissions } from "./storage";

export const records = recordsJson as unknown as ParticipationRecord[];
export const places = placesJson as unknown as CanonicalPlace[];
export const sampleResponses = responsesJson as unknown as SurveyResponse[];
export const cleanedComments = commentsJson as unknown as PublicComment[];
export const moderationItems = moderationJson as unknown as ModerationItem[];
export const workflowSteps = (workflowJson as unknown as WorkflowStep[]).slice().sort((a, b) => a.order - b.order);
export const roles = (rolesJson as { roles: Role[] }).roles;
export const permissions = (rolesJson as { permissions: Permission[] }).permissions;

export function getRecord(recordId: string): ParticipationRecord | undefined {
  return records.find((r) => r.recordId === recordId);
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

export function getModerationForRecord(recordId: string): ModerationItem[] {
  return moderationItems.filter((m) => m.recordId === recordId);
}

export function countBy<T>(items: T[], key: (item: T) => string): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, value]) => ({ name, value }));
}
