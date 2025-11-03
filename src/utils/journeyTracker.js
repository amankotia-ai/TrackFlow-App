/**
 * Cookie-Free Journey Tracker
 * Uses only sessionStorage, localStorage, and in-memory state
 * 100% GDPR-friendly, no cookies required
 * 
 * Storage Strategy:
 * - sessionStorage: Current journey (expires when browser closes)
 * - localStorage: Visit count, first visit date, UTM attribution
 * - In-memory: Real-time interactions, scroll depth
 */

(function() {
  'use strict';
  
  class CookieFreeJourneyTracker {
    constructor(config = {}) {
      this.config = {
        maxJourneyLength: 50,
        sessionTimeout: 30 * 60 * 1000, // 30 minutes
        storagePrefix: 'tf_journey_', // TrackFlow journey prefix
        enableCrossTab: true, // Sync across tabs using storage events
        debug: false,
        apiEndpoint: config.apiEndpoint || null,
        ...config
      };
      
      // In-memory state (reset on page load)
      this.currentPageStartTime = Date.now();
      this.pageInteractions = [];
      this.scrollDepth = 0;
      this.maxScrollDepth = 0;
      
      // Load or create journey from sessionStorage
      this.journey = this.loadJourneyFromSession();
      
      // Setup tracking
      this.setupTracking();
      this.trackPageVisit();
      
      this.log('✅ Cookie-Free Journey Tracker initialized');
    }

    log(message, level = 'info', data = null) {
      if (!this.config.debug) return;
      
      const styles = {
        info: 'color: #3b82f6',
        success: 'color: #10b981',
        warning: 'color: #f59e0b',
        error: 'color: #ef4444'
      };
      
      console.log(`%c🛤️ Journey Tracker: ${message}`, styles[level] || styles.info);
      if (data) console.log(data);
    }

    /**
     * Load journey from sessionStorage (expires when browser closes)
     */
    loadJourneyFromSession() {
      try {
        const key = this.config.storagePrefix + 'session';
        const stored = sessionStorage.getItem(key);
        
        if (stored) {
          const journey = JSON.parse(stored);
          
          // Check if session is still active (within timeout)
          const timeSinceLastActivity = Date.now() - journey.lastActivityAt;
          if (timeSinceLastActivity < this.config.sessionTimeout) {
            this.log('📖 Restored journey from sessionStorage');
            return journey;
          }
        }
        
        // Create new journey if no valid session exists
        return this.createNewJourney();
      } catch (error) {
        this.log('❌ Error loading journey: ' + error.message, 'error');
        return this.createNewJourney();
      }
    }

    /**
     * Create new journey object
     */
    createNewJourney() {
      const sessionId = this.generateSessionId();
      
      const journey = {
        sessionId,
        startedAt: Date.now(),
        lastActivityAt: Date.now(),
        pages: [],
        events: [],
        intentSignals: [],
        utm: this.captureUTMParameters(),
        device: this.getDeviceInfo(),
        referrer: document.referrer,
        landingPage: window.location.pathname,
        metadata: {
          intentScore: 0,
          intentLevel: 'low',
          visitNumber: this.incrementVisitCount(),
          daysSinceFirstVisit: this.getDaysSinceFirstVisit()
        }
      };
      
      this.saveJourneyToSession(journey);
      this.log('🆕 Created new journey session', 'success');
      return journey;
    }

    /**
     * Save journey to sessionStorage (session-only persistence)
     */
    saveJourneyToSession(journey) {
      try {
        const key = this.config.storagePrefix + 'session';
        sessionStorage.setItem(key, JSON.stringify(journey));
        
        // Broadcast to other tabs if enabled
        if (this.config.enableCrossTab) {
          localStorage.setItem(
            this.config.storagePrefix + 'sync',
            JSON.stringify({
              timestamp: Date.now(),
              sessionId: journey.sessionId,
              action: 'journey_updated'
            })
          );
        }
      } catch (error) {
        this.log('❌ Error saving journey: ' + error.message, 'error');
      }
    }

    /**
     * Generate unique session ID (no cookies)
     */
    generateSessionId() {
      // Check if session ID already exists in sessionStorage
      const key = this.config.storagePrefix + 'sid';
      let sessionId = sessionStorage.getItem(key);
      
      if (!sessionId) {
        // Generate new session ID using timestamp + random
        sessionId = 's_' + Date.now() + '_' + this.generateRandomId();
        sessionStorage.setItem(key, sessionId);
      }
      
      return sessionId;
    }

    /**
     * Generate random ID component
     */
    generateRandomId() {
      return Math.random().toString(36).substring(2, 11) + 
             Math.random().toString(36).substring(2, 11);
    }

    /**
     * Increment visit count in localStorage (persistent across sessions)
     */
    incrementVisitCount() {
      const key = this.config.storagePrefix + 'visit_count';
      const currentCount = parseInt(localStorage.getItem(key) || '0');
      const newCount = currentCount + 1;
      localStorage.setItem(key, newCount.toString());
      
      // Also store first visit timestamp
      const firstVisitKey = this.config.storagePrefix + 'first_visit';
      if (!localStorage.getItem(firstVisitKey)) {
        localStorage.setItem(firstVisitKey, Date.now().toString());
      }
      
      return newCount;
    }

    /**
     * Get visit count
     */
    getVisitCount() {
      const key = this.config.storagePrefix + 'visit_count';
      return parseInt(localStorage.getItem(key) || '1');
    }

    /**
     * Get days since first visit
     */
    getDaysSinceFirstVisit() {
      const key = this.config.storagePrefix + 'first_visit';
      const firstVisit = localStorage.getItem(key);
      
      if (!firstVisit) return 0;
      
      const daysDiff = (Date.now() - parseInt(firstVisit)) / (1000 * 60 * 60 * 24);
      return Math.floor(daysDiff);
    }

    /**
     * Track current page visit
     */
    trackPageVisit() {
      const pageData = {
        path: window.location.pathname,
        fullUrl: window.location.href,
        title: document.title,
        referrer: document.referrer,
        timestamp: Date.now(),
        enteredAt: Date.now(),
        exitedAt: null,
        timeOnPage: 0,
        scrollDepth: 0,
        interactions: [],
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      // Calculate time on previous page
      if (this.journey.pages.length > 0) {
        const previousPage = this.journey.pages[this.journey.pages.length - 1];
        previousPage.exitedAt = Date.now();
        previousPage.timeOnPage = previousPage.exitedAt - previousPage.enteredAt;
      }

      // Add new page
      this.journey.pages.push(pageData);
      
      // Trim if exceeds max length
      if (this.journey.pages.length > this.config.maxJourneyLength) {
        this.journey.pages.shift();
      }

      this.journey.lastActivityAt = Date.now();
      this.saveJourneyToSession(this.journey);
      
      // Calculate intent
      this.calculateIntentScore();
      
      this.log('📄 Page tracked: ' + pageData.path);
      
      // Send to analytics endpoint if configured
      this.sendJourneyUpdate();
    }

    /**
     * Track event (no cookies involved)
     */
    trackEvent(eventData) {
      const event = {
        type: eventData.type || 'generic',
        target: eventData.target || '',
        data: eventData.data || {},
        timestamp: Date.now(),
        pageIndex: this.journey.pages.length - 1,
        page: window.location.pathname
      };

      // Add to journey events
      this.journey.events.push(event);
      
      // Add to current page interactions (in memory)
      this.pageInteractions.push(event);
      
      // Update current page interactions in journey
      if (this.journey.pages.length > 0) {
        const currentPage = this.journey.pages[this.journey.pages.length - 1];
        currentPage.interactions.push(event);
      }

      // Check for intent signals
      if (this.isIntentSignal(event)) {
        this.journey.intentSignals.push(event);
        this.calculateIntentScore();
        this.log('🎯 Intent signal detected: ' + event.type, 'success');
      }

      this.journey.lastActivityAt = Date.now();
      this.saveJourneyToSession(this.journey);
    }

    /**
     * Detect buying intent signals
     */
    isIntentSignal(event) {
      const intentPatterns = {
        paths: /pricing|checkout|cart|buy|purchase|signup|trial|demo|contact|order|payment|billing|plans|subscribe/i,
        actions: /add.*cart|start.*trial|request.*demo|contact.*sales|get.*quote|buy.*now|purchase|checkout/i,
        forms: /email|phone|company|name|address/i
      };

      const currentPath = window.location.pathname;
      const eventTarget = (event.target || '').toLowerCase();
      const eventType = (event.type || '').toLowerCase();

      return (
        intentPatterns.paths.test(currentPath) ||
        intentPatterns.actions.test(eventTarget) ||
        intentPatterns.actions.test(eventType) ||
        (eventType.includes('form') && intentPatterns.forms.test(eventTarget))
      );
    }

    /**
     * Calculate buying intent score
     */
    calculateIntentScore() {
      let score = 0;
      
      const signals = {
        // High-intent pages visited
        highIntentPages: this.journey.pages.filter(p => 
          /pricing|plans|checkout|cart|buy|purchase/i.test(p.path)
        ).length,
        
        // Form interactions
        formInteractions: this.journey.events.filter(e => 
          e.type.includes('form')
        ).length,
        
        // Time spent (minutes)
        totalTimeMinutes: (Date.now() - this.journey.startedAt) / (60 * 1000),
        
        // Page depth
        pageDepth: this.journey.pages.length,
        
        // Return visits
        visitNumber: this.journey.metadata.visitNumber,
        
        // Intent signals
        intentSignals: this.journey.intentSignals.length,
        
        // Average scroll depth
        avgScrollDepth: this.getAverageScrollDepth()
      };

      // Weighted scoring
      if (signals.highIntentPages > 0) score += 0.25 * Math.min(signals.highIntentPages / 2, 1);
      if (signals.formInteractions > 0) score += 0.20 * Math.min(signals.formInteractions / 3, 1);
      if (signals.totalTimeMinutes > 2) score += 0.15 * Math.min(signals.totalTimeMinutes / 10, 1);
      if (signals.pageDepth > 2) score += 0.10 * Math.min(signals.pageDepth / 10, 1);
      if (signals.visitNumber > 1) score += 0.15 * Math.min(signals.visitNumber / 5, 1);
      if (signals.intentSignals > 0) score += 0.20 * Math.min(signals.intentSignals / 3, 1);
      if (signals.avgScrollDepth > 50) score += 0.10 * (signals.avgScrollDepth / 100);

      score = Math.min(score, 1); // Cap at 1.0
      
      this.journey.metadata.intentScore = score;
      this.journey.metadata.intentLevel = this.getIntentLevel(score);
      this.journey.metadata.signals = signals;
      
      this.saveJourneyToSession(this.journey);
      
      return score;
    }

    /**
     * Get intent level from score
     */
    getIntentLevel(score) {
      if (score >= 0.7) return 'high';
      if (score >= 0.4) return 'medium';
      return 'low';
    }

    /**
     * Get average scroll depth across pages
     */
    getAverageScrollDepth() {
      const pagesWithScroll = this.journey.pages.filter(p => p.scrollDepth > 0);
      if (pagesWithScroll.length === 0) return 0;
      
      const total = pagesWithScroll.reduce((sum, p) => sum + p.scrollDepth, 0);
      return total / pagesWithScroll.length;
    }

    /**
     * Check if journey matches pattern
     */
    matchesJourneyPattern(pattern) {
      const { pages, order } = pattern;
      const journeyPaths = this.journey.pages.map(p => p.path);

      if (order === 'sequence') {
        return this.matchesSequence(journeyPaths, pages);
      } else {
        return this.matchesAnyOrder(journeyPaths, pages);
      }
    }

    matchesSequence(journeyPaths, targetPages) {
      let targetIndex = 0;
      
      for (const path of journeyPaths) {
        if (this.pathMatches(path, targetPages[targetIndex])) {
          targetIndex++;
          if (targetIndex === targetPages.length) return true;
        }
      }
      
      return false;
    }

    matchesAnyOrder(journeyPaths, targetPages) {
      const visitedTargets = new Set();
      
      for (const path of journeyPaths) {
        for (const targetPage of targetPages) {
          if (this.pathMatches(path, targetPage)) {
            visitedTargets.add(targetPage);
          }
        }
      }
      
      return visitedTargets.size === targetPages.length;
    }

    pathMatches(path, target) {
      return path === target || 
             path.includes(target) || 
             path.startsWith(target);
    }

    /**
     * Setup automatic tracking (no cookies)
     */
    setupTracking() {
      // Track scroll depth
      let scrollThrottle;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollThrottle);
        scrollThrottle = setTimeout(() => {
          const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
          this.scrollDepth = Math.max(this.scrollDepth, scrollPercentage || 0);
          this.maxScrollDepth = this.scrollDepth;
          
          if (this.journey.pages.length > 0) {
            const currentPage = this.journey.pages[this.journey.pages.length - 1];
            currentPage.scrollDepth = this.scrollDepth;
            this.saveJourneyToSession(this.journey);
          }
        }, 200);
      });

      // Track page exit
      window.addEventListener('beforeunload', () => {
        if (this.journey.pages.length > 0) {
          const currentPage = this.journey.pages[this.journey.pages.length - 1];
          currentPage.exitedAt = Date.now();
          currentPage.timeOnPage = currentPage.exitedAt - currentPage.enteredAt;
          currentPage.scrollDepth = this.scrollDepth;
          this.saveJourneyToSession(this.journey);
          
          // Send final journey update
          this.sendJourneyUpdate(true);
        }
      });

      // Track visibility changes (user switched tabs)
      document.addEventListener('visibilitychange', () => {
        this.journey.lastActivityAt = Date.now();
        this.saveJourneyToSession(this.journey);
      });

      // Listen for storage events from other tabs
      if (this.config.enableCrossTab) {
        window.addEventListener('storage', (e) => {
          if (e.key === this.config.storagePrefix + 'sync') {
            this.log('🔄 Journey synced from another tab');
            this.journey = this.loadJourneyFromSession();
          }
        });
      }

      // Auto-save every 10 seconds
      setInterval(() => {
        if (this.journey.pages.length > 0) {
          const currentPage = this.journey.pages[this.journey.pages.length - 1];
          currentPage.timeOnPage = Date.now() - currentPage.enteredAt;
          this.saveJourneyToSession(this.journey);
        }
      }, 10000);
    }

    /**
     * Send journey update to analytics endpoint
     */
    async sendJourneyUpdate(isFinal = false) {
      if (!this.config.apiEndpoint) return;
      
      try {
        const analytics = this.getAnalytics();
        
        const payload = {
          sessionId: this.journey.sessionId,
          analytics,
          journey: {
            pages: this.journey.pages.map(p => ({
              path: p.path,
              title: p.title,
              timeOnPage: p.timeOnPage,
              scrollDepth: p.scrollDepth,
              interactions: p.interactions.length
            })),
            intentScore: this.journey.metadata.intentScore,
            intentLevel: this.journey.metadata.intentLevel,
            intentSignals: this.journey.intentSignals.length
          },
          isFinal
        };

        // Use sendBeacon for final update to ensure it goes through
        if (isFinal && navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          navigator.sendBeacon(this.config.apiEndpoint + '/journey-update', blob);
        } else {
          // Regular fetch for periodic updates
          fetch(this.config.apiEndpoint + '/journey-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
          }).catch(err => {
            this.log('❌ Failed to send journey update: ' + err.message, 'error');
          });
        }
      } catch (error) {
        this.log('❌ Error sending journey update: ' + error.message, 'error');
      }
    }

    /**
     * Capture UTM parameters from URL
     */
    captureUTMParameters() {
      const params = new URLSearchParams(window.location.search);
      const utm = {
        source: params.get('utm_source'),
        medium: params.get('utm_medium'),
        campaign: params.get('utm_campaign'),
        term: params.get('utm_term'),
        content: params.get('utm_content')
      };
      
      // Store UTM in localStorage for attribution across sessions
      if (Object.values(utm).some(v => v !== null)) {
        const key = this.config.storagePrefix + 'utm';
        localStorage.setItem(key, JSON.stringify(utm));
      } else {
        // Try to restore previous UTM if current page has none
        const key = this.config.storagePrefix + 'utm';
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      return utm;
    }

    /**
     * Get device info (no cookies)
     */
    getDeviceInfo() {
      return {
        type: this.getDeviceType(),
        browser: this.getBrowserInfo(),
        os: this.getOS(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height
        },
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    getDeviceType() {
      const ua = navigator.userAgent;
      if (/mobile/i.test(ua)) return 'mobile';
      if (/tablet|ipad/i.test(ua)) return 'tablet';
      return 'desktop';
    }

    getBrowserInfo() {
      const ua = navigator.userAgent;
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Unknown';
    }

    getOS() {
      const ua = navigator.userAgent;
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'MacOS';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS')) return 'iOS';
      return 'Unknown';
    }

    /**
     * Get journey analytics
     */
    getAnalytics() {
      return {
        sessionId: this.journey.sessionId,
        sessionDuration: Date.now() - this.journey.startedAt,
        pageCount: this.journey.pages.length,
        eventCount: this.journey.events.length,
        intentScore: this.journey.metadata.intentScore,
        intentLevel: this.journey.metadata.intentLevel,
        intentSignals: this.journey.intentSignals.length,
        visitNumber: this.journey.metadata.visitNumber,
        daysSinceFirstVisit: this.getDaysSinceFirstVisit(),
        landingPage: this.journey.landingPage,
        currentPage: window.location.pathname,
        pagePaths: this.journey.pages.map(p => p.path),
        utm: this.journey.utm,
        device: this.journey.device,
        avgTimePerPage: this.getAverageTimePerPage(),
        avgScrollDepth: this.getAverageScrollDepth(),
        referrer: this.journey.referrer
      };
    }

    getAverageTimePerPage() {
      const pagesWithTime = this.journey.pages.filter(p => p.timeOnPage > 0);
      if (pagesWithTime.length === 0) return 0;
      
      const total = pagesWithTime.reduce((sum, p) => sum + p.timeOnPage, 0);
      return Math.round(total / pagesWithTime.length);
    }

    /**
     * Export journey data
     */
    exportJourney() {
      return {
        journey: this.journey,
        analytics: this.getAnalytics()
      };
    }

    /**
     * Clear journey (no cookies to clear!)
     */
    clearJourney() {
      sessionStorage.removeItem(this.config.storagePrefix + 'session');
      sessionStorage.removeItem(this.config.storagePrefix + 'sid');
      this.journey = this.createNewJourney();
      this.log('🧹 Journey cleared (no cookies were harmed)', 'success');
    }

    /**
     * Get storage usage info
     */
    getStorageInfo() {
      const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith(this.config.storagePrefix));
      const localKeys = Object.keys(localStorage).filter(k => k.startsWith(this.config.storagePrefix));
      
      return {
        sessionStorage: {
          keys: sessionKeys,
          size: sessionKeys.reduce((sum, k) => sum + (sessionStorage.getItem(k) || '').length, 0)
        },
        localStorage: {
          keys: localKeys,
          size: localKeys.reduce((sum, k) => sum + (localStorage.getItem(k) || '').length, 0)
        },
        cookiesUsed: 0, // Always 0!
        privacyFriendly: true
      };
    }
  }

  // Expose globally
  window.JourneyTracker = CookieFreeJourneyTracker;
  
  // Auto-initialize if not disabled
  if (!window.DISABLE_AUTO_JOURNEY_TRACKING) {
    window.journeyTracker = new CookieFreeJourneyTracker({
      debug: false,
      apiEndpoint: window.TRACKFLOW_API_ENDPOINT || 'https://trackflow-app-production.up.railway.app/api'
    });
  }
  
})();




