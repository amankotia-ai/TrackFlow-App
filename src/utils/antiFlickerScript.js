/**
 * Anti-Flicker Script for Unified Workflow System
 * 
 * This script should be injected directly into the <head> section
 * BEFORE any other content to prevent Flash of Original Content (FOOC)
 * 
 * Usage: Add this script tag immediately after the opening <head> tag
 */

(function() {
  'use strict';
  
  // Configuration - can be overridden by window.unifiedWorkflowConfig
  const defaultConfig = {
    maxHideTime: 5000,           // Maximum time to hide content (5 seconds)
    showLoadingIndicator: true,  // Show loading spinner
    debug: false,                // Enable debug logging
    hideMethod: 'opacity'        // 'opacity' or 'visibility'
  };
  
  // Get configuration from window or use defaults
  const config = Object.assign({}, defaultConfig, window.unifiedWorkflowConfig || {});
  
  // Debug logging function
  function log(message, level = 'info') {
    if (config.debug) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] 🎯 Anti-Flicker: ${message}`);
    }
  }
  
  // State tracking
  let contentHidden = false;
  let loadingIndicatorShown = false;
  let safetyTimeoutId = null;
  
  // Hide content immediately
  function hideContent() {
    if (contentHidden) return;
    
    log('🙈 Hiding content to prevent flicker');
    
    // Add CSS to hide content
    const style = document.createElement('style');
    style.id = 'unified-workflow-anti-flicker';
    style.textContent = `
      body {
        ${config.hideMethod === 'opacity' ? 'opacity: 0 !important;' : 'visibility: hidden !important;'}
        transition: opacity 0.3s ease !important;
      }
      
      /* Loading indicator styles */
      #unified-workflow-loading {
        position: fixed !important;
        top: 50% !important;
        left: 50% !important;
        transform: translate(-50%, -50%) !important;
        z-index: 999999 !important;
        background: rgba(255, 255, 255, 0.95) !important;
        border-radius: 12px !important;
        padding: 20px 30px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
        display: flex !important;
        align-items: center !important;
        gap: 15px !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
        font-size: 14px !important;
        color: #333 !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      
      .unified-workflow-spinner {
        width: 20px !important;
        height: 20px !important;
        border: 2px solid #e3e3e3 !important;
        border-top: 2px solid #007bff !important;
        border-radius: 50% !important;
        animation: unified-workflow-spin 1s linear infinite !important;
      }
      
      @keyframes unified-workflow-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    
    document.head.appendChild(style);
    contentHidden = true;
    
    // Show loading indicator if enabled
    if (config.showLoadingIndicator) {
      showLoadingIndicator();
    }
    
    // Safety timeout to show content even if workflow system fails
    safetyTimeoutId = setTimeout(() => {
      log('⏰ Safety timeout reached - showing content automatically', 'warning');
      showContent();
    }, config.maxHideTime);
  }
  
  // Show loading indicator
  function showLoadingIndicator() {
    if (loadingIndicatorShown) return;
    
    // Wait for body to be available
    const showIndicator = () => {
      if (!document.body) {
        setTimeout(showIndicator, 10);
        return;
      }
      
      const indicator = document.createElement('div');
      indicator.id = 'unified-workflow-loading';
      indicator.innerHTML = `
        <div class="unified-workflow-spinner"></div>
        <span>Personalizing content...</span>
      `;
      
      document.body.appendChild(indicator);
      loadingIndicatorShown = true;
      log('🔄 Loading indicator shown');
    };
    
    showIndicator();
  }
  
  // Hide loading indicator
  function hideLoadingIndicator() {
    const indicator = document.getElementById('unified-workflow-loading');
    if (indicator) {
      indicator.remove();
      loadingIndicatorShown = false;
      log('🔄 Loading indicator hidden');
    }
  }
  
  // Show content
  function showContent() {
    if (!contentHidden) return;
    
    log('👀 Revealing content');
    
    // Clear safety timeout
    if (safetyTimeoutId) {
      clearTimeout(safetyTimeoutId);
      safetyTimeoutId = null;
    }
    
    // Hide loading indicator
    hideLoadingIndicator();
    
    // Remove anti-flicker styles
    const style = document.getElementById('unified-workflow-anti-flicker');
    if (style) {
      style.remove();
    }
    
    contentHidden = false;
  }
  
  // Expose global functions for the main workflow system to use
  window.unifiedWorkflowAntiFlicker = {
    hideContent,
    showContent,
    hideLoadingIndicator,
    showLoadingIndicator,
    isContentHidden: () => contentHidden,
    isLoadingIndicatorShown: () => loadingIndicatorShown
  };
  
  // Auto-hide content immediately if not already hidden
  if (document.readyState === 'loading') {
    // Document is still loading, hide immediately
    hideContent();
  } else {
    // Document already loaded, check if we should still hide
    if (!window.workflowSystem || !window.workflowSystem.initialized) {
      hideContent();
    }
  }
  
  log('✅ Anti-flicker script initialized');
  
})(); 