// src/utils/aiEnhancer.ts
//
// Builds the structured input payload for the optional on-device Qwen model.
// The model receives structured data only — never raw page text.
// The model outputs natural language only — never does calculations.

import { FinalResults, SearchFilters } from '../types';

export type AIEnhancerInput = {
  company: string;
  role: string;
  country: string;
  rating: number | null;
  salaryRange: string;
  hikeRange: string;
  confidence: string;
  topPros: string[];
  topCons: string[];
};

export function buildAIInput(
  results: FinalResults,
  filters: SearchFilters
): AIEnhancerInput {
  const salaryRange =
    results.salaryMin !== null && results.salaryMax !== null
      ? `${results.salaryMin}–${results.salaryMax} ${filters.salaryFormat}`
      : 'Not found';

  const hikeRange =
    results.hikeMinPercent !== null && results.hikeMaxPercent !== null
      ? `+${results.hikeMinPercent}% to +${results.hikeMaxPercent}%`
      : 'Not found';

  return {
    company: filters.company,
    role: filters.role,
    country: filters.country,
    rating: results.rating,
    salaryRange,
    hikeRange,
    confidence: results.confidence,
    topPros: results.positives.slice(0, 3),
    topCons: results.negatives.slice(0, 3),
  };
}

export function buildAIPrompt(input: AIEnhancerInput): string {
  return `You are a professional career summary writer.
Write a 2-3 sentence human-readable summary based on the following structured data.
Be factual. Use only the data provided. Do not add information.
Do not use bullet points. Plain sentences only.

Data:
Company: ${input.company}
Role: ${input.role}
Country: ${input.country}
Rating: ${input.rating !== null ? `${input.rating}/5` : 'Not available'}
Salary Range: ${input.salaryRange}
Expected Hike: ${input.hikeRange}
Confidence: ${input.confidence}
Top Positives: ${input.topPros.join(', ')}
Top Negatives: ${input.topCons.join(', ')}

Summary:`;
}
