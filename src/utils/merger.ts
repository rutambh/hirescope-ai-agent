// src/utils/merger.ts
//
// Summary Engine — mandatory, deterministic, no AI.
// Takes raw scraped data points, extracts structured records,
// runs theme clustering, and produces FinalResults.

import { FinalResults, RawDataPoint, SearchFilters, StructuredRecord } from '../types';
import { extractStructuredRecord } from './dataExtractor';
import { clusterPros, clusterCons, topThemes } from './themeEngine';
import { calculateAverage, calculateMedian, removeOutliers } from './outlierDetection';
import { logger } from './logger';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deduplicateStrings(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter(s => {
    const key = s.toLowerCase().trim().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Summary Engine ───────────────────────────────────────────────────────────

export function mergeAllResults(
  filters: SearchFilters,
  rawDataPoints: RawDataPoint[],
  timeElapsedSeconds: number
): FinalResults {
  // 1. Extract structured records from each scraped page
  const records: StructuredRecord[] = rawDataPoints
    .filter(p => p.success && p.rawText.length > 50)
    .map(p => extractStructuredRecord(p.source, p.rawText, filters.salaryFormat, filters.company, filters.experience));

  const sourcesCount = records.length;
  const domainsScraped = sourcesCount;

  logger.info('Merger', `Processing ${records.length} records from ${rawDataPoints.length} raw data points`);

  // 2. Compile ratings — average of all non-null ratings
  const allRatings = records
    .map(r => r.rating)
    .filter((r): r is number => r !== null);

  const rating =
    allRatings.length > 0
      ? Math.round(calculateAverage(allRatings)! * 10) / 10
      : null;

  // 3. Compile salaries — median of mins and maxs, with outlier removal
  const allMins = records
    .map(r => r.salaryMin)
    .filter((v): v is number => v !== null);
  const allMaxs = records
    .map(r => r.salaryMax)
    .filter((v): v is number => v !== null);

  const filteredMins = removeOutliers(allMins);
  const filteredMaxs = removeOutliers(allMaxs);

  const salaryMin =
    filteredMins.length > 0
      ? Math.round(calculateMedian(filteredMins)! * 10) / 10
      : null;
  const salaryMax =
    filteredMaxs.length > 0
      ? Math.round(calculateMedian(filteredMaxs)! * 10) / 10
      : null;

  logger.salary(filteredMins.length, `mins (${filteredMins.length} records), max (${filteredMaxs.length} records) → ${salaryMin !== null ? salaryMin : 'null'} - ${salaryMax !== null ? salaryMax : 'null'}`);

  // 4. Calculate hike percentages (deterministic formula)
  let hikeMinPercent: number | null = null;
  let hikeMaxPercent: number | null = null;

  const current = filters.currentSalary;
  if (current > 0) {
    if (salaryMin !== null) {
      hikeMinPercent = Math.max(0, Math.round(((salaryMin - current) / current) * 100));
    }
    if (salaryMax !== null) {
      hikeMaxPercent = Math.max(0, Math.round(((salaryMax - current) / current) * 100));
    }
  }

  // 5. Pros & Cons — theme clustering via themeEngine
  const allRawPros = records.flatMap(r => r.pros);
  const allRawCons = records.flatMap(r => r.cons);
  // Also include snippets for additional signal
  const allSnippets = records.flatMap(r => r.snippets);

  const clusteredPros = clusterPros([...allRawPros, ...allSnippets]);
  const clusteredCons = clusterCons([...allRawCons, ...allSnippets]);

  let positives = topThemes(clusteredPros, 5);
  let negatives = topThemes(clusteredCons, 5);

  // Fallback if clustering found nothing
  if (positives.length === 0) {
    positives = [
      `Opportunity to work as ${filters.role} at ${filters.company}`,
      `Professional growth in ${filters.country} market`,
      `Industry experience with established team`,
    ];
  }
  if (negatives.length === 0) {
    negatives = [
      `Standard job responsibilities and timeline pressures`,
      `Performance expectations typical for the role`,
      `Varying scope depending on team and client needs`,
    ];
  }

  positives = deduplicateStrings(positives).slice(0, 5);
  negatives = deduplicateStrings(negatives).slice(0, 5);

  // 6. Confidence score
  let confidence: FinalResults['confidence'] = 'minimal';
  if (sourcesCount >= 25) confidence = 'high';
  else if (sourcesCount >= 10) confidence = 'medium';
  else if (sourcesCount >= 5) confidence = 'low';

  return {
    rating,
    salaryMin,
    salaryMax,
    hikeMinPercent,
    hikeMaxPercent,
    positives,
    negatives,
    sourcesCount,
    domainsScraped,
    confidence,
    timeElapsedSeconds,
    // aiEnhancedSummary is not set here; it gets set optionally in useScraper
  };
}
