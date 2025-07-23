import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient, ApiResponse } from '../lib/apiClient';

export interface HierarchicalScrapingResult {
  success: boolean;
  data?: any[];
  flatData?: any[];
  error?: string;
  url: string;
  timestamp: Date;
  debugInfo?: {
    htmlLength: number;
    totalElements: number;
    maxDepth: number;
    containerElements: number;
    contentElements: number;
  };
}

export interface UseHierarchicalScraperReturn {
  scrapingResult: HierarchicalScrapingResult | null;
  isScraping: boolean;
  scrapeUrl: (url: string) => Promise<void>;
  clearResult: () => void;
}

/**
 * Hook for hierarchical web scraping that maintains DOM tree structure
 */
export function useHierarchicalScraper(): UseHierarchicalScraperReturn {
  const [scrapingResult, setScrapingResult] = useState<HierarchicalScrapingResult | null>(null);
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
      console.warn('Empty URL provided to hierarchical scraper');
      return;
    }

    if (isScraping) {
      console.warn('Hierarchical scraping already in progress, ignoring new request');
      return;
    }

    console.log(`🌳 Starting hierarchical scrape for: ${url}`);
    setIsScraping(true);
    setScrapingResult(null);

    try {
      const response: ApiResponse = await apiClient.scrapeWebsiteHierarchical(url);

      if (!isMountedRef.current) {
        console.log('Component unmounted, ignoring hierarchical scrape result');
        return;
      }

      if (response.success) {
        const result: HierarchicalScrapingResult = {
          success: true,
          data: response.data?.data || [],
          flatData: response.data?.flatData || [],
          url: response.data?.url || url,
          timestamp: new Date(response.timestamp),
          debugInfo: response.data?.debugInfo
        };

        setScrapingResult(result);
        console.log(`✅ Hierarchical scraping successful: ${result.flatData?.length || 0} elements found in tree structure`);
        console.log(`📊 Debug info:`, result.debugInfo);
      } else {
        const result: HierarchicalScrapingResult = {
          success: false,
          error: response.error || 'Unknown hierarchical scraping error',
          url: url,
          timestamp: new Date(response.timestamp)
        };

        setScrapingResult(result);
        console.error(`❌ Hierarchical scraping failed: ${result.error}`);
      }

    } catch (error: any) {
      console.error('Hierarchical scraping error:', error);

      if (isMountedRef.current) {
        const result: HierarchicalScrapingResult = {
          success: false,
          error: error.message || 'An unexpected error occurred during hierarchical scraping',
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
    console.log('🧹 Clearing hierarchical scraping result');
    setScrapingResult(null);
  }, []);

  return {
    scrapingResult,
    isScraping,
    scrapeUrl,
    clearResult,
  };
} 