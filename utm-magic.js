// UTM Content Magic Script - Optimized & Cloudflare Compatible
// IMPORTANT: Load with async attribute
// <script src="utm-magic.js" async></script>
(function() {
  'use strict';
  
  // Version tracking
  const SCRIPT_VERSION = '1.5.2';
  
  // Debug mode flag - set to false in production
  const DEBUG = true;
  
  // Performance timing tracking
  const PERF = {
    start: performance.now(),
    apiCall: 0,
    rulesProcessed: 0,
    contentReplaced: 0
  };
  
  // Minimal logging function that only logs in debug mode
  const log = (msg, data) => {
    if (!DEBUG) return;
    if (data) {
      console.log(`UTM Magic: ${msg}`, data);
    } else {
      console.log(`UTM Magic: ${msg}`);
    }
  };
  
  // Clear any existing rule caches
  try {
    localStorage.removeItem('utm_cr'); // CACHE_RULES
    localStorage.removeItem('utm_ct'); // CACHE_TIME
    log('Cleared rule caches to ensure fresh content');
  } catch (e) {
    // Silent fail if localStorage not available
  }
  
  // Get global configuration if any
  const config = window.utmMagicConfig || {};
  
  // Cloudflare compatibility settings
  const retryCount = config.retryCount || 3;
  const retryDelay = config.retryDelay || 1500;
  const cloudflareCompatible = config.cloudflareCompatible !== false;
  
  // Content blocking settings
  const blockUntilReplaced = config.blockUntilReplaced === true;
  const maxBlockingTime = config.maxBlockingTime || 1000;
  
  // Function to make content visible
  const makeContentVisible = () => {
    // Only run if the page has been blocked
    if (blockUntilReplaced && typeof window.utmContentReady === 'function') {
      log('Making content visible');
      window.utmContentReady();
    }
  };
  
  // Ensure content becomes visible even without replacements
  if (blockUntilReplaced) {
    // Set a timeout as a failsafe
    setTimeout(makeContentVisible, maxBlockingTime);
  }
  
  // Extract project ID from the script URL or data attribute
  const getProjectId = () => {
    // Try from config
    if (config.projectId) return config.projectId;
    
    // Try from script data attribute
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    
    if (currentScript.dataset && currentScript.dataset.projectId) {
      return currentScript.dataset.projectId;
    }
    
    // Try from script URL
    const scriptUrl = currentScript.src;
    const projectIdMatch = scriptUrl.match(/\/\/([^.]+)/);
    return projectIdMatch ? projectIdMatch[1] : null;
  };
  
  // Get project ID
  const projectId = getProjectId();
  
  if (!projectId) {
    // Silent fail in production, log in debug
    log('Could not determine project ID');
    makeContentVisible(); // Ensure content is visible even if script fails
    return;
  }
  
  // Add a preload hint immediately
  const addResourceHint = (rel, href) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  };
  
  // Preconnect to API
  addResourceHint('preconnect', `https://${projectId}.supabase.co`);
  
  // Storage keys - use shorter names to reduce storage size
  const KEYS = {
    CLIENT_ID: 'utm_cid',
    SESSION_ID: 'utm_sid',
    VISIT_COUNT: 'utm_vc',
    LAST_ACTIVITY: 'utm_la',
    CACHE_RULES: 'utm_cr',
    CACHE_TIME: 'utm_ct'
  };
  
  // Session timeout - 30 minutes
  const SESSION_TIMEOUT = 30 * 60 * 1000;
  
  // Cache expiration - 1 hour for rules
  const CACHE_EXPIRATION = 60 * 60 * 1000;
  
  // Flag for content replacement status
  let contentReplaced = false;
  
  // Store element selectors for matched rules
  const matchedSelectors = new Set();
  
  // Map of rules by selector for quick lookup
  const selectorRulesMap = new Map();
  
  // Optimized storage access
  const storage = {
    get: (key, defaultValue = null) => {
      try {
        const value = localStorage.getItem(key);
        return value !== null ? value : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },
    
    set: (key, value) => {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        return false;
      }
    },
    
    getJson: (key, defaultValue = null) => {
      try {
        const value = localStorage.getItem(key);
        return value !== null ? JSON.parse(value) : defaultValue;
      } catch (e) {
        return defaultValue;
      }
    },
    
    setJson: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    }
  };
  
  // Get client ID or create new one
  const getClientId = () => {
    let clientId = storage.get(KEYS.CLIENT_ID);
    if (!clientId) {
      clientId = 'utm_' + Math.random().toString(36).substring(2, 15);
      storage.set(KEYS.CLIENT_ID, clientId);
    }
    return clientId;
  };
  
  // Get or create session ID
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem(KEYS.SESSION_ID);
    const lastActivity = storage.get(KEYS.LAST_ACTIVITY);
    
    // Check if we need a new session
    const needNewSession = !sessionId || 
                          !lastActivity || 
                          (Date.now() - parseInt(lastActivity, 10)) > SESSION_TIMEOUT;
    
    if (needNewSession) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem(KEYS.SESSION_ID, sessionId);
      
      // Update visit count
      const visitCount = parseInt(storage.get(KEYS.VISIT_COUNT, '0'), 10) + 1;
      storage.set(KEYS.VISIT_COUNT, visitCount.toString());
    }
    
    // Update last activity
    storage.set(KEYS.LAST_ACTIVITY, Date.now().toString());
    
    return sessionId;
  };
  
  // Get URL parameters
  const getUrlParams = () => {
    const params = {};
    window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, (_, key, value) => {
      params[key] = decodeURIComponent(value);
    });
    return params;
  };
  
  // Fetch with retry for Cloudflare protection
  const fetchWithRetry = async (url, options, attempts = 0) => {
    try {
      const response = await fetch(url, options);
      
      // Check for Cloudflare challenge responses
      if (response.status === 403 || response.status === 503 || response.status === 429 || response.status === 401) {
        if (attempts < retryCount) {
          log(`Cloudflare challenge detected, retrying in ${retryDelay}ms (attempt ${attempts + 1})`);
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempts + 1)));
          return fetchWithRetry(url, options, attempts + 1);
        }
      }
      
      return response;
    } catch (error) {
      if (attempts < retryCount) {
        log(`Fetch error, retrying in ${retryDelay}ms (attempt ${attempts + 1})`, error);
        
        // Wait before retrying with exponential backoff
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempts + 1)));
        return fetchWithRetry(url, options, attempts + 1);
      }
      
      throw error;
    }
  };
  
  // Content replacement function - optimized for performance
  const replaceContent = (element, content) => {
    if (!element || !content) return false;
    
    try {
      const tagName = element.tagName.toLowerCase();
      
      // Handle buttons
      if (tagName === 'button' || (tagName === 'input' && (element.type === 'submit' || element.type === 'button'))) {
        element.textContent = content;
      }
      // Handle inputs
      else if (tagName === 'input') {
        if (element.type === 'text' || element.type === 'email' || element.type === 'tel' || element.type === 'number') {
          element.value = content || '';
          element.setAttribute('placeholder', content || '');
        }
      }
      // Handle links
      else if (tagName === 'a') {
        if (content && (content.startsWith('http') || content.startsWith('/') || content.includes('://'))) {
          element.setAttribute('href', content);
        } else {
          element.innerHTML = content || '';
        }
      }
      // Default
      else {
        element.innerHTML = content || '';
      }
      
      return true;
    } catch (e) {
      log("Error replacing content", e);
      return false;
    }
  };
  
  // Apply a single selector efficiently
  const applySingleSelector = (selector, replacement) => {
    if (matchedSelectors.has(selector)) return true; // Already processed
    
    try {
      const elements = document.querySelectorAll(selector);
      if (!elements?.length) return false;
      
      let success = false;
      
      elements.forEach(element => {
        if (replaceContent(element, replacement)) {
          success = true;
        }
      });
      
      if (success) {
        matchedSelectors.add(selector);
      }
      
      return success;
    } catch (e) {
      log("Error applying selector", e);
      return false;
    }
  };
  
  // Apply content rules efficiently
  const applyContentRules = (rules, params) => {
    if (!rules?.length) {
      // Make content visible immediately if no rules to apply
      if (blockUntilReplaced) makeContentVisible();
      return;
    }
    
    const start = performance.now();
    
    // Group rules by selector
    rules.forEach(rule => {
      if (!matchesCondition(rule, params) || !rule.selector) return;
      
      // Store the latest rule for each selector
      if (!selectorRulesMap.has(rule.selector) || 
          (rule.created_at && selectorRulesMap.get(rule.selector).created_at && 
           new Date(rule.created_at) > new Date(selectorRulesMap.get(rule.selector).created_at))) {
        selectorRulesMap.set(rule.selector, rule);
      }
    });
    
    // Early exit if no matching rules
    if (!selectorRulesMap.size) {
      // Make content visible immediately if no matching rules
      if (blockUntilReplaced) makeContentVisible();
      return;
    }
    
    // Apply rules for above-the-fold elements first
    const applyVisibleRules = () => {
      let appliedCount = 0;
      
      selectorRulesMap.forEach((rule, selector) => {
        if (matchedSelectors.has(selector)) return; // Skip already applied
        
        // Apply rule
        if (applySingleSelector(selector, rule.replacement_content)) {
          appliedCount++;
        }
      });
      
      PERF.contentReplaced = performance.now() - PERF.start;
      contentReplaced = true;
      
      // Make content visible after replacements
      if (blockUntilReplaced) makeContentVisible();
      
      // Optional performance logging
      if (DEBUG) {
        log(`Applied ${appliedCount} rules in ${performance.now() - start}ms`);
        log(`Total time from script start: ${PERF.contentReplaced}ms`);
      }
    };
    
    // Start content replacement immediately
    applyVisibleRules();
    
    // Set up mutation observer for dynamic content
    const setupMutationObserver = () => {
      // Only set up if we have rules for buttons or forms
      const hasButtonRules = Array.from(selectorRulesMap.keys()).some(
        selector => selector.includes('button') || selector.includes('input[type="submit"]')
      );
      
      if (!hasButtonRules) return;
      
      // Create observer
      const observer = new MutationObserver(mutations => {
        let shouldReapply = false;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType !== 1) return; // Not an element
              
              // Check if this is a relevant element
              if ((node.tagName === 'BUTTON' || 
                  (node.tagName === 'INPUT' && node.type === 'submit')) ||
                  (node.querySelectorAll && node.querySelectorAll('button, input[type="submit"]').length)) {
                shouldReapply = true;
              }
            });
          }
        });
        
        if (shouldReapply) {
          applyVisibleRules();
        }
      });
      
      // Start observing
      observer.observe(document.body, { childList: true, subtree: true });
    };
    
    // Set up observer after initial content replacement
    setupMutationObserver();
  };
  
  // Fetch content rules with caching
  const fetchContentRules = async (params) => {
    const apiUrl = `https://${projectId}.supabase.co/functions/v1/utm-content`;
    
    // Add user ID to params - this is required
    const userId = config.userId;
    if (!userId) {
      log("No user ID configured, cannot fetch content rules");
      return { rules: [], error: "No user ID configured" };
    }
    
    // Always add user_id to params
    params.user_id = userId;
    
    const queryString = new URLSearchParams(params).toString();
    log(`Fetching content rules: ${apiUrl}?${queryString}`);
    
    try {
      // Fetch fresh rules - no caching
      PERF.apiCall = performance.now() - PERF.start;
      
      // Use fetchWithRetry for Cloudflare compatibility
      const options = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        mode: 'cors',
        credentials: 'omit'
      };
      
      let response;
      if (cloudflareCompatible) {
        response = await fetchWithRetry(`${apiUrl}?${queryString}`, options);
      } else {
        response = await fetch(`${apiUrl}?${queryString}`, options);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        log(`HTTP error ${response.status}: ${errorText}`);
        throw new Error(`HTTP error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      PERF.rulesProcessed = performance.now() - PERF.start;
      
      log("Content rules fetched successfully", data);
      return data;
    } catch (e) {
      log("Error fetching rules", e);
      return { rules: [], error: e.message };
    }
  };
  
  // Priority content replacement - execute ASAP
  const priorityContentReplacement = async () => {
    if (contentReplaced) {
      // Make sure content is visible if already replaced
      if (blockUntilReplaced) makeContentVisible();
      return;
    }
    
    try {
      const params = getUrlParams();
      
      // No UTM parameters at all - make content visible immediately
      const hasAnyUtmParams = Object.keys(params).some(key => key.startsWith('utm_'));
      if (!hasAnyUtmParams && blockUntilReplaced) {
        makeContentVisible();
        return;
      }
      
      // Fetch rules
      const data = await fetchContentRules(params);
      
      if (data?.rules?.length) {
        // Apply rules immediately
        applyContentRules(data.rules, params);
      } else {
        // No rules - make content visible
        if (blockUntilReplaced) makeContentVisible();
      }
    } catch (e) {
      // Silent fail in production, log in debug
      if (DEBUG) console.error('UTM Magic: Error in priority content replacement:', e);
      
      // Always make content visible in case of error
      if (blockUntilReplaced) makeContentVisible();
    }
  };
  
  // Check if a rule's conditions match parameters
  const matchesCondition = (rule, params) => {
    if (!rule?.condition_type || !rule?.condition_value) return false;
    const utmValue = params[rule.condition_type];
    return utmValue && utmValue === rule.condition_value;
  };
  
  // Initialization with retry for Cloudflare compatibility
  const initWithRetry = async (attempts = 0) => {
    try {
      // Check for Cloudflare challenge
      if (detectCloudflareChallenges()) {
        if (attempts < retryCount) {
          log(`Cloudflare challenge detected, retrying in ${retryDelay}ms (attempt ${attempts + 1})`);
          setTimeout(() => initWithRetry(attempts + 1), retryDelay * (attempts + 1));
          return;
        }
      }
      
      // Skip content rules if already applied by priority function
      if (!contentReplaced) {
        try {
          const params = getUrlParams();
          const data = await fetchContentRules(params);
          
          if (data?.rules?.length) {
            applyContentRules(data.rules, params);
          }
        } catch (e) {
          // Silent fail in production
          if (DEBUG) console.error('UTM Magic: Error in init:', e);
        }
      }
    } catch (e) {
      if (attempts < retryCount) {
        log(`Init error, retrying in ${retryDelay}ms (attempt ${attempts + 1})`, e);
        setTimeout(() => initWithRetry(attempts + 1), retryDelay * (attempts + 1));
      } else {
        log(`Max retry attempts reached, giving up after ${attempts} attempts`, e);
      }
    }
  };
  
  // Start priority content replacement immediately
  if (document.readyState === 'loading') {
    // Use requestIdleCallback with a timeout for priority if available
    if (window.requestIdleCallback) {
      requestIdleCallback(() => priorityContentReplacement(), { timeout: 500 });
    } else {
      // Fallback to immediate execution with minimal timeout
      setTimeout(priorityContentReplacement, 0);
    }
    
    // Also run during the parsing phase
    document.addEventListener('DOMContentLoaded', () => {
      if (!contentReplaced) priorityContentReplacement();
      initWithRetry();
    }, { once: true });
  } else {
    // Document already loaded
    priorityContentReplacement().then(() => initWithRetry());
  }
  
  // Keep session active
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      getSessionId();
    }
  }, { passive: true });
  
  // Update activity periodically
  const activityInterval = setInterval(() => {
    storage.set(KEYS.LAST_ACTIVITY, Date.now().toString());
  }, 60000);
  
  // Check for Cloudflare challenge
  const detectCloudflareChallenges = () => {
    // Common Cloudflare challenge elements
    return !!(
      document.querySelector('iframe[src*="cloudflare"]') || 
      document.querySelector('iframe[src*="challenges.cloudflare"]') ||
      document.getElementById('challenge-running') ||
      document.querySelector('.cf-browser-verification') ||
      document.querySelector('.cf-error-code')
    );
  };
  
  // Expose public API
  window.utmMagic = {
    version: SCRIPT_VERSION,
    retry: () => initWithRetry(),
    makeContentVisible: makeContentVisible,  // Expose function to make content visible
    clearUtmValues: () => {
      // Clear all UTM values from storage
      Object.values(KEYS).forEach(key => {
        try {
          if (key.includes('utm_')) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Silent fail
        }
      });
      log('Cleared all stored UTM values');
      return true;
    }
  };
})();
