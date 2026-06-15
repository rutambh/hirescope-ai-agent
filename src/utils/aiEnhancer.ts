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
  state: string;
  district: string;
  experience: number;
  currentSalary: number;
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
    state: filters.state || '',
    district: filters.district || '',
    experience: filters.experience,
    currentSalary: filters.currentSalary,
    rating: results.rating,
    salaryRange,
    hikeRange,
    confidence: results.confidence,
    topPros: results.positives.slice(0, 3),
    topCons: results.negatives.slice(0, 3),
  };
}

export function buildAIPrompt(input: AIEnhancerInput): string {
  const location = [input.country, input.state, input.district].filter(Boolean).join(', ');

  return `You are a professional career and salary research analyst.
Write a detailed analysis of the research findings below in 5-7 sentences.

Structure your response in three paragraphs:
1. Salary Assessment: Compare the market range to the user's current salary and comment on the hike potential.
2. Company Rating & Reputation: What the rating suggests about employee satisfaction.
3. Key Pros and Cons: Highlight the most important positives and negatives.

Be factual. Use only the data provided. Do not add or infer information.
Do not use bullet points or markdown. Plain paragraphs only.

Data:
Company: ${input.company}
Role: ${input.role}
Location: ${location}
Experience: ${input.experience} years
Current Salary: ${input.currentSalary}
Rating: ${input.rating !== null ? `${input.rating}/5` : 'Not available'}
Salary Range: ${input.salaryRange}
Expected Hike: ${input.hikeRange}
Confidence Level: ${input.confidence}
Top Positives: ${input.topPros.join(', ')}
Top Negatives: ${input.topCons.join(', ')}

Analysis:`;
}
