/**
 * Workflow Execution Engine
 * Handles fetching, evaluating, and executing workflow operations
 */

(function() {
  'use strict';
  
  class WorkflowExecutor {
    constructor(config = {}) {
      // Prevent conflicts with unified workflow system
      if (window.DISABLE_LEGACY_WORKFLOWS && window.workflowSystem) {
        console.log('🎯 Workflow Executor: Unified system is active, skipping legacy initialization');
        return;
      }

      this.config = {
        apiEndpoint: 'https://trackflow-webapp-production.up.railway.app',
        debug: true,
        retryAttempts: 3,
        executionDelay: 100,
        hideContentDuringInit: true,
        maxInitTime: 3000, // Maximum time to wait for workflows before showing content
        ...config
      };
      
      this.workflows = new Map();
      this.executedActions = new Set();
      this.pageContext = this.getPageContext();
      this.userContext = this.getUserContext();
      this.contentHidden = false;
      this.initializationComplete = false;
      
      // Hide content immediately if enabled
      if (this.config.hideContentDuringInit) {
        this.hideContentDuringInitialization();
      }
      
      console.log('🎯 Workflow Executor: Initialized');
    }

    getPageContext() {
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        title: document.title,
        referrer: document.referrer,
        userAgent: navigator.userAgent
      };
    }

    getUserContext() {
      return {
        deviceType: this.getDeviceType(),
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled
      };
    }

    getDeviceType() {
      const width = window.innerWidth;
      if (width <= 768) return 'mobile';
      if (width <= 1024) return 'tablet';
      return 'desktop';
    }

    /**
     * Fetch active workflows for the current page
     */
    async fetchWorkflows() {
      try {
        const response = await fetch(`${this.config.apiEndpoint}/api/workflows/active?url=${encodeURIComponent(window.location.href)}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.workflows) {
          data.workflows.forEach(workflow => {
            this.workflows.set(workflow.id, workflow);
          });
          
          console.log(`🎯 Workflow Executor: Loaded ${data.workflows.length} active workflows`);
          return data.workflows;
        }
        
        return [];
      } catch (error) {
        console.error('🎯 Workflow Executor: Failed to fetch workflows:', error);
        return [];
      }
    }

    /**
     * Evaluate trigger conditions
     */
    evaluateTrigger(trigger, eventData = {}) {
      const { config, name } = trigger;
      
      if (this.config.debug) {
        console.log(`🔍 Evaluating trigger: ${name}`, config, eventData);
      }

      switch (name) {
        case 'Device Type':
          return this.evaluateDeviceTrigger(config, eventData);
        
        case 'UTM Parameters':
          return this.evaluateUTMTrigger(config, eventData);
        
        case 'Page Visits':
          return this.evaluatePageVisitTrigger(config, eventData);
        
        case 'Time on Page':
          return this.evaluateTimeOnPageTrigger(config, eventData);
        
        case 'Scroll Depth':
          return this.evaluateScrollDepthTrigger(config, eventData);
        
        case 'Element Click':
          return this.evaluateElementClickTrigger(config, eventData);
        
        case 'Repeat Visitor':
          return this.evaluateRepeatVisitorTrigger(config, eventData);
        
        default:
          console.warn(`🎯 Unknown trigger type: ${name}`);
          return false;
      }
    }

    evaluateDeviceTrigger(config, eventData) {
      const currentDevice = this.userContext.deviceType;
      return config.deviceType === currentDevice;
    }

    evaluateUTMTrigger(config, eventData) {
      const urlParams = new URLSearchParams(window.location.search);
      const utmValue = urlParams.get(config.parameter);
      
      if (!utmValue) return false;
      
      switch (config.operator || 'equals') {
        case 'equals':
          return utmValue === config.value;
        case 'contains':
          return utmValue.includes(config.value);
        case 'starts_with':
          return utmValue.startsWith(config.value);
        case 'exists':
          return Boolean(utmValue);
        default:
          return false;
      }
    }

    evaluatePageVisitTrigger(config, eventData) {
      // This would normally check stored visit count
      // For now, return true if we have session data
      return eventData.sessionVisits >= (config.visitCount || 1);
    }

    evaluateTimeOnPageTrigger(config, eventData) {
      const timeOnPage = eventData.timeOnPage || 0;
      const threshold = config.unit === 'minutes' ? config.duration * 60 : config.duration;
      return timeOnPage >= threshold;
    }

    evaluateScrollDepthTrigger(config, eventData) {
      const scrollPercentage = eventData.scrollPercentage || 0;
      return scrollPercentage >= (config.scrollPercentage || 50);
    }

    evaluateElementClickTrigger(config, eventData) {
      if (eventData.eventType !== 'click') return false;
      
      const element = document.querySelector(config.selector);
      return element && eventData.element === config.selector;
    }

    evaluateRepeatVisitorTrigger(config, eventData) {
      // This would check stored visit history
      return eventData.visitCount >= (config.minimumVisitCount || 2);
    }

    /**
     * Execute workflow actions
     */
    async executeAction(action, context = {}) {
      const actionKey = `${action.id}-${Date.now()}`;
      
      // Prevent duplicate executions
      if (this.executedActions.has(actionKey)) {
        return;
      }
      
      this.executedActions.add(actionKey);
      
      // Transform action to standardized format if needed
      const standardizedAction = this.transformActionToStandard(action);
      
      if (this.config.debug) {
        console.log(`⚡ Executing action: ${standardizedAction.name}`, standardizedAction.config);
      }

      try {
        switch (standardizedAction.name) {
          case 'Replace Text':
            await this.executeReplaceText(standardizedAction.config);
            break;
          
          case 'Hide Element':
            await this.executeHideElement(standardizedAction.config);
            break;
          
          case 'Show Element':
            await this.executeShowElement(standardizedAction.config);
            break;
          
          case 'Modify CSS':
            await this.executeModifyCSS(standardizedAction.config);
            break;
          
          case 'Add Class':
            await this.executeAddClass(standardizedAction.config);
            break;
          
          case 'Remove Class':
            await this.executeRemoveClass(standardizedAction.config);
            break;
          
          case 'Display Overlay':
            await this.executeDisplayOverlay(standardizedAction.config);
            break;
          
          case 'Redirect Page':
          case 'Redirect User':
            await this.executeRedirectPage(standardizedAction.config);
            break;
          
          case 'Custom Event':
            await this.executeCustomEvent(standardizedAction.config);
            break;
          
          case 'Progressive Form':
            await this.executeProgressiveForm(standardizedAction.config);
            break;
          
          case 'Dynamic Content':
            await this.executeDynamicContent(standardizedAction.config);
            break;
          
          default:
            console.warn(`⚡ Unknown action type: ${standardizedAction.name}`);
        }
      } catch (error) {
        console.error(`⚡ Error executing action ${standardizedAction.name}:`, error);
      }
    }

    /**
     * Transform action to standardized format
     * Handles both database format and legacy format
     */
    transformActionToStandard(action) {
      // If action is already in standard format (has name and config), return as-is
      if (action.name && action.config) {
        return action;
      }
      
      // If action is in legacy format (has type and target), transform to standard
      if (action.type && action.target) {
        const config = {
          selector: action.target,
          animation: action.animation || 'fade'
        };
        
        // Add action-specific properties to config
        switch (action.type) {
          case 'replace_text':
            config.newText = action.newText;
            config.originalText = action.originalText;
            return {
              id: action.id || `legacy-${Date.now()}`,
              name: 'Replace Text',
              config
            };
            
          case 'hide_element':
            return {
              id: action.id || `legacy-${Date.now()}`,
              name: 'Hide Element',
              config
            };
            
          case 'show_element':
            return {
              id: action.id || `legacy-${Date.now()}`,
              name: 'Show Element',
              config
            };
            
          case 'modify_css':
            config.property = action.property;
            config.value = action.value;
            return {
              id: action.id || `legacy-${Date.now()}`,
              name: 'Modify CSS',
              config
            };
            
          case 'add_class':
            config.className = action.className;
            return {
              id: action.id || `legacy-${Date.now()}`,
              name: 'Add Class',
              config
            };
            
          case 'remove_class':
            config.className = action.className;
            return {
              id: action.id || `legacy-${Date.now()}`,
              name: 'Remove Class',
              config
            };
            
          case 'display_overlay':
            config.content = action.content;
            config.position = action.position || 'center';
            return {
              id: action.id || `legacy-${Date.now()}`,
              name: 'Display Overlay',
              config
            };
            
          case 'redirect':
            config.url = action.url;
            config.delay = action.delay || 0;
            config.newTab = action.newTab || false;
            return {
              id: action.id || `legacy-${Date.now()}`,
              name: 'Redirect User', // Use the current node template name
              config
            };
            
          case 'custom_event':
            config.eventName = action.eventName;
            config.eventData = action.eventData;
            return {
              id: action.id || `legacy-${Date.now()}`,
              name: 'Custom Event',
              config
            };
            
          default:
            console.warn(`⚡ Unknown legacy action type: ${action.type}`);
            return {
              id: action.id || `legacy-${Date.now()}`,
              name: action.type,
              config: { ...action }
            };
        }
      }
      
      // Fallback: return action as-is with warning
      console.warn('⚡ Action format not recognized:', action);
      return action;
    }

    // Action Executors
    async executeReplaceText(config) {
      await this.waitForElement(config.selector);
      
      const elements = document.querySelectorAll(config.selector);
      if (!elements?.length) {
        console.warn(`🎯 No elements found for selector: ${config.selector}`);
        return;
      }
      
      let successCount = 0;
      elements.forEach(element => {
        if (this.replaceContentRobust(element, config)) {
          successCount++;
        }
      });
      
      this.logActionExecution('Replace Text', config.selector, `Text changed in ${successCount}/${elements.length} elements to: ${config.newText}`);
    }

    /**
     * Robust content replacement adapted from utm-magic.js
     */
    replaceContentRobust(element, config) {
      if (!element || (!config.newText && config.newText !== '')) return false;
      
      try {
        const tagName = element.tagName.toLowerCase();
        const newText = config.newText;
        const originalText = config.originalText;
        
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
        console.error('🎯 Error replacing content:', e);
        return false;
      }
    }

    async executeHideElement(config) {
      await this.waitForElement(config.selector);
      
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        if (config.animation === 'fade') {
          element.style.transition = 'opacity 0.3s ease';
          element.style.opacity = '0';
          setTimeout(() => {
            element.style.display = 'none';
          }, 300);
        } else if (config.animation === 'slide') {
          element.style.transition = 'transform 0.3s ease';
          element.style.transform = 'translateY(-100%)';
          setTimeout(() => {
            element.style.display = 'none';
          }, 300);
        } else {
          element.style.display = 'none';
        }
      });
      
      this.logActionExecution('Hide Element', config.selector);
    }

    async executeShowElement(config) {
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        element.style.display = '';
        
        if (config.animation === 'fade') {
          element.style.opacity = '0';
          element.style.transition = 'opacity 0.3s ease';
          setTimeout(() => {
            element.style.opacity = '1';
          }, 10);
        } else if (config.animation === 'slide') {
          element.style.transform = 'translateY(-100%)';
          element.style.transition = 'transform 0.3s ease';
          setTimeout(() => {
            element.style.transform = 'translateY(0)';
          }, 10);
        }
      });
      
      this.logActionExecution('Show Element', config.selector);
    }

    async executeModifyCSS(config) {
      await this.waitForElement(config.selector);
      
      const elements = document.querySelectorAll(config.selector);
      const property = config.customProperty || config.property;
      
      elements.forEach(element => {
        element.style[property] = config.value;
      });
      
      this.logActionExecution('Modify CSS', config.selector, `${property}: ${config.value}`);
    }

    async executeAddClass(config) {
      await this.waitForElement(config.selector);
      
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        element.classList.add(config.className);
      });
      
      this.logActionExecution('Add Class', config.selector, config.className);
    }

    async executeRemoveClass(config) {
      await this.waitForElement(config.selector);
      
      const elements = document.querySelectorAll(config.selector);
      elements.forEach(element => {
        element.classList.remove(config.className);
      });
      
      this.logActionExecution('Remove Class', config.selector, config.className);
    }

    async executeDisplayOverlay(config) {
      // Create overlay element
      const overlay = document.createElement('div');
      overlay.id = 'workflow-overlay-' + Date.now();
      overlay.innerHTML = config.content || '<div>Overlay Content</div>';
      
      // Style overlay
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: Arial, sans-serif;
      `;
      
      // Add close functionality
      overlay.addEventListener('click', () => {
        overlay.remove();
      });
      
      document.body.appendChild(overlay);
      this.logActionExecution('Display Overlay');
    }

    async executeRedirectPage(config) {
      // Validate URL
      if (!config.url || typeof config.url !== 'string') {
        console.error('⚠️ Redirect action: Invalid or missing URL');
        return;
      }

      // Prevent redirect loops - check if we're redirecting to the same page
      const currentUrl = window.location.href;
      const targetUrl = new URL(config.url, window.location.origin).href;
      
      if (currentUrl === targetUrl) {
        console.warn('⚠️ Redirect action: Prevented redirect to same page to avoid infinite loop');
        return;
      }

      // Check if we've already redirected recently (within last 10 seconds)
      const redirectKey = `redirect_${targetUrl}`;
      const lastRedirectTime = sessionStorage.getItem(redirectKey);
      const now = Date.now();
      
      if (lastRedirectTime && (now - parseInt(lastRedirectTime)) < 10000) {
        console.warn('⚠️ Redirect action: Prevented rapid consecutive redirects to prevent loop');
        return;
      }

      // Store redirect timestamp
      sessionStorage.setItem(redirectKey, now.toString());

      const delay = (config.delay || 0) * 1000; // Convert seconds to milliseconds
      
      if (this.config.debug) {
        console.log(`🔄 Redirect scheduled: ${config.url} (delay: ${config.delay || 0}s, newTab: ${config.newTab || false})`);
      }
      
      setTimeout(() => {
        try {
          if (config.newTab) {
            window.open(config.url, '_blank', 'noopener,noreferrer');
          } else {
            window.location.href = config.url;
          }
        } catch (error) {
          console.error('❌ Redirect failed:', error);
        }
      }, delay);
      
      this.logActionExecution('Redirect', config.url);
    }

    async executeCustomEvent(config) {
      // Send custom event to analytics
      if (window.elementTracker) {
        const customEvent = {
          eventType: 'custom_workflow_event',
          eventName: config.eventName,
          eventData: config.eventData,
          timestamp: Date.now(),
          sessionId: window.elementTracker.sessionId,
          pageContext: this.pageContext,
          userContext: this.userContext
        };
        
        window.elementTracker.addEvent(customEvent);
      }
      
      this.logActionExecution('Custom Event', config.eventName);
    }

    async executeProgressiveForm(config) {
      await this.waitForElement(config.triggerField);
      
      const triggerField = document.querySelector(config.triggerField);
      const additionalFields = document.querySelector(config.additionalFields);
      
      if (triggerField && additionalFields) {
        triggerField.addEventListener('focus', () => {
          additionalFields.style.display = 'block';
          if (config.animation === 'slide') {
            additionalFields.style.transform = 'translateY(-20px)';
            additionalFields.style.transition = 'transform 0.3s ease';
            setTimeout(() => {
              additionalFields.style.transform = 'translateY(0)';
            }, 10);
          }
        });
      }
      
      this.logActionExecution('Progressive Form', config.triggerField);
    }

    async executeDynamicContent(config) {
      await this.waitForElement(config.targetContainer);
      
      const container = document.querySelector(config.targetContainer);
      if (container) {
        // Replace placeholders in template with actual data
        let content = config.contentTemplate;
        
        // Simple placeholder replacement
        content = content.replace(/\{\{(\w+)\}\}/g, (match, key) => {
          return this.userContext[key] || this.pageContext[key] || match;
        });
        
        container.innerHTML = content;
      }
      
      this.logActionExecution('Dynamic Content', config.targetContainer);
    }

    // Utility methods
    async waitForElement(selector, timeout = 5000) {
      return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
          return;
        }

        const observer = new MutationObserver((mutations, obs) => {
          const element = document.querySelector(selector);
          if (element) {
            obs.disconnect();
            resolve(element);
          }
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });

        setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
      });
    }

    logActionExecution(actionName, target = '', details = '') {
      if (this.config.debug) {
        console.log(`⚡ Executed: ${actionName}${target ? ' on ' + target : ''}${details ? ' - ' + details : ''}`);
      }
    }

    /**
     * Process workflows and execute matching actions
     */
    async processWorkflows(eventData = {}) {
      if (this.workflows.size === 0) {
        return;
      }

      for (const [workflowId, workflow] of this.workflows) {
        if (!workflow.isActive) continue;

        // Find trigger node
        const triggerNode = workflow.nodes.find(node => node.type === 'trigger');
        if (!triggerNode) continue;

        // Evaluate trigger
        const triggerMatches = this.evaluateTrigger(triggerNode, eventData);
        
        if (triggerMatches) {
          console.log(`🎯 Workflow triggered: ${workflow.name}`);
          
          // Track execution start time
          const executionStartTime = performance.now();
          
          // Find connected action nodes
          const actionNodes = this.getConnectedActions(workflow, triggerNode.id);
          
          const executedActions = [];
          
          // Execute actions in sequence
          for (const actionNode of actionNodes) {
            const actionStartTime = performance.now();
            
            try {
              await this.executeAction(actionNode, { workflow, trigger: triggerNode });
              
              const actionExecutionTime = Math.round(performance.now() - actionStartTime);
              executedActions.push({
                name: actionNode.name,
                config: actionNode.config,
                selector: actionNode.config?.selector,
                executionTimeMs: actionExecutionTime
              });
              
            } catch (error) {
              console.error(`Error executing action ${actionNode.name}:`, error);
            }
            
            // Add delay between actions if configured
            if (this.config.executionDelay > 0) {
              await new Promise(resolve => setTimeout(resolve, this.config.executionDelay));
            }
          }
          
          // Calculate total execution time
          const totalExecutionTime = Math.round(performance.now() - executionStartTime);
          
          // Track the workflow execution
          await this.trackWorkflowExecution(workflow, {
            status: 'success',
            executionTimeMs: totalExecutionTime,
            pageUrl: window.location.href,
            deviceType: this.pageContext.deviceType,
            triggerName: triggerNode.name,
            actionsExecuted: executedActions
          });
        }
      }
    }

    getConnectedActions(workflow, triggerNodeId) {
      const actionNodes = [];
      const visited = new Set();
      
      const findConnectedNodes = (nodeId) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        
        const connections = workflow.connections.filter(conn => conn.sourceNodeId === nodeId);
        
        for (const connection of connections) {
          const targetNode = workflow.nodes.find(node => node.id === connection.targetNodeId);
          if (targetNode && targetNode.type === 'action') {
            actionNodes.push(targetNode);
            findConnectedNodes(targetNode.id); // Support chained actions
          }
        }
      };
      
      findConnectedNodes(triggerNodeId);
      return actionNodes;
    }

    /**
     * Hide content during initialization to prevent FOUC
     */
    hideContentDuringInitialization() {
      if (this.contentHidden) return;
      
      // Create and inject CSS to hide content
      const style = document.createElement('style');
      style.id = 'workflow-init-hide';
      style.textContent = `
        body {
          visibility: hidden !important;
          opacity: 0 !important;
          transition: opacity 0.3s ease-in-out !important;
        }
        
        .workflow-loading-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: rgba(255, 255, 255, 0.95) !important;
          z-index: 999999 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: Arial, sans-serif !important;
          font-size: 16px !important;
          color: #333 !important;
        }
      `;
      
      // Add to head as early as possible
      if (document.head) {
        document.head.appendChild(style);
      } else {
        // If head doesn't exist yet, add to document
        document.documentElement.appendChild(style);
      }
      
      // Add loading overlay when DOM is ready
      if (document.body) {
        this.addLoadingOverlay();
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          this.addLoadingOverlay();
        });
      }
      
      this.contentHidden = true;
      
      // Safety timeout to show content even if workflows fail
      setTimeout(() => {
        if (!this.initializationComplete) {
          console.warn('🎯 Workflow Executor: Initialization timeout, showing content anyway');
          this.showContent();
        }
      }, this.config.maxInitTime);
      
      if (this.config.debug) {
        console.log('🎯 Workflow Executor: Content hidden during initialization');
      }
    }

    addLoadingOverlay() {
      const overlay = document.createElement('div');
      overlay.className = 'workflow-loading-overlay';
      overlay.id = 'workflow-loading-overlay';
      overlay.innerHTML = `
        <div style="text-align: center;">
          <div style="margin-bottom: 15px;">
            <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
          </div>
          <div>🎯 Personalizing your experience...</div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      
      document.body.appendChild(overlay);
    }

    /**
     * Show content after workflow initialization
     */
    showContent() {
      if (!this.contentHidden) return;
      
      // Remove hiding styles
      const hideStyle = document.getElementById('workflow-init-hide');
      if (hideStyle) {
        hideStyle.remove();
      }
      
      // Remove loading overlay
      const overlay = document.getElementById('workflow-loading-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
        }, 300);
      }
      
      // Show body with transition
      document.body.style.visibility = 'visible';
      document.body.style.opacity = '1';
      
      this.contentHidden = false;
      this.initializationComplete = true;
      
      if (this.config.debug) {
        console.log('🎯 Workflow Executor: Content revealed after workflow initialization');
      }
    }

    /**
     * Initialize workflow execution on page load
     */
    async initialize() {
      try {
        // Fetch workflows
        await this.fetchWorkflows();
        
        // Process immediate triggers (device type, UTM, etc.)
        const immediateEventData = {
          eventType: 'page_load',
          sessionVisits: 1,
          visitCount: 1,
          timeOnPage: 0,
          scrollPercentage: 0,
          ...this.pageContext,
          ...this.userContext
        };
        
        await this.processWorkflows(immediateEventData);
        
        // Small delay to ensure all DOM modifications are complete
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Show content after workflow operations are complete
        this.showContent();
        
        console.log('🎯 Workflow Executor: Initialization complete');
        
        return true;
      } catch (error) {
        console.error('🎯 Workflow Executor: Initialization failed:', error);
        
        // Show content even if initialization failed
        this.showContent();
        
        return false;
      }
    }

    /**
     * Handle runtime events from element tracker
     */
    async handleEvent(eventData) {
      await this.processWorkflows(eventData);
    }

    /**
     * Track workflow execution to analytics endpoint
     */
    async trackWorkflowExecution(workflow, executionData) {
      try {
        // Don't track if no API endpoint configured
        if (!this.config.apiEndpoint) {
          console.warn('⚠️ No API endpoint configured for execution tracking');
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
          actions: executionData.actionsExecuted || []
        };

        console.log('📊 Tracking execution for workflow:', workflow.name, trackingPayload);

        const response = await fetch(`https://xlzihfstoqdbgdegqkoi.supabase.co/functions/v1/track-execution`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(trackingPayload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Execution tracked successfully:', result.executionId);
        } else {
          const error = await response.text();
          console.error('❌ Failed to track execution:', response.status, error);
        }
      } catch (error) {
        console.error('❌ Error tracking workflow execution:', error);
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
  }

  // Global API
  window.WorkflowExecutor = WorkflowExecutor;

  // Auto-initialize
  if (!window.workflowExecutor) {
    window.workflowExecutor = new WorkflowExecutor();
    
    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.workflowExecutor.initialize();
      });
    } else {
      window.workflowExecutor.initialize();
    }
  }

})(); 