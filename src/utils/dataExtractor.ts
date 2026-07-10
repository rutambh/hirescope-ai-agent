// src/utils/dataExtractor.ts
//
// Enhanced deterministic extraction of structured data from raw scraped page text.
// No AI involved — pure regex + heuristic pattern matching.
// Improved with more patterns, better noise filtering, and confidence scoring.

import { StructuredRecord } from '../types';

// ─── Rating Extraction ────────────────────────────────────────────────────────

const RATING_PATTERNS = [
  // 4.2/5  |  4.2 / 5
  /\b([1-4]\.\d|5\.0)\s*\/\s*5\b/gi,
  // 4.2 out of 5
  /\b([1-4]\.\d|5\.0)\s+out\s+of\s+5\b/gi,
  // 4.2 stars
  /\b([1-4]\.\d|5\.0)\s*(?:star|stars|★)\b/gi,
  // rating: 4.2  |  rating 4.2  |  overall rating 4.2
  /\b(?:overall|company|employer|workplace)?\s*rating[:\s]+([1-4]\.\d|5\.0)\b/gi,
  // Rated 4.2
  /\brated\s+([1-4]\.\d|5\.0)\b/gi,
  // ★4.2  |  ★ 4.2
  /★\s*([1-4]\.\d|5\.0)\b/g,
  // 4.2 ★
  /\b([1-4]\.\d|5\.0)\s*★/g,
  // Glassdoor/AmbitionBox style: "3.8 Overall" or "Work-Life Balance 4.1"
  /\b([1-4]\.\d|5\.0)\s+(?:overall|out\s+of|total|aggregate)\b/gi,
  // Indian format: 4.2/5.0
  /\b([1-4]\.\d|5\.0)\s*\/\s*5\.0\b/gi,
  // Percentage rating: 84% (sometimes used as rating)
  /\b([6-9]\d)%\s+(?:approval|recommend|satisfied|positive)\b/gi,
];

export function extractRatings(text: string): number[] {
  const ratings: number[] = [];
  const clean = text.replace(/\s+/g, ' ');
  for (const pattern of RATING_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((match = re.exec(clean)) !== null) {
      let val = parseFloat(match[1]);
      // Handle percentage ratings (84% → 4.2/5)
      if (pattern.source.includes('%')) {
        val = Math.round((val / 20) * 10) / 10;
      }
      if (!isNaN(val) && val >= 1.0 && val <= 5.0) {
        ratings.push(val);
      }
    }
  }
  return ratings;
}

// ─── Salary Extraction ────────────────────────────────────────────────────────

