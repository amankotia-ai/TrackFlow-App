/**
 * Enhanced Element-Based Event Tracking System with Workflow Integration
 * Client-side tracking script that integrates with workflow execution engine
 * 
 * This script combines element tracking with workflow automation for complete personalization
 */

(function() {
  'use strict';
  
  // Configuration
  const TRACKING_CONFIG = {
    debug: true,
    apiEndpoint: 'https://trackflow-webapp-production.up.railway.app/api/analytics/track',
    workflowEndpoint: 'https://trackflow-webapp-production.up.railway.app',
    batchSize: 10,
    batchTimeout: 5000,
    throttleMs: 100,
    maxRetries: 3,
    workflowInitDelay: 500 // Delay before initializing workflows to ensure DOM is ready
  };

  console.log('🎯 Enhanced Element Tracker: Initializing tracking + workflow system...');

  class EnhancedElementTracker {
    constructor(config = {}) {
      this.config = { ...TRACKING_CONFIG, ...config };
      this.eventQueue = [];
      this.trackedElements = new Set();
      this.eventListeners = new Map();
      this.observers = new Map();
      this.throttledEvents = new Map();
      this.processingTimer = null;
      this.sessionId = this.generateSessionId();
      this.pageContext = this.getPageContext();
      this.userContext = this.getUserContext();
      this.workflowExecutor = null;
      this.sessionData = this.initializeSessionData();
      
      console.log('🎯 Enhanced Element Tracker: Session ID:', this.sessionId);
      console.log('🎯 Enhanced Element Tracker: Page Context:', this.pageContext);
      
      this.init();
    }

    init() {
      // Initialize basic page tracking
      this.trackPageView();
      
      // Set up dynamic element tracking
      this.initializeDynamicTracking();
      
      // Initialize workflow system with delay to ensure DOM readiness
      setTimeout(() => {
        this.initializeWorkflowSystem();
      }, this.config.workflowInitDelay);
      
      // Track page unload for analytics
      window.addEventListener('beforeunload', () => {
        this.processBatch(true); // Force process remaining events
      });

      console.log('🎯 Enhanced Element Tracker: Initialization complete');
    }

    async initializeWorkflowSystem() {
      try {
        // Load workflow executor if not already loaded
        if (!window.WorkflowExecutor) {
          console.log('🎯 Loading workflow executor...');
          await this.loadWorkflowExecutor();
        }
        
        // Create workflow executor instance
        this.workflowExecutor = new window.WorkflowExecutor({
          apiEndpoint: this.config.workflowEndpoint,
          debug: this.config.debug,
          hideContentDuringInit: this.config.hideContentDuringInit !== false, // Default true unless explicitly disabled
          maxInitTime: this.config.maxInitTime || 3000
        });
        
        // Initialize workflows
        await this.workflowExecutor.initialize();
        
        // Set up event forwarding to workflow executor
        this.setupWorkflowEventForwarding();
        
        // If a specific workflowId is configured, also set up legacy trigger checking
        if (this.config.workflowId) {
          console.log('🎯 Setting up legacy trigger checking for workflow:', this.config.workflowId);
          this.setupLegacyWorkflowTriggers(this.config.workflowId);
        }
        
        console.log('🎯 Enhanced Element Tracker: Workflow system ready');
        
      } catch (error) {
        console.error('🎯 Enhanced Element Tracker: Failed to initialize workflow system:', error);
        // Continue with basic tracking even if workflows fail
      }
    }

    async loadWorkflowExecutor() {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.WorkflowExecutor) {
          resolve();
          return;
        }
        
        // Create script element
        const script = document.createElement('script');
        script.src = `${this.config.workflowEndpoint}/workflow-executor.js`;
        script.onload = resolve;
        script.onerror = reject;
        
        // Add to head
        document.head.appendChild(script);
      });
    }

    setupWorkflowEventForwarding() {
      // Override addEvent to also forward to workflow executor
      const originalAddEvent = this.addEvent.bind(this);
      
      this.addEvent = (event) => {
        // Add to normal tracking queue
        originalAddEvent(event);
        
        // Forward to workflow executor for real-time processing
        if (this.workflowExecutor) {
          const workflowEventData = this.prepareWorkflowEventData(event);
          this.workflowExecutor.handleEvent(workflowEventData);
        }
      };
    }

    prepareWorkflowEventData(event) {
      return {
        eventType: event.eventType,
        element: event.elementSelector,
        elementId: event.elementId,
        sessionVisits: this.sessionData.pageViews,
        visitCount: this.sessionData.totalVisits,
        timeOnPage: Math.floor((Date.now() - this.sessionData.sessionStart) / 1000),
        scrollPercentage: this.getCurrentScrollPercentage(),
        deviceType: this.userContext.deviceType,
        ...event.eventData,
        ...this.pageContext,
        ...this.userContext
      };
    }

    getCurrentScrollPercentage() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      return scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 0;
    }

    initializeSessionData() {
      const sessionKey = 'elementTracker_session';
      const visitKey = 'elementTracker_visits';
      
      let sessionData = {
        sessionStart: Date.now(),
        pageViews: 1,
        totalVisits: 1,
        lastVisit: Date.now()
      };
      
      try {
        // Get or create session data
        const existingSession = localStorage.getItem(sessionKey);
        const existingVisits = localStorage.getItem(visitKey);
        
        if (existingSession) {
          const parsed = JSON.parse(existingSession);
          // Check if session is still valid (within 30 minutes)
          if (Date.now() - parsed.sessionStart < 30 * 60 * 1000) {
            sessionData = {
              ...parsed,
              pageViews: parsed.pageViews + 1,
              lastVisit: Date.now()
            };
          }
        }
        
        if (existingVisits) {
          sessionData.totalVisits = parseInt(existingVisits) + (sessionData.pageViews === 1 ? 1 : 0);
        }
        
        // Store updated session data
        localStorage.setItem(sessionKey, JSON.stringify(sessionData));
        localStorage.setItem(visitKey, sessionData.totalVisits.toString());
        
      } catch (error) {
        console.warn('🎯 Enhanced Element Tracker: Could not access localStorage:', error);
      }
      
      return sessionData;
    }

    generateSessionId() {
      return 'session-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    getPageContext() {
      return {
        url: window.location.href,
        title: document.title,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      };
    }

    getUserContext() {
      return {
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        deviceType: this.getDeviceType()
      };
    }

    getDeviceType() {
      const width = window.innerWidth;
      if (width <= 768) return 'mobile';
      if (width <= 1024) return 'tablet';
      return 'desktop';
    }

    trackPageView() {
      const pageViewEvent = {
        eventType: 'page_view',
        timestamp: Date.now(),
        sessionId: this.sessionId,
        pageContext: this.pageContext,
        userContext: this.userContext,
        sessionData: this.sessionData
      };

      this.addEvent(pageViewEvent);
      console.log('📊 Enhanced Element Tracker: Page view tracked with session data');
    }

    // Enhanced tracking with workflow integration
    track(selector, eventTypes = ['click'], config = {}) {
      console.log(`🎯 Enhanced Element Tracker: Setting up tracking for "${selector}" with events:`, eventTypes);
      
      const elements = document.querySelectorAll(selector);
      
      if (elements.length === 0) {
        console.warn(`⚠️ Enhanced Element Tracker: No elements found for selector "${selector}"`);
        return;
      }

      console.log(`🎯 Enhanced Element Tracker: Found ${elements.length} elements for "${selector}"`);

      const listeners = [];
      
      elements.forEach((element, index) => {
        const elementId = this.getElementId(element, selector, index);
        
        eventTypes.forEach(eventType => {
          const listener = this.createEnhancedEventListener(element, eventType, selector, config);
          element.addEventListener(eventType, listener);
          listeners.push({ element, eventType, listener });
        });

        this.trackedElements.add(elementId);
      });

      this.eventListeners.set(selector, listeners);
    }

    createEnhancedEventListener(element, eventType, selector, config) {
      return (event) => {
        const elementId = this.getElementId(element, selector);
        
        const trackedEvent = {
          eventType: eventType,
          elementId: elementId,
          elementSelector: selector,
          elementTag: element.tagName.toLowerCase(),
          elementText: element.textContent?.trim() || '',
          elementAttributes: this.getElementAttributes(element),
          timestamp: Date.now(),
          sessionId: this.sessionId,
          eventData: this.extractEventData(event, element, eventType),
          pageContext: this.pageContext,
          userContext: this.userContext,
          sessionData: this.sessionData
        };

        this.addEvent(trackedEvent);
        
        if (this.config.debug) {
          console.log(`🎯 Enhanced Element Tracker: Event "${eventType}" on "${selector}"`, trackedEvent);
        }
      };
    }

    // All other methods from original elementTracker.js remain the same...
    trackForms(formSelector = 'form') {
      this.trackFormInteractions(formSelector);
    }

    trackFormInteractions(formSelector = 'form') {
      console.log(`📝 Enhanced Element Tracker: Setting up form tracking for "${formSelector}"`);
      
      const forms = document.querySelectorAll(formSelector);
      
      forms.forEach((form, formIndex) => {
        const formId = this.getElementId(form, formSelector, formIndex);
        
        // Track form submission
        form.addEventListener('submit', (e) => {
          this.trackFormSubmission(form, formId, e);
        });

        // Track field interactions
        const fields = form.querySelectorAll('input, textarea, select');
        fields.forEach((field, fieldIndex) => {
          const fieldId = this.getElementId(field, `${formSelector} input`, fieldIndex);
          
          field.addEventListener('focus', (e) => {
            this.trackFieldInteraction(field, fieldId, 'focus', e);
          });
          
          field.addEventListener('blur', (e) => {
            this.trackFieldInteraction(field, fieldId, 'blur', e);
          });
          
          field.addEventListener('input', (e) => {
            this.throttledTrackFieldInteraction(field, fieldId, 'input', e);
          });
        });
      });
    }

    trackVisibility(selector, threshold = 0.5) {
      this.trackElementVisibility(selector, threshold);
    }

    trackElementVisibility(selector, threshold = 0.5) {
      console.log(`👁️ Enhanced Element Tracker: Setting up visibility tracking for "${selector}"`);
      
      const elements = document.querySelectorAll(selector);
      
      if (elements.length === 0) {
        console.warn(`⚠️ Enhanced Element Tracker: No elements found for visibility tracking "${selector}"`);
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const elementId = this.getElementId(entry.target, selector);
          
          if (entry.isIntersecting) {
            this.trackVisibilityEvent(entry.target, elementId, 'element_visible', entry.intersectionRatio);
          } else {
            this.trackVisibilityEvent(entry.target, elementId, 'element_hidden', entry.intersectionRatio);
          }
        });
      }, { threshold });

      elements.forEach(element => {
        observer.observe(element);
      });

      this.observers.set(selector, observer);
    }

    // Implement all other methods from the original elementTracker.js...
    trackFormSubmission(form, formId, event) {
      const formData = new FormData(form);
      const formFields = {};
      
      for (let [key, value] of formData.entries()) {
        formFields[key] = typeof value === 'string' ? value : '[file]';
      }

      const trackedEvent = {
        eventType: 'form_submit',
        elementId: formId,
        elementSelector: this.getElementSelector(form),
        elementTag: 'form',
        timestamp: Date.now(),
        sessionId: this.sessionId,
        eventData: {
          formFields: formFields,
          fieldCount: Object.keys(formFields).length,
          formAction: form.action,
          formMethod: form.method
        },
        pageContext: this.pageContext,
        userContext: this.userContext,
        sessionData: this.sessionData
      };

      this.addEvent(trackedEvent);
      console.log('📝 Enhanced Element Tracker: Form submission tracked', trackedEvent);
    }

    trackFieldInteraction(field, fieldId, interactionType, event) {
      const trackedEvent = {
        eventType: `field_${interactionType}`,
        elementId: fieldId,
        elementSelector: this.getElementSelector(field),
        elementTag: field.tagName.toLowerCase(),
        timestamp: Date.now(),
        sessionId: this.sessionId,
        eventData: {
          fieldName: field.name,
          fieldType: field.type,
          fieldValue: interactionType === 'blur' ? field.value : undefined,
          fieldRequired: field.required,
          fieldPlaceholder: field.placeholder
        },
        pageContext: this.pageContext,
        userContext: this.userContext,
        sessionData: this.sessionData
      };

      this.addEvent(trackedEvent);
      
      if (this.config.debug) {
        console.log(`📝 Enhanced Element Tracker: Field ${interactionType} tracked`, trackedEvent);
      }
    }

    throttledTrackFieldInteraction(field, fieldId, interactionType, event) {
      const key = `${fieldId}-${interactionType}`;
      const now = Date.now();
      const lastEvent = this.throttledEvents.get(key) || 0;
      
      if (now - lastEvent >= this.config.throttleMs) {
        this.throttledEvents.set(key, now);
        this.trackFieldInteraction(field, fieldId, interactionType, event);
      }
    }

    trackVisibilityEvent(element, elementId, eventType, intersectionRatio) {
      const trackedEvent = {
        eventType: eventType,
        elementId: elementId,
        elementSelector: this.getElementSelector(element),
        elementTag: element.tagName.toLowerCase(),
        elementText: element.textContent?.trim() || '',
        timestamp: Date.now(),
        sessionId: this.sessionId,
        eventData: {
          visibilityPercentage: Math.round(intersectionRatio * 100),
          intersectionRatio: intersectionRatio
        },
        pageContext: this.pageContext,
        userContext: this.userContext,
        sessionData: this.sessionData
      };

      this.addEvent(trackedEvent);
      
      if (this.config.debug) {
        console.log(`👁️ Enhanced Element Tracker: Visibility event "${eventType}"`, trackedEvent);
      }
    }

    initializeDynamicTracking() {
      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkNewElement(node);
            }
          });
        });
      });

      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });

      this.observers.set('dynamic-content', mutationObserver);
      console.log('🔄 Enhanced Element Tracker: Dynamic content tracking initialized');
    }

    checkNewElement(element) {
      if (this.config.debug) {
        console.log('🔄 Enhanced Element Tracker: New element added:', element.tagName, element.className);
      }
    }

    // Utility methods
    getElementId(element, selector, index = 0) {
      if (element.id) {
        return element.id;
      }
      
      const selectorHash = btoa(selector).replace(/[^a-zA-Z0-9]/g, '').substr(0, 8);
      return `elem-${selectorHash}-${index}`;
    }

    getElementSelector(element) {
      if (element.id) {
        return `#${element.id}`;
      }
      
      if (element.className) {
        const classes = element.className.split(' ').filter(c => c.trim()).join('.');
        return `${element.tagName.toLowerCase()}.${classes}`;
      }
      
      return element.tagName.toLowerCase();
    }

    getElementAttributes(element) {
      const attributes = {};
      const relevantAttrs = ['id', 'class', 'href', 'src', 'alt', 'title', 'data-track', 'role'];
      
      relevantAttrs.forEach(attr => {
        const value = element.getAttribute(attr);
        if (value) {
          attributes[attr] = value;
        }
      });
      
      return attributes;
    }

    extractEventData(event, element, eventType) {
      const data = {
        eventType: eventType,
        targetTag: event.target.tagName.toLowerCase()
      };

      if (eventType === 'click') {
        data.clickCoordinates = { x: event.clientX, y: event.clientY };
        data.ctrlKey = event.ctrlKey;
        data.shiftKey = event.shiftKey;
        data.altKey = event.altKey;
      }

      if (eventType === 'scroll') {
        data.scrollPosition = { x: window.pageXOffset, y: window.pageYOffset };
        data.scrollPercentage = this.getCurrentScrollPercentage();
      }

      return data;
    }

    addEvent(event) {
      this.eventQueue.push(event);
      
      if (this.eventQueue.length >= this.config.batchSize) {
        this.processBatch();
      } else if (!this.processingTimer) {
        this.processingTimer = setTimeout(() => {
          this.processBatch();
        }, this.config.batchTimeout);
      }
    }

    async processBatch(force = false) {
      if (this.eventQueue.length === 0 && !force) return;
      
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
      
      const events = [...this.eventQueue];
      this.eventQueue = [];
      
      if (events.length === 0) return;

      try {
        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ events, sessionId: this.sessionId })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (this.config.debug) {
          console.log(`📊 Enhanced Element Tracker: Sent batch of ${events.length} events`);
        }

      } catch (error) {
        console.error('📊 Enhanced Element Tracker: Failed to send events:', error);
        // Re-queue events for retry (implement retry logic as needed)
      }
    }

    destroy() {
      // Remove all event listeners
      this.eventListeners.forEach(listeners => {
        listeners.forEach(({ element, eventType, listener }) => {
          element.removeEventListener(eventType, listener);
        });
      });

      // Disconnect all observers
      this.observers.forEach(observer => {
        observer.disconnect();
      });

      // Process remaining events
      this.processBatch(true);

      console.log('🎯 Enhanced Element Tracker: Destroyed');
    }

    setupLegacyWorkflowTriggers(workflowId) {
      // Override addEvent to also check triggers via API
      const originalAddEvent = this.addEvent.bind(this);
      
      this.addEvent = async (event) => {
        // Add to normal tracking queue
        originalAddEvent(event);
        
        // Check workflow triggers via API for specific workflow
        if (workflowId && workflowId !== 'element-tracking-demo' && workflowId !== 'test-workflow-123') {
          try {
            const triggerUrl = this.config.apiEndpoint.replace('/analytics/track', '/workflows/trigger-check');
            const response = await fetch(triggerUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                event: this.prepareWorkflowEventData(event),
                workflowId: workflowId
              })
            });
            
            if (response.ok) {
              const result = await response.json();
              
              if (result.triggered && result.actions && result.actions.length > 0) {
                console.log('🔄 Legacy Workflow Triggered:', result.actions);
                // Execute actions using the legacy format
                this.executeLegacyWorkflowActions(result.actions);
              }
            }
          } catch (error) {
            console.error('❌ Legacy workflow trigger check failed:', error);
          }
        }
      };
    }

    executeLegacyWorkflowActions(actions) {
      // Execute actions in the legacy format
      actions.forEach(action => {
        setTimeout(() => {
          this.executeLegacyAction(action);
        }, action.delay || 0);
      });
    }

    executeLegacyAction(action) {
      const elements = document.querySelectorAll(action.target);
      
      if (elements.length === 0) {
        console.warn('⚠️ Action target not found:', action.target);
        return;
      }
      
      console.log(`🎬 Executing legacy action: ${action.type} on ${elements.length} element(s)`);
      
      switch (action.type) {
        case 'replace_text':
          elements.forEach(element => {
            if (action.originalText && element.textContent.includes(action.originalText)) {
              element.textContent = element.textContent.replace(action.originalText, action.newText);
            } else if (action.newText) {
              element.textContent = action.newText;
            }
          });
          break;
          
        case 'hide_element':
          elements.forEach(element => {
            if (action.animation === 'fade') {
              element.style.transition = 'opacity 0.3s ease';
              element.style.opacity = '0';
              setTimeout(() => element.style.display = 'none', 300);
            } else {
              element.style.display = 'none';
            }
          });
          break;
          
        case 'show_element':
          elements.forEach(element => {
            element.style.display = 'block';
            if (action.animation === 'fade') {
              element.style.opacity = '0';
              element.style.transition = 'opacity 0.3s ease';
              setTimeout(() => element.style.opacity = '1', 10);
            }
          });
          break;
          
        case 'modify_css':
          elements.forEach(element => {
            if (action.property && action.value) {
              element.style[action.property] = action.value;
            }
          });
          break;
          
        case 'add_class':
          elements.forEach(element => {
            if (action.className) {
              element.classList.add(action.className);
            }
          });
          break;
          
        case 'display_overlay':
          const overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;color:white;';
          overlay.innerHTML = action.content || '<div>Overlay Content</div>';
          overlay.onclick = () => overlay.remove();
          document.body.appendChild(overlay);
          break;
          
        default:
          console.warn('⚠️ Unknown legacy action type:', action.type);
      }
    }
  }

  // Global API
  window.ElementTracker = EnhancedElementTracker;
  window.EnhancedElementTracker = EnhancedElementTracker;

  // Auto-initialize with default settings if not already initialized
  if (!window.elementTracker) {
    window.elementTracker = new EnhancedElementTracker();
    
    // Auto-track common elements after initialization
    setTimeout(() => {
      // Track all buttons and CTAs
      window.elementTracker.track('button, .btn, .cta, [role="button"]', ['click']);
      
      // Track all links
      window.elementTracker.track('a[href]', ['click']);
      
      // Track all forms
      window.elementTracker.trackForms();
      
      // Track main content areas for visibility
      window.elementTracker.trackVisibility('main, .main-content, .content, article');
      
      console.log('🎯 Enhanced Element Tracker: Auto-tracking initialized for common elements');
    }, 1000);
  }

})(); 