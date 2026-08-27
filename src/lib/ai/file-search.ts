import type { RTIKnowledgeSource } from '../../types/rti-knowledge.js';

type FileSearchResult = {
  attributes?: unknown;
  file_id?: unknown;
  filename?: unknown;
  score?: unknown;
  text?: unknown;
};

type FileSearchCall = {
  type?: unknown;
  results?: unknown;
};

export function extractFileSearchSources(output: unknown): RTIKnowledgeSource[] {
  if (!Array.isArray(output)) {
    return [];
  }

  const sources: RTIKnowledgeSource[] = [];
  for (const item of output) {
    if (!isObject(item) || (item as FileSearchCall).type !== 'file_search_call') {
      continue;
    }

    const results = (item as FileSearchCall).results;
    if (!Array.isArray(results)) {
      continue;
    }

    for (const result of results) {
      if (!isObject(result) || !hasVerifiedOfficialProvenance(result)) {
        continue;
      }

      const candidate = result as FileSearchResult;
      if (typeof candidate.file_id !== 'string' || typeof candidate.filename !== 'string') {
        continue;
      }

      sources.push({
        fileId: candidate.file_id,
        filename: candidate.filename,
        score:
          typeof candidate.score === 'number' &&
          Number.isFinite(candidate.score) &&
          candidate.score >= 0 &&
          candidate.score <= 1
            ? candidate.score
            : null,
        excerpt: typeof candidate.text === 'string' ? excerpt(candidate.text) : null
      });

      if (sources.length === 5) {
        return sources;
      }
    }
  }

  return sources;
}

export function hasStateSpecificFileSearchEvidence(output: unknown): boolean {
  return fileSearchResults(output).some((result) => {
    if (!hasVerifiedOfficialProvenance(result) || !isObject(result.attributes)) {
      return false;
    }
    const jurisdiction = result.attributes.jurisdiction;
    return (
      typeof jurisdiction === 'string' &&
      (jurisdiction === 'state' || jurisdiction.startsWith('state:'))
    );
  });
}

function hasVerifiedOfficialProvenance(result: FileSearchResult): boolean {
  if (!isObject(result.attributes)) {
    return false;
  }
  const { document_type, jurisdiction, organization, source_type, source_url } =
    result.attributes;
  return (
    source_type === 'official' &&
    typeof document_type === 'string' &&
    document_type.length > 0 &&
    typeof jurisdiction === 'string' &&
    ['national', 'central', 'state'].some(
      (value) => jurisdiction === value || jurisdiction.startsWith(`${value}:`)
    ) &&
    typeof organization === 'string' &&
    organization.length > 0 &&
    typeof source_url === 'string' &&
    isOfficialGovernmentUrl(source_url)
  );
}

function isOfficialGovernmentUrl(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'gov.in' || hostname.endsWith('.gov.in');
  } catch {
    return false;
  }
}

function fileSearchResults(output: unknown): FileSearchResult[] {
  if (!Array.isArray(output)) {
    return [];
  }
  const results: FileSearchResult[] = [];
  for (const item of output) {
    if (!isObject(item) || (item as FileSearchCall).type !== 'file_search_call') {
      continue;
    }
    const candidates = (item as FileSearchCall).results;
    if (Array.isArray(candidates)) {
      results.push(...candidates.filter(isObject));
    }
  }
  return results;
}

function excerpt(value: string): string | null {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return null;
  }
  return normalized.length <= 400 ? normalized : `${normalized.slice(0, 397)}...`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