export function extractSalaries(
  text: string,
  salaryFormat: string
): number[] {
  const values: number[] = [];
  const clean = text.replace(/\s+/g, ' ');

  if (salaryFormat === 'LPA') {
    // ₹12.5 LPA  |  Rs 12 LPA  |  INR 8.5 L  |  ₹12L (no space)
    const lpaSymbol = /(?:Rs\.?|INR|₹|inr)\s*(\d+(?:\.\d+)?)\s*(?:lakh|lpa|l|Lakh|LPA|L)\b/gi;
    // 8-15 LPA  |  8.5 to 14.2 Lakhs  |  12L–18L
    const lpaRange = /\b(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s*(?:lakh|lpa|l|Lakh|LPA|L)\b/gi;
    // 12 LPA  (bare number + LPA)  |  12 Lakhs  |  12L (bare)
    const lpaBare = /\b(\d+(?:\.\d+)?)\s*(?:lakh|lpa|lakhs)\b/gi;
    // ₹12,00,000  |  12,00,000 (Indian numeric format)
    const indianNumeric = /(?:Rs\.?|INR|₹|inr)?\s*(\d{1,2}),(\d{2}),(\d{3})\b/gi;
    // CTC: 12.5 L  |  CTC 15 Lakhs  |  CTC: 18 LPA
    const ctcPattern = /CTC[:\s]*(?:Rs\.?|INR|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lpa|l|Lakh|LPA|L)\b/gi;
    // Annual: 12,00,000  |  Annual CTC 15,00,000
    const annualIndian = /(?:annual|yearly|per\s+annum)[:\s]*(?:Rs\.?|INR|₹)?\s*(\d{1,2}),(\d{2}),(\d{3})\b/gi;
    // Per month: ₹80,000/month  |  Rs 70,000 per month
    const perMonthToAnnual = /(?:Rs\.?|INR|₹)?\s*(\d{1,2}),(\d{3})\s*(?:\/\s*month|per\s+month|monthly)\b/gi;

    let m: RegExpExecArray | null;

    const r1 = new RegExp(lpaSymbol.source, lpaSymbol.flags);
    while ((m = r1.exec(clean)) !== null) {
      const v = parseFloat(m[1]);
      if (!isNaN(v) && v > 0 && v < 300) values.push(v);
    }

    const r2 = new RegExp(lpaRange.source, lpaRange.flags);
    while ((m = r2.exec(clean)) !== null) {
      const v1 = parseFloat(m[1]);
      const v2 = parseFloat(m[2]);
      if (!isNaN(v1) && v1 > 0 && v1 < 300) values.push(v1);
      if (!isNaN(v2) && v2 > 0 && v2 < 300) values.push(v2);
    }

    const r3 = new RegExp(lpaBare.source, lpaBare.flags);
    while ((m = r3.exec(clean)) !== null) {
      const v = parseFloat(m[1]);
      if (!isNaN(v) && v > 0 && v < 300) values.push(v);
    }

    const r4 = new RegExp(indianNumeric.source, indianNumeric.flags);
    while ((m = r4.exec(clean)) !== null) {
      const lakh = parseFloat(m[1] + m[2] + m[3]) / 100000;
      if (!isNaN(lakh) && lakh > 0 && lakh < 300) values.push(lakh);
    }

    const r5 = new RegExp(ctcPattern.source, ctcPattern.flags);
    while ((m = r5.exec(clean)) !== null) {
      const v = parseFloat(m[1]);
      if (!isNaN(v) && v > 0 && v < 300) values.push(v);
    }

    const r6 = new RegExp(annualIndian.source, annualIndian.flags);
    while ((m = r6.exec(clean)) !== null) {
      const lakh = parseFloat(m[1] + m[2] + m[3]) / 100000;
      if (!isNaN(lakh) && lakh > 0 && lakh < 300) values.push(lakh);
    }

    const r7 = new RegExp(perMonthToAnnual.source, perMonthToAnnual.flags);
    while ((m = r7.exec(clean)) !== null) {
      const monthly = parseFloat(m[1] + m[2]);
      const annualLpa = (monthly * 12) / 100000;
      if (!isNaN(annualLpa) && annualLpa > 0 && annualLpa < 300) values.push(Math.round(annualLpa * 10) / 10);
    }

  } else if (salaryFormat === 'per year') {
    // $80,000  |  £65,000  |  €75,000  |  $80,000 - $150,000
    const yearly = /(?:\$|£|€|CAD|C\$|A\$|USD|GBP|EUR)\s*(\d{2,3})[,\s](\d{3})\b/gi;
    // $80k  |  £65k  |  $120K (capital K)
    const kformat = /(?:\$|£|€|CAD|C\$|A\$|USD|GBP|EUR)\s*(\d{2,3})\s*k\b/gi;
    // 80k USD  |  120K GBP (currency after)
    const kformatReverse = /\b(\d{2,3})\s*k\s*(?:\$|£|€|CAD|C\$|A\$|USD|GBP|EUR)\b/gi;
    // $150,000+  (with trailing +)
    const yearlyPlus = /(?:\$|£|€|CAD|C\$|A\$|USD|GBP|EUR)\s*(\d{2,3})[,\s](\d{3})\s*\+/gi;
    // 100,000 - 150,000 USD  |  100,000 - 150,000
    const bareYearly = /\b(\d{2,3})[,\s](\d{3})\s*(?:-|–|—|to)\s*(\d{2,3})[,\s](\d{3})\b/gi;
    // Salary range: $80K - $150K
    const kRange = /(?:\$|£|€)\s*(\d{2,3})\s*k?\s*(?:-|–|—|to)\s*(?:\$|£|€)?\s*(\d{2,3})\s*k\b/gi;
    // Annual: $120,000 per year  |  $120K annually
    const annualFormat = /(?:\$|£|€)\s*(\d{2,3})[,\s](\d{3})\s*(?:per\s+year|annually|\/\s*year)\b/gi;

    let m: RegExpExecArray | null;

    const r1 = new RegExp(yearly.source, yearly.flags);
    while ((m = r1.exec(clean)) !== null) {
      const v = parseFloat(m[1] + m[2]);
      if (!isNaN(v) && v >= 10000 && v <= 1000000) values.push(v);
    }

    const r2 = new RegExp(kformat.source, kformat.flags);
    while ((m = r2.exec(clean)) !== null) {
      const v = parseFloat(m[1]) * 1000;
      if (!isNaN(v) && v >= 10000 && v <= 1000000) values.push(v);
    }

    const r3 = new RegExp(kformatReverse.source, kformatReverse.flags);
    while ((m = r3.exec(clean)) !== null) {
      const v = parseFloat(m[1]) * 1000;
      if (!isNaN(v) && v >= 10000 && v <= 1000000) values.push(v);
    }

    const r4 = new RegExp(yearlyPlus.source, yearlyPlus.flags);
    while ((m = r4.exec(clean)) !== null) {
      const v = parseFloat(m[1] + m[2]);
      if (!isNaN(v) && v >= 10000 && v <= 1000000) values.push(v);
    }

    const r5 = new RegExp(bareYearly.source, bareYearly.flags);
    while ((m = r5.exec(clean)) !== null) {
      const v1 = parseFloat(m[1] + m[2]);
      const v2 = parseFloat(m[3] + m[4]);
      if (!isNaN(v1) && v1 >= 10000 && v1 <= 1000000) values.push(v1);
      if (!isNaN(v2) && v2 >= 10000 && v2 <= 1000000) values.push(v2);
    }

    const r6 = new RegExp(kRange.source, kRange.flags);
    while ((m = r6.exec(clean)) !== null) {
      const v1 = parseFloat(m[1]) * 1000;
      const v2 = parseFloat(m[2]) * 1000;
      if (!isNaN(v1) && v1 >= 10000 && v1 <= 1000000) values.push(v1);
      if (!isNaN(v2) && v2 >= 10000 && v2 <= 1000000) values.push(v2);
    }

    const r7 = new RegExp(annualFormat.source, annualFormat.flags);
    while ((m = r7.exec(clean)) !== null) {
      const v = parseFloat(m[1] + m[2]);
      if (!isNaN(v) && v >= 10000 && v <= 1000000) values.push(v);
    }
  } else if (salaryFormat === 'per month') {
    // AED 15,000  |  12,000 Dirhams
    const monthly = /(?:AED|aed|dirhams?|dh|dhs|SAR|sar)\s*(\d{1,2})[,\s](\d{3})\b/gi;
    // AED 12k  |  15k AED (k format for monthly)
    const monthlyK = /(?:AED|aed|dirhams?|dh|dhs|SAR|sar)\s*(\d{1,2})\s*k\b/gi;
    // 15,000 AED (currency after)
    const monthlyReverse = /\b(\d{1,2})[,\s](\d{3})\s*(?:AED|aed|dirhams?|dh|dhs|SAR|sar)\b/gi;

    let m: RegExpExecArray | null;

    const r1 = new RegExp(monthly.source, monthly.flags);
    while ((m = r1.exec(clean)) !== null) {
      const v = parseFloat(m[1] + m[2]);
      if (!isNaN(v) && v >= 1000 && v <= 200000) values.push(v);
    }

    const r2 = new RegExp(monthlyK.source, monthlyK.flags);
    while ((m = r2.exec(clean)) !== null) {
      const v = parseFloat(m[1]) * 1000;
      if (!isNaN(v) && v >= 1000 && v <= 200000) values.push(v);
    }

    const r3 = new RegExp(monthlyReverse.source, monthlyReverse.flags);
    while ((m = r3.exec(clean)) !== null) {
      const v = parseFloat(m[1] + m[2]);
      if (!isNaN(v) && v >= 1000 && v <= 200000) values.push(v);
    }
  }

  return values;
}

const PRO_HEADERS = [
  'pros:', 'pros\n', 'advantages:', 'likes:', 'positives:',
  'what i liked:', 'what employees like:', 'what people like:',
  'highlights:', 'benefits:', 'strengths:',
  'good about', 'best part', 'what\'s good', 'why join',
  'employee benefits', 'perks:', 'the good',
  'pros & cons:', 'pros and cons:',
];

const CON_HEADERS = [
  'cons:', 'cons\n', 'disadvantages:', 'dislikes:', 'negatives:',
  'what i disliked:', 'areas of improvement:', 'concerns:',
  'challenges:', 'weaknesses:', 'drawbacks:',
  'bad about', 'worst part', 'what\'s bad', 'issues:',
  'improvement areas', 'the bad', 'downsides:',
];

function isGarbageText(line: string, company: string): boolean {
  const cleanLine = line.toLowerCase().trim();
  
  // Exclude common nav/UI words
  if (
    cleanLine === 'see more' ||
    cleanLine === 'see less' ||
    cleanLine === 'read more' ||
    cleanLine === 'read less' ||
    cleanLine === 'show more' ||
    cleanLine === 'show less' ||
    cleanLine.startsWith('click here') ||
    cleanLine.includes('sign in') ||
    cleanLine.includes('sign up') ||
    cleanLine.includes('log in') ||
    cleanLine.includes('create account') ||
    cleanLine.includes('forgot password') ||
    cleanLine.includes('reset password')
  ) {
    return true;
  }

  // Exclude typical site headers/footers, copyright and generic SEO lines
  if (
    cleanLine.includes('all rights reserved') ||
    cleanLine.includes('copyright') ||
    cleanLine.includes('privacy policy') ||
    cleanLine.includes('terms of service') ||
    cleanLine.includes('terms of use') ||
    cleanLine.includes('cookie policy') ||
    cleanLine.includes('cookie settings') ||
    cleanLine.includes('benchmark') ||
    cleanLine.includes('estimate') ||
    cleanLine.includes('calculator') ||
    cleanLine.includes('advertisement') ||
    cleanLine.includes('sponsored') ||
    cleanLine.includes('post a job') ||
    cleanLine.includes('find jobs') ||
    cleanLine.includes('search jobs') ||
    cleanLine.includes('upload your') ||
    cleanLine.includes('submit your') ||
    cleanLine.includes('get started') ||
    cleanLine.includes('create your') ||
    cleanLine.includes('subscribe to') ||
    cleanLine.includes('follow us') ||
    cleanLine.includes('download app') ||
    cleanLine.includes('share on')
  ) {
    return true;
  }

  // Exclude typical page title structures
  if (cleanLine.includes('::') || cleanLine.includes('—')) {
    return true;
  }

  // Exclude lines with multiple pipe-separated fragments (typically nav/UI tabs)
  const pipeCount = (cleanLine.match(/\|/g) || []).length;
  if (pipeCount > 1) {
    return true;
  }

  // Exclude strings that look like generic column headers or site labels
  if (
    cleanLine === 'reviews' ||
    cleanLine === 'salaries' ||
    cleanLine === 'benefits' ||
    cleanLine === 'jobs' ||
    cleanLine === 'interviews' ||
    cleanLine === 'photos' ||
    cleanLine === 'questions' ||
    cleanLine === 'overview' ||
    cleanLine === 'news' ||
    cleanLine === 'updates'
  ) {
    return true;
  }

  // Exclude generic search engine page title fragments matching company name
  const companyLower = company.toLowerCase().trim();
  if (
    cleanLine === companyLower ||
    cleanLine === `${companyLower} reviews` ||
    cleanLine === `${companyLower} salaries` ||
    cleanLine === `${companyLower} careers` ||
    cleanLine === `working at ${companyLower}` ||
    cleanLine === `${companyLower} - glassdoor` ||
    cleanLine === `${companyLower} - ambitionbox` ||
    cleanLine === `${companyLower} - indeed`
  ) {
    return true;
  }

  // Exclude URLs and file paths
  if (cleanLine.includes('http') || cleanLine.includes('www.') || cleanLine.includes('.com')) {
    return true;
  }

  // Exclude very short lines (likely navigation)
  if (cleanLine.length < 5) {
    return true;
  }

  return false;
}

function extractSection(text: string, headers: string[], company?: string): string[] {
  const results: string[] = [];
  const lower = text.toLowerCase();

  for (const header of headers) {
    const idx = lower.indexOf(header);
    if (idx === -1) continue;

    // Get text after header, up to next blank line or 800 chars
    const start = idx + header.length;
    const chunk = text.substring(start, start + 800);
    const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Stop at counter-section headers
      const lline = line.toLowerCase();
      const isNewSection = CON_HEADERS.concat(PRO_HEADERS).some(h => lline.startsWith(h));
      if (isNewSection) break;

      // Stop at very short lines (likely section break)
      if (line.length < 3) break;

      // Skip very short or very long lines
      if (line.length >= 8 && line.length <= 250) {
        // Strip leading bullets/numbers
        const cleaned = line.replace(/^[\-\*•·◦\d\.\)]+\s*/, '').trim();
        if (cleaned.length >= 5) {
          if (company && isGarbageText(cleaned, company)) continue;
          results.push(cleaned);
        }
      }
    }
  }

  return results;
}

