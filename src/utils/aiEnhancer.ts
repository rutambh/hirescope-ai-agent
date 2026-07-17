import { FinalResults, SearchFilters } from '../types';
import { isValidReviewSnippet } from './dataExtractor';

// ─── Extraction Prompt: Raw page text → Structured JSON ───────────────────────

export function buildExtractionPrompt(
  allText: string,
  filters: SearchFilters,
  pageCount: number
): string {
  const location = filters.country;

  // Filter raw text line by line to protect the model from seeing raw low-quality junk/scraped UI text
  const lines = allText.split('\n');
  const filteredLines = lines
    .map(line => line.trim())
    .filter(line => {
      if (line.length === 0) return false;
      const lower = line.toLowerCase();
      // Keep rating and salary indicator lines so the model can extract them
      const hasRating = /rating|star|★|\b[1-4]\.\d\b|5\.0/i.test(lower);
      const hasSalary = /lpa|ctc|lakh|₹|inr|salary|\b\d+k\b/i.test(lower);
      if (hasRating || hasSalary) return true;

      // Otherwise, only keep if it is a valid review snippet
      return isValidReviewSnippet(line);
    });
  const cleanText = filteredLines.join('\n');

  return `You are an expert data extraction engine specializing in employee reviews and compensation data. Your job is to extract structured information from scraped web pages about a company's work environment, pay, and culture.

CONTEXT:
Company: ${filters.company}
Role: ${filters.role}
Location: ${location}
${filters.overall ? 'Target Experience: All experience levels (overall range)' : `Target Experience: ${filters.experience} years`}
Salary Format: ${filters.salaryFormat}
Current Salary: ${filters.currentSalary}
Pages scraped: ${pageCount}

TASK:
Analyze the ${pageCount} scraped web pages below. Extract every data point you can find — ratings, salary figures, pros, cons, and useful quotes. Be thorough and precise.

Return ONLY valid JSON — no markdown fences, no explanation, no extra text:
{
  "rating": number | null,
  "salaryMin": number | null,
  "salaryMax": number | null,
  "pros": string[],
  "cons": string[],
  "snippets": string[],
  "salarySources": number,
  "ratingSources": number
}

FIELD RULES:
- rating: Overall company/employer rating out of 5 (decimal, e.g. 3.8, 4.2). null if not found. If you see multiple ratings (e.g. "3.8 overall, 4.1 for work-life balance"), use the overall/aggregate rating. If you see ratings from different sources, average them.
- salaryMin/salaryMax: Market salary range for the role in ${filters.salaryFormat} units. null if not found.
  LPA format: e.g. 12 means ₹12 Lakhs Per Annum. Convert "1.2 Cr" to 120 LPA. Convert "₹12,00,000" to 12 LPA.
  Per year: e.g. 120000 means $120,000/year. Convert "120K" to 120000.
  Per month: e.g. 15000 means 15,000/month.
  If you see "12-18 LPA", set salaryMin: 12, salaryMax: 18.
  If you see a single number like "15 LPA", set both salaryMin and salaryMax to 15.
  IMPORTANT: Only include salary data that is specifically for the "${filters.role}" role${filters.overall ? '' : ` with around ${filters.experience} years of experience`} or closely related roles.${filters.overall ? ' Include the overall salary range across all experience levels.' : ' Ignore generic company-wide salary data or salaries for vastly different experience levels if specific data is available.'}
- pros: Positive employee feedback themes (max 10, each 3-8 words). Group similar sentiments. Examples: "Good work-life balance", "Strong learning culture", "Competitive pay".
- cons: Negative employee feedback themes (max 10, each 3-8 words). Group similar sentiments. Examples: "Poor management", "Long working hours", "Limited growth".
- snippets: Factual quotes or statements from reviews about pay, culture, or experience (max 5, each 10-50 words). Prefer direct statements like "Average salary for this role is 15 LPA" over vague ones.
- salarySources: Count of pages that contained salary data for this role.
- ratingSources: Count of pages that contained rating data.

ABSOLUTE RULES:
- NEVER fabricate data. If a field is not found in the text, use null or [].
- Extract from ALL pages, not just the first few.
- If salary data appears in different formats across pages, normalize to the requested format.
- If pros/cons are listed as bullet points in the source, extract each as a separate item.
- Prioritize data from well-known review sites (Glassdoor, AmbitionBox, Indeed, etc.) over generic content.

SCRAPED TEXT:
${cleanText.substring(0, 28000)}`; // Stay within ~20K token limit
}

// ─── Enhancement Prompt: Structured data → Natural language summary ──────────

export type AIEnhancerInput = {
  company: string;
  role: string;
  country: string;
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
    experience: filters.overall ? -1 : filters.experience,
    currentSalary: filters.currentSalary,
    rating: results.rating,
    salaryRange,
    hikeRange,
    confidence: results.confidence,
    topPros: results.positives.filter(isValidReviewSnippet).slice(0, 3),
    topCons: results.negatives.filter(isValidReviewSnippet).slice(0, 3),
  };
}

