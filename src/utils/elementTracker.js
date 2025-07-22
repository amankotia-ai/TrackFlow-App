/**
 * Element-Based Event Tracking System
 * Client-side tracking script for personalization workflows
 * 
 * This script tracks user interactions with specific elements on a webpage
 * and sends the data to our analytics system for workflow triggers.
 */

(function() {
  'use strict';
  
  // Configuration
  const TRACKING_CONFIG = {
    debug: true,
    apiEndpoint: 'https://trackflow-webapp-production.up.railway.app/api/analytics/track',
    batchSize: 10,
    batchTimeout: 5000,
    throttleMs: 100,
    maxRetries: 3
  };

  console.log('🎯 Element Tracker: Initializing tracking system...');

  class ElementEventTracker {
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
      
      console.log('🎯 Element Tracker: Session ID:', this.sessionId);
      console.log('🎯 Element Tracker: Page Context:', this.pageContext);
      
      this.init();
    }

    init() {
      // Initialize basic page tracking
      this.trackPageView();
      
      // Set up dynamic element tracking
      this.initializeDynamicTracking();
      
      // Track page unload for analytics
      window.addEventListener('beforeunload', () => {
        this.processBatch(true); // Force process remaining events
      });

      console.log('🎯 Element Tracker: Initialization complete');
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
        userContext: this.userContext
      };

      this.addEvent(pageViewEvent);
      console.log('📊 Element Tracker: Page view tracked');
    }

    /**
     * Track specific elements based on CSS selectors
     */
    trackElement(selector, eventTypes = ['click'], config = {}) {
      console.log(`🎯 Element Tracker: Setting up tracking for "${selector}" with events:`, eventTypes);
      
      const elements = document.querySelectorAll(selector);
      
      if (elements.length === 0) {
        console.warn(`⚠️ Element Tracker: No elements found for selector "${selector}"`);
        return;
      }

      console.log(`🎯 Element Tracker: Found ${elements.length} elements for "${selector}"`);

      const listeners = [];
      
      elements.forEach((element, index) => {
        const elementId = this.getElementId(element, selector, index);
        
        eventTypes.forEach(eventType => {
          const listener = this.createEventListener(element, eventType, selector, config);
          element.addEventListener(eventType, listener);
          listeners.push({ element, eventType, listener });
        });

        this.trackedElements.add(elementId);
      });

      this.eventListeners.set(selector, listeners);
    }

    /**
     * Track form interactions specifically
     */
    trackFormInteractions(formSelector = 'form') {
      console.log(`📝 Element Tracker: Setting up form tracking for "${formSelector}"`);
      
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

    /**
     * Track element visibility using Intersection Observer
     */
    trackElementVisibility(selector, threshold = 0.5) {
      console.log(`👁️ Element Tracker: Setting up visibility tracking for "${selector}"`);
      
      const elements = document.querySelectorAll(selector);
      
      if (elements.length === 0) {
        console.warn(`⚠️ Element Tracker: No elements found for visibility tracking "${selector}"`);
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

    createEventListener(element, eventType, selector, config) {
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
          userContext: this.userContext
        };

        this.addEvent(trackedEvent);
        
        if (this.config.debug) {
          console.log(`🎯 Element Tracker: Event "${eventType}" on "${selector}"`, trackedEvent);
        }
      };
    }

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
        userContext: this.userContext
      };

      this.addEvent(trackedEvent);
      console.log('📝 Element Tracker: Form submission tracked', trackedEvent);
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
          fieldValue: interactionType === 'blur' ? field.value : undefined, // Only capture value on blur for privacy
          fieldRequired: field.required,
          fieldPlaceholder: field.placeholder
        },
        pageContext: this.pageContext,
        userContext: this.userContext
      };

      this.addEvent(trackedEvent);
      
      if (this.config.debug) {
        console.log(`📝 Element Tracker: Field ${interactionType} tracked`, trackedEvent);
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
        userContext: this.userContext
      };

      this.addEvent(trackedEvent);
      
      if (this.config.debug) {
        console.log(`👁️ Element Tracker: Visibility event "${eventType}"`, trackedEvent);
      }
    }

    initializeDynamicTracking() {
      // Set up MutationObserver for dynamic content
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
      console.log('🔄 Element Tracker: Dynamic content tracking initialized');
    }

    checkNewElement(element) {
      // This will be used to automatically track dynamically added elements
      // For now, just log them
      if (this.config.debug) {
        console.log('🔄 Element Tracker: New element added:', element.tagName, element.className);
      }
    }

    getElementId(element, selector, index = 0) {
      if (element.id) {
        return element.id;
      }
      
      // Generate a unique ID based on selector and position
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

      // Add event-specific data
      if (eventType === 'click') {
        data.clickCoordinates = { x: event.clientX, y: event.clientY };
        data.ctrlKey = event.ctrlKey;
        data.shiftKey = event.shiftKey;
      }
      
      if (eventType === 'scroll') {
        data.scrollTop = window.pageYOffset;
        data.scrollLeft = window.pageXOffset;
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

    processBatch(force = false) {
      if (this.processingTimer) {
        clearTimeout(this.processingTimer);
        this.processingTimer = null;
      }

      if (this.eventQueue.length === 0) {
        return;
      }

      const batch = this.eventQueue.splice(0, this.config.batchSize);
      this.sendBatchToAnalytics(batch);
      
      if (this.config.debug) {
        console.log(`📊 Element Tracker: Processing batch of ${batch.length} events`, batch);
      }
    }

    async sendBatchToAnalytics(batch) {
      try {
        const response = await fetch(this.config.apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            events: batch,
            metadata: {
              sessionId: this.sessionId,
              timestamp: Date.now(),
              userAgent: navigator.userAgent
            }
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (this.config.debug) {
          console.log('📊 Element Tracker: Batch sent successfully', result);
        }
      } catch (error) {
        console.error('❌ Element Tracker: Failed to send batch:', error);
        
        // Add events back to queue for retry (simple retry logic)
        if (error.retryCount < this.config.maxRetries) {
          batch.forEach(event => {
            event.retryCount = (event.retryCount || 0) + 1;
            this.eventQueue.unshift(event);
          });
        }
      }
    }

    // Public API methods
    track(selector, eventTypes = ['click'], config = {}) {
      this.trackElement(selector, eventTypes, config);
      return this;
    }

    trackForms(selector = 'form') {
      this.trackFormInteractions(selector);
      return this;
    }

    trackVisibility(selector, threshold = 0.5) {
      this.trackElementVisibility(selector, threshold);
      return this;
    }

    // Stop tracking
    destroy() {
      // Remove all event listeners
      this.eventListeners.forEach((listeners, selector) => {
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

      console.log('🎯 Element Tracker: Destroyed');
    }
  }

  // Global API
  window.ElementTracker = ElementEventTracker;

  // Auto-initialize with default settings if not already initialized and not disabled
  if (!window.elementTracker && !window.DISABLE_LEGACY_WORKFLOWS) {
    window.elementTracker = new ElementEventTracker();
    
    // Auto-track common elements
    setTimeout(() => {
      // Track all buttons and CTAs
      window.elementTracker.track('button, .btn, .cta, [role="button"]', ['click']);
      
      // Track all links
      window.elementTracker.track('a[href]', ['click']);
      
      // Track all forms
      window.elementTracker.trackForms();
      
      // Track main content areas for visibility
      window.elementTracker.trackVisibility('main, .main-content, .content, article');
      
      console.log('🎯 Element Tracker: Auto-tracking initialized for common elements');
    }, 1000);
  }

})(); 