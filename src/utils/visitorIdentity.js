/**
 * Unified Visitor Identity Module
 * 
 * Provides consistent visitor and session identification across all tracking scripts.
 * Uses localStorage for persistent visitor IDs and sessionStorage for session IDs.
 * 
 * This module solves the duplicate session problem by ensuring all trackers
 * use the same visitor/session IDs instead of generating their own.
 */

(function() {
  'use strict';

  const STORAGE_PREFIX = 'tf_';
  const VISITOR_ID_KEY = STORAGE_PREFIX + 'visitor_id';
  const SESSION_ID_KEY = STORAGE_PREFIX + 'session_id';
  const VISITOR_NAME_KEY = STORAGE_PREFIX + 'visitor_name';
  const FIRST_SEEN_KEY = STORAGE_PREFIX + 'first_seen';
  const SESSION_COUNT_KEY = STORAGE_PREFIX + 'session_count';
  const LAST_SESSION_KEY = STORAGE_PREFIX + 'last_session';

  // Session timeout in milliseconds (30 minutes)
  const SESSION_TIMEOUT = 30 * 60 * 1000;

  /**
   * Generate a random ID string
   * @param {number} length - Length of the ID
   * @returns {string} Random ID
   */
  function generateRandomId(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }

  /**
   * Get or create a persistent visitor ID
   * Stored in localStorage to survive browser restarts
   * @returns {string} Visitor ID
   */
  function getOrCreateVisitorId() {
    try {
      let visitorId = localStorage.getItem(VISITOR_ID_KEY);
      
      if (!visitorId) {
        // Generate new visitor ID with timestamp prefix for rough ordering
        visitorId = 'v_' + Date.now().toString(36) + '_' + generateRandomId(12);
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
        localStorage.setItem(FIRST_SEEN_KEY, Date.now().toString());
        localStorage.setItem(SESSION_COUNT_KEY, '0');
        
        console.log('🆔 New visitor ID created:', visitorId);
      }
      
      return visitorId;
    } catch (error) {
      // Fallback for private browsing or storage disabled
      console.warn('⚠️ localStorage unavailable, using temporary visitor ID');
      return 'temp_' + generateRandomId(16);
    }
  }

  /**
   * Get or create a session ID
   * Stored in sessionStorage to reset on browser close
   * @returns {string} Session ID
   */
  function getOrCreateSessionId() {
    try {
      let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
      const lastActivity = sessionStorage.getItem(STORAGE_PREFIX + 'last_activity');
      
      // Check if session is still valid (within timeout)
      const isSessionValid = sessionId && lastActivity && 
        (Date.now() - parseInt(lastActivity, 10)) < SESSION_TIMEOUT;
      
      if (!isSessionValid) {
        // Generate new session ID
        sessionId = 's_' + Date.now().toString(36) + '_' + generateRandomId(8);
        sessionStorage.setItem(SESSION_ID_KEY, sessionId);
        
        // Increment session count in localStorage
        incrementSessionCount();
        
        console.log('🔄 New session ID created:', sessionId);
      }
      
      // Update last activity timestamp
      sessionStorage.setItem(STORAGE_PREFIX + 'last_activity', Date.now().toString());
      
      return sessionId;
    } catch (error) {
      // Fallback for private browsing or storage disabled
      console.warn('⚠️ sessionStorage unavailable, using temporary session ID');
      return 'temp_s_' + generateRandomId(12);
    }
  }

  /**
   * Increment session count (called when new session starts)
   */
  function incrementSessionCount() {
    try {
      const currentCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
      const newCount = currentCount + 1;
      localStorage.setItem(SESSION_COUNT_KEY, newCount.toString());
      localStorage.setItem(LAST_SESSION_KEY, Date.now().toString());
      return newCount;
    } catch (error) {
      return 1;
    }
  }

  /**
   * Get visitor statistics
   * @returns {Object} Visitor stats
   */
  function getVisitorStats() {
    try {
      const firstSeen = localStorage.getItem(FIRST_SEEN_KEY);
      const sessionCount = localStorage.getItem(SESSION_COUNT_KEY);
      const lastSession = localStorage.getItem(LAST_SESSION_KEY);
      
      return {
        visitorId: getOrCreateVisitorId(),
        firstSeen: firstSeen ? new Date(parseInt(firstSeen, 10)) : new Date(),
        sessionCount: parseInt(sessionCount || '1', 10),
        lastSession: lastSession ? new Date(parseInt(lastSession, 10)) : new Date(),
        daysSinceFirstVisit: firstSeen 
          ? Math.floor((Date.now() - parseInt(firstSeen, 10)) / (1000 * 60 * 60 * 24))
          : 0
      };
    } catch (error) {
      return {
        visitorId: getOrCreateVisitorId(),
        firstSeen: new Date(),
        sessionCount: 1,
        lastSession: new Date(),
        daysSinceFirstVisit: 0
      };
    }
  }

  /**
   * Get current visitor and session IDs together
   * @returns {Object} { visitorId, sessionId }
   */
  function getIdentity() {
    return {
      visitorId: getOrCreateVisitorId(),
      sessionId: getOrCreateSessionId()
    };
  }

  /**
   * Update last activity timestamp (call on user interactions)
   */
  function updateActivity() {
    try {
      sessionStorage.setItem(STORAGE_PREFIX + 'last_activity', Date.now().toString());
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Check if this is a new visitor (first session ever)
   * @returns {boolean}
   */
  function isNewVisitor() {
    try {
      const sessionCount = parseInt(localStorage.getItem(SESSION_COUNT_KEY) || '0', 10);
      return sessionCount <= 1;
    } catch (error) {
      return true;
    }
  }

  /**
   * Check if this is a returning visitor
   * @returns {boolean}
   */
  function isReturningVisitor() {
    return !isNewVisitor();
  }

  /**
   * Get stored anonymous name or null if not set
   * @returns {string|null}
   */
  function getStoredName() {
    try {
      return localStorage.getItem(VISITOR_NAME_KEY);
    } catch (error) {
      return null;
    }
  }

  /**
   * Store anonymous name for visitor
   * @param {string} name
   */
  function setStoredName(name) {
    try {
      localStorage.setItem(VISITOR_NAME_KEY, name);
    } catch (error) {
      // Silently fail
    }
  }

  // Export for different module systems
  const VisitorIdentity = {
    getOrCreateVisitorId,
    getOrCreateSessionId,
    getIdentity,
    getVisitorStats,
    updateActivity,
    isNewVisitor,
    isReturningVisitor,
    getStoredName,
    setStoredName,
    STORAGE_PREFIX,
    SESSION_TIMEOUT
  };

  // Export for ES modules
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisitorIdentity;
  }

  // Export for browser global
  if (typeof window !== 'undefined') {
    window.VisitorIdentity = VisitorIdentity;
  }

  // Export for AMD
  if (typeof define === 'function' && define.amd) {
    define([], function() { return VisitorIdentity; });
  }

})();