export function buildEnhancementPrompt(input: AIEnhancerInput): string {
  const location = input.country;

  return `You are a senior career and compensation analyst. Write a professional, data-driven analysis of the research findings below.

Write exactly 3 paragraphs, 2-3 sentences each:

Paragraph 1 — Salary Assessment:
Compare the market salary range to the user's current salary. Quantify the gap (e.g. "The market range of ₹12–18 LPA suggests a potential 20-50% hike from your current ₹12 LPA"). Mention if the user is above, at, or below market. Be specific with numbers.

Paragraph 2 — Company Reputation:
Interpret the rating. A rating of 4.0+ suggests strong employee satisfaction. 3.0-3.9 is average. Below 3.0 indicates significant issues. Connect the rating to the pros and cons. Mention the most significant pros and cons.

Paragraph 3 — Strategic Recommendation:
Based on the salary gap, rating, and key pros/cons, give a brief actionable recommendation. Be honest — if the data suggests caution, say so. Include specific next steps the user should take.

RULES:
- Be factual. Use ONLY the data provided — do not fabricate or infer.
- Use plain paragraphs. No bullet points, no markdown, no headers.
- Write in professional, neutral tone.
- If data is missing (e.g. no rating), acknowledge it briefly and move on.
- Use specific numbers from the data, not vague phrases.
- Summarize ONLY the provided key strengths and concerns. Do NOT invent or assume any pros or cons not explicitly present in the input.
- Do NOT include any page titles, FAQs, UI navigation, or other unrelated chrome text if any slipped through.

DATA:
Company: ${input.company}
Role: ${input.role}
Location: ${location}
Experience: ${input.experience < 0 ? 'All levels (overall)' : `${input.experience} years`}
Current Salary: ${input.currentSalary}
Rating: ${input.rating !== null ? `${input.rating}/5` : 'Not available'}
Market Salary Range: ${input.salaryRange}
Expected Hike: ${input.hikeRange}
Confidence Level: ${input.confidence}
Key Strengths: ${input.topPros.join(', ') || 'None identified'}
Key Concerns: ${input.topCons.join(', ') || 'None identified'}

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
  salarySources?: number;
  ratingSources?: number;
} | null {
  try {
    // Strip markdown code fences if present
    let cleaned = text
      .replace(/```(?:json)?\s*/gi, '')
      .replace(/\s*```/g, '')
      .trim();

    // Find JSON boundaries
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return null;
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

    // Try strict parse first
    try {
      const parsed = JSON.parse(cleaned);
      return normalizeExtraction(parsed);
    } catch {
      // Fallback: fix common issues and retry
      let fixed = cleaned
        // Trailing commas
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        // Single-quoted keys/values -> double-quoted
        .replace(/'/g, '"')
        // Unquoted keys
        .replace(/(\{|,)\s*(\w+)\s*:/g, '$1"$2":')
        // Truncated JSON — close open arrays/objects
        .replace(/([^"[\]{}]+)$/, '');

      // Try to close incomplete JSON
      let depth = 0;
      for (const ch of fixed) {
        if (ch === '{' || ch === '[') depth++;
        if (ch === '}' || ch === ']') depth--;
      }
      while (depth > 0) { fixed += '}'; depth--; }
      if (depth < 0) fixed = fixed.slice(0, fixed.lastIndexOf('}') + 1);

      const parsed = JSON.parse(fixed);
      return normalizeExtraction(parsed);
    }
  } catch {
    return null;
  }
}

function normalizeExtraction(parsed: any): {
  rating: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  pros: string[];
  cons: string[];
  snippets: string[];
  salarySources?: number;
  ratingSources?: number;
} {
  return {
    rating: typeof parsed.rating === 'number' && parsed.rating >= 1 && parsed.rating <= 5 ? parsed.rating : null,
    salaryMin: typeof parsed.salaryMin === 'number' && parsed.salaryMin > 0 ? parsed.salaryMin : null,
    salaryMax: typeof parsed.salaryMax === 'number' && parsed.salaryMax > 0 ? parsed.salaryMax : null,
    pros: Array.isArray(parsed.pros) ? parsed.pros.filter((p: any) => typeof p === 'string' && p.length > 3).slice(0, 10) : [],
    cons: Array.isArray(parsed.cons) ? parsed.cons.filter((c: any) => typeof c === 'string' && c.length > 3).slice(0, 10) : [],
    snippets: Array.isArray(parsed.snippets) ? parsed.snippets.filter((s: any) => typeof s === 'string' && s.length > 10).slice(0, 5) : [],
    salarySources: typeof parsed.salarySources === 'number' ? parsed.salarySources : undefined,
    ratingSources: typeof parsed.ratingSources === 'number' ? parsed.ratingSources : undefined,
  };
}
