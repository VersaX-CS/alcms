/**
 * Quick Actions Panel - Enhancement Module
 * 
 * Copy this entire file and include it in your HTML after the main app loads:
 * <script src="quick-actions-enhancements.js"></script>
 * 
 * This module adds:
 * - Keyboard shortcuts (Ctrl+Shift+Q to open)
 * - Recent actions history
 * - Form auto-save
 * - Pending notifications badge
 * - Enhanced keyboard navigation
 */

(function() {
  'use strict';

  // ==================== History Manager ====================
  
  const QuickActionsHistory = {
    maxItems: 8,
    storageKey: 'alcms:quickActionsHistory',
    
    add(actionType) {
      const history = this.get();
      const filtered = history.filter(a => a.type !== actionType);
      const entry = { type: actionType, timestamp: new Date().toISOString() };
      const updated = [entry, ...filtered].slice(0, this.maxItems);
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(updated));
      } catch(e) {
        console.warn('Could not save history:', e);
      }
    },
    
    get() {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey)) || [];
      } catch {
        return [];
      }
    },
    
    clear() {
      try {
        localStorage.removeItem(this.storageKey);
      } catch(e) {
        console.warn('Could not clear history:', e);
      }
    }
  };

  // ==================== Draft Manager ====================
  
  const QuickActionsDraft = {
    storageKey: 'alcms:quickActionsDraft',
    autoSaveInterval: 2000,
    
    save(formData) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(formData));
      } catch(e) {
        console.warn('Could not save draft:', e);
      }
    },
    
    load() {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey)) || null;
      } catch {
        return null;
      }
    },
    
    clear() {
      try {
        localStorage.removeItem(this.storageKey);
      } catch(e) {
        console.warn('Could not clear draft:', e);
      }
    },
    
    enableAutoSave(container) {
      if (!container) return;
      
      const inputs = container.querySelectorAll('input, select, textarea');
      let autoSaveTimer = null;
      
      inputs.forEach(input => {
        input.addEventListener('input', () => {
          clearTimeout(autoSaveTimer);
          autoSaveTimer = setTimeout(() => {
            const formData = {};
            inputs.forEach(i => {
              if (i.type === 'checkbox') {
                formData[i.id] = i.checked;
              } else {
                formData[i.id] = i.value;
              }
            });
            this.save(formData);
          }, this.autoSaveInterval);
        });
      });
    },
    
    restoreDraft(container) {
      const draft = this.load();
      if (!draft || Object.keys(draft).length === 0) return false;
      
      const inputs = container.querySelectorAll('input, select, textarea');
      let restored = 0;
      
      inputs.forEach(input => {
        if (draft.hasOwnProperty(input.id)) {
          if (input.type === 'checkbox') {
            input.checked = draft[input.id];
          } else {
            input.value = draft[input.id];
          }
          restored++;
        }
      });
      
      return restored > 0;
    }
  };

  // ==================== Notification Badge ====================
  
  const QuickActionsBadge = {
    count: 0,
    
    set(count) {
      this.count = Math.max(0, count);
      this.updateDisplay();
    },
    
    increment() {
      this.set(this.count + 1);
    },
    
    decrement() {
      this.set(this.count - 1);
    },
    
    clear() {
      this.set(0);
    },
    
    updateDisplay() {
      const btn = document.getElementById('quickActionBtn');
      if (!btn) return;
      
      let badge = btn.querySelector('.quick-badge');
      
      if (this.count === 0) {
        if (badge) {
          badge.remove();
        }
        return;
      }
      
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'quick-badge';
        badge.style.cssText = `
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--warn);
          color: white;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          animation: pulse-badge 2s ease-in-out infinite;
        `;
        
        // Add animation keyframes
        if (!document.querySelector('style[data-quick-badge]')) {
          const style = document.createElement('style');
          style.setAttribute('data-quick-badge', '');
          style.textContent = `
            @keyframes pulse-badge {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.2); }
            }
          `;
          document.head.appendChild(style);
        }
        
        btn.style.position = 'relative';
        btn.appendChild(badge);
      }
      
      badge.textContent = this.count > 9 ? '9+' : this.count;
    }
  };

  // ==================== Statistics Tracker ====================
  
  const QuickActionsStats = {
    storageKey: 'alcms:quickActionsStats',
    
    record(actionType) {
      const stats = this.get();
      stats[actionType] = (stats[actionType] || 0) + 1;
      stats.lastUpdated = new Date().toISOString();
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(stats));
      } catch(e) {
        console.warn('Could not save stats:', e);
      }
    },
    
    get() {
      try {
        return JSON.parse(localStorage.getItem(this.storageKey)) || {};
      } catch {
        return {};
      }
    },
    
    getMostUsed(limit = 3) {
      const stats = this.get();
      return Object.entries(stats)
        .filter(([k]) => k !== 'lastUpdated')
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([action]) => action);
    },
    
    reset() {
      try {
        localStorage.removeItem(this.storageKey);
      } catch(e) {
        console.warn('Could not reset stats:', e);
      }
    }
  };

  // ==================== Keyboard Shortcuts ====================
  
  function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
      // Ctrl+Shift+Q (or Cmd+Shift+Q on Mac) to toggle quick actions
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === 'Q') {
        e.preventDefault();
        if (typeof toggleQuickPanel === 'function') {
          toggleQuickPanel();
        }
      }
      
      // Ctrl+Alt+1 through 7 for direct action access
      if ((e.ctrlKey || e.metaKey) && e.altKey && /^[1-7]$/.test(e.key)) {
        e.preventDefault();
        const actionMap = {
          '1': 'checkin',
          '2': 'issue',
          '3': 'addtitle',
          '4': 'addmember',
          '5': 'schedule',
          '6': 'timetable',
          '7': 'calendar'
        };
        
        if (typeof openQuickAction === 'function') {
          openQuickAction(actionMap[e.key]);
        }
      }
    });
    
    // Update button tooltip with shortcuts
    const btn = document.getElementById('quickActionBtn');
    if (btn) {
      const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
      const modifier = isMac ? 'Cmd' : 'Ctrl';
      btn.title = `Quick Actions (${modifier}+Shift+Q)\nDirect: ${modifier}+Alt+1-7`;
    }
  }

  // ==================== Enhanced Modal Keyboard Nav ====================
  
  function enhanceModalKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
      const modal = document.querySelector('.quick-modal.show');
      if (!modal) return;
      
      // Escape to close
      if (e.key === 'Escape') {
        if (typeof closeQuickActionModal === 'function') {
          closeQuickActionModal();
        }
        return;
      }
      
      // Tab through form fields (auto-focus management)
      if (e.key === 'Tab') {
        const focusableElements = modal.querySelectorAll(
          'input, select, textarea, button, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;
        
        const focusedElement = modal.querySelector(':focus');
        let focusIndex = Array.from(focusableElements).indexOf(focusedElement);
        
        if (e.shiftKey) {
          focusIndex = (focusIndex - 1 + focusableElements.length) % focusableElements.length;
        } else {
          focusIndex = (focusIndex + 1) % focusableElements.length;
        }
        
        e.preventDefault();
        focusableElements[focusIndex].focus();
      }
      
      // Enter on last input = submit
      if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        const form = modal.querySelector('form') || modal;
        const inputs = form.querySelectorAll('input, textarea');
        const isLastField = Array.from(inputs)[inputs.length - 1] === e.target;
        
        if (isLastField) {
          const submitBtn = modal.querySelector('.btn-primary');
          if (submitBtn && !e.target.classList.contains('allow-enter')) {
            e.preventDefault();
            submitBtn.click();
          }
        }
      }
    });
  }

  // ==================== Initialize on Page Load ====================
  
  function initializeEnhancements() {
    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();
    
    // Initialize modal keyboard navigation
    enhanceModalKeyboardNavigation();
    
    // Hook into quick action submissions to record history and clear draft
    if (window.addEventListener) {
      window.addEventListener('quickActionSubmit', function(e) {
        QuickActionsHistory.add(e.detail.type);
        QuickActionsStats.record(e.detail.type);
        QuickActionsDraft.clear();
      });
    }
  }

  // ==================== Integrate with Modal Opening ====================
  
  // Override modal functions to add enhancements
  const originalOpenCheckInOut = window.openCheckInOutModal;
  window.openCheckInOutModal = function() {
    originalOpenCheckInOut.call(this);
    
    setTimeout(() => {
      const modal = document.querySelector('.quick-modal.show');
      if (modal) {
        // Enable draft auto-save
        QuickActionsDraft.enableAutoSave(modal);
        
        // Try to restore previous draft
        if (QuickActionsDraft.restoreDraft(modal)) {
          console.log('Restored previous form data');
        }
        
        // Focus first input
        const firstInput = modal.querySelector('input');
        if (firstInput) firstInput.focus();
      }
    }, 100);
  };

  // Apply same enhancement to other modals
  const modalOpeners = [
    'openIssueReturnModal',
    'openAddTitleModal',
    'openAddMemberModal'
  ];
  
  modalOpeners.forEach(funcName => {
    const original = window[funcName];
    if (original) {
      window[funcName] = function() {
        original.call(this);
        
        setTimeout(() => {
          const modal = document.querySelector('.quick-modal.show');
          if (modal) {
            QuickActionsDraft.enableAutoSave(modal);
            if (QuickActionsDraft.restoreDraft(modal)) {
              console.log('Restored previous form data');
            }
            const firstInput = modal.querySelector('input');
            if (firstInput) firstInput.focus();
          }
        }, 100);
      };
    }
  });

  // ==================== Pending Items Update ====================
  
  // Optional: Check for pending items periodically
  function startPendingItemsCheck(intervalMs = 60000) {
    setInterval(function() {
      // Example: Fetch pending check-ins from your API
      if (window.getPendingCheckIns && typeof window.getPendingCheckIns === 'function') {
        window.getPendingCheckIns()
          .then(count => {
            if (count > 0) {
              QuickActionsBadge.set(count);
            } else {
              QuickActionsBadge.clear();
            }
          })
          .catch(err => console.warn('Could not fetch pending items:', err));
      }
    }, intervalMs);
  }

  // ==================== Public API ====================
  
  // Expose managers to window for external use
  window.QuickActionsHistory = QuickActionsHistory;
  window.QuickActionsDraft = QuickActionsDraft;
  window.QuickActionsBadge = QuickActionsBadge;
  window.QuickActionsStats = QuickActionsStats;
  window.startPendingItemsCheck = startPendingItemsCheck;

  // ==================== Startup ====================
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeEnhancements);
  } else {
    initializeEnhancements();
  }

  console.log('✓ Quick Actions Enhancements loaded');
  console.log('  Shortcuts: Ctrl+Shift+Q to toggle, Ctrl+Alt+1-7 for direct access');
  console.log('  Features: Auto-save drafts, history tracking, keyboard navigation');

})();
