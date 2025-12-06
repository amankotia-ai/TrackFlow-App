/**
 * Cookie-Free Journey Tracker
 * Uses only sessionStorage, localStorage, and in-memory state
 * 100% GDPR-friendly, no cookies required
 * 
 * NOW USES TrackFlowCore for unified identity and deduplication.
 * TrackFlowCore MUST be loaded before this script.
 * 
 * Usage:
 * const tracker = new CookieFreeJourneyTracker({
 *   apiEndpoint: 'https://your-domain.com/api',
 *   enableTracking: true,
 *   debug: true
 * });
 * 
 * Storage Strategy:
 * - localStorage: Persistent visitor ID, visit count, first visit date, UTM
 * - sessionStorage: Current session ID, journey (expires when browser closes)
 * - In-memory: Real-time interactions, scroll depth
 */

(function() {
  'use strict';

  // ============================================================================
  // TrackFlowCore Integration
  // ============================================================================
  
  /**
   * Get TrackFlowCore or create a minimal fallback
   * TrackFlowCore should be loaded first, but we provide fallback for safety
   */
  function getCore() {
    if (window.TrackFlowCore) {
      return window.TrackFlowCore;
    }
    
    // Fallback implementation if TrackFlowCore isn't loaded yet
    console.warn('🛤️ Journey Tracker: TrackFlowCore not found, using fallback identity');
    return null;
  }

  // Storage keys (used for fallback if TrackFlowCore not available)
  const STORAGE_PREFIX = 'tf_';
  const VISITOR_ID_KEY = STORAGE_PREFIX + 'visitor_id';
  const VISITOR_NAME_KEY = STORAGE_PREFIX + 'visitor_name';
  const FIRST_SEEN_KEY = STORAGE_PREFIX + 'first_seen';
  const SESSION_COUNT_KEY = STORAGE_PREFIX + 'session_count';
  const SESSION_ID_KEY = STORAGE_PREFIX + 'session_id';
  const LAST_ACTIVITY_KEY = STORAGE_PREFIX + 'last_activity';

  // Session timeout in milliseconds (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  /**
   * Generate random ID string (fallback)
   */
  function generateRandomId(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    try {
      const array = new Uint8Array(length);
      crypto.getRandomValues(array);
      for (let i = 0; i < length; i++) {
        result += chars[array[i] % chars.length];
      }
    } catch (e) {
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return result;
  }

  /**
   * Get or create persistent visitor ID
   * Uses TrackFlowCore if available, otherwise fallback
   */
  function getOrCreateVisitorId() {
    const core = getCore();
    if (core) {
      return core.getVisitorId();
    }
    
    // Fallback implementation
    try {
      let visitorId = localStorage.getItem(VISITOR_ID_KEY);
      
      if (!visitorId) {
        visitorId = 'v_' + Date.now().toString(36) + '_' + generateRandomId(12);
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
        localStorage.setItem(FIRST_SEEN_KEY, Date.now().toString());
        localStorage.setItem(SESSION_COUNT_KEY, '0');
      }
      
      return visitorId;
    } catch (error) {
      return 'temp_' + generateRandomId(16);
    }
  }

  /**
   * Get or create session ID
   * Uses TrackFlowCore if available, otherwise fallback
   */
  function getOrCreateSessionId() {
    const core = getCore();
    if (core) {
      return core.getSessionId();
    }
    
    // Fallback implementation
    try {
      let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
      const lastActivity = sessionStorage.getItem(LAST_ACTIVITY_KEY);
      
      const isValid = sessionId && lastActivity && 
        (Date.now() - parseInt(lastActivity, 10)) < SESSION_TIMEOUT;
      
      if (!isValid) {
        sessionId = 's_' + Date.now().toString(36) + '_' + generateRandomId(8);
        sessionStorage.setItem(SESSION_ID_KEY, sessionId);
        
        // Increment session count
        const currentCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
        localStorage.setItem(SESSION_COUNT_KEY, (currentCount + 1).toString());
      }
      
      sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
      return sessionId;
    } catch (error) {
      return 'temp_s_' + generateRandomId(12);
    }
  }

  /**
   * Generate anonymous name from visitor ID (deterministic)
   * Uses TrackFlowCore if available, otherwise fallback
   */
  function generateAnonymousName(visitorId) {
    const core = getCore();
    if (core) {
      return core.getAnonymousName(visitorId);
    }
    
    // Fallback implementation
    const adjectives = [
      'Useful', 'Clever', 'Swift', 'Happy', 'Bright', 'Brave', 'Calm', 'Daring',
      'Eager', 'Fancy', 'Gentle', 'Handy', 'Jolly', 'Kind', 'Lucky', 'Merry',
      'Noble', 'Peppy', 'Quick', 'Rapid', 'Savvy', 'Steady', 'Tender', 'Vivid'
    ];
    const animals = [
      'Mule', 'Fox', 'Eagle', 'Dolphin', 'Owl', 'Wolf', 'Bear', 'Tiger',
      'Lion', 'Falcon', 'Hawk', 'Raven', 'Otter', 'Beaver', 'Badger', 'Panda',
      'Koala', 'Sloth', 'Gecko', 'Toucan', 'Parrot', 'Penguin', 'Seal', 'Moose'
    ];

    let hash = 0;
    for (let i = 0; i < visitorId.length; i++) {
      hash = ((hash << 5) - hash) + visitorId.charCodeAt(i);
      hash = hash & hash;
    }
    hash = Math.abs(hash);

    const adjIndex = hash % adjectives.length;
    const animalIndex = Math.floor(hash / adjectives.length) % animals.length;

    return `${adjectives[adjIndex]} ${animals[animalIndex]}`;
  }

  // ============================================================================
  // Journey Tracker Class
  // ============================================================================
  
  class CookieFreeJourneyTracker {
    constructor(config = {}) {
      this.config = {
        maxJourneyLength: 50,
        sessionTimeout: SESSION_TIMEOUT,
        storagePrefix: 'tf_journey_',
        enableCrossTab: true,
        debug: false,
        apiEndpoint: config.apiEndpoint || null,
        ...config
      };
      
      // Initialize unified identity (using TrackFlowCore if available)
      this.visitorId = getOrCreateVisitorId();
      this.sessionId = getOrCreateSessionId();
      this.anonymousName = this.getOrCreateAnonymousName();
      
      // In-memory state
      this.currentPageStartTime = Date.now();
      this.pageInteractions = [];
      this.scrollDepth = 0;
      this.maxScrollDepth = 0;
      this.geolocationData = null;
      
      // Load or create journey
      this.journey = this.loadJourneyFromSession();
      
      // Setup tracking
      this.setupTracking();
      
      // Fetch geolocation then track page
      this.fetchGeolocation().then(() => {
        this.trackPageVisit();
      });
      
      this.log('✅ Cookie-Free Journey Tracker initialized');
      this.log(`🆔 Visitor ID: ${this.visitorId}`);
      this.log(`🔄 Session ID: ${this.sessionId}`);
      this.log(`👤 Anonymous Name: ${this.anonymousName}`);
      this.log(`🎯 Using TrackFlowCore: ${!!getCore()}`);
    }

    /**
     * Get or create anonymous name for this visitor
     */
    getOrCreateAnonymousName() {
      const core = getCore();
      if (core) {
        return core.getAnonymousName(this.visitorId);
      }
      
      // Fallback
      try {
        let name = localStorage.getItem(VISITOR_NAME_KEY);
        if (!name) {
          name = generateAnonymousName(this.visitorId);
          localStorage.setItem(VISITOR_NAME_KEY, name);
        }
        return name;
      } catch (e) {
        return generateAnonymousName(this.visitorId);
      }
    }

    /**
     * Fetch geolocation data via TrackFlowCore or direct API call
     */
    async fetchGeolocation() {
      const core = getCore();
      
      // Use TrackFlowCore's shared geolocation if available
      if (core) {
        try {
          this.geolocationData = await core.getGeolocation();
          this.log('🌍 Using shared geolocation from TrackFlowCore: ' + this.geolocationData.countryCode);
          return;
        } catch (e) {
          this.log('⚠️ TrackFlowCore geolocation failed, trying direct fetch', 'warning');
        }
      }
      
      // Fallback: Check local cache
      const cached = sessionStorage.getItem(this.config.storagePrefix + 'geo');
      if (cached) {
        try {
          this.geolocationData = JSON.parse(cached);
          this.log('🌍 Using cached geolocation: ' + this.geolocationData.countryCode);
          return;
        } catch (e) {
          // Continue to fetch fresh data
        }
      }

      // Fallback: Direct API call
      try {
        const response = await fetch('https://ipapi.co/json/', {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const data = await response.json();
          this.geolocationData = {
            country: data.country_name || '',
            countryCode: data.country_code || 'unknown',
            region: data.region || '',
            city: data.city || '',
            timezone: data.timezone || ''
          };
          
          sessionStorage.setItem(
            this.config.storagePrefix + 'geo',
            JSON.stringify(this.geolocationData)
          );
          
          this.log('🌍 Geolocation fetched: ' + this.geolocationData.countryCode, 'success');
        }
      } catch (error) {
        this.log('⚠️ Geolocation fetch failed: ' + error.message, 'warning');
        this.geolocationData = { countryCode: 'unknown' };
      }
    }

    initialize() {
      this.log('ℹ️ .initialize() called but not needed - tracker already initialized', 'warning');
      return this;
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

    loadJourneyFromSession() {
      try {
        const key = this.config.storagePrefix + 'session';
        const stored = sessionStorage.getItem(key);
        
        if (stored) {
          const journey = JSON.parse(stored);
          
          const timeSinceLastActivity = Date.now() - journey.lastActivityAt;
          if (timeSinceLastActivity < this.config.sessionTimeout) {
            // Update with current identity
            journey.visitorId = this.visitorId;
            journey.sessionId = this.sessionId;
            journey.anonymousName = this.anonymousName;
            this.log('📖 Restored journey from sessionStorage');
            return journey;
          }
        }
        
        return this.createNewJourney();
      } catch (error) {
        this.log('❌ Error loading journey: ' + error.message, 'error');
        return this.createNewJourney();
      }
    }

    createNewJourney() {
      const journey = {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        anonymousName: this.anonymousName,
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
          visitNumber: this.getVisitCount(),
          daysSinceFirstVisit: this.getDaysSinceFirstVisit()
        }
      };
      
      this.saveJourneyToSession(journey);
      this.log('🆕 Created new journey session', 'success');
      return journey;
    }

    saveJourneyToSession(journey) {
      try {
        const key = this.config.storagePrefix + 'session';
        sessionStorage.setItem(key, JSON.stringify(journey));
        
        if (this.config.enableCrossTab) {
          localStorage.setItem(
            this.config.storagePrefix + 'sync',
            JSON.stringify({
              timestamp: Date.now(),
              visitorId: journey.visitorId,
              sessionId: journey.sessionId,
              action: 'journey_updated'
            })
          );
        }
      } catch (error) {
        this.log('❌ Error saving journey: ' + error.message, 'error');
      }
    }

    getVisitCount() {
      const core = getCore();
      if (core) {
        return core.getVisitCount();
      }
      
      try {
        return parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '1', 10);
      } catch (e) {
        return 1;
      }
    }

    getDaysSinceFirstVisit() {
      const core = getCore();
      if (core) {
        return core.getDaysSinceFirstVisit();
      }
      
      try {
        const firstVisit = localStorage.getItem(FIRST_SEEN_KEY);
        if (!firstVisit) return 0;
        
        const daysDiff = (Date.now() - parseInt(firstVisit, 10)) / (1000 * 60 * 60 * 24);
        return Math.floor(daysDiff);
      } catch (e) {
        return 0;
      }
    }

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

      if (this.journey.pages.length > 0) {
        const previousPage = this.journey.pages[this.journey.pages.length - 1];
        previousPage.exitedAt = Date.now();
        previousPage.timeOnPage = previousPage.exitedAt - previousPage.enteredAt;
      }

      this.journey.pages.push(pageData);
      
      if (this.journey.pages.length > this.config.maxJourneyLength) {
        this.journey.pages.shift();
      }

      this.journey.lastActivityAt = Date.now();
      this.saveJourneyToSession(this.journey);
      
      this.calculateIntentScore();
      
      this.log('📄 Page tracked: ' + pageData.path);
      
      this.sendJourneyUpdate();
      this.trackRealTimePageView(pageData);
    }

    /**
     * Track real-time page view to analytics endpoint
     * NOW WITH DEDUPLICATION via TrackFlowCore
     */
    trackRealTimePageView(pageData) {
      if (!this.config.apiEndpoint) return;

      // Check for duplicate tracking using TrackFlowCore
      const core = getCore();
      if (core && core.isPageViewTracked()) {
        this.log('⏭️ Page view already tracked by TrackFlowCore, skipping duplicate', 'warning');
        return;
      }

      try {
        const countryCode = this.geolocationData?.countryCode || 'unknown';
        
        const payload = {
          events: [{
            eventType: 'page_view',
            pageUrl: pageData.fullUrl,
            visitorId: this.visitorId,
            sessionId: this.sessionId,
            anonymousName: this.anonymousName,
            timestamp: new Date().toISOString(),
            deviceType: this.getDeviceType(),
            countryCode: countryCode,
            browserInfo: {
              userAgent: navigator.userAgent,
              language: navigator.language,
              browser: this.getBrowserInfo()
            },
            eventData: {
              title: pageData.title,
              referrer: pageData.referrer,
              country: this.geolocationData?.country || '',
              countryCode: countryCode,
              source: 'journey_tracker' // Mark the source for debugging
            }
          }]
        };

        this.log(`📤 Sending page_view with visitor: ${this.visitorId}, country: ${countryCode}`);

        fetch(this.config.apiEndpoint + '/analytics/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        })
        .then(() => {
          // Mark as tracked to prevent duplicates
          if (core) {
            core.markPageViewTracked();
            this.log('✅ Page view sent and marked as tracked', 'success');
          }
        })
        .catch(() => {});
      } catch (e) {
        // Ignore errors
      }
    }

    trackEvent(eventData) {
      const event = {
        type: eventData.type || 'generic',
        target: eventData.target || '',
        data: eventData.data || {},
        timestamp: Date.now(),
        pageIndex: this.journey.pages.length - 1,
        page: window.location.pathname
      };

      this.journey.events.push(event);
      this.pageInteractions.push(event);
      
      if (this.journey.pages.length > 0) {
        const currentPage = this.journey.pages[this.journey.pages.length - 1];
        currentPage.interactions.push(event);
      }

      if (this.isIntentSignal(event)) {
        this.journey.intentSignals.push(event);
        this.calculateIntentScore();
        this.log('🎯 Intent signal detected: ' + event.type, 'success');
      }

      this.journey.lastActivityAt = Date.now();
      this.saveJourneyToSession(this.journey);
    }

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

    calculateIntentScore() {
      let score = 0;
      
      const signals = {
        highIntentPages: this.journey.pages.filter(p => 
          /pricing|plans|checkout|cart|buy|purchase/i.test(p.path)
        ).length,
        formInteractions: this.journey.events.filter(e => 
          e.type.includes('form')
        ).length,
        totalTimeMinutes: (Date.now() - this.journey.startedAt) / (60 * 1000),
        pageDepth: this.journey.pages.length,
        visitNumber: this.journey.metadata.visitNumber,
        intentSignals: this.journey.intentSignals.length,
        avgScrollDepth: this.getAverageScrollDepth()
      };

      if (signals.highIntentPages > 0) score += 0.25 * Math.min(signals.highIntentPages / 2, 1);
      if (signals.formInteractions > 0) score += 0.20 * Math.min(signals.formInteractions / 3, 1);
      if (signals.totalTimeMinutes > 2) score += 0.15 * Math.min(signals.totalTimeMinutes / 10, 1);
      if (signals.pageDepth > 2) score += 0.10 * Math.min(signals.pageDepth / 10, 1);
      if (signals.visitNumber > 1) score += 0.15 * Math.min(signals.visitNumber / 5, 1);
      if (signals.intentSignals > 0) score += 0.20 * Math.min(signals.intentSignals / 3, 1);
      if (signals.avgScrollDepth > 50) score += 0.10 * (signals.avgScrollDepth / 100);

      score = Math.min(score, 1);
      
      this.journey.metadata.intentScore = score;
      this.journey.metadata.intentLevel = this.getIntentLevel(score);
      this.journey.metadata.signals = signals;
      
      this.saveJourneyToSession(this.journey);
      
      return score;
    }

    getIntentLevel(score) {
      if (score >= 0.7) return 'high';
      if (score >= 0.4) return 'medium';
      return 'low';
    }

    getAverageScrollDepth() {
      const pagesWithScroll = this.journey.pages.filter(p => p.scrollDepth > 0);
      if (pagesWithScroll.length === 0) return 0;
      
      const total = pagesWithScroll.reduce((sum, p) => sum + p.scrollDepth, 0);
      return total / pagesWithScroll.length;
    }

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

    setupTracking() {
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

      window.addEventListener('beforeunload', () => {
        if (this.journey.pages.length > 0) {
          const currentPage = this.journey.pages[this.journey.pages.length - 1];
          currentPage.exitedAt = Date.now();
          currentPage.timeOnPage = currentPage.exitedAt - currentPage.enteredAt;
          currentPage.scrollDepth = this.scrollDepth;
          this.saveJourneyToSession(this.journey);
          
          this.sendJourneyUpdate(true);
        }
      });

      document.addEventListener('visibilitychange', () => {
        this.journey.lastActivityAt = Date.now();
        this.saveJourneyToSession(this.journey);
      });

      if (this.config.enableCrossTab) {
        window.addEventListener('storage', (e) => {
          if (e.key === this.config.storagePrefix + 'sync') {
            this.log('🔄 Journey synced from another tab');
            this.journey = this.loadJourneyFromSession();
          }
        });
      }

      setInterval(() => {
        if (this.journey.pages.length > 0) {
          const currentPage = this.journey.pages[this.journey.pages.length - 1];
          currentPage.timeOnPage = Date.now() - currentPage.enteredAt;
          this.saveJourneyToSession(this.journey);
        }
      }, 10000);
    }

    async sendJourneyUpdate(isFinal = false) {
      if (!this.config.apiEndpoint) {
        this.log('ℹ️ API endpoint not configured, skipping journey update', 'info');
        return;
      }
      
      try {
        const analytics = this.getAnalytics();
        
        const payload = {
          visitorId: this.visitorId,
          sessionId: this.sessionId,
          anonymousName: this.anonymousName,
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

        const apiUrl = this.config.apiEndpoint + '/journey-update';
        this.log(`📤 Sending journey update to: ${apiUrl}`, 'info');

        if (isFinal && navigator.sendBeacon) {
          const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
          const sent = navigator.sendBeacon(apiUrl, blob);
          this.log(sent ? '✅ Final journey update sent' : '⚠️ sendBeacon failed', sent ? 'success' : 'warning');
        } else {
          fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
          })
          .then(response => {
            if (!response.ok) {
              this.log(`❌ Journey update failed with status ${response.status}`, 'error');
            } else {
              this.log('✅ Journey update sent successfully', 'success');
            }
          })
          .catch(err => {
            this.log('❌ Failed to send journey update: ' + err.message, 'error');
          });
        }
      } catch (error) {
        this.log('❌ Error sending journey update: ' + error.message, 'error');
      }
    }

    captureUTMParameters() {
      const params = new URLSearchParams(window.location.search);
      const utm = {
        source: params.get('utm_source'),
        medium: params.get('utm_medium'),
        campaign: params.get('utm_campaign'),
        term: params.get('utm_term'),
        content: params.get('utm_content')
      };
      
      if (Object.values(utm).some(v => v !== null)) {
        const key = this.config.storagePrefix + 'utm';
        localStorage.setItem(key, JSON.stringify(utm));
      } else {
        const key = this.config.storagePrefix + 'utm';
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (e) {}
        }
      }
      
      return utm;
    }

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
      const core = getCore();
      if (core) {
        return core.getDeviceType();
      }
      
      const ua = navigator.userAgent;
      if (/mobile/i.test(ua)) return 'mobile';
      if (/tablet|ipad/i.test(ua)) return 'tablet';
      return 'desktop';
    }

    getBrowserInfo() {
      const core = getCore();
      if (core) {
        return core.getBrowser();
      }
      
      const ua = navigator.userAgent;
      if (ua.includes('DuckDuckGo')) return 'DuckDuckGo';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Edg')) return 'Edge';
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
      return 'Unknown';
    }

    getOS() {
      const core = getCore();
      if (core) {
        return core.getOS();
      }
      
      const ua = navigator.userAgent;
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'MacOS';
      if (ua.includes('Linux')) return 'Linux';
      if (ua.includes('Android')) return 'Android';
      if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
      return 'Unknown';
    }

    getAnalytics() {
      return {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        anonymousName: this.anonymousName,
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
        utmSource: this.journey.utm?.source || '',
        utmCampaign: this.journey.utm?.campaign || '',
        device: this.journey.device,
        deviceType: this.getDeviceType(),
        browser: this.getBrowserInfo(),
        avgTimePerPage: this.getAverageTimePerPage(),
        avgScrollDepth: this.getAverageScrollDepth(),
        referrer: this.journey.referrer,
        country: this.geolocationData?.country || '',
        countryCode: this.geolocationData?.countryCode || 'unknown',
        startTime: this.journey.startedAt
      };
    }

    getAverageTimePerPage() {
      const pagesWithTime = this.journey.pages.filter(p => p.timeOnPage > 0);
      if (pagesWithTime.length === 0) return 0;
      
      const total = pagesWithTime.reduce((sum, p) => sum + p.timeOnPage, 0);
      return Math.round(total / pagesWithTime.length);
    }

    exportJourney() {
      return {
        journey: this.journey,
        analytics: this.getAnalytics()
      };
    }

    clearJourney() {
      sessionStorage.removeItem(this.config.storagePrefix + 'session');
      this.journey = this.createNewJourney();
      this.log('🧹 Journey cleared', 'success');
    }

    getStorageInfo() {
      const sessionKeys = Object.keys(sessionStorage).filter(k => k.startsWith(this.config.storagePrefix) || k.startsWith(STORAGE_PREFIX));
      const localKeys = Object.keys(localStorage).filter(k => k.startsWith(this.config.storagePrefix) || k.startsWith(STORAGE_PREFIX));
      
      return {
        visitorId: this.visitorId,
        sessionId: this.sessionId,
        anonymousName: this.anonymousName,
        sessionStorage: {
          keys: sessionKeys,
          size: sessionKeys.reduce((sum, k) => sum + (sessionStorage.getItem(k) || '').length, 0)
        },
        localStorage: {
          keys: localKeys,
          size: localKeys.reduce((sum, k) => sum + (localStorage.getItem(k) || '').length, 0)
        },
        cookiesUsed: 0,
        privacyFriendly: true,
        usingTrackFlowCore: !!getCore()
      };
    }
  }

  // Expose globally
  window.CookieFreeJourneyTracker = CookieFreeJourneyTracker;
  window.JourneyTracker = CookieFreeJourneyTracker;
  
  // Only expose TrackFlowIdentity if TrackFlowCore hasn't already done so
  if (!window.TrackFlowIdentity) {
    window.TrackFlowIdentity = {
      getVisitorId: getOrCreateVisitorId,
      getSessionId: getOrCreateSessionId,
      generateAnonymousName
    };
  }
  
  // Auto-initialize if not disabled
  if (!window.DISABLE_AUTO_JOURNEY_TRACKING) {
    window.journeyTracker = new CookieFreeJourneyTracker({
      debug: false,
      apiEndpoint: window.TRACKFLOW_API_ENDPOINT || 'https://trackflow-app-production.up.railway.app/api'
    });
  }
  
})();
