/**
 * Unified Workflow System
 * Single, robust system for workflow automation
 * Eliminates the complexity of dual execution paths
 */

(function() {
  'use strict';
  
  class UnifiedWorkflowSystem {
    constructor(config = {}) {
      this.config = {
        apiEndpoint: 'https://trackflow-webapp-production.up.railway.app',
        apiKey: null, // Add API key support
        debug: true, // Enable debug by default to help troubleshooting
        retryAttempts: 3,
        executionDelay: 100,
        hideContentDuringInit: true,
        maxInitTime: 5000, // Increased timeout
        elementWaitTimeout: 10000, // How long to wait for elements
        showLoadingIndicator: true, // Show loading spinner
        progressive: true, // Show content progressively as modifications complete
        ...config
      };
      
      this.workflows = new Map();
      this.executedActions = new Set();
      this.executedWorkflows = new Set(); // Track executed workflows to prevent duplicates
      this.triggeredWorkflows = new Map(); // Cache triggered workflows to prevent re-triggering
      this.processingWorkflows = false; // Flag to prevent recursive processWorkflows calls
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
      this.lastTimeCheck = 0; // Throttle time-based triggers
      
      // Auto-hide content if enabled and anti-flicker script hasn't already done it
      if (this.config.hideContentDuringInit && !window.unifiedWorkflowAntiFlicker?.isContentHidden()) {
        this.safeHideContent();
      }
      
      this.log('🎯 Unified Workflow System: Starting...');
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
        
        // Fetch all active workflows first - this is CRITICAL
        await this.fetchWorkflows();
        this.log(`📊 Workflows loaded: ${this.workflows.size} workflows available`);
        
        // Execute priority actions immediately (like utm-magic.js priority execution)
        await this.executePriorityActions();
        
        // Process all immediate triggers (page load, device type, etc.)
        await this.processImmediateTriggers();
        
        // Set up event listeners for dynamic triggers
        this.setupEventListeners();
        
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
          // Check immediate triggers (device type, UTM, page load)
          const immediateEventData = {
            eventType: 'page_load',
            deviceType: this.pageContext.deviceType,
            utm: this.pageContext.utm
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

      // Click tracking - single execution per click
      document.addEventListener('click', (event) => {
        const selector = this.generateSelector(event.target);
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
      
      // For immediate triggers (page_load, device type, UTM), allow re-execution more frequently
      const isImmediateTrigger = eventData.eventType === 'page_load' || 
                                triggerType === 'Device Type' || 
                                triggerType === 'UTM Parameters';
      
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
          
        case 'Exit Intent':
          shouldTrigger = this.evaluateExitIntentTrigger(config, eventData);
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
      return eventData.eventType === 'click' && 
             eventData.elementSelector === config.selector;
    }

    /**
     * Evaluate exit intent trigger
     */
    evaluateExitIntentTrigger(config, eventData) {
      return eventData.eventType === 'exit_intent';
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
      const actionKey = `${action.id}-${Date.now()}`;
      
      // Prevent duplicate executions
      if (this.executedActions.has(actionKey)) {
        return { success: false, reason: 'already_executed' };
      }
      this.executedActions.add(actionKey);
      
      const { config = {}, name } = action;
      this.log(`⚡ Executing: ${name}`, config);

      try {
        let result = { success: false };
        
        switch (name) {
          case 'Replace Text':
            result = await this.replaceText(config);
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
        });
        
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
     * Apply a single selector efficiently (adapted from utm-magic.js)
     */
    applySingleSelector(selector, config, preventDuplicates = true) {
      const selectorKey = `${selector}-${JSON.stringify(config)}`;
      
      if (preventDuplicates && this.processedSelectors.has(selectorKey)) {
        this.log(`Skipping already processed selector: ${selector}`);
        return true; // Already processed
      }
      
      try {
        const elements = document.querySelectorAll(selector);
        if (!elements?.length) {
          this.log(`No elements found for selector: ${selector}`, 'warning');
          // Add explicit browser console warning:
          console.warn(`No elements found for selector: ${selector}`);
          return false;
        }
        
        let successCount = 0;
        
        elements.forEach(element => {
          if (this.replaceContent(element, config)) {
            successCount++;
          }
        });
        
        if (successCount > 0) {
          if (preventDuplicates) {
            this.processedSelectors.add(selectorKey);
          }
          this.log(`✅ Applied content replacement to ${successCount}/${elements.length} elements (${selector})`, 'success');
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
        return { success: true, hidden: hiddenCount };
        
      } catch (error) {
        this.log(`❌ Hide element failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    async showElement(config) {
      try {
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
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
        return { success: true, shown: elements.length };
        
      } catch (error) {
        this.log(`❌ Show element failed for ${config.selector}: ${error.message}`, 'error');
        return { success: false, error: error.message };
      }
    }

    async modifyCSS(config) {
      try {
        await this.waitForElement(config.selector);
        
        const elements = document.querySelectorAll(config.selector);
        elements.forEach(element => {
          element.style[config.property] = config.value;
        });
        
        this.completedModifications.add(`modifyCSS:${config.selector}`);
        this.log(`✅ Modified CSS for ${elements.length} elements (${config.selector})`);
        return { success: true, modified: elements.length };
        
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
        timestamp: Date.now()
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
      if (element.id) return `#${element.id}`;
      if (element.className) return `.${element.className.split(' ').join('.')}`;
      return element.tagName.toLowerCase();
    }

    async waitForElement(selector, timeout = null) {
      const actualTimeout = timeout || this.config.elementWaitTimeout;
      
      return new Promise((resolve, reject) => {
        // Add to waiting set for tracking
        this.elementsToWaitFor.add(selector);
        
        // Check if element already exists
        const element = document.querySelector(selector);
        if (element) {
          this.elementsToWaitFor.delete(selector);
          this.log(`✅ Element found immediately: ${selector}`);
          resolve(element);
          return;
        }

        this.log(`⏳ Waiting for element: ${selector} (timeout: ${actualTimeout}ms)`);

        const observer = new MutationObserver(() => {
          const element = document.querySelector(selector);
          if (element) {
            observer.disconnect();
            this.elementsToWaitFor.delete(selector);
            this.log(`✅ Element appeared: ${selector}`);
            resolve(element);
          }
        });

        // Observe with more comprehensive options
        const observeOptions = { 
          childList: true, 
          subtree: true, 
          attributes: true, 
          attributeOldValue: true 
        };

        // Start observing - handle case where body might not exist yet
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
        
        setTimeout(() => {
          observer.disconnect();
          this.elementsToWaitFor.delete(selector);
          this.log(`❌ Element timeout: ${selector} not found within ${actualTimeout}ms`, 'error');
          reject(new Error(`Element ${selector} not found within ${actualTimeout}ms`));
        }, actualTimeout);
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