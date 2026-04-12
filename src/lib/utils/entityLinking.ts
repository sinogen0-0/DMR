import type { AnyDossier } from '$lib/types/dossier';

export interface LinkedTextSegment {
  text: string;
  dossierId?: string;
  dossierName?: string;
  matchedName?: string;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findMentionedDossiers(transcript: string, dossiers: AnyDossier[]): Array<{
  start: number;
  end: number;
  dossier: AnyDossier;
  matchedName: string;
}> {
  const occupied: Array<{ start: number; end: number }> = [];
  const matches: Array<{ start: number; end: number; dossier: AnyDossier; matchedName: string }> = [];

  const ordered = [...dossiers].sort((a, b) => b.name.length - a.name.length);

  for (const dossier of ordered) {
    const pattern = new RegExp(`\\b${escapeRegExp(dossier.name)}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(transcript)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      const overlaps = occupied.some((range) => !(end <= range.start || start >= range.end));
      if (overlaps) {
        continue;
      }

      occupied.push({ start, end });
      matches.push({
        start,
        end,
        dossier,
        matchedName: match[0]
      });
    }
  }

  return matches.sort((a, b) => a.start - b.start);
}

export function buildLinkedTranscript(transcript: string, dossiers: AnyDossier[]): LinkedTextSegment[] {
  if (!transcript) {
    return [];
  }

  const matches = findMentionedDossiers(transcript, dossiers);
  if (matches.length === 0) {
    return [{ text: transcript }];
  }

  const segments: LinkedTextSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      segments.push({ text: transcript.slice(cursor, match.start) });
    }

    segments.push({
      text: transcript.slice(match.start, match.end),
      dossierId: match.dossier.id,
      dossierName: match.dossier.name,
      matchedName: match.matchedName
    });

    cursor = match.end;
  }

  if (cursor < transcript.length) {
    segments.push({ text: transcript.slice(cursor) });
  }

  return segments;
}

export function findMentionedDossierIds(transcript: string, dossiers: AnyDossier[]): string[] {
  const seen = new Set<string>();
  for (const match of findMentionedDossiers(transcript, dossiers)) {
    seen.add(match.dossier.id);
  }
  return Array.from(seen);
}