// ─── Snippet Extraction ───────────────────────────────────────────────────────

const REVIEW_KEYWORDS = [
  'work', 'culture', 'salary', 'pay', 'hike', 'appraisal', 'management',
  'team', 'learning', 'growth', 'career', 'promotion', 'balance', 'hours',
  'pressure', 'environment', 'colleagues', 'training', 'benefits',
  'compensation', 'review', 'experience', 'rating', 'recommend',
  'pros', 'cons', 'good', 'bad', 'average', 'excellent', 'poor',
  'company', 'job', 'role', 'manager', 'wlb', 'remote', 'onsite',
];

function extractSnippets(text: string, company?: string): string[] {
  const snippets: string[] = [];
  const sentences = text.split(/[.!?]\s+/);

  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length < 20 || trimmed.length > 300) continue;
    const lower = trimmed.toLowerCase();
    const hasKeyword = REVIEW_KEYWORDS.some(kw => lower.includes(kw));
    if (!hasKeyword) continue;

    // Skip garbage text (same filter used for section extraction)
    if (company && isGarbageText(trimmed, company)) continue;

    // Skip lines that look like navigation or UI chrome
    if (
      trimmed.startsWith('Sign') ||
      trimmed.startsWith('Log') ||
      trimmed.includes('create your') ||
      trimmed.includes('get started') ||
      trimmed.startsWith('Search') ||
      trimmed.match(/^\d+\.\s*$/)
    ) continue;

    snippets.push(trimmed);
    if (snippets.length >= 25) break;
  }

  return snippets;
}

