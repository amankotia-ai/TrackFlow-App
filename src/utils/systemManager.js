/**
 * System Manager - Prevents multiple workflow systems from conflicting
 * Ensures only one unified system is running at a time
 */

(function() {
  'use strict';
  
  // Global system state
  window.trackflowSystemManager = window.trackflowSystemManager || {
    initialized: false,
    activeSystem: null,
    loadingPromise: null,
    debug: true
  };
  
  const manager = window.trackflowSystemManager;
  
  function log(message, level = 'info') {
    if (manager.debug) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] 🎯 System Manager: ${message}`);
    }
  }
  
  /**
   * Initialize the unified workflow system (singleton)
   */
  async function initializeUnifiedSystem(config = {}) {
    // Prevent multiple initializations
    if (manager.initialized || manager.loadingPromise) {
      log('System already initialized or initializing, returning existing instance');
      return manager.loadingPromise || Promise.resolve(manager.activeSystem);
    }
    
    log('🚀 Initializing unified workflow system...');
    
    // Create loading promise to prevent race conditions
    manager.loadingPromise = new Promise(async (resolve, reject) => {
      try {
        // Disable other systems
        window.DISABLE_LEGACY_WORKFLOWS = true;
        
        // Wait for unifiedWorkflowSystem to be available
        let attempts = 0;
        while (!window.UnifiedWorkflowSystem && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!window.UnifiedWorkflowSystem) {
          throw new Error('UnifiedWorkflowSystem not loaded');
        }
        
        // Initialize unified system if not already done
        if (!window.workflowSystem) {
          window.workflowSystem = new window.UnifiedWorkflowSystem({
            debug: true,
            hideContentDuringInit: true,
            maxInitTime: 5000,
            ...config
          });
          
          await window.workflowSystem.initialize();
        }
        
        manager.activeSystem = window.workflowSystem;
        manager.initialized = true;
        
        log('✅ Unified workflow system ready!');
        resolve(manager.activeSystem);
        
      } catch (error) {
        log(`❌ System initialization failed: ${error.message}`, 'error');
        manager.loadingPromise = null;
        reject(error);
      }
    });
    
    return manager.loadingPromise;
  }
  
  /**
   * Check if system is ready
   */
  function isSystemReady() {
    return manager.initialized && manager.activeSystem;
  }
  
  /**
   * Get active system instance
   */
  function getActiveSystem() {
    return manager.activeSystem;
  }
  
  /**
   * Reset system state (for debugging)
   */
  function resetSystem() {
    log('🔄 Resetting system state...');
    
    // Cleanup existing system
    if (manager.activeSystem && typeof manager.activeSystem.destroy === 'function') {
      manager.activeSystem.destroy();
    }
    
    manager.initialized = false;
    manager.activeSystem = null;
    manager.loadingPromise = null;
    
    // Re-enable other systems
    delete window.DISABLE_LEGACY_WORKFLOWS;
  }
  
  /**
   * Cleanup on page unload
   */
  function cleanup() {
    if (manager.activeSystem && typeof manager.activeSystem.destroy === 'function') {
      manager.activeSystem.destroy();
    }
  }
  
  // Expose API
  window.trackflowSystemManager.initializeUnifiedSystem = initializeUnifiedSystem;
  window.trackflowSystemManager.isSystemReady = isSystemReady;
  window.trackflowSystemManager.getActiveSystem = getActiveSystem;
  window.trackflowSystemManager.resetSystem = resetSystem;
  window.trackflowSystemManager.cleanup = cleanup;
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);
  
  log('System Manager ready');
  
})(); 