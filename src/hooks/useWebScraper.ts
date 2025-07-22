import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient, ApiResponse } from '../lib/apiClient';

export interface ScrapingResult {
  success: boolean;
  data?: any[];
  error?: string;
  url: string;
  timestamp: Date;
  debugInfo?: any;
}

export interface UseWebScraperReturn {
  scrapingResult: ScrapingResult | null;
  isScraping: boolean;
  scrapeUrl: (url: string) => Promise<void>;
  clearResult: () => void;
}

/**
 * Simple, reliable web scraper hook using the new ApiClient
 * No more complex timeout utilities or manual request management
 */
export function useWebScraper(): UseWebScraperReturn {
  const [scrapingResult, setScrapingResult] = useState<ScrapingResult | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const scrapeUrl = useCallback(async (url: string) => {
    if (!url.trim()) {
      console.warn('Empty URL provided to scraper');
      return;
    }

    if (isScraping) {
      console.warn('Scraping already in progress, ignoring new request');
      return;
    }

    console.log(`🕷️ Starting scrape for: ${url}`);
    setIsScraping(true);
    setScrapingResult(null);

    try {
      const response: ApiResponse = await apiClient.scrapeWebsite(url);

      if (!isMountedRef.current) {
        console.log('Component unmounted, ignoring scrape result');
        return;
      }

      if (response.success) {
        const result: ScrapingResult = {
          success: true,
          data: response.data?.data || [],
          url: response.data?.url || url,
          timestamp: new Date(response.timestamp),
          debugInfo: response.data?.debugInfo
        };

        setScrapingResult(result);
        console.log(`✅ Scraping successful: ${result.data?.length || 0} elements found`);
      } else {
        const result: ScrapingResult = {
          success: false,
          error: response.error || 'Unknown scraping error',
          url: url,
          timestamp: new Date(response.timestamp)
        };

        setScrapingResult(result);
        console.error(`❌ Scraping failed: ${result.error}`);
      }

    } catch (error: any) {
      console.error('Scraping error:', error);

      if (isMountedRef.current) {
        const result: ScrapingResult = {
          success: false,
          error: error.message || 'An unexpected error occurred while scraping',
          url: url,
          timestamp: new Date()
        };

        setScrapingResult(result);
      }
    } finally {
      if (isMountedRef.current) {
        setIsScraping(false);
      }
    }
  }, [isScraping]);

  const clearResult = useCallback(() => {
    console.log('🧹 Clearing scraping result');
    setScrapingResult(null);
  }, []);

  return {
    scrapingResult,
    isScraping,
    scrapeUrl,
    clearResult,
  };
} 