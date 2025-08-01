/**
 * Unified Workflow System
 * Single, robust system for workflow automation
 * Eliminates the complexity of dual execution paths
 * Enhanced with unique element targeting capabilities
 */

(function() {
  'use strict';
  
  class UnifiedWorkflowSystem {
    constructor(config = {}) {
      this.config = {
        apiEndpoint: 'https://trackflow-app-production.up.railway.app',
        apiKey: null, // Add API key support
        debug: true, // Enable debug by default to help troubleshooting
        retryAttempts: 3,
        executionDelay: 100,
        hideContentDuringInit: true,
        maxInitTime: 5000, // Increased timeout
        elementWaitTimeout: 12000, // Base timeout for elements - increased for heavy pages
        heavyPageTimeout: 20000, // Extended timeout for heavy pages
        maxRetryAttempts: 3, // Number of retry attempts for element waiting
        retryBackoffMultiplier: 1.3, // Exponential backoff for retries
        showLoadingIndicator: true, // Show loading spinner
        progressive: true, // Show content progressively as modifications complete
        ...config
      };
      
      this.workflows = new Map();
      this.executedActions = new Set();
      this.executedWorkflows = new Set(); // Track executed workflows to prevent duplicates
      this.triggeredWorkflows = new Map(); // Cache triggered workflows to prevent re-triggering
      this.processingWorkflows = false; // Flag to prevent recursive processWorkflows calls
      
      // SIMPLE: Track which workflow nodes have already executed this page load
      this.executedNodes = new Set(); // Track nodes that have already run - NEVER run again
      this.geolocationData = null; // Initialize geolocation data
      this.pageContext = this.getPageContext();
      this.userContext = this.getUserContext();
      this.contentHidden = false;
      this.initialized = false;
      this.loadingIndicatorShown = false;
      this.elementsToWaitFor = new Set(); // Track elements we're waiting for
      this.completedModifications = new Set(); // Track completed modifications
      this.processedSelectors = new Set(); // Track processed selectors to prevent duplicates
      this.selectorRulesMap = new Map(); // Map selectors to rules for efficient processing
      this.mutationObserver = null; // For dynamic content tracking
      this.lastScrollCheck = 0; // Throttle scroll events
      this.lastTimeCheck = 0;
      
      // NEW: Modal state tracking and close button detection
      this.activeModals = new Set(); // Track currently visible modals
      this.modalShowHistory = new Map(); // Track when modals were last shown
      this.dismissClickCache = new Set(); // Cache dismiss/close button clicks
      
      // Common close button patterns
      this.closeButtonPatterns = [
        /close/i,
        /dismiss/i,
        /cancel/i,
        /x/i,
        /✕/,
        /×/,
        /❌/,
        /🗙/
      ];
      
      // Close button selectors
      this.closeButtonSelectors = [
        '[data-dismiss]',
        '[data-close]',
        '.close',
        '.dismiss',
        '.modal-close',
        '.popup-close',
        '.btn-close',
        '.close-btn',
        '.cancel',
        '.cancel-btn'
      ];
      
      this.log('🎯 Unified Workflow System: Initialized with modal loop prevention');
    }

    /**
     * Enhanced logging with proper debug mode check
     */
    log(message, level = 'info', data = null) {
      if (!this.config.debug && level !== 'error') return;
      
      const prefix = '🎯 Unified Workflow System:';
      const timestamp = new Date().toLocaleTimeString();
      
      switch (level) {
        case 'error':
          console.error(`${prefix} [${timestamp}] ❌ ${message}`, data || '');
          break;
        case 'warning':
          console.warn(`${prefix} [${timestamp}] ⚠️ ${message}`, data || '');
          break;
        case 'success':
          console.log(`${prefix} [${timestamp}] ✅ ${message}`, data || '');
          break;
        default:
          console.log(`${prefix} [${timestamp}] ${message}`, data || '');
      }
    }

    /**
     * Initialize the workflow system
     */
    async initialize() {
      if (this.initialized) {
        this.log('⚠️ System already initialized', 'warning');
        return;
      }

      try {
        this.log('🚀 Initializing unified workflow system...');
        
        // Fetch geolocation data first (for geo-based triggers)
        await this.fetchGeolocationData();
        
        // Fetch all active workflows first - this is CRITICAL
        await this.fetchWorkflows();
        this.log(`📊 Workflows loaded: ${this.workflows.size} workflows available`);
        
        // Execute priority actions immediately (like utm-magic.js priority execution)
        await this.executePriorityActions();
        
        // Process all immediate triggers (page load, device type, etc.)
        await this.processImmediateTriggers();
        
        // Set up event listeners for dynamic triggers
        this.setupEventListeners();
        
        // Set up element visibility tracking for visibility triggers
        this.setupElementVisibilityTracking();
        
        // Set up element hover tracking for hover triggers
        this.setupElementHoverTracking();
        
        // Set up user inactivity tracking for inactivity triggers
        this.setupUserInactivityTracking();
        
        // Set up visit count tracking for repeat visitor triggers
        this.setupVisitCountTracking();
        
        // Set up mutation observer for dynamic content
        this.setupMutationObserver();
        
        // Wait for all pending element operations to complete
        await this.waitForAllModifications();
        
        // Show content after all modifications are complete
        this.showContent();
        
        this.initialized = true;
        this.log('✅ Unified workflow system ready!', 'success');
        
      } catch (error) {
        this.log(`❌ Initialization failed: ${error.message}`, 'error');
        this.showContent(); // Show content even if initialization fails
      }
    }

    /**
     * Fetch geolocation data using IP-based service
     */
    async fetchGeolocationData() {
      // Check if geolocation data is already cached in session
      const cached = sessionStorage.getItem('workflow_geolocation_data');
      if (cached) {
        try {
          this.geolocationData = JSON.parse(cached);
          this.log('🌍 Using cached geolocation data', 'info', this.geolocationData);
          return;
        } catch (e) {
          this.log('⚠️ Invalid cached geolocation data, fetching fresh', 'warning');
        }
      }

      try {
        this.log('🌍 Fetching geolocation data...');
        
        // Try ipapi.co first (free, reliable)
        let geoData = null;
        try {
          const response = await fetch('https://ipapi.co/json/', {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            geoData = {
              country: data.country_name || '',
              countryCode: data.country_code || '',
              region: data.region || '',
              city: data.city || '',
              postalCode: data.postal || '',
              timezone: data.timezone || '',
              latitude: data.latitude || 0,
              longitude: data.longitude || 0,
              isp: data.org || '',
              ipType: this.determineIPType(data.org || ''),
              asn: data.asn || ''
            };
          }
        } catch (error) {
          this.log(`⚠️ ipapi.co failed: ${error.message}`, 'warning');
        }

        // Fallback to ip-api.com if ipapi.co fails
        if (!geoData) {
          try {
            const response = await fetch('http://ip-api.com/json/', {
              method: 'GET'
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.status === 'success') {
                geoData = {
                  country: data.country || '',
                  countryCode: data.countryCode || '',
                  region: data.regionName || '',
                  city: data.city || '',
                  postalCode: data.zip || '',
                  timezone: data.timezone || '',
                  latitude: data.lat || 0,
                  longitude: data.lon || 0,
                  isp: data.isp || '',
                  ipType: this.determineIPType(data.isp || ''),
                  asn: data.as || ''
                };
              }
            }
          } catch (error) {
            this.log(`⚠️ ip-api.com also failed: ${error.message}`, 'warning');
          }
        }

        if (geoData) {
          this.geolocationData = geoData;
          // Cache for the session to avoid repeated API calls
          sessionStorage.setItem('workflow_geolocation_data', JSON.stringify(geoData));
          this.log('🌍 Geolocation data fetched successfully', 'success', geoData);
        } else {
          this.log('❌ Failed to fetch geolocation data from all sources', 'error');
          // Set minimal fallback data
          this.geolocationData = {
            country: '',
            countryCode: '',
            region: '',
            city: '',
            postalCode: '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            latitude: 0,
            longitude: 0,
            isp: '',
            ipType: '',
            asn: ''
          };
        }
        
      } catch (error) {
        this.log(`❌ Geolocation fetch error: ${error.message}`, 'error');
        this.geolocationData = null;
      }
    }

    /**
     * Determine IP type based on ISP/Organization name
     */
    determineIPType(orgName) {
      const org = orgName.toLowerCase();
      if (org.includes('mobile') || org.includes('cellular') || org.includes('wireless')) {
        return 'Mobile';
      } else if (org.includes('business') || org.includes('enterprise') || org.includes('corporate')) {
        return 'Business';
      } else if (org.includes('residential') || org.includes('broadband') || org.includes('cable')) {
        return 'Residential';
      }
      return 'Unknown';
    }

    /**
     * Fetch active workflows from the server
     */
    async fetchWorkflows() {
      try {
        const url = `${this.config.apiEndpoint}/api/workflows/active?url=${encodeURIComponent(window.location.href)}`;
        this.log(`📡 Fetching workflows from: ${url}`);
        
        // Prepare headers for API key authentication if available
        const headers = {};
        if (this.config.apiKey) {
          headers['X-API-Key'] = this.config.apiKey;
          this.log('🔑 Using API key authentication');
        }
        
        const response = await fetch(url, { headers });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.workflows) {
          // Store workflows in Map for efficient lookup
          data.workflows.forEach(workflow => {
            this.workflows.set(workflow.id, workflow);
          });
          
          this.log(`✅ Loaded ${data.workflows.length} active workflows`);
          return data.workflows;
        }
        
        this.log('⚠️ No active workflows found', 'warning');
        return [];
        
      } catch (error) {
        this.log(`❌ Failed to fetch workflows: ${error.message}`, 'error');
        return [];
      }
    }

    /**
     * Set up mutation observer for dynamic content
     */
    setupMutationObserver() {
      // Only set up if we have content replacement rules
      const hasContentRules = Array.from(this.selectorRulesMap.keys()).some(
        selector => selector.includes('button') || selector.includes('input') || selector.includes('a')
      );
      
      if (!hasContentRules) {
        this.log('No content replacement rules found, skipping mutation observer');
        return;
      }
      
      this.mutationObserver = new MutationObserver(mutations => {
        // Prevent mutation observer from triggering workflow processing
        // Only reapply existing content rules, don't trigger new workflows
        let shouldReapply = false;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length) {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType !== 1) return; // Not an element
              
              // Check if this is a relevant element for content replacement only
              if (this.isRelevantElement(node)) {
                shouldReapply = true;
              }
            });
          }
        });
        
        if (shouldReapply) {
          this.log('New relevant elements detected, reapplying content rules only (no workflow triggers)');
          // Only reapply content rules, don't process workflows
          this.reapplyContentRules();
        }
      });
      
      // Start observing
      if (document.body) {
        this.mutationObserver.observe(document.body, { 
          childList: true, 
          subtree: true 
        });
        this.log('Mutation observer setup for dynamic content (content replacement only)');
      }
    }

    /**
     * Check if an element is relevant for our rules
     */
    isRelevantElement(node) {
      if (!node.tagName) return false;
      
      const tagName = node.tagName.toLowerCase();
      const relevantTags = ['button', 'input', 'a', 'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
      
      if (relevantTags.includes(tagName)) return true;
      
      // Check if it contains relevant elements
      if (node.querySelectorAll) {
        return node.querySelectorAll('button, input, a, [class*="btn"], [class*="cta"]').length > 0;
      }
      
      return false;
    }

    /**
     * Reapply content rules to new elements
     */
    reapplyContentRules() {
      if (this.selectorRulesMap.size === 0) return;
      
      let appliedCount = 0;
      
      this.selectorRulesMap.forEach((rule, selector) => {
        // Don't skip already processed selectors for dynamic content
        if (this.applySingleSelector(selector, rule, false)) {
          appliedCount++;
        }
      });
      
      if (appliedCount > 0) {
        this.log(`Reapplied ${appliedCount} rules to new elements`);
      }
    }

    /**
     * Process triggers that fire immediately on page load
     */
    async processImmediateTriggers() {
      const eventData = {
        eventType: 'page_load',
        deviceType: this.pageContext.deviceType,
        visitCount: 1,
        timeOnPage: 0,
        scrollPercentage: 0,
        utm: this.pageContext.utm,
        geolocation: this.geolocationData, // Include geolocation data for geo triggers
        ...this.userContext
      };
      
      this.log(`🚀 Processing immediate triggers with data:`, 'info', eventData);
      await this.processWorkflows(eventData);
    }

    /**
     * Priority execution for critical actions that need to run ASAP
     */
    async executePriorityActions() {
      this.log('⚡ Executing priority content replacement actions...');
      
      if (this.workflows.size === 0) {
        this.log('⚠️ No workflows loaded yet, skipping priority execution', 'warning');
        return;
      }
      
      // Execute content replacement actions immediately for visible elements
      const priorityActions = [];
      
      this.log(`🔍 Checking ${this.workflows.size} workflows for priority actions`);
      
      this.workflows.forEach(workflow => {
        // Check both is_active and isActive properties for compatibility
        const isActive = workflow.is_active ?? workflow.isActive ?? true; // Default to true if missing
        this.log(`📋 Checking workflow: ${workflow.name} (active: ${isActive}, is_active: ${workflow.is_active}, isActive: ${workflow.isActive})`);
        
        if (!isActive) {
          this.log(`⏭️ Skipping inactive workflow: ${workflow.name}`);
          return;
        }
        
        const triggerNodes = workflow.nodes?.filter(node => node.type === 'trigger') || [];
        this.log(`🎯 Found ${triggerNodes.length} trigger nodes in workflow: ${workflow.name}`);
        
        triggerNodes.forEach(trigger => {
          // Check immediate triggers (device type, UTM, page load, geolocation)
          const immediateEventData = {
            eventType: 'page_load',
            deviceType: this.pageContext.deviceType,
            utm: this.pageContext.utm,
            geolocation: this.geolocationData
          };
          
          this.log(`🔍 Evaluating trigger "${trigger.name}" with data:`, 'info', {
            trigger: trigger.config,
            eventData: immediateEventData
          });
          
          const triggerResult = this.evaluateTrigger(trigger, immediateEventData);
          this.log(`📊 Trigger "${trigger.name}" result: ${triggerResult}`);
          
          if (triggerResult) {
            this.log(`✅ Trigger matched! Finding connected actions...`);
            const actions = this.getConnectedActions(workflow, trigger.id);
            const contentActions = actions.filter(action => action.name === 'Replace Text');
            this.log(`🎬 Found ${contentActions.length} content replacement actions`);
            priorityActions.push(...contentActions);
          } else {
            this.log(`❌ Trigger did not match`);
          }
        });
      });
      
      this.log(`🎯 Total priority actions found: ${priorityActions.length}`);
      
      if (priorityActions.length > 0) {
        this.log(`🚀 Executing ${priorityActions.length} priority content actions`, 'success');
        const promises = priorityActions.map(action => this.executeAction(action));
        await Promise.all(promises);
      } else {
        this.log(`⚠️ No priority actions found to execute`, 'warning');
      }
    }

    /**
     * Set up event listeners for dynamic triggers
     */
    setupEventListeners() {
      // Scroll depth tracking with proper throttling
      let scrollTimeout;
      window.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          const now = Date.now();
          // Only check scroll every 5 seconds to prevent spam
          if (now - this.lastScrollCheck < 5000) {
            return;
          }
          this.lastScrollCheck = now;
          
          const scrollPercentage = Math.round(
            (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
          );
          
          // Only trigger on meaningful scroll milestones
          if (scrollPercentage >= 25 && scrollPercentage % 25 === 0) {
            this.handleEvent({
              eventType: 'scroll',
              scrollPercentage,
              timestamp: now
            });
          }
        }, 500); // Increased throttle to 500ms
      });

      // Time on page tracking - much less frequent and with caching
      let timeOnPage = 0;
      const timeInterval = setInterval(() => {
        timeOnPage += 10; // Increment by 10 seconds
        const now = Date.now();
        
        // Only check time-based triggers every 30 seconds
        if (now - this.lastTimeCheck < 30000) {
          return;
        }
        this.lastTimeCheck = now;
        
        // Only trigger on meaningful time milestones (30s, 60s, 120s, etc.)
        if (timeOnPage === 30 || timeOnPage === 60 || timeOnPage === 120 || timeOnPage === 300) {
          this.handleEvent({
            eventType: 'time_on_page',
            timeOnPage,
            timestamp: now
          });
        }
      }, 10000); // Check every 10 seconds instead of every second

      // Click tracking - single execution per click with close button detection
      document.addEventListener('click', (event) => {
        const selector = this.generateSelector(event.target);
        
        // NEW: Detect and ignore close button clicks to prevent modal loops
        if (this.isCloseButton(event.target)) {
          this.log(`🚫 Ignoring close button click: ${selector}`, 'info');
          
          // Track this as a dismiss action and clean up modal state
          const dismissKey = `dismiss-${selector}-${Date.now()}`;
          this.dismissClickCache.add(dismissKey);
          
          // Clean up dismiss cache
          setTimeout(() => {
            this.dismissClickCache.delete(dismissKey);
          }, 1000);
          
          return; // Don't process workflows for close button clicks
        }
        
        const clickKey = `click-${selector}-${Date.now()}`;
        
        // Prevent duplicate click events
        if (this.executedActions.has(clickKey)) {
          return;
        }
        this.executedActions.add(clickKey);
        
        this.handleEvent({
          eventType: 'click',
          elementSelector: selector,
          element: event.target,
          timestamp: Date.now()
        });
      });

      // Exit intent detection - only once per session
      let exitIntentTriggered = false;
      document.addEventListener('mouseleave', (event) => {
        if (event.clientY <= 0 && !exitIntentTriggered) {
          exitIntentTriggered = true;
          this.handleEvent({
            eventType: 'exit_intent',
            timestamp: Date.now()
          });
        }
      });

      this.log('👂 Event listeners configured with proper throttling');
    }

    /**
     * Set up element visibility tracking for Element Visibility triggers
     */
    setupElementVisibilityTracking() {
      if (this.workflows.size === 0) {
        this.log('⚠️ No workflows available for visibility tracking setup', 'warning');
        return;
      }

      const uniqueSelectors = new Set();
      let visibilityTriggersFound = 0;

      // Collect all unique selectors from Element Visibility triggers
      this.workflows.forEach(workflow => {
        const isActive = workflow.is_active ?? workflow.isActive ?? true;
        if (!isActive) return;

        const triggerNodes = workflow.nodes?.filter(node => node.type === 'trigger') || [];
        
        triggerNodes.forEach(trigger => {
          if (trigger.name === 'Element Visibility' && trigger.config?.elementSelector) {
            visibilityTriggersFound++;
            const selectors = trigger.config.elementSelector.split(',').map(s => s.trim());
            selectors.forEach(selector => uniqueSelectors.add(selector));
          }
        });
      });

      this.log(`👁️ Found ${visibilityTriggersFound} Element Visibility triggers with ${uniqueSelectors.size} unique selectors`);

      if (uniqueSelectors.size === 0) {
        this.log('👁️ No Element Visibility triggers found, skipping visibility tracking setup');
        return;
      }

      // Set up intersection observers for each unique selector
      uniqueSelectors.forEach(selector => {
        this.setupVisibilityObserver(selector);
      });

      this.log(`👁️ Element visibility tracking configured for ${uniqueSelectors.size} selectors`, 'success');
    }

    /**
     * Set up intersection observer for a specific selector
     */
    setupVisibilityObserver(selector) {
      try {
        const elements = document.querySelectorAll(selector);
        
        if (elements.length === 0) {
          this.log(`👁️ No elements found for visibility tracking: "${selector}"`, 'warning');
          return;
        }

        this.log(`👁️ Setting up visibility tracking for ${elements.length} elements matching: "${selector}"`);

        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            const visibilityPercentage = Math.round(entry.intersectionRatio * 100);
            const eventType = entry.isIntersecting ? 'element_visible' : 'element_hidden';
            
            // Only process visibility events, not hidden events for now
            if (eventType === 'element_visible') {
              this.handleEvent({
                eventType: eventType,
                elementSelector: this.generateSelector(entry.target),
                element: entry.target,
                eventData: {
                  visibilityPercentage: visibilityPercentage,
                  intersectionRatio: entry.intersectionRatio
                },
                timestamp: Date.now()
              });
            }
          });
        }, { 
          threshold: [0, 0.1, 0.25, 0.5, 0.75, 1.0] // Multiple thresholds for accurate percentage calculation
        });

        elements.forEach(element => {
          observer.observe(element);
        });

        // Store observer for cleanup if needed
        if (!this.visibilityObservers) {
          this.visibilityObservers = new Map();
        }
        this.visibilityObservers.set(selector, observer);

      } catch (error) {
        this.log(`❌ Error setting up visibility observer for "${selector}": ${error.message}`, 'error');
      }
    }

    /**
     * Set up element hover tracking for Element Hover triggers
     */
    setupElementHoverTracking() {
      if (this.workflows.size === 0) {
        this.log('⚠️ No workflows available for hover tracking setup', 'warning');
        return;
      }

      const uniqueSelectors = new Set();
      let hoverTriggersFound = 0;

      // Collect all unique selectors from Element Hover triggers
      this.workflows.forEach(workflow => {
        const isActive = workflow.is_active ?? workflow.isActive ?? true;
        if (!isActive) return;

        const triggerNodes = workflow.nodes?.filter(node => node.type === 'trigger') || [];
        
        triggerNodes.forEach(trigger => {
          if (trigger.name === 'Element Hover' && trigger.config?.elementSelector) {
            hoverTriggersFound++;
            const selectors = trigger.config.elementSelector.split(',').map(s => s.trim());
            selectors.forEach(selector => uniqueSelectors.add(selector));
          }
        });
      });

      this.log(`🖱️ Found ${hoverTriggersFound} Element Hover triggers with ${uniqueSelectors.size} unique selectors`);

      if (uniqueSelectors.size === 0) {
        this.log('🖱️ No Element Hover triggers found, skipping hover tracking setup');
        return;
      }

      // Set up hover listeners for each unique selector
      uniqueSelectors.forEach(selector => {
        this.setupHoverListener(selector);
      });

      this.log(`🖱️ Element hover tracking configured for ${uniqueSelectors.size} selectors`, 'success');
    }

    /**
     * Set up hover listener for a specific selector
     */
    setupHoverListener(selector) {
      try {
        const elements = document.querySelectorAll(selector);
        
        if (elements.length === 0) {
          this.log(`🖱️ No elements found for hover tracking: "${selector}"`, 'warning');
          return;
        }

        this.log(`🖱️ Setting up hover tracking for ${elements.length} elements matching: "${selector}"`);

        elements.forEach(element => {
          element.addEventListener('mouseenter', (event) => {
            this.handleEvent({
              eventType: 'mouseenter',
              elementSelector: this.generateSelector(event.target),
              element: event.target,
              timestamp: Date.now()
            });
          });

          // Also set up for touch events if needed
          element.addEventListener('touchstart', (event) => {
            this.handleEvent({
              eventType: 'hover', // Map touch to hover for consistency
              elementSelector: this.generateSelector(event.target),
              element: event.target,
              timestamp: Date.now()
            });
          });
        });

      } catch (error) {
        this.log(`❌ Error setting up hover listener for "${selector}": ${error.message}`, 'error');
      }
    }

    /**
     * Set up user inactivity tracking
     */
    setupUserInactivityTracking() {
      // Check if we have any inactivity triggers
      let inactivityTriggersFound = 0;
      let minInactivityTime = Infinity;

      this.workflows.forEach(workflow => {
        const isActive = workflow.is_active ?? workflow.isActive ?? true;
        if (!isActive) return;

        const triggerNodes = workflow.nodes?.filter(node => node.type === 'trigger') || [];
        
        triggerNodes.forEach(trigger => {
          if (trigger.name === 'User Inactivity') {
            inactivityTriggersFound++;
            const inactivityTime = trigger.config?.inactivityTime || 30;
            const unit = trigger.config?.unit || 'seconds';
            const timeMs = unit === 'minutes' ? inactivityTime * 60 * 1000 : inactivityTime * 1000;
            minInactivityTime = Math.min(minInactivityTime, timeMs);
          }
        });
      });

      this.log(`⏱️ Found ${inactivityTriggersFound} User Inactivity triggers`);

      if (inactivityTriggersFound === 0) {
        this.log('⏱️ No User Inactivity triggers found, skipping inactivity tracking setup');
        return;
      }

      // Set up inactivity tracking
      let lastActivityTime = Date.now();
      let inactivityTimer = null;

      const resetInactivityTimer = () => {
        lastActivityTime = Date.now();
        
        if (inactivityTimer) {
          clearTimeout(inactivityTimer);
        }

        // Set timer for the minimum inactivity time found
        inactivityTimer = setTimeout(() => {
          const inactivityDuration = Date.now() - lastActivityTime;
          
          this.handleEvent({
            eventType: 'user_inactive',
            inactivityDuration: inactivityDuration,
            timestamp: Date.now()
          });
        }, minInactivityTime);
      };

      // Track user activity events
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      activityEvents.forEach(eventType => {
        document.addEventListener(eventType, resetInactivityTimer, { passive: true });
      });

      // Start the initial timer
      resetInactivityTimer();

      this.log(`⏱️ User inactivity tracking configured (min threshold: ${minInactivityTime}ms)`, 'success');
    }

    /**
     * Set up visit count tracking for repeat visitor triggers
     */
    setupVisitCountTracking() {
      // Check if we have any repeat visitor triggers
      let repeatVisitorTriggersFound = 0;

      this.workflows.forEach(workflow => {
        const isActive = workflow.is_active ?? workflow.isActive ?? true;
        if (!isActive) return;

        const triggerNodes = workflow.nodes?.filter(node => node.type === 'trigger') || [];
        
        triggerNodes.forEach(trigger => {
          if (trigger.name === 'Repeat Visitor') {
            repeatVisitorTriggersFound++;
          }
        });
      });

      this.log(`🔄 Found ${repeatVisitorTriggersFound} Repeat Visitor triggers`);

      if (repeatVisitorTriggersFound === 0) {
        this.log('🔄 No Repeat Visitor triggers found, skipping visit count tracking setup');
        return;
      }

      try {
        // Get current visit count from localStorage
        let visitCount = parseInt(localStorage.getItem('trackflow_visit_count') || '0', 10);
        
        // Increment visit count
        visitCount++;
        
        // Store updated visit count
        localStorage.setItem('trackflow_visit_count', visitCount.toString());
        
        // Store first visit timestamp if not exists
        if (!localStorage.getItem('trackflow_first_visit')) {
          localStorage.setItem('trackflow_first_visit', Date.now().toString());
        }
        
        // Store last visit timestamp
        localStorage.setItem('trackflow_last_visit', Date.now().toString());
        
        this.log(`🔄 Visit count tracking configured. Current visit: ${visitCount}`, 'success');
        
        // Trigger immediate evaluation for repeat visitor triggers with current visit count
        this.handleEvent({
          eventType: 'page_load',
          visitCount: visitCount,
          timestamp: Date.now()
        });
        
      } catch (error) {
        this.log(`❌ Error setting up visit count tracking: ${error.message}`, 'error');
      }
    }

    /**
     * Detect if a clicked element is a close/dismiss button
     */
    isCloseButton(element) {
      if (!element) return false;
      
      // Check if element matches close button selectors
      for (const selector of this.closeButtonSelectors) {
        if (element.matches && element.matches(selector)) {
          this.log(`🚫 Close button detected via selector: ${selector}`, 'info');
          return true;
        }
      }
      
      // Check parent elements up to 3 levels for close button selectors
      let parent = element.parentElement;
      let level = 0;
      while (parent && level < 3) {
        for (const selector of this.closeButtonSelectors) {
          if (parent.matches && parent.matches(selector)) {
            this.log(`🚫 Close button detected via parent selector: ${selector}`, 'info');
            return true;
          }
        }
        parent = parent.parentElement;
        level++;
      }
      
      // Check text content against close button patterns
      const textContent = (element.textContent || element.innerText || '').trim();
      for (const pattern of this.closeButtonPatterns) {
        if (pattern.test(textContent)) {
          this.log(`🚫 Close button detected via text pattern: "${textContent}"`, 'info');
          return true;
        }
      }
      
      // Check for onclick handlers that contain common close actions
      const onclickAttr = element.getAttribute('onclick') || '';
      if (onclickAttr.includes('display=') && onclickAttr.includes('none')) {
        this.log(`🚫 Close button detected via onclick attribute`, 'info');
        return true;
      }
      
      // Check aria-label
      const ariaLabel = element.getAttribute('aria-label') || '';
      for (const pattern of this.closeButtonPatterns) {
        if (pattern.test(ariaLabel)) {
          this.log(`🚫 Close button detected via aria-label: "${ariaLabel}"`, 'info');
          return true;
        }
      }
      
      return false;
    }

    /**
     * Check if an element is currently visible (for modal state tracking)
     */
    isElementVisible(selector) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const style = window.getComputedStyle(element);
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            return true;
          }
        }
        return false;
      } catch (error) {
        this.log(`Error checking element visibility for ${selector}: ${error.message}`, 'warning');
        return false;
      }
    }

    /**
     * Reset executed nodes (for testing or page navigation)
     */
    resetPageLoadCache() {
      const nodeSize = this.executedNodes.size;
      this.executedNodes.clear();
      this.log(`🔄 Reset: Cleared ${nodeSize} executed nodes`, 'info');
    }

    /**
     * Get current execution stats
     */
    getExecutionStats() {
      return {
        executedNodes: Array.from(this.executedNodes),
        totalExecutedActions: this.executedActions.size
      };
    }

    /**
     * Handle runtime events
     */
    async handleEvent(eventData) {
      await this.processWorkflows(eventData);
    }

    /**
     * Process all workflows against an event
     */
    async processWorkflows(eventData) {
      if (this.workflows.size === 0) {
        this.log('⚠️ No workflows available to process', 'warning');
        return;
      }

      // Prevent recursive calls to processWorkflows
      if (this.processingWorkflows) {
        this.log('⚠️ Already processing workflows, skipping to prevent recursion', 'warning');
        return;
      }

      this.processingWorkflows = true;
      
      this.log(`🔄 Processing ${this.workflows.size} workflows for event: ${eventData.eventType}`, 'info');

      try {
        for (const [workflowId, workflow] of this.workflows) {
          const isActive = workflow.is_active ?? workflow.isActive ?? true;
          if (!isActive) {
            this.log(`⏭️ Skipping inactive workflow: ${workflow.name}`, 'info');
            continue;
          }

          this.log(`📋 Processing workflow: ${workflow.name} (active: ${isActive})`, 'info');

          // Find trigger nodes
          const triggerNodes = workflow.nodes?.filter(node => node.type === 'trigger') || [];
          this.log(`🎯 Found ${triggerNodes.length} trigger nodes in workflow: ${workflow.name}`, 'info');
          
          for (const trigger of triggerNodes) {
            this.log(`🔍 Evaluating trigger: ${trigger.name || trigger.config?.triggerType}`, 'info');
            
            if (this.evaluateTrigger(trigger, eventData)) {
              this.log(`🎯 Workflow triggered: ${workflow.name} by ${trigger.name}`, 'success');
              
              // Create unique execution key to prevent duplicate tracking
              const executionKey = `${workflow.id}-${trigger.id}-${Date.now()}`;
              
              // Check if this exact execution has already been tracked
              if (this.executedWorkflows.has(executionKey)) {
                this.log(`⚠️ Workflow execution already tracked: ${executionKey}`, 'warning');
                continue;
              }
              
              // Mark this workflow execution as tracked
              this.executedWorkflows.add(executionKey);
              
              // Find and execute connected actions
              const actions = this.getConnectedActions(workflow, trigger.id);
              this.log(`🔗 Found ${actions.length} connected actions for trigger ${trigger.id}`, 'info', actions);
              
              // Store action selectors in our mapping for mutation observer
              actions.forEach(action => {
                if (action.name === 'Replace Text' && action.config?.selector) {
                  this.selectorRulesMap.set(action.config.selector, action.config);
                }
              });
              
              // Track workflow execution start time
              const executionStartTime = performance.now();
              
              // Execute the actions
              const executedActions = await this.executeActions(actions);
              
              // Calculate execution time
              const executionTime = Math.round(performance.now() - executionStartTime);
              
              // Track the workflow execution (only once per execution)
              await this.trackWorkflowExecution(workflow, {
                status: 'success',
                executionTimeMs: executionTime,
                pageUrl: window.location.href,
                deviceType: this.pageContext.deviceType,
                triggerName: trigger.name,
                actionsExecuted: executedActions || [],
                executionKey: executionKey
              });
            } else {
              this.log(`❌ Trigger did not match: ${trigger.name || trigger.config?.triggerType}`, 'info');
            }
          }
        }
      } finally {
        this.processingWorkflows = false;
        this.log(`✅ Finished processing workflows for event: ${eventData.eventType}`, 'info');
      }
    }

    /**
     * Evaluate if a trigger should fire for given event data
     */
    evaluateTrigger(trigger, eventData) {
      const { config = {}, name } = trigger;
      
      // Use triggerType from config or name from trigger
      const triggerType = config.triggerType || name;
      
      this.log(`🔍 Evaluating trigger: ${triggerType} for event: ${eventData.eventType}`, 'info', {
        trigger: trigger,
        eventData: eventData,
        triggerType: triggerType
      });
      
      // Create a cache key for this trigger and event data
      const triggerCacheKey = `${trigger.id}-${triggerType}-${eventData.eventType}`;
      
      // For immediate triggers (page_load, device type, UTM, geolocation), allow re-execution more frequently
      const isImmediateTrigger = eventData.eventType === 'page_load' || 
                                triggerType === 'Device Type' || 
                                triggerType === 'UTM Parameters' || 
                                triggerType === 'Geolocation';
      
      // Check if this trigger has already been processed for similar conditions
      if (this.triggeredWorkflows.has(triggerCacheKey) && !isImmediateTrigger) {
        const lastTriggered = this.triggeredWorkflows.get(triggerCacheKey);
        const timeSinceLastTrigger = Date.now() - lastTriggered;
        
        // Prevent re-triggering the same condition within 30 seconds (except immediate triggers)
        if (timeSinceLastTrigger < 30000) {
          this.log(`⏭️ Skipping cached trigger: ${triggerType} (last triggered ${Math.round(timeSinceLastTrigger/1000)}s ago)`, 'info');
          return false;
        }
      }
      
      let shouldTrigger = false;
      
      switch (triggerType) {
        case 'Device Type':
          shouldTrigger = this.evaluateDeviceTypeTrigger(config, eventData);
          break;
          
        case 'UTM Parameters':
          shouldTrigger = this.evaluateUTMTrigger(config, eventData);
          break;
          
        case 'Page Visits':
          shouldTrigger = this.evaluatePageVisitTrigger(config, eventData);
          break;
          
        case 'Time on Page':
          shouldTrigger = this.evaluateTimeOnPageTrigger(config, eventData);
          break;
          
        case 'Scroll Depth':
          shouldTrigger = this.evaluateScrollDepthTrigger(config, eventData);
          break;
          
        case 'Element Click':
          shouldTrigger = this.evaluateElementClickTrigger(config, eventData);
          break;
          
        case 'Element Visibility':
          shouldTrigger = this.evaluateElementVisibilityTrigger(config, eventData);
          break;
          
        case 'Element Hover':
          shouldTrigger = this.evaluateElementHoverTrigger(config, eventData);
          break;
          
        case 'User Inactivity':
          shouldTrigger = this.evaluateUserInactivityTrigger(config, eventData);
          break;
          
        case 'Repeat Visitor':
          shouldTrigger = this.evaluateRepeatVisitorTrigger(config, eventData);
          break;
          
        case 'Exit Intent':
          shouldTrigger = this.evaluateExitIntentTrigger(config, eventData);
          break;
          
        case 'Geolocation':
          shouldTrigger = this.evaluateGeolocationTrigger(config, eventData);
          break;
          
        default:
          this.log(`⚠️ Unknown trigger type: ${triggerType}`, 'warning');
          shouldTrigger = false;
      }
      
      this.log(`📊 Trigger evaluation result: ${triggerType} = ${shouldTrigger}`, shouldTrigger ? 'success' : 'info');
      
      // Cache successful triggers to prevent immediate re-triggering (except immediate triggers)
      if (shouldTrigger && !isImmediateTrigger) {
        this.triggeredWorkflows.set(triggerCacheKey, Date.now());
      }
      
      return shouldTrigger;
    }

    /**
     * Evaluate device type trigger
     */
    evaluateDeviceTypeTrigger(config, eventData) {
      return this.pageContext.deviceType === config.deviceType;
    }

    /**
     * Evaluate UTM parameters trigger
     */
    evaluateUTMTrigger(config, eventData) {
      if (!this.pageContext.utm) return false;
      const utmValue = this.pageContext.utm[config.parameter];
      switch (config.operator) {
        case 'equals': return utmValue === config.value;
        case 'contains': return utmValue && utmValue.includes(config.value);
        case 'exists': return Boolean(utmValue);
        default: return false;
      }
    }

    /**
     * Evaluate page visits trigger
     */
    evaluatePageVisitTrigger(config, eventData) {
      return eventData.visitCount >= (config.visitCount || 3);
    }

    /**
     * Evaluate time on page trigger
     */
    evaluateTimeOnPageTrigger(config, eventData) {
      const thresholdSeconds = config.unit === 'minutes' ? config.duration * 60 : config.duration;
      return eventData.timeOnPage >= thresholdSeconds;
    }

    /**
     * Evaluate scroll depth trigger
     */
    evaluateScrollDepthTrigger(config, eventData) {
      return eventData.scrollPercentage >= (config.percentage || 50);
    }

    /**
     * Evaluate element click trigger
     */
    evaluateElementClickTrigger(config, eventData) {
      // Basic click and selector match
      const isMatch = eventData.eventType === 'click' && 
                     eventData.elementSelector === config.selector;
      
      if (!isMatch) return false;
      
      // NEW: Enhanced caching for click events to prevent rapid re-triggering
      const clickCacheKey = `click-${config.selector}-${eventData.elementSelector}`;
      const now = Date.now();
      
      // Check if this exact click combination was recently processed
      if (this.triggeredWorkflows.has(clickCacheKey)) {
        const lastTriggered = this.triggeredWorkflows.get(clickCacheKey);
        const timeSinceLastTrigger = now - lastTriggered;
        
        // Prevent re-triggering the same click combination within 5 seconds
        if (timeSinceLastTrigger < 5000) {
          this.log(`⏭️ Skipping recent click trigger: ${config.selector} (last triggered ${Math.round(timeSinceLastTrigger/1000)}s ago)`, 'info');
          return false;
        }
      }
      
      // Cache this click combination
      this.triggeredWorkflows.set(clickCacheKey, now);
      
      return true;
    }

    /**
     * Evaluate exit intent trigger
     */
    evaluateExitIntentTrigger(config, eventData) {
      return eventData.eventType === 'exit_intent';
    }

    /**
     * Evaluate geolocation trigger
     */
    evaluateGeolocationTrigger(config, eventData) {
      if (!this.geolocationData) {
        this.log('⚠️ Geolocation data not available for trigger evaluation', 'warning');
        return false;
      }

      const { geoField, operator, values } = config;
      
      if (!geoField || !values) {
        this.log('⚠️ Geolocation trigger: Missing required config (geoField or values)', 'warning');
        return false;
      }

      // Get the field value from geolocation data
      let fieldValue = '';
      switch (geoField) {
        case 'country':
          fieldValue = this.geolocationData.country || '';
          break;
        case 'countryCode':
          fieldValue = this.geolocationData.countryCode || '';
          break;
        case 'region':
          fieldValue = this.geolocationData.region || '';
          break;
        case 'city':
          fieldValue = this.geolocationData.city || '';
          break;
        case 'timezone':
          fieldValue = this.geolocationData.timezone || '';
          break;
        case 'isp':
          fieldValue = this.geolocationData.isp || '';
          break;
        case 'ipType':
          fieldValue = this.geolocationData.ipType || '';
          break;
        default:
          this.log(`⚠️ Unknown geolocation field: ${geoField}`, 'warning');
          return false;
      }

      // Parse target values (comma or newline separated)
      const targetValues = values.split(/[,\n]/).map(v => v.trim().toLowerCase()).filter(v => v);
      const currentValue = fieldValue.toLowerCase();

      this.log(`🌍 Geolocation evaluation: ${geoField}="${currentValue}" ${operator} [${targetValues.join(', ')}]`, 'info');

      let isMatch = false;
      switch (operator) {
        case 'equals':
          isMatch = targetValues.includes(currentValue);
          break;
        case 'contains':
          isMatch = targetValues.some(target => currentValue.includes(target) || target.includes(currentValue));
          break;
        case 'excludes':
          isMatch = !targetValues.includes(currentValue);
          break;
        case 'exists':
          isMatch = Boolean(fieldValue);
          break;
        default:
          this.log(`⚠️ Unknown geolocation operator: ${operator}`, 'warning');
          return false;
      }

      this.log(`🌍 Geolocation trigger result: ${isMatch}`, isMatch ? 'success' : 'info');
      return isMatch;
    }

    /**
     * Evaluate element visibility trigger
     */
    evaluateElementVisibilityTrigger(config, eventData) {
      // Only process element_visible events
      if (eventData.eventType !== 'element_visible') {
        return false;
      }

      const { elementSelector, visibilityThreshold = 50, duration = 0 } = config;
      
      if (!elementSelector) {
        this.log('⚠️ Element Visibility trigger: Missing elementSelector config', 'warning');
        return false;
      }

      // Check if the event's element selector matches the configured selector
      const eventElementSelector = eventData.elementSelector || '';
      
      // Split configured selector by commas to handle multiple selectors
      const configSelectors = elementSelector.split(',').map(s => s.trim());
      
      // Check if any of the configured selectors match the event's element
      const selectorMatches = configSelectors.some(selector => {
        // Exact match
        if (eventElementSelector === selector) return true;
        
        // Check if the event element matches the selector via DOM query
        try {
          const element = eventData.element || document.querySelector(eventElementSelector);
          if (element && element.matches && element.matches(selector)) return true;
        } catch (e) {
          // Ignore selector parsing errors
        }
        
        return false;
      });

      if (!selectorMatches) {
        this.log(`👁️ Element visibility: Selector mismatch. Event: "${eventElementSelector}", Config: "${elementSelector}"`, 'info');
        return false;
      }

      // Check visibility threshold
      const visibilityPercentage = eventData.eventData?.visibilityPercentage || 0;
      if (visibilityPercentage < visibilityThreshold) {
        this.log(`👁️ Element visibility: Threshold not met. ${visibilityPercentage}% < ${visibilityThreshold}%`, 'info');
        return false;
      }

      // TODO: Implement duration check if needed (would require tracking visibility start time)
      // For now, we'll ignore duration and trigger immediately when threshold is met

      this.log(`👁️ Element visibility trigger matched: ${eventElementSelector} (${visibilityPercentage}% >= ${visibilityThreshold}%)`, 'success');
      return true;
    }

    /**
     * Evaluate element hover trigger
     */
    evaluateElementHoverTrigger(config, eventData) {
      // Check for hover-related events
      if (eventData.eventType !== 'mouseenter' && eventData.eventType !== 'hover') {
        return false;
      }

      const { elementSelector, hoverDuration = 2000, includeTouch = false } = config;
      
      if (!elementSelector) {
        this.log('⚠️ Element Hover trigger: Missing elementSelector config', 'warning');
        return false;
      }

      // Check if the event's element selector matches the configured selector
      const eventElementSelector = eventData.elementSelector || '';
      
      // Split configured selector by commas to handle multiple selectors
      const configSelectors = elementSelector.split(',').map(s => s.trim());
      
      // Check if any of the configured selectors match the event's element
      const selectorMatches = configSelectors.some(selector => {
        // Exact match
        if (eventElementSelector === selector) return true;
        
        // Check if the event element matches the selector via DOM query
        try {
          const element = eventData.element || document.querySelector(eventElementSelector);
          if (element && element.matches && element.matches(selector)) return true;
        } catch (e) {
          // Ignore selector parsing errors
        }
        
        return false;
      });

      if (!selectorMatches) {
        this.log(`🖱️ Element hover: Selector mismatch. Event: "${eventElementSelector}", Config: "${elementSelector}"`, 'info');
        return false;
      }

      // For now, we'll trigger immediately on hover without duration checking
      // TODO: Implement hover duration tracking if needed
      this.log(`🖱️ Element hover trigger matched: ${eventElementSelector}`, 'success');
      return true;
    }

    /**
     * Evaluate user inactivity trigger
     */
    evaluateUserInactivityTrigger(config, eventData) {
      // Only process inactivity events
      if (eventData.eventType !== 'user_inactive') {
        return false;
      }

      const { inactivityTime = 30, unit = 'seconds' } = config;
      
      // Convert to milliseconds
      const thresholdMs = unit === 'minutes' ? inactivityTime * 60 * 1000 : inactivityTime * 1000;
      
      // Check if the inactivity duration meets the threshold
      const inactivityDuration = eventData.inactivityDuration || 0;
      
      if (inactivityDuration >= thresholdMs) {
        this.log(`⏱️ User inactivity trigger matched: ${inactivityDuration}ms >= ${thresholdMs}ms`, 'success');
        return true;
      }

      this.log(`⏱️ User inactivity: Threshold not met. ${inactivityDuration}ms < ${thresholdMs}ms`, 'info');
      return false;
    }

    /**
     * Evaluate repeat visitor trigger
     */
    evaluateRepeatVisitorTrigger(config, eventData) {
      const { visitCount = 2, timeframe = 'all_time' } = config;
      
      // Get visit count from session storage or event data
      let currentVisitCount = 0;
      
      try {
        // Try to get from event data first
        if (eventData.visitCount !== undefined) {
          currentVisitCount = eventData.visitCount;
        } else {
          // Fallback to session storage
          const storedVisits = localStorage.getItem('trackflow_visit_count') || '1';
          currentVisitCount = parseInt(storedVisits, 10) || 1;
        }
      } catch (error) {
        this.log(`⚠️ Repeat visitor: Error getting visit count: ${error.message}`, 'warning');
        currentVisitCount = 1;
      }

      // For now, we'll only implement 'all_time' timeframe
      // TODO: Implement other timeframes (last_30_days, etc.) if needed
      
      if (currentVisitCount >= visitCount) {
        this.log(`🔄 Repeat visitor trigger matched: ${currentVisitCount} >= ${visitCount} visits`, 'success');
        return true;
      }

      this.log(`🔄 Repeat visitor: Threshold not met. ${currentVisitCount} < ${visitCount} visits`, 'info');
      return false;
    }

    /**
     * Get actions connected to a trigger
     */
    getConnectedActions(workflow, triggerNodeId) {
      const connections = workflow.connections || [];
      const nodes = workflow.nodes || [];
      
      this.log(`🔍 Finding connected actions for trigger ${triggerNodeId}`, 'info', {
        totalConnections: connections.length,
        totalNodes: nodes.length,
        connections: connections
      });
      
      const connectedActionIds = connections
        .filter(conn => conn.sourceNodeId === triggerNodeId)
        .map(conn => conn.targetNodeId);
        
      this.log(`🔗 Found ${connectedActionIds.length} connected action IDs:`, 'info', connectedActionIds);
      
      const actionNodes = nodes.filter(node => 
        node.type === 'action' && connectedActionIds.includes(node.id)
      );
      
      this.log(`🎯 Returning ${actionNodes.length} action nodes:`, 'info', actionNodes);
      
      return actionNodes;
    }

    /**
     * Execute a list of actions
     */
    async executeActions(actions) {
      if (!actions?.length) {
        this.log('⚠️ No actions to execute', 'warning');
        return [];
      }
      
      this.log(`🎬 Executing ${actions.length} actions`, 'info', actions);
      
      const executedActions = [];
      
      // Execute content replacement actions immediately in parallel for better performance
      const contentActions = actions.filter(action => action.name === 'Replace Text');
      const otherActions = actions.filter(action => action.name !== 'Replace Text');
      
      this.log(`📊 Action breakdown: ${contentActions.length} content actions, ${otherActions.length} other actions`);
      
      // Execute content replacements in parallel for speed
      if (contentActions.length > 0) {
        this.log(`⚡ Executing ${contentActions.length} content replacement actions in parallel`);
        const contentPromises = contentActions.map(async (action) => {
          const startTime = performance.now();
          const result = await this.executeAction(action);
          const executionTime = Math.round(performance.now() - startTime);
          
          if (result.success) {
            executedActions.push({
              name: action.name,
              config: action.config,
              selector: action.config?.selector,
              text: action.config?.newText || action.config?.text,
              executionTimeMs: executionTime
            });
          }
          
          return result;
        });
        await Promise.all(contentPromises);
      }
      
      // Execute other actions sequentially with delay
      for (const action of otherActions) {
        const startTime = performance.now();
        const result = await this.executeAction(action);
        const executionTime = Math.round(performance.now() - startTime);
        
        if (result.success) {
          executedActions.push({
            name: action.name,
            config: action.config,
            selector: action.config?.selector,
            executionTimeMs: executionTime
          });
        }
        
        // Add delay between actions if configured
        if (this.config.executionDelay > 0) {
          await this.delay(this.config.executionDelay);
        }
      }
      
      return executedActions;
    }

    /**
     * Execute a single action
     */
    async executeAction(action) {
      const { config = {}, name, id } = action;
      
      // DEBUG: Log the action structure to understand what we're working with
      this.log(`🔍 DEBUG: Action structure:`, 'info');
      this.log(`   - id: ${id}`, 'info');
      this.log(`   - name: ${name}`, 'info');
      this.log(`   - config: ${JSON.stringify(config)}`, 'info');
      
      // SIMPLE: Create a unique key for this action if no ID
      const actionKey = id || `${name}-${config.selector || 'no-selector'}`;
      
      // SIMPLE: Check if this specific action has already executed this page load
      if (this.executedNodes.has(actionKey)) {
        this.log(`🚫 Action already executed this page load - BLOCKED: ${actionKey} (${name})`, 'warning');
        return { success: false, reason: 'action_already_executed' };
      }
      
      // Mark this action as executed
      this.executedNodes.add(actionKey);
      this.log(`🔒 Action marked as executed: ${actionKey} (${name})`, 'info');
      
      this.log(`⚡ Executing: ${name}`, config);

      try {
        let result = { success: false };
        
        switch (name) {
          case 'Replace Text':
            result = await this.replaceText(config);
            break;
            
          case 'Replace Image':
            result = await this.replaceImage(config);
            break;
            
          case 'Hide Element':
            result = await this.hideElement(config);
            break;
            
          case 'Show Element':
            result = await this.showElement(config);
            break;
            
          case 'Modify CSS':
            result = await this.modifyCSS(config);
            break;
            
          case 'Add Class':
            result = await this.addClass(config);
            break;
            
          case 'Remove Class':
            result = await this.removeClass(config);
            break;
            
          case 'Display Overlay':
            result = await this.displayOverlay(config);
            break;
            
          case 'Redirect Page':
          case 'Redirect User':
            result = await this.redirectPage(config);
            break;
            
          default:
            this.log(`⚠️ Unknown action: ${name}`, 'warning');
            result = { success: false, error: `Unknown action: ${name}` };
        }
        
        return result;
        
      } catch (error) {
        this.log(`❌ Action failed: ${name} - ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    // Action implementations
    async replaceText(config) {
      try {
        // Wait for elements to be available
        await this.waitForElement(config.selector);
        
        // Use the robust replacement logic from utm-magic.js
        const success = this.applySingleSelector(config.selector, {
          newText: config.newText,
          originalText: config.originalText
        }, true, 'replaceText');
        
        if (success) {
          this.completedModifications.add(`replaceText:${config.selector}`);
          this.log(`✅ Text replaced successfully (${config.selector})`, 'success');
          return { success: true };
        } else {
          this.log(`⚠️ No elements found or replacement failed (${config.selector})`, 'warning');
          return { success: false, error: 'No elements found' };
        }
        
      } catch (error) {
        this.log(`❌ Text replacement failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    async replaceImage(config) {
      try {
        // Wait for elements to be available
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
        if (!elements?.length) {
          this.log(`⚠️ No elements found for image replacement: ${config.selector}`, 'warning');
          return { success: false, error: 'No elements found' };
        }
        
        let successCount = 0;
        
        // For image replacement, apply smart targeting to avoid replacing images in multiple identical elements
        if (elements.length > 1) {
          this.log(`🎯 Image replacement detected with ${elements.length} matching elements. Applying smart targeting...`);
          
          // Try to find the most specific element to replace
          let targetElement = null;
          
          // Strategy 1: If originalImageUrl is provided, find the image element containing that URL
          if (config.originalImageUrl) {
            for (const element of elements) {
              const currentSrc = element.src || element.getAttribute('src') || '';
              if (currentSrc.includes(config.originalImageUrl)) {
                targetElement = element;
                this.log(`🎯 Found image with original URL: "${config.originalImageUrl}"`);
                break;
              }
            }
          }
          
          // Strategy 2: If no originalImageUrl match, use the first element
          if (!targetElement) {
            targetElement = elements[0];
            this.log(`🎯 Using first matching element for image replacement`);
          }
          
          // Apply replacement to only the targeted element
          if (this.replaceImageContent(targetElement, config)) {
            successCount = 1;
          }
        } else {
          // Single element match - proceed as normal
          elements.forEach(element => {
            if (this.replaceImageContent(element, config)) {
              successCount++;
            }
          });
        }
        
        if (successCount > 0) {
          this.completedModifications.add(`replaceImage:${config.selector}`);
          this.log(`✅ Image replaced successfully in ${successCount}/${elements.length} elements (${config.selector})`, 'success');
          return { success: true, replaced: successCount };
        } else {
          this.log(`⚠️ Image replacement failed (${config.selector})`, 'warning');
          return { success: false, error: 'Image replacement failed' };
        }
        
      } catch (error) {
        this.log(`❌ Image replacement failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    /**
     * Replace image content in an element
     */
    replaceImageContent(element, config) {
      if (!element || !config.newImageUrl) return false;
      
      try {
        const tagName = element.tagName.toLowerCase();
        const newImageUrl = config.newImageUrl;
        const altText = config.altText;
        
        this.log(`🔄 Replacing image in ${tagName} element with: ${newImageUrl}`, 'info');
        
        // Handle img elements
        if (tagName === 'img') {
          element.src = newImageUrl;
          if (altText) {
            element.alt = altText;
          }
        }
        // Handle elements with background images
        else {
          element.style.backgroundImage = `url("${newImageUrl}")`;
          // Ensure background-size and background-position are set for better display
          if (!element.style.backgroundSize) {
            element.style.backgroundSize = 'cover';
          }
          if (!element.style.backgroundPosition) {
            element.style.backgroundPosition = 'center';
          }
        }
        
        return true;
      } catch (e) {
        this.log(`Error replacing image: ${e.message}`, 'error');
        return false;
      }
    }

    /**
     * Robust content replacement function adapted from utm-magic.js
     * Handles different element types properly
     */
    replaceContent(element, config) {
      if (!element || (!config.newText && config.newText !== '')) return false;
      
      try {
        const tagName = element.tagName.toLowerCase();
        const newText = config.newText;
        const originalText = config.originalText;
        
        this.log(`🔄 Replacing content in ${tagName} element`, 'info', { newText, originalText });
        
        // Handle buttons
        if (tagName === 'button' || (tagName === 'input' && (element.type === 'submit' || element.type === 'button'))) {
          if (originalText && element.textContent.includes(originalText)) {
            element.textContent = element.textContent.replace(originalText, newText);
          } else {
            element.textContent = newText;
          }
        }
        // Handle inputs
        else if (tagName === 'input') {
          if (element.type === 'text' || element.type === 'email' || element.type === 'tel' || element.type === 'number') {
            element.value = newText || '';
            element.setAttribute('placeholder', newText || '');
          }
        }
        // Handle links
        else if (tagName === 'a') {
          if (newText && (newText.startsWith('http') || newText.startsWith('/') || newText.includes('://'))) {
            element.setAttribute('href', newText);
          } else {
            if (originalText && element.innerHTML.includes(originalText)) {
              element.innerHTML = element.innerHTML.replace(originalText, newText || '');
            } else {
              element.innerHTML = newText || '';
            }
          }
        }
        // Default for div, span, p, h1-h6, etc.
        else {
          if (originalText && element.innerHTML.includes(originalText)) {
            element.innerHTML = element.innerHTML.replace(originalText, newText || '');
          } else {
            element.innerHTML = newText || '';
          }
        }
        
        return true;
      } catch (e) {
        this.log(`Error replacing content: ${e.message}`, 'error');
        return false;
      }
    }

    /**
     * Enhanced element targeting using the new targeting system
     */
    targetElementWithStrategies(elementData, actionConfig, actionType) {
      // Check if we have enhanced element data with selector strategies
      if (elementData && elementData.selectorStrategies) {
        return this.resolveElementWithStrategies(elementData.selectorStrategies, {
          originalText: actionConfig.originalText,
          textContent: elementData.text,
          position: elementData.position?.indexInParent,
          attributes: elementData.attributes
        }, actionType);
      }
      
      // Fallback to legacy selector handling
      return this.resolveLegacySelector(actionConfig.selector || elementData?.selector, actionConfig, actionType);
    }

    /**
     * Resolve element using enhanced selector strategies
     */
    resolveElementWithStrategies(strategies, context, actionType) {
      this.log(`🎯 Enhanced Targeting: Resolving element for ${actionType} using ${strategies.length} strategies`, 'info');
      
      // Try each strategy in order of reliability
      for (const strategy of strategies) {
        const elements = document.querySelectorAll(strategy.selector);
        this.log(`🔍 Strategy ${strategy.type}: "${strategy.selector}" (${elements.length} matches)`);
        
        if (elements.length === 0) continue;
        
        if (elements.length === 1) {
          this.log(`✅ Unique element found with ${strategy.type} selector`, 'success');
          return {
            success: true,
            element: elements[0],
            elements: Array.from(elements),
            strategy,
            message: `Found unique element using ${strategy.description}`
          };
        }
        
        // Multiple elements found - apply disambiguation
        const disambiguated = this.disambiguateElements(Array.from(elements), context, actionType);
        
        if (disambiguated.success) {
          this.log(`✅ Element disambiguated using ${strategy.type} selector with ${disambiguated.method}`, 'success');
          return {
            success: true,
            element: disambiguated.element,
            elements: Array.from(elements),
            strategy,
            message: `Found target element using ${strategy.description} with ${disambiguated.method}`,
            fallbackUsed: true
          };
        }
      }
      
      this.log(`❌ Enhanced targeting failed - no strategies resolved to a unique element`, 'error');
      return {
        success: false,
        element: null,
        elements: [],
        strategy: null,
        message: 'No targeting strategy could resolve to a unique element'
      };
    }

    /**
     * Disambiguate between multiple matching elements
     */
    disambiguateElements(elements, context, actionType) {
      this.log(`🎯 Disambiguating ${elements.length} elements for ${actionType} action`);
      
      // Strategy 1: Text content matching (for text-related actions)
      if (context.originalText && (actionType.includes('text') || actionType.includes('Text'))) {
        for (const element of elements) {
          if (element.textContent && element.textContent.includes(context.originalText)) {
            this.log(`🎯 Found element by original text: "${context.originalText}"`, 'success');
            return { success: true, element, method: 'original text matching' };
          }
        }
      }
      
      // Strategy 2: Exact text content matching
      if (context.textContent) {
        for (const element of elements) {
          if (element.textContent && element.textContent.trim() === context.textContent.trim()) {
            this.log(`🎯 Found element by exact text content`, 'success');
            return { success: true, element, method: 'exact text content matching' };
          }
        }
      }
      
      // Strategy 3: Position-based selection
      if (context.position !== undefined && context.position >= 0 && context.position < elements.length) {
        this.log(`🎯 Using position-based selection: index ${context.position}`, 'info');
        return { success: true, element: elements[context.position], method: `position ${context.position}` };
      }
      
      // Strategy 4: First element fallback (for non-text actions)
      if (!actionType.includes('text') && !actionType.includes('Text')) {
        this.log(`🎯 Using first element for non-text action: ${actionType}`, 'info');
        return { success: true, element: elements[0], method: 'first element fallback' };
      }
      
      // Strategy 5: Most visible element
      const visibleElements = elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               el.offsetWidth > 0 && 
               el.offsetHeight > 0;
      });
      
      if (visibleElements.length === 1) {
        this.log(`🎯 Found unique visible element`, 'success');
        return { success: true, element: visibleElements[0], method: 'visibility filtering' };
      }
      
      this.log(`❌ Could not disambiguate elements`, 'warning');
      return { success: false, element: null, method: 'no disambiguation method worked' };
    }

    /**
     * Legacy selector resolution for backward compatibility
     */
    resolveLegacySelector(selector, config, actionType) {
      const elements = document.querySelectorAll(selector);
      
      if (elements.length === 0) {
        return { success: false, element: null, elements: [], message: 'No elements found' };
      }
      
      if (elements.length === 1) {
        return { success: true, element: elements[0], elements: Array.from(elements), message: 'Single element found' };
      }
      
      // Apply legacy smart targeting for text replacement
      if ((config.newText !== undefined || config.originalText !== undefined) && actionType.includes('Text')) {
        let targetElement = null;
        
        if (config.originalText) {
          for (const element of elements) {
            if (element.textContent && element.textContent.includes(config.originalText)) {
              targetElement = element;
              break;
            }
          }
        }
        
        if (!targetElement) {
          targetElement = elements[0];
        }
        
        return { 
          success: true, 
          element: targetElement, 
          elements: Array.from(elements), 
          message: 'Legacy smart targeting used',
          fallbackUsed: true 
        };
      }
      
      // For other actions, use first element
      return { 
        success: true, 
        element: elements[0], 
        elements: Array.from(elements), 
        message: 'First element used as fallback',
        fallbackUsed: true 
      };
    }

    /**
     * Apply a single selector efficiently with enhanced targeting
     */
    applySingleSelector(selector, config, preventDuplicates = true, actionType = null, elementData = null) {
      const selectorKey = `${selector}-${JSON.stringify(config)}`;
      
      if (preventDuplicates && this.processedSelectors.has(selectorKey)) {
        this.log(`Skipping already processed selector: ${selector}`);
        return true; // Already processed
      }
      
      try {
        // Use enhanced targeting if element data is available
        let targetingResult;
        
        if (elementData && elementData.selectorStrategies) {
          targetingResult = this.targetElementWithStrategies(elementData, config, actionType || 'Unknown');
        } else {
          targetingResult = this.resolveLegacySelector(selector, config, actionType || 'Unknown');
        }
        
        if (!targetingResult.success || !targetingResult.element) {
          this.log(`No elements found for selector: ${selector}`, 'warning');
          console.warn(`No elements found for selector: ${selector}`);
          return false;
        }
        
        // Apply the action to the resolved element
        const success = this.replaceContent(targetingResult.element, config);
        
        if (success) {
          const message = targetingResult.fallbackUsed 
            ? `Applied action using ${targetingResult.message} (${targetingResult.elements.length} total matches)`
            : `Applied action to unique element`;
          
          this.log(`✅ ${message} (${selector})`, 'success');
          
          if (preventDuplicates) {
            this.processedSelectors.add(selectorKey);
          }
          
          return true;
        } else {
          this.log(`❌ Failed to apply action to resolved element (${selector})`, 'error');
          return false;
        }
        
        if (successCount > 0) {
          if (preventDuplicates) {
            this.processedSelectors.add(selectorKey);
          }
          return true;
        }
        
        return false;
      } catch (e) {
        this.log(`Error applying selector ${selector}: ${e.message}`, 'error');
        return false;
      }
    }

    async hideElement(config) {
      try {
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
        if (!elements?.length) {
          this.log(`⚠️ No elements found to hide: ${config.selector}`, 'warning');
          return { success: false, error: 'No elements found' };
        }
        
        // Apply delay if specified (non-blocking)
        const delay = parseInt(config.delay) || 0;
        
        const executeHide = () => {
          let hiddenCount = 0;
          elements.forEach(element => {
            if (config.animation === 'fade') {
              element.style.transition = 'opacity 0.3s ease';
              element.style.opacity = '0';
              setTimeout(() => {
                element.style.display = 'none';
                this.log(`🫥 Element faded out: ${element.tagName}.${element.className}`);
              }, 300);
            } else {
              element.style.display = 'none';
              this.log(`🫥 Element hidden: ${element.tagName}.${element.className}`);
            }
            hiddenCount++;
          });
          
          this.completedModifications.add(`hideElement:${config.selector}`);
          this.log(`✅ Hidden ${hiddenCount} elements (${config.selector})`, 'success');
        };
        
        if (delay > 0) {
          this.log(`⏰ Scheduling hide element execution in ${delay}ms (non-blocking)`);
          setTimeout(executeHide, delay);
          return { success: true, scheduled: true, delay: delay, elements: elements.length };
        } else {
          executeHide();
          return { success: true, hidden: elements.length };
        }
        
      } catch (error) {
        this.log(`❌ Hide element failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    async showElement(config) {
      try {
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
        if (!elements?.length) {
          this.log(`⚠️ No elements found to show: ${config.selector}`, 'warning');
          return { success: false, error: 'No elements found' };
        }
        
        // Apply delay if specified (non-blocking)
        const delay = parseInt(config.delay) || 0;
        
        const executeShow = () => {
          elements.forEach(element => {
            element.style.display = 'block';
            if (config.animation === 'fade') {
              element.style.opacity = '0';
              element.style.transition = 'opacity 0.3s ease';
              setTimeout(() => element.style.opacity = '1', 10);
            }
          });
          
          this.completedModifications.add(`showElement:${config.selector}`);
          this.log(`✅ Shown ${elements.length} elements (${config.selector})`);
        };
        
        if (delay > 0) {
          this.log(`⏰ Scheduling show element execution in ${delay}ms (non-blocking)`);
          setTimeout(executeShow, delay);
          return { success: true, scheduled: true, delay: delay, elements: elements.length };
        } else {
          executeShow();
          return { success: true, shown: elements.length };
        }
        
      } catch (error) {
        this.log(`❌ Show element failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    async modifyCSS(config) {
      try {
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
        if (!elements?.length) {
          this.log(`⚠️ No elements found to modify CSS: ${config.selector}`, 'warning');
          return { success: false, error: 'No elements found' };
        }
        
        // Apply delay if specified (non-blocking)
        const delay = parseInt(config.delay) || 0;
        
        const executeCSS = () => {
          const property = config.customProperty || config.property;
          elements.forEach(element => {
            element.style[property] = config.value;
          });
          
          this.completedModifications.add(`modifyCSS:${config.selector}`);
          this.log(`✅ Modified CSS for ${elements.length} elements (${config.selector}): ${property} = ${config.value}`);
        };
        
        if (delay > 0) {
          this.log(`⏰ Scheduling CSS modification execution in ${delay}ms (non-blocking)`);
          setTimeout(executeCSS, delay);
          return { success: true, scheduled: true, delay: delay, elements: elements.length };
        } else {
          executeCSS();
          return { success: true, modified: elements.length };
        }
        
      } catch (error) {
        this.log(`❌ CSS modification failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    async addClass(config) {
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        element.classList.add(config.className);
      });
      this.log(`✅ Added class to ${elements.length} elements`);
    }

    async removeClass(config) {
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        element.classList.remove(config.className);
      });
      this.log(`✅ Removed class from ${elements.length} elements`);
    }

    async displayOverlay(config) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
        color: white; font-family: Arial, sans-serif;
      `;
      overlay.innerHTML = config.content || '<div>Overlay Content</div>';
      overlay.onclick = () => overlay.remove();
      document.body.appendChild(overlay);
      this.log('✅ Overlay displayed');
    }

    async redirectPage(config) {
      // Validate URL
      if (!config.url || typeof config.url !== 'string') {
        this.log('⚠️ Redirect action: Invalid or missing URL', 'error');
        return { success: false, error: 'Invalid or missing URL' };
      }

      // Prevent redirect loops - check if we're redirecting to the same page
      const currentUrl = window.location.href;
      const targetUrl = new URL(config.url, window.location.origin).href;
      
      if (currentUrl === targetUrl) {
        this.log('⚠️ Redirect action: Prevented redirect to same page to avoid infinite loop', 'warning');
        return { success: false, error: 'Same page redirect prevented' };
      }

      // Check if we've already redirected recently (within last 10 seconds)
      const redirectKey = `redirect_${targetUrl}`;
      const lastRedirectTime = sessionStorage.getItem(redirectKey);
      const now = Date.now();
      
      if (lastRedirectTime && (now - parseInt(lastRedirectTime)) < 10000) {
        this.log('⚠️ Redirect action: Prevented rapid consecutive redirects to prevent loop', 'warning');
        return { success: false, error: 'Rapid redirect prevented' };
      }

      // Store redirect timestamp
      sessionStorage.setItem(redirectKey, now.toString());

      const delay = (config.delay || 0) * 1000; // Convert seconds to milliseconds
      
      this.log(`🔄 Redirect scheduled: ${config.url} (delay: ${config.delay || 0}s, newTab: ${config.newTab || false})`);
      
      setTimeout(() => {
        try {
          if (config.newTab) {
            window.open(config.url, '_blank', 'noopener,noreferrer');
          } else {
            window.location.href = config.url;
          }
        } catch (error) {
          this.log(`❌ Redirect failed: ${error.message}`, 'error');
        }
      }, delay);
      
      this.log(`✅ Redirect scheduled to: ${config.url}`);
      return { success: true };
    }

    // Utility methods
    getPageContext() {
      const url = new URL(window.location.href);
      const utm = {};
      
      // Extract UTM parameters
      for (const [key, value] of url.searchParams) {
        if (key.startsWith('utm_')) {
          utm[key] = value;
        }
      }
      
      return {
        url: window.location.href,
        path: window.location.pathname,
        deviceType: window.innerWidth <= 768 ? 'mobile' : 'desktop',
        utm,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        geolocation: this.geolocationData // Add geolocation data
      };
    }

    getUserContext() {
      return {
        sessionId: this.getSessionId(),
        visitCount: this.getVisitCount(),
        isReturning: this.isReturningVisitor(),
        browser: this.getBrowser(),
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };
    }

    getSessionId() {
      let sessionId = sessionStorage.getItem('workflow_session_id');
      if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('workflow_session_id', sessionId);
      }
      return sessionId;
    }

    getVisitCount() {
      const count = parseInt(localStorage.getItem('workflow_visit_count') || '0') + 1;
      localStorage.setItem('workflow_visit_count', count.toString());
      return count;
    }

    isReturningVisitor() {
      return localStorage.getItem('workflow_first_visit') !== null;
    }

    getBrowser() {
      const ua = navigator.userAgent;
      if (ua.includes('Chrome')) return 'Chrome';
      if (ua.includes('Firefox')) return 'Firefox';
      if (ua.includes('Safari')) return 'Safari';
      if (ua.includes('Edge')) return 'Edge';
      return 'Other';
    }

    generateSelector(element) {
      try {
        if (element.id) return `#${element.id}`;
        
        // Handle different types of className
        let className = '';
        if (element.className) {
          if (typeof element.className === 'string') {
            className = element.className;
          } else if (element.className.baseVal) {
            // SVG elements have className.baseVal
            className = element.className.baseVal;
          } else if (element.className.animVal) {
            // Some SVG elements use animVal
            className = element.className.animVal;
          }
        }
        
        if (className && className.trim()) {
          return `.${className.trim().split(' ').filter(c => c).join('.')}`;
        }
        
        return element.tagName ? element.tagName.toLowerCase() : 'unknown';
      } catch (error) {
        this.log(`⚠️ Error generating selector: ${error.message}`, 'warning');
        return 'unknown-element';
      }
    }

    /**
     * Detect if the current page is heavy/complex
     */
    detectHeavyPage() {
      const scripts = document.scripts.length;
      const images = document.images.length;
      const stylesheets = document.styleSheets.length;
      const totalElements = document.querySelectorAll('*').length;
      
      // Consider page heavy if it has many resources or elements
      const isHeavy = scripts > 10 || images > 20 || stylesheets > 5 || totalElements > 1000;
      
      if (isHeavy) {
        this.log(`🏋️ Heavy page detected: ${scripts} scripts, ${images} images, ${totalElements} elements`);
      }
      
      return isHeavy;
    }

    /**
     * Generate fallback selectors for more robust element detection
     */
    generateFallbackSelectors(selector) {
      const fallbacks = [];
      
      // If it's a class selector, try variations
      if (selector.startsWith('.')) {
        const className = selector.substring(1);
        
        // Try case-insensitive variations
        fallbacks.push(`[class*="${className}" i]`);
        fallbacks.push(`[class~="${className}" i]`);
        
        // Try partial matches
        fallbacks.push(`[class*="${className.toLowerCase()}"]`);
        fallbacks.push(`[class*="${className.toUpperCase()}"]`);
        
        // Try with common prefixes/suffixes
        fallbacks.push(`.${className}-`);
        fallbacks.push(`[class*="${className}-"]`);
        fallbacks.push(`[class*="-${className}"]`);
      }
      
      // If it's an ID selector, try variations
      if (selector.startsWith('#')) {
        const idName = selector.substring(1);
        fallbacks.push(`[id*="${idName}" i]`);
        fallbacks.push(`[id*="${idName.toLowerCase()}"]`);
        fallbacks.push(`[id*="${idName.toUpperCase()}"]`);
      }
      
      // Try data attribute variations for custom selectors
      if (selector.includes('modal') || selector.includes('Modal')) {
        fallbacks.push('[data-modal]', '[role="dialog"]', '.modal', '#modal', '[class*="modal" i]');
      }
      
      if (selector.includes('contact') || selector.includes('Contact')) {
        fallbacks.push('[data-contact]', '[class*="contact" i]', '[id*="contact" i]');
      }
      
      return fallbacks;
    }

    /**
     * Enhanced element waiting with retry mechanism for heavy pages
     */
    async waitForElement(selector, timeout = null, attempt = 1) {
      const isHeavyPage = this.detectHeavyPage();
      const baseTimeout = timeout || (isHeavyPage ? this.config.heavyPageTimeout : this.config.elementWaitTimeout);
      const actualTimeout = Math.min(baseTimeout * Math.pow(this.config.retryBackoffMultiplier, attempt - 1), 60000); // Cap at 60s
      
      this.log(`⏳ Waiting for element: ${selector} (attempt ${attempt}/${this.config.maxRetryAttempts}, timeout: ${actualTimeout}ms${isHeavyPage ? ' - heavy page' : ''})`);
      
      try {
        return await this.waitForElementSingle(selector, actualTimeout);
      } catch (error) {
        if (attempt < this.config.maxRetryAttempts) {
          this.log(`🔄 Retry ${attempt + 1}/${this.config.maxRetryAttempts} for element: ${selector}`, 'warning');
          
          // Wait for page to stabilize before retry (but with shorter timeout)
          try {
            await this.waitForPageStability(1000); // Shorter stability wait
          } catch (stabilityError) {
            this.log(`⚠️ Page stability check failed, continuing with retry`, 'warning');
          }
          
          return this.waitForElement(selector, timeout, attempt + 1);
        } else {
          this.log(`❌ Element not found after ${this.config.maxRetryAttempts} attempts: ${selector}`, 'error');
          throw error;
        }
      }
    }

    /**
     * Wait for page to stabilize (no new network requests, DOM mutations settled)
     */
    async waitForPageStability(timeout = 3000) {
      return new Promise((resolve) => {
        let stabilityTimer;
        let mutationCount = 0;
        let networkActivityCount = 0;
        let observer; // Declare observer variable first
        
        const resetTimer = () => {
          clearTimeout(stabilityTimer);
          stabilityTimer = setTimeout(() => {
            if (observer) observer.disconnect();
            this.log(`📊 Page stabilized after ${mutationCount} mutations, ${networkActivityCount} network events`);
            resolve();
          }, 500); // Wait 500ms of stability
        };

        // Monitor DOM mutations
        observer = new MutationObserver(() => {
          mutationCount++;
          resetTimer();
        });

        // Monitor network activity (images, scripts, etc.)
        const monitorNetworkActivity = () => {
          // Check for pending images
          const images = Array.from(document.images);
          const pendingImages = images.filter(img => !img.complete);
          
          if (pendingImages.length > 0) {
            this.log(`📡 Waiting for ${pendingImages.length} images to load`);
            networkActivityCount++;
            
            Promise.all(pendingImages.map(img => new Promise(resolve => {
              if (img.complete) resolve();
              else {
                img.onload = img.onerror = resolve;
              }
            }))).then(() => {
              this.log(`🖼️ All images loaded`);
              resetTimer();
            });
          }

          // Check document ready state
          if (document.readyState !== 'complete') {
            networkActivityCount++;
            document.addEventListener('readystatechange', () => {
              if (document.readyState === 'complete') {
                this.log(`📋 Document ready state: complete`);
                resetTimer();
              }
            });
          }
        };

        if (document.body) {
          observer.observe(document.body, { 
            childList: true, 
            subtree: true, 
            attributes: true 
          });
          monitorNetworkActivity();
          resetTimer();
        } else {
          resolve(); // If no body, resolve immediately
        }

        // Max timeout to prevent infinite waiting
        setTimeout(() => {
          if (observer) observer.disconnect();
          clearTimeout(stabilityTimer);
          this.log(`⏰ Page stability timeout reached (${mutationCount} mutations, ${networkActivityCount} network events observed)`);
          resolve();
        }, timeout);
      });
    }

    /**
     * Single element wait attempt with multiple detection strategies
     */
    async waitForElementSingle(selector, timeout) {
      return new Promise((resolve, reject) => {
        // Add to waiting set for tracking
        this.elementsToWaitFor.add(selector);
        let resolved = false;
        
        const cleanup = () => {
          this.elementsToWaitFor.delete(selector);
          if (observer) observer.disconnect();
          if (pollInterval) clearInterval(pollInterval);
          if (timeoutId) clearTimeout(timeoutId);
        };

        const resolveElement = (element, method) => {
          if (resolved) return;
          resolved = true;
          cleanup();
          this.log(`✅ Element found via ${method}: ${selector}`);
          resolve(element);
        };

        // Strategy 1: Immediate check
        let element = document.querySelector(selector);
        if (element) {
          resolveElement(element, 'immediate');
          return;
        }

        // Strategy 1.5: Fallback selector attempts (for cases where selector might be slightly off)
        try {
          const fallbackSelectors = this.generateFallbackSelectors(selector);
          for (const fallbackSelector of fallbackSelectors) {
            try {
              element = document.querySelector(fallbackSelector);
              if (element) {
                this.log(`🎯 Found element using fallback selector: ${fallbackSelector}`);
                resolveElement(element, 'fallback-selector');
                return;
              }
            } catch (fallbackError) {
              // Ignore individual fallback errors and continue
            }
          }
        } catch (fallbackGenerationError) {
          this.log(`⚠️ Fallback selector generation failed, continuing with standard detection`, 'warning');
        }

        let observer, pollInterval, timeoutId;

        // Strategy 2: Mutation Observer (primary)
        observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            resolveElement(element, 'mutation-observer');
          }
        });

        // Strategy 3: Polling fallback (for elements added via non-DOM methods)
        pollInterval = setInterval(() => {
          const element = document.querySelector(selector);
          if (element) {
            resolveElement(element, 'polling');
          }
        }, 250); // Poll every 250ms

        // Observe with comprehensive options
        const observeOptions = { 
          childList: true, 
          subtree: true, 
          attributes: true,
          attributeOldValue: true
        };

        // Start observing
        if (document.body) {
          observer.observe(document.body, observeOptions);
        } else {
          // If body doesn't exist, wait for it
          const bodyObserver = new MutationObserver(() => {
            if (document.body) {
              bodyObserver.disconnect();
              observer.observe(document.body, observeOptions);
            }
          });
          bodyObserver.observe(document.documentElement, { childList: true });
        }
        
        // Timeout handler
        timeoutId = setTimeout(() => {
          if (resolved) return;
          resolved = true;
          cleanup();
          const error = new Error(`Element ${selector} not found within ${timeout}ms`);
          this.log(`❌ Element timeout: ${selector} not found within ${timeout}ms`, 'error');
          reject(error);
        }, timeout);
      });
    }

    safeHideContent() {
      // Wait for body to be available
      if (!document.body) {
        // If body not ready, wait a bit and try again
        setTimeout(() => this.safeHideContent(), 10);
        return;
      }
      this.hideContent();
    }

    hideContent() {
      if (this.contentHidden) return;
      
      // Check if document.body exists
      if (!document.body) {
        this.log('⚠️ Document body not ready, skipping content hide', 'warning');
        return;
      }
      
      // Apply comprehensive hiding to prevent FOOC
      document.body.style.visibility = 'hidden';
      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity 0.3s ease';
      this.contentHidden = true;
      
      // Show loading indicator if enabled
      if (this.config.showLoadingIndicator) {
        this.showLoadingIndicator();
      }
      
      this.log('🙈 Content hidden during workflow initialization');
      
      // Safety timeout to show content regardless
      setTimeout(() => {
        this.log('⏰ Safety timeout reached, showing content', 'warning');
        this.showContent();
      }, this.config.maxInitTime);
    }

    showContent() {
      // Use anti-flicker script if available, otherwise use built-in method
      if (window.unifiedWorkflowAntiFlicker) {
        window.unifiedWorkflowAntiFlicker.showContent();
        this.contentHidden = false;
        this.log('👀 Content revealed via anti-flicker script');
        return;
      }
      
      if (!this.contentHidden) return;
      
      // Check if document.body exists
      if (!document.body) {
        this.log('⚠️ Document body not ready, skipping content show', 'warning');
        this.contentHidden = false; // Reset the flag
        return;
      }
      
      // Hide loading indicator first
      this.hideLoadingIndicator();
      
      // Progressive content reveal with smooth transition
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';
      
      this.contentHidden = false;
      this.log('👀 Content revealed after workflow processing');
    }

    async waitForAllModifications(timeout = 5000) {
      this.log('⏳ Waiting for all modifications to complete...');
      
      const startTime = Date.now();
      
      while (this.elementsToWaitFor.size > 0 && (Date.now() - startTime) < timeout) {
        this.log(`⏳ Still waiting for ${this.elementsToWaitFor.size} elements: ${Array.from(this.elementsToWaitFor).join(', ')}`);
        await this.delay(100);
      }
      
      if (this.elementsToWaitFor.size > 0) {
        this.log(`⚠️ Timeout: ${this.elementsToWaitFor.size} elements still pending`, 'warning');
      } else {
        this.log('✅ All modifications completed successfully');
      }
    }

    showLoadingIndicator() {
      if (this.loadingIndicatorShown || !this.config.showLoadingIndicator) return;
      
      const indicator = document.createElement('div');
      indicator.id = 'unified-workflow-loading';
      indicator.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 999999;
          background: rgba(255, 255, 255, 0.95);
          border-radius: 12px;
          padding: 20px 30px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          gap: 15px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          font-size: 14px;
          color: #333;
        ">
          <div style="
            width: 20px;
            height: 20px;
            border: 2px solid #e3e3e3;
            border-top: 2px solid #007bff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
          <span>Personalizing content...</span>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      
      document.body.appendChild(indicator);
      this.loadingIndicatorShown = true;
      this.log('🔄 Loading indicator shown');
    }

    hideLoadingIndicator() {
      const indicator = document.getElementById('unified-workflow-loading');
      if (indicator) {
        indicator.remove();
        this.loadingIndicatorShown = false;
        this.log('🔄 Loading indicator hidden');
      }
    }

    /**
     * Track workflow execution to analytics endpoint
     */
    async trackWorkflowExecution(workflow, executionData) {
      try {
        // Don't track if no API endpoint configured
        if (!this.config.apiEndpoint) {
          this.log('⚠️ No API endpoint configured for execution tracking', 'warning');
          return;
        }

        const trackingPayload = {
          workflowId: workflow.id,
          userId: workflow.user_id || null, // May be null for public workflows
          status: executionData.status || 'success',
          executionTimeMs: executionData.executionTimeMs,
          pageUrl: executionData.pageUrl || window.location.href,
          sessionId: this.generateSessionId(),
          userAgent: navigator.userAgent,
          deviceType: executionData.deviceType,
          actions: executionData.actionsExecuted || [],
          executionKey: executionData.executionKey // Add executionKey to payload
        };

        this.log(`📊 Tracking execution for workflow: ${workflow.name}`, 'info', trackingPayload);

        const response = await fetch(`https://xlzihfstoqdbgdegqkoi.supabase.co/functions/v1/track-execution`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(trackingPayload)
        });

        if (response.ok) {
          const result = await response.json();
          this.log(`✅ Execution tracked successfully: ${result.executionId}`, 'success');
        } else {
          const error = await response.text();
          this.log(`❌ Failed to track execution: ${response.status} - ${error}`, 'error');
        }
      } catch (error) {
        this.log(`❌ Error tracking workflow execution: ${error.message}`, 'error');
        // Don't throw - tracking failure shouldn't break workflow execution
      }
    }

    /**
     * Generate a simple session ID for tracking
     */
    generateSessionId() {
      if (!this._sessionId) {
        this._sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      return this._sessionId;
    }

    delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }

  // Global API
  window.UnifiedWorkflowSystem = UnifiedWorkflowSystem;

  // Prevent multiple instances and conflicts with legacy systems
  if (window.workflowSystem) {
    console.log('🎯 Unified Workflow System: Instance already exists, skipping initialization');
    return;
  }

  // Auto-initialize if not already done and not disabled
  if (!window.DISABLE_LEGACY_WORKFLOWS) {
    // Disable other workflow systems to prevent conflicts
    window.DISABLE_LEGACY_WORKFLOWS = true;
    
    console.log('🎯 Unified Workflow System: Initializing new instance...');
    window.workflowSystem = new UnifiedWorkflowSystem();
    
    // Track initialization state
    let priorityInitComplete = false;
    let fullInitComplete = false;
    
    // Priority initialization for immediate content replacement
    const priorityInit = async () => {
      if (priorityInitComplete) {
        console.log('🎯 Priority init already completed, skipping');
        return;
      }
      
      try {
        console.log('🎯 Starting priority initialization...');
        priorityInitComplete = true;
        
        // Fetch workflows first, then execute priority actions
        await window.workflowSystem.fetchWorkflows();
        console.log(`🎯 Priority init: ${window.workflowSystem.workflows.size} workflows loaded`);
        
        if (window.workflowSystem.workflows.size > 0) {
          await window.workflowSystem.executePriorityActions();
        } else {
          console.warn('🎯 Priority init: No workflows found, skipping priority execution');
        }
      } catch (error) {
        console.error('🎯 Priority initialization failed:', error);
        priorityInitComplete = false; // Reset on failure
      }
    };
    
    // Full initialization 
    const fullInit = async () => {
      if (fullInitComplete) {
        console.log('🎯 Full init already completed, skipping');
        return;
      }
      
      try {
        console.log('🎯 Starting full initialization...');
        fullInitComplete = true;
        
        // Wait for priority init to complete first
        while (!priorityInitComplete) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        await window.workflowSystem.initialize();
      } catch (error) {
        console.error('🎯 Full initialization failed:', error);
        fullInitComplete = false; // Reset on failure
      }
    };
    
    // Initialize when DOM is ready, with priority execution
    if (document.readyState === 'loading') {
      // Use requestIdleCallback with timeout for priority if available
      if (window.requestIdleCallback) {
        requestIdleCallback(() => priorityInit(), { timeout: 500 });
      } else {
        setTimeout(priorityInit, 0);
      }
      
      // Full initialization on DOMContentLoaded
      document.addEventListener('DOMContentLoaded', () => {
        fullInit();
      }, { once: true });
    } else {
      // Document already loaded - run priority init then full init
      priorityInit().then(() => fullInit());
    }
  }
  
  // Log that unified system is active
  console.log('🎯 Unified Workflow System: Active and preventing legacy systems');
  console.log('🎯 DISABLE_LEGACY_WORKFLOWS:', window.DISABLE_LEGACY_WORKFLOWS);

})(); 