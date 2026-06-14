// src/utils/urlExtractor.ts

export function cleanAndFilterUrls(rawUrls: string[], company: string, country: string): string[] {
  const lowercaseCompany = company.toLowerCase();
  const lowercaseCountry = country.toLowerCase();

  const excludedDomains = [
    'duckduckgo.com',
    'bing.com',
    'google.com',
    'yahoo.com',
    'microsoft.com',
    'youtube.com',
    'twitter.com',
    'facebook.com',
    'linkedin.com/share',
    'pinterest.com',
    'instagram.com',
    'ad.doubleclick.net',
    'wikipedia.org', // Wikipedia is general info, usually no salary details
  ];

  const uniqueUrls = new Set<string>();

  for (const url of rawUrls) {
    if (!url || typeof url !== 'string') continue;

    // Check if it matches any excluded domains
    const isExcluded = excludedDomains.some(domain => url.toLowerCase().includes(domain));
    if (isExcluded) continue;

    // Must be a valid http/https link
    if (!url.startsWith('http://') && !url.startsWith('https://')) continue;

    // Check country signal: if the URL explicitly points to another country, skip it
    // For example: if we search for India, skip /us/, /uk/, /ca/ subfolders.
    // If the URL contains '/us/' or '.us/' and country is India, skip it.
    if (lowercaseCountry === 'india') {
      const wrongCountryMatch = ['/us/', '/uk/', '/ca/', '/au/', '/de/', '.co.uk', '.com.au', '.ca'].some(
        signal => url.toLowerCase().includes(signal)
      );
      if (wrongCountryMatch) continue;
    } else if (lowercaseCountry === 'united states') {
      const wrongCountryMatch = ['/in/', '/uk/', '/ca/', '/au/', '/de/', '.co.in', '.co.uk', '.com.au', '.ca'].some(
        signal => url.toLowerCase().includes(signal)
      );
      if (wrongCountryMatch) continue;
    }

    uniqueUrls.add(url.trim());
  }

  // Convert to array and prioritize links containing the company name
  return Array.from(uniqueUrls).sort((a, b) => {
    const aHasCompany = a.toLowerCase().includes(lowercaseCompany);
    const bHasCompany = b.toLowerCase().includes(lowercaseCompany);

    if (aHasCompany && !bHasCompany) return -1;
    if (!aHasCompany && bHasCompany) return 1;
    return 0;
  });
}

// Injected JS script to run inside DuckDuckGo/Bing WebViews to find search result links
export const WEBVIEW_URL_EXTRACTOR_SCRIPT = `
  (function() {
    try {
      var urls = [];
      
      // DuckDuckGo selectors
      var links = document.querySelectorAll('a.result__url, a.result__link, .links_main a, .result__snippet a, .result__title a');
      for (var i = 0; i < links.length; i++) {
        if (links[i].href) {
          urls.push(links[i].href);
        }
      }
      
      // Bing selectors
      var bingLinks = document.querySelectorAll('#b_results .b_algo h2 a, #b_results .b_caption a, #b_results a');
      for (var j = 0; j < bingLinks.length; j++) {
        if (bingLinks[j].href) {
          urls.push(bingLinks[j].href);
        }
      }
      
      // Fallback: get all anchor tags in body
      if (urls.length === 0) {
        var allLinks = document.getElementsByTagName('a');
        for (var k = 0; k < allLinks.length; k++) {
          if (allLinks[k].href) {
            urls.push(allLinks[k].href);
          }
        }
      }
      
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'URL_EXTRACTION',
        urls: urls
      }));
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ERROR',
        message: e.toString()
      }));
    }
  })();
`;

// Injected JS script to extract page content (ratings, salaries, pros/cons) from domain page
export const WEBVIEW_CONTENT_EXTRACTOR_SCRIPT = `
  (function() {
    try {
      // Extract text content of the page body
      var text = document.body.innerText || document.body.textContent || "";
      
      // Keep it under a reasonable size (e.g. 50,000 characters) to avoid memory crashes
      var trimmedText = text.substring(0, 50000);
      
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'CONTENT_EXTRACTION',
        text: trimmedText
      }));
    } catch(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'ERROR',
        message: e.toString()
      }));
    }
  })();
`;
