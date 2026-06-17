import React, { useEffect, useRef } from 'react';
import { useSearchStore } from '../store/searchStore';
import { useScraper } from '../hooks/useScraper';

export function BackgroundScraper() {
  const phase = useSearchStore((s) => s.activePhase);
  const scraper = useScraper();
  const startedRef = useRef(false);

  useEffect(() => {
    if ((phase === 'searching' || phase === 'extracting') && !startedRef.current) {
      startedRef.current = true;
      scraper.runScrape().catch((err: any) => {
        console.error('BackgroundScraper error:', err);
      });
    } else if (phase === 'idle' || phase === 'complete' || phase === 'error') {
      startedRef.current = false;
    }
  }, [phase, scraper]);

  return null;
}
