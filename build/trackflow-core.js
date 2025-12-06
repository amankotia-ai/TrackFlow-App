/**
 * TrackFlow Core - Unified Identity & Tracking Foundation
 * 
 * Single source of truth for:
 * - Visitor identity (ID, name, session)
 * - Geolocation data (single fetch, shared cache)
 * - Page view tracking deduplication
 * 
 * This module MUST load before JourneyTracker and UnifiedWorkflowSystem
 * to ensure consistent identity across all tracking systems.
 */

(function() {
  'use strict';

  // ============================================================================
  // Storage Keys - Unified across all tracking systems
  // ============================================================================
  const STORAGE_KEYS = {
    VISITOR_ID: 'tf_visitor_id',
    VISITOR_NAME: 'tf_visitor_name',
    SESSION_ID: 'tf_session_id',
    SESSION_COUNT: 'tf_session_count',
    FIRST_SEEN: 'tf_first_seen',
    LAST_ACTIVITY: 'tf_last_activity',
    GEOLOCATION: 'tf_geo',
    PAGE_VIEW_PREFIX: 'tf_pv_'
  };

  // Legacy keys to migrate from (for backward compatibility)
  const LEGACY_KEYS = {
    WORKFLOW_SESSION_ID: 'workflow_session_id',
    WORKFLOW_VISIT_COUNT: 'workflow_visit_count',
    WORKFLOW_GEOLOCATION: 'workflow_geolocation_data',
    JOURNEY_GEO: 'tf_journey_geo'
  };

  // Session timeout in milliseconds (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  // Geolocation cache TTL (1 hour)
  const GEO_CACHE_TTL = 60 * 60 * 1000;

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Generate a cryptographically random ID string
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
      // Fallback for environments without crypto
      for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
      }
    }
    return result;
  }

  /**
   * Generate a deterministic hash from a string
   */
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Safe localStorage getter
   */
  function getLocal(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  /**
   * Safe localStorage setter
   */
  function setLocal(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Safe sessionStorage getter
   */
  function getSession(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  /**
   * Safe sessionStorage setter
   */
  function setSession(key, value) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ============================================================================
  // Identity Management
  // ============================================================================

  /**
   * Get or create a persistent visitor ID
   * Checks for existing IDs from legacy systems and migrates them
   */
  function getVisitorId() {
    // Check unified key first
    let visitorId = getLocal(STORAGE_KEYS.VISITOR_ID);
    
    if (visitorId) {
      return visitorId;
    }

    // Check if this is a new visitor - set first seen timestamp
    const isNewVisitor = !getLocal(STORAGE_KEYS.FIRST_SEEN);
    
    // Generate new visitor ID
    visitorId = 'v_' + Date.now().toString(36) + '_' + generateRandomId(12);
    setLocal(STORAGE_KEYS.VISITOR_ID, visitorId);
    
    if (isNewVisitor) {
      setLocal(STORAGE_KEYS.FIRST_SEEN, Date.now().toString());
      setLocal(STORAGE_KEYS.SESSION_COUNT, '0');
    }

    return visitorId;
  }

  /**
   * Get or create a session ID
   * Sessions expire after 30 minutes of inactivity
   */
  function getSessionId() {
    const lastActivity = getSession(STORAGE_KEYS.LAST_ACTIVITY);
    let sessionId = getSession(STORAGE_KEYS.SESSION_ID);
    
    // Check for legacy session ID
    if (!sessionId) {
      sessionId = getSession(LEGACY_KEYS.WORKFLOW_SESSION_ID);
      if (sessionId) {
        // Migrate to unified key
        setSession(STORAGE_KEYS.SESSION_ID, sessionId);
      }
    }

    const now = Date.now();
    const isValid = sessionId && lastActivity && 
      (now - parseInt(lastActivity, 10)) < SESSION_TIMEOUT;

    if (!isValid) {
      // Create new session
      sessionId = 's_' + Date.now().toString(36) + '_' + generateRandomId(8);
      setSession(STORAGE_KEYS.SESSION_ID, sessionId);
      
      // Increment session count
      const currentCount = parseInt(getLocal(STORAGE_KEYS.SESSION_COUNT) || '0', 10);
      setLocal(STORAGE_KEYS.SESSION_COUNT, (currentCount + 1).toString());
    }

    // Update last activity timestamp
    setSession(STORAGE_KEYS.LAST_ACTIVITY, now.toString());
    
    return sessionId;
  }

  /**
   * Generate a deterministic anonymous name from visitor ID
   * Same visitor ID will always produce the same name
   */
  function getAnonymousName(visitorId) {
    // Check cache first
    const cachedName = getLocal(STORAGE_KEYS.VISITOR_NAME);
    if (cachedName) {
      return cachedName;
    }

    const vid = visitorId || getVisitorId();
    
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

    const hash = hashString(vid);
    const adjIndex = hash % adjectives.length;
    const animalIndex = Math.floor(hash / adjectives.length) % animals.length;
    
    const name = `${adjectives[adjIndex]} ${animals[animalIndex]}`;
    setLocal(STORAGE_KEYS.VISITOR_NAME, name);
    
    return name;
  }

  /**
   * Get visit count for the current visitor
   */
  function getVisitCount() {
    return parseInt(getLocal(STORAGE_KEYS.SESSION_COUNT) || '1', 10);
  }

  /**
   * Get days since first visit
   */
  function getDaysSinceFirstVisit() {
    const firstSeen = getLocal(STORAGE_KEYS.FIRST_SEEN);
    if (!firstSeen) return 0;
    
    const days = (Date.now() - parseInt(firstSeen, 10)) / (1000 * 60 * 60 * 24);
    return Math.floor(days);
  }

  // ============================================================================
  // Geolocation Management
  // ============================================================================

  // In-memory geolocation data (shared across all systems)
  let _geolocationData = null;
  let _geolocationPromise = null;

  /**
   * Get cached geolocation data or fetch it
   * Returns a promise that resolves to geolocation data
   */
  async function getGeolocation() {
    // Return in-memory cache if available
    if (_geolocationData) {
      return _geolocationData;
    }

    // Check sessionStorage cache (survives page reloads within session)
    const cached = getSession(STORAGE_KEYS.GEOLOCATION);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp) < GEO_CACHE_TTL) {
          _geolocationData = parsed.data;
          return _geolocationData;
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    // Check legacy cache keys
    const legacyCaches = [LEGACY_KEYS.WORKFLOW_GEOLOCATION, LEGACY_KEYS.JOURNEY_GEO];
    for (const legacyKey of legacyCaches) {
      const legacyCached = getSession(legacyKey);
      if (legacyCached) {
        try {
          const parsed = JSON.parse(legacyCached);
          if (parsed && parsed.countryCode) {
            _geolocationData = parsed;
            // Migrate to unified cache
            setSession(STORAGE_KEYS.GEOLOCATION, JSON.stringify({
              data: _geolocationData,
              timestamp: Date.now()
            }));
            return _geolocationData;
          }
        } catch (e) {
          // Continue to next key
        }
      }
    }

    // If already fetching, return the existing promise
    if (_geolocationPromise) {
      return _geolocationPromise;
    }

    // Fetch fresh geolocation data
    _geolocationPromise = fetchGeolocation();
    return _geolocationPromise;
  }

  /**
   * Fetch geolocation data from IP-based service
   */
  async function fetchGeolocation() {
    try {
      // Try ipapi.co first (free, reliable, 1000 requests/day)
      const response = await fetch('https://ipapi.co/json/', {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        _geolocationData = {
          country: data.country_name || '',
          countryCode: data.country_code || 'unknown',
          region: data.region || '',
          city: data.city || '',
          postalCode: data.postal || '',
          timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          isp: data.org || ''
        };

        // Cache the result
        setSession(STORAGE_KEYS.GEOLOCATION, JSON.stringify({
          data: _geolocationData,
          timestamp: Date.now()
        }));

        _geolocationPromise = null;
        return _geolocationData;
      }
    } catch (error) {
      // Primary service failed, try fallback
    }

    // Fallback to ip-api.com
    try {
      const response = await fetch('http://ip-api.com/json/', {
        method: 'GET'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          _geolocationData = {
            country: data.country || '',
            countryCode: data.countryCode || 'unknown',
            region: data.regionName || '',
            city: data.city || '',
            postalCode: data.zip || '',
            timezone: data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            latitude: data.lat || 0,
            longitude: data.lon || 0,
            isp: data.isp || ''
          };

          // Cache the result
          setSession(STORAGE_KEYS.GEOLOCATION, JSON.stringify({
            data: _geolocationData,
            timestamp: Date.now()
          }));

          _geolocationPromise = null;
          return _geolocationData;
        }
      }
    } catch (error) {
      // Fallback also failed
    }

    // Return default data if all services fail
    _geolocationData = {
      country: '',
      countryCode: 'unknown',
      region: '',
      city: '',
      postalCode: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      latitude: 0,
      longitude: 0,
      isp: ''
    };

    _geolocationPromise = null;
    return _geolocationData;
  }

  // ============================================================================
  // Page View Deduplication
  // ============================================================================

  /**
   * Generate a unique key for the current page view
   * Based on session ID and page URL (normalized)
   */
  function getPageViewKey() {
    const sessionId = getSessionId();
    const pageUrl = window.location.pathname + window.location.search;
    // Create a short hash of the URL to avoid storage key length issues
    const urlHash = hashString(pageUrl).toString(36);
    return STORAGE_KEYS.PAGE_VIEW_PREFIX + sessionId + '_' + urlHash;
  }

  /**
   * Check if the current page view has already been tracked
   */
  function isPageViewTracked() {
    const key = getPageViewKey();
    return getSession(key) === '1';
  }

  /**
   * Mark the current page view as tracked
   */
  function markPageViewTracked() {
    const key = getPageViewKey();
    setSession(key, '1');
  }

  /**
   * Clear page view tracking (for testing purposes)
   */
  function clearPageViewTracking() {
    const key = getPageViewKey();
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      // Ignore errors
    }
  }

  // ============================================================================
  // Device & Browser Detection
  // ============================================================================

  /**
   * Get device type based on viewport/user agent
   */
  function getDeviceType() {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet|ipad/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  /**
   * Get browser name from user agent
   */
  function getBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('DuckDuckGo')) return 'DuckDuckGo';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    return 'Unknown';
  }

  /**
   * Get operating system from user agent
   */
  function getOS() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'MacOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  }

  // ============================================================================
  // Centralized Page View Tracking
  // ============================================================================

  /**
   * Track a page view event to the analytics endpoint
   * This is the single source of truth for page view tracking
   * 
   * @param {Object} options - Tracking options
   * @param {string} options.apiEndpoint - API endpoint URL
   * @param {boolean} options.force - Force tracking even if already tracked
   * @param {Object} options.additionalData - Additional data to include
   * @returns {Promise<boolean>} - True if tracking was sent, false if skipped
   */
  async function trackPageView(options = {}) {
    const {
      apiEndpoint = 'https://trackflow-app-production.up.railway.app/api',
      force = false,
      additionalData = {}
    } = options;

    // Check if already tracked (unless forced)
    if (!force && isPageViewTracked()) {
      console.log('%c🛤️ TrackFlow Core: Page view already tracked, skipping duplicate', 'color: #f59e0b');
      return false;
    }

    try {
      // Get all required data
      const visitorId = getVisitorId();
      const sessionId = getSessionId();
      const anonymousName = getAnonymousName(visitorId);
      const geo = await getGeolocation();
      const deviceType = getDeviceType();
      const browser = getBrowser();

      const payload = {
        events: [{
          eventType: 'page_view',
          pageUrl: window.location.href,
          visitorId: visitorId,
          sessionId: sessionId,
          anonymousName: anonymousName,
          timestamp: new Date().toISOString(),
          deviceType: deviceType,
          countryCode: geo.countryCode || 'unknown',
          browserInfo: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            browser: browser
          },
          eventData: {
            title: document.title,
            referrer: document.referrer,
            country: geo.country || '',
            countryCode: geo.countryCode || 'unknown',
            ...additionalData
          }
        }]
      };

      // Send tracking request
      await fetch(apiEndpoint + '/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });

      // Mark as tracked
      markPageViewTracked();
      
      console.log('%c🛤️ TrackFlow Core: Page view tracked successfully', 'color: #10b981');
      return true;

    } catch (error) {
      console.error('TrackFlow Core: Failed to track page view:', error.message);
      return false;
    }
  }

  // ============================================================================
  // Full Identity Object (for convenience)
  // ============================================================================

  /**
   * Get complete visitor identity object
   */
  function getFullIdentity() {
    const visitorId = getVisitorId();
    return {
      visitorId: visitorId,
      sessionId: getSessionId(),
      anonymousName: getAnonymousName(visitorId),
      visitCount: getVisitCount(),
      daysSinceFirstVisit: getDaysSinceFirstVisit(),
      deviceType: getDeviceType(),
      browser: getBrowser(),
      os: getOS()
    };
  }

  // ============================================================================
  // Export Public API
  // ============================================================================

  const TrackFlowCore = {
    // Identity
    getVisitorId,
    getSessionId,
    getAnonymousName,
    getVisitCount,
    getDaysSinceFirstVisit,
    getFullIdentity,

    // Geolocation
    getGeolocation,

    // Page View Deduplication
    isPageViewTracked,
    markPageViewTracked,
    clearPageViewTracking,

    // Centralized Tracking
    trackPageView,

    // Device & Browser
    getDeviceType,
    getBrowser,
    getOS,

    // Storage Keys (for debugging/migration)
    STORAGE_KEYS,

    // Version
    version: '1.0.0'
  };

  // Expose globally
  window.TrackFlowCore = TrackFlowCore;

  // Also expose as TrackFlowIdentity for backward compatibility
  // (JourneyTracker exposes this, so we ensure it's always available)
  if (!window.TrackFlowIdentity) {
    window.TrackFlowIdentity = {
      getVisitorId,
      getSessionId,
      generateAnonymousName: getAnonymousName
    };
  }

  // Initialize identity on load (ensures visitor ID exists)
  getVisitorId();
  getSessionId();

  console.log('%c🎯 TrackFlow Core v1.0.0 initialized', 'color: #3b82f6; font-weight: bold');

})();

