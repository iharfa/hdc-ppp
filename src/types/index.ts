// Core data models for the HDC Public Participation Portal POC.
// These mirror the future backend schema so a real API can replace local JSON later.

export type ParticipationStatus =
  | "Ongoing"
  | "Completed"
  | "Planned"
  | "Internal Review"
  | "Closed";

export type ParticipationType =
  | "Public consultation"
  | "Survey"
  | "Development notice"
  | "Design feedback"
  | "Planning disclosure"
  | "Environmental and social feedback"
  | "Road and mobility feedback"
  | "Public space feedback";

export type VerificationMode = "Anonymous" | "eFaas verified" | "Anonymous or eFaas";

export type PlaceType =
  | "plot"
  | "building"
  | "road"
  | "park"
  | "public space"
  | "waterfront"
  | "development area";

export type GeometryType = "point" | "line" | "polygon";

export interface GeoPoint {
  type: "point";
  coordinates: [number, number]; // [lon, lat]
}
export interface GeoLine {
  type: "line";
  coordinates: [number, number][];
}
export interface GeoPolygon {
  type: "polygon";
  coordinates: [number, number][][]; // rings
}
export type Geometry = GeoPoint | GeoLine | GeoPolygon;

export interface PlaceAlias {
  aliasType:
    | "estatePlotId"
    | "planningPlotId"
    | "gisObjectId"
    | "landUseCode"
    | "buildingId"
    | "projectId"
    | "roadSegmentId"
    | "publicSpaceId"
    | "oldPlotReference"
    | "informalName";
  value: string;
  sourceDepartment: string;
  sourceSystem: string;
  sourceId: string;
  confidenceScore: number; // 0..1
  matchStatus: "confirmed" | "ambiguous" | "unresolved";
  notes?: string;
}

export interface CanonicalPlace {
  canonicalPlaceId: string;
  displayName: string;
  placeType: PlaceType;
  geometryType: GeometryType;
  geometry: Geometry;
  aliases: PlaceAlias[];
  notes?: string;
}

export type SurveyQuestionType =
  | "demographic"
  | "yesno"
  | "multiplechoice"
  | "opentext"
  | "mappin"
  | "consent";

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  label: string;
  required: boolean;
  options?: string[];
  helpText?: string;
}

export interface DemographicProfile {
  ageGroup: string;
  gender: string;
  ward: string;
  residentType: string;
}

export interface SurveyResponse {
  responseId: string;
  recordId: string;
  submittedAt: string;
  verification: "anonymous" | "efaas-verified";
  demographics: DemographicProfile;
  answers: Record<string, string>;
  sample: true; // every generated response is labelled sample POC data
}

export interface TimelineEntry {
  date: string;
  label: string;
  description?: string;
}

export interface DocumentRef {
  title: string;
  type: string;
  sizeLabel: string;
}

export interface DecisionSummary {
  conclusion: string;
  decidedOn: string;
  commonThemes: string[];
  moderationSummary: string;
  dataQualitySummary: string;
}

export interface ParticipationRecord {
  recordId: string;
  title: string;
  status: ParticipationStatus;
  participationType: ParticipationType;
  canonicalPlaceId: string;
  locationName: string;
  knownReferences: string[];
  islandPhase: string;
  department: string;
  responsibleSection: string;
  relatedDepartments: string[];
  anonymousAllowed: boolean;
  efaasRequired: boolean;
  verificationMode: VerificationMode;
  periodStart: string;
  periodEnd: string;
  summary: string;
  whyParticipation: string;
  documents: DocumentRef[];
  timeline: TimelineEntry[];
  surveyQuestions: SurveyQuestion[];
  decision?: DecisionSummary;
  workflowStage: string;
  sampleData: true;
}

export interface ModerationItem {
  itemId: string;
  recordId: string;
  responseId: string;
  excerpt: string;
  flagReason: "spam" | "abusive" | "duplicate" | "invalid" | "off-topic";
  status: "pending" | "removed" | "kept";
  moderatorNote?: string;
  flaggedAt: string;
}

export interface Permission {
  key: string;
  label: string;
}

export interface Role {
  roleId: string;
  name: string;
  description: string;
  permissions: string[]; // permission keys
}

export interface WorkflowStep {
  stepId: string;
  order: number;
  name: string;
  actor: string;
  description: string;
}

export interface ChartDatum {
  name: string;
  value: number;
}
export interface ChartData {
  title: string;
  data: ChartDatum[];
}

export interface PublicComment {
  commentId: string;
  recordId: string;
  text: string;
  ward: string;
  submittedAt: string;
  cleaned: true;
}

export interface RecordFilters {
  statuses: ParticipationStatus[];
  types: ParticipationType[];
  islandPhase: string | "all";
  department: string | "all";
  anonymousAllowed: "all" | "yes" | "no";
  efaasRequired: "all" | "yes" | "no";
  dateFrom: string;
  dateTo: string;
}
