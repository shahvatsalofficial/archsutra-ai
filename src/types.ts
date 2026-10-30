export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'high' | 'medium' | 'low';
export type EvidenceKind = 'observed' | 'inferred' | 'unknown';

export interface Evidence {
  path: string;
  startLine?: number;
  endLine?: number;
  kind: EvidenceKind;
  /** Redacted excerpt; never contains secret values. */
  excerpt?: string;
}

export interface Finding {
  id: string;
  rule: string;
  title: string;
  status: 'open';
  category: string;
  severity: Severity;
  confidence: Confidence;
  evidence: Evidence[];
  impact: string;
  whyItMatters: string;
  fix: string;
  verification: string;
  acceptanceCriteria: string;
  effort: 'S' | 'M' | 'L';
  ownerType: string;
  caveats: string;
  references: string[];
}

export interface SourceFile {
  rel: string;
  abs: string;
  size: number;
  ext: string;
}

export interface Corpus {
  root: string;
  files: SourceFile[];
  skipped: { ignoredDirs: number; tooLarge: number; binary: number; symlinks: number; overBudget: number };
  limits: { maxFiles: number; maxFileBytes: number; timeBudgetMs: number };
  truncated: boolean;
}

export interface ModuleNode {
  name: string;
  files: number;
  lines: number;
  ecosystems: string[];
}

export interface ArchMap {
  root: string;
  generatedBy: string;
  ecosystems: string[];
  frameworks: string[];
  datastores: string[];
  infra: string[];
  entrypoints: string[];
  modules: ModuleNode[];
  edges: { from: string; to: string; count: number; example: Evidence }[];
  cycles: string[][];
  blindSpots: string[];
  coverage: { filesScanned: number; skipped: Corpus['skipped']; truncated: boolean };
}

export interface ScoreEntry {
  category: string;
  rating: 'strong' | 'adequate' | 'weak' | 'critical' | 'not assessed';
  basis: string;
}

export interface AuditResult {
  map: ArchMap;
  findings: Finding[];
  scorecard: ScoreEntry[];
  failedChecks: string[];
}