// ─── Page Content Cleaner ─────────────────────────────────────────────────────

export function cleanPageText(raw: string): string {
  return raw
    // Remove URLs
    .replace(/https?:\/\/\S+/g, ' ')
    // Remove email addresses
    .replace(/\S+@\S+\.\S+/g, ' ')
    // Remove tracking pixels (1x1 images)
    .replace(/<img[^>]*1x1[^>]*>/gi, ' ')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Collapse multiple spaces/newlines
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─── Main Extractor ───────────────────────────────────────────────────────────

export function extractStructuredRecord(
  source: string,
  rawText: string,
  salaryFormat: string,
  company?: string
): StructuredRecord {
  const text = cleanPageText(rawText);

  const ratings = extractRatings(text);
  const salaries = extractSalaries(text, salaryFormat);

  // Sort salaries; use lowest as min, highest as max
  const sorted = [...salaries].sort((a, b) => a - b);
  const salaryMin = sorted.length > 0 ? sorted[0] : null;
  const salaryMax = sorted.length > 1 ? sorted[sorted.length - 1] : salaryMin;

  // Average rating from this page
  const rating =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

  const pros = extractSection(text, PRO_HEADERS, company);
  const cons = extractSection(text, CON_HEADERS, company);
  const snippets = extractSnippets(text, company);

  return {
    source,
    rating: rating !== null && rating >= 1.0 && rating <= 5.0 ? rating : null,
    salaryMin,
    salaryMax,
    pros,
    cons,
    snippets,
  };
}
