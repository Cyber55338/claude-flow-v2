/**
 * UI Utilities - Modern Component System
 * Toast notifications, loading states, and error handling
 */

class UIUtils {
    constructor() {
        this.toastContainer = null;
        this.loadingOverlay = null;
        this.toastQueue = [];
        this.maxToasts = 3;
        this.init();
    }

    /**
     * Initialize UI utilities
     */
    init() {
        this.toastContainer = document.getElementById('toast-container');
        this.loadingOverlay = document.getElementById('loading-overlay');
    }

    /**
     * Show loading overlay
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        if (this.loadingOverlay) {
            const textEl = this.loadingOverlay.querySelector('.spinner-text');
            if (textEl) {
                textEl.textContent = message;
            }
            this.loadingOverlay.classList.remove('hidden');
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        if (this.loadingOverlay) {
            this.loadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                this.loadingOverlay.classList.add('hidden');
                this.loadingOverlay.classList.remove('fade-out');
            }, 300);
        }
    }

    /**
     * Show toast notification
     * @param {string} type - Type of toast (success, error, warning, info)
     * @param {string} title - Toast title
     * @param {string} message - Toast message
     * @param {number} duration - Duration in milliseconds (0 for persistent)
     */
    showToast(type = 'info', title = '', message = '', duration = 4000) {
        if (!this.toastContainer) return;

        // Create toast element
        const toast = this.createToast(type, title, message);

        // Add to queue
        this.toastQueue.push(toast);

        // Remove oldest if exceeds max
        if (this.toastQueue.length > this.maxToasts) {
            const oldToast = this.toastQueue.shift();
            this.removeToast(oldToast);
        }

        // Add to DOM
        this.toastContainer.appendChild(toast);

        // Auto-remove after duration (if not persistent)
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(toast);
            }, duration);
        }

        return toast;
    }

    /**
     * Create toast element
     * @private
     */
    createToast(type, title, message) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = this.getToastIcon(type);

        toast.innerHTML = `
            ${icon}
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        `;

        // Add close button listener
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));

        return toast;
    }

    /**
     * Get SVG icon for toast type
     * @private
     */
    getToastIcon(type) {
        const icons = {
            success: `
                <div class="toast-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            `,
            error: `
                <div class="toast-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            `,
            warning: `
                <div class="toast-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
            `,
            info: `
                <div class="toast-icon">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            `
        };

        return icons[type] || icons.info;
    }

    /**
     * Remove toast
     * @private
     */
    removeToast(toast) {
        if (!toast) return;

        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
            // Remove from queue
            const index = this.toastQueue.indexOf(toast);
            if (index > -1) {
                this.toastQueue.splice(index, 1);
            }
        }, 300);
    }

    /**
     * Show success toast
     */
    success(title, message, duration = 4000) {
        return this.showToast('success', title, message, duration);
    }

    /**
     * Show error toast
     */
    error(title, message, duration = 5000) {
        return this.showToast('error', title, message, duration);
    }

    /**
     * Show warning toast
     */
    warning(title, message, duration = 4500) {
        return this.showToast('warning', title, message, duration);
    }

    /**
     * Show info toast
     */
    info(title, message, duration = 4000) {
        return this.showToast('info', title, message, duration);
    }

    /**
     * Clear all toasts
     */
    clearAllToasts() {
        this.toastQueue.forEach(toast => this.removeToast(toast));
        this.toastQueue = [];
    }

    /**
     * Create inline error message
     */
    createErrorMessage(title, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div class="error-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div class="error-content">
                <div class="error-title">${title}</div>
                <div class="error-text">${message}</div>
            </div>
        `;
        return errorDiv;
    }

    /**
     * Create inline success message
     */
    createSuccessMessage(title, message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div class="success-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div class="success-content">
                <div class="success-title">${title}</div>
                <div class="success-text">${message}</div>
            </div>
        `;
        return successDiv;
    }

    /**
     * Update status badge
     */
    updateStatusBadge(elementId, status, text) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const indicator = element.querySelector('.status-indicator');
        if (indicator) {
            indicator.className = 'status-indicator';
            if (status === 'active') {
                indicator.classList.add('status-active');
            }
        }

        // Update text (keep indicator)
        const textNode = Array.from(element.childNodes).find(
            node => node.nodeType === Node.TEXT_NODE
        );
        if (textNode) {
            textNode.textContent = text;
        } else {
            // If no text node, update entire text content
            const currentHTML = element.innerHTML;
            const indicatorHTML = element.querySelector('.status-indicator')?.outerHTML || '';
            element.innerHTML = indicatorHTML;
            element.appendChild(document.createTextNode(text));
        }
    }

    /**
     * Update node count display
     */
    updateNodeCount(count) {
        const nodeCountEl = document.getElementById('node-count');
        if (nodeCountEl) {
            const span = nodeCountEl.querySelector('span');
            if (span) {
                span.textContent = `${count} node${count !== 1 ? 's' : ''}`;
            }
        }
    }

    /**
     * Show/hide empty state
     */
    toggleEmptyState(show) {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            if (show) {
                emptyState.classList.remove('hidden');
                emptyState.classList.add('fade-in');
            } else {
                emptyState.classList.add('fade-out');
                setTimeout(() => {
                    emptyState.classList.add('hidden');
                    emptyState.classList.remove('fade-out');
                }, 300);
            }
        }
    }

    /**
     * Animate element
     */
    animate(element, animationClass, duration = 300) {
        if (!element) return Promise.resolve();

        return new Promise((resolve) => {
            element.classList.add(animationClass);
            setTimeout(() => {
                element.classList.remove(animationClass);
                resolve();
            }, duration);
        });
    }

    /**
     * Confirm dialog (using browser native for now)
     * Can be replaced with custom modal later
     */
    confirm(title, message) {
        return window.confirm(`${title}\n\n${message}`);
    }

    /**
     * Update connection status
     */
    updateConnectionStatus(connected) {
        const statusEl = document.getElementById('connection-status');
        if (!statusEl) return;

        const indicator = statusEl.querySelector('.status-indicator');
        if (indicator) {
            if (connected) {
                indicator.classList.add('status-active');
            } else {
                indicator.classList.remove('status-active');
            }
        }

        const textNode = Array.from(statusEl.childNodes).find(
            node => node.nodeType === Node.TEXT_NODE
        );
        if (textNode) {
            textNode.textContent = connected ? 'Connected' : 'Disconnected';
        }
    }
}

// Create global instance
window.ui = new UIUtils();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIUtils;
}
