import { FinalResults, SearchFilters } from '../types';

// ─── Extraction Prompt: Raw page text → Structured JSON ───────────────────────

export function buildExtractionPrompt(
  allText: string,
  filters: SearchFilters,
  pageCount: number
): string {
  const location = [filters.country, filters.state, filters.district].filter(Boolean).join(', ');

  return `You are a precise data extraction engine. Extract structured data from employee review pages about a company.

Company: ${filters.company}
Role: ${filters.role}
Location: ${location}
Salary Format: ${filters.salaryFormat}
Current Salary: ${filters.currentSalary}

Below are scraped text contents from ${pageCount} web pages. Extract ALL data points you can find.

Return ONLY valid JSON with this exact structure — no markdown, no explanation, no extra text:
{
  "rating": number | null,
  "salaryMin": number | null,
  "salaryMax": number | null,
  "pros": string[],
  "cons": string[],
  "snippets": string[]
}

RULES:
- rating: company rating out of 5 (decimal, 1.0–5.0). null if not found.
- salaryMin/salaryMax: salary in ${filters.salaryFormat} units as plain numbers. null if not found.
  For LPA: e.g. 12 means 12 Lakhs Per Annum
  For per year: e.g. 120000 means $120,000 per year
  For per month: e.g. 15000 means 15,000 per month
- pros: list of positive employee feedback themes (max 10 items, concise)
- cons: list of negative employee feedback themes (max 10 items, concise)
- snippets: useful factual sentences about pay, culture, or reviews (max 5)
- NEVER make up data. If not found in text, use null or empty array.
- Extract multiple salary values if you see ranges (e.g. "12-18 LPA" → salaryMin: 12, salaryMax: 18)
- Extract ALL pros and cons you can find, not just the most obvious ones

SCRAPED TEXT:
${allText.substring(0, 28000)}`; // Stay within ~20K token limit
}

// ─── Enhancement Prompt: Structured data → Natural language summary ──────────

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

export function buildEnhancementInput(
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

export function buildEnhancementPrompt(input: AIEnhancerInput): string {
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

// ─── Parse SLM JSON output ────────────────────────────────────────────────────

export function parseExtractionJson(text: string): {
  rating: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  pros: string[];
  cons: string[];
  snippets: string[];
} | null {
  try {
    // Find JSON in the response (handle cases where model adds preamble)
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    const json = text.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(json);

    return {
      rating: typeof parsed.rating === 'number' && parsed.rating >= 1 && parsed.rating <= 5 ? parsed.rating : null,
      salaryMin: typeof parsed.salaryMin === 'number' && parsed.salaryMin > 0 ? parsed.salaryMin : null,
      salaryMax: typeof parsed.salaryMax === 'number' && parsed.salaryMax > 0 ? parsed.salaryMax : null,
      pros: Array.isArray(parsed.pros) ? parsed.pros.filter((p: any) => typeof p === 'string' && p.length > 3) : [],
      cons: Array.isArray(parsed.cons) ? parsed.cons.filter((c: any) => typeof c === 'string' && c.length > 3) : [],
      snippets: Array.isArray(parsed.snippets) ? parsed.snippets.filter((s: any) => typeof s === 'string' && s.length > 10) : [],
    };
  } catch {
    return null;
  }
}
