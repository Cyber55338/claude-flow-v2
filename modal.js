/**
 * Modal.js - Modal Component for Node Details
 * Full-screen modal with markdown rendering and syntax highlighting
 */

class Modal {
    constructor() {
        this.modal = null;
        this.currentNode = null;
        this.isOpen = false;

        this.createModal();
        this.setupEventListeners();
    }

    /**
     * Create modal DOM element
     */
    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'node-modal hidden';
        this.modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <div class="modal-header-left">
                        <div class="modal-type-badge"></div>
                        <h2 class="modal-title"></h2>
                    </div>
                    <button class="modal-close" aria-label="Close modal">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="modal-metadata"></div>
                    <div class="modal-content-section">
                        <h3 class="modal-section-title">Content</h3>
                        <div class="modal-content"></div>
                    </div>
                    <div class="modal-relationships-section hidden">
                        <h3 class="modal-section-title">Relationships</h3>
                        <div class="modal-relationships"></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-secondary" data-action="copy">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy Content
                    </button>
                    <button class="modal-btn modal-btn-secondary" data-action="export">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Node
                    </button>
                    <button class="modal-btn modal-btn-primary" data-action="close">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close button
        this.modal.querySelector('.modal-close').addEventListener('click', () => {
            this.close();
        });

        // Backdrop click
        this.modal.querySelector('.modal-backdrop').addEventListener('click', () => {
            this.close();
        });

        // Action buttons
        this.modal.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                this.handleAction(action);
            });
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Prevent scroll when modal is open
        this.modal.addEventListener('wheel', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * Open modal with node data
     */
    open(node) {
        this.currentNode = node;
        this.isOpen = true;

        // Populate modal
        this.populate(node);

        // Show modal
        this.modal.classList.remove('hidden');
        document.body.classList.add('modal-open');

        // Trigger animation
        requestAnimationFrame(() => {
            this.modal.classList.add('visible');
        });
    }

    /**
     * Close modal
     */
    close() {
        this.modal.classList.remove('visible');
        document.body.classList.remove('modal-open');

        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.isOpen = false;
            this.currentNode = null;
        }, 300); // Match CSS transition
    }

    /**
     * Populate modal with node data
     */
    populate(node) {
        // Type badge
        const typeBadge = this.modal.querySelector('.modal-type-badge');
        typeBadge.textContent = node.type.toUpperCase();
        typeBadge.className = `modal-type-badge modal-type-${node.type}`;

        // Title
        const title = this.getNodeTitle(node);
        this.modal.querySelector('.modal-title').textContent = title;

        // Metadata
        this.modal.querySelector('.modal-metadata').innerHTML = this.renderMetadata(node);

        // Content with markdown and syntax highlighting
        this.modal.querySelector('.modal-content').innerHTML = this.renderContent(node.content || '');

        // Relationships
        const relationships = this.getRelationships(node);
        if (relationships.length > 0) {
            this.modal.querySelector('.modal-relationships-section').classList.remove('hidden');
            this.modal.querySelector('.modal-relationships').innerHTML = this.renderRelationships(relationships);
        } else {
            this.modal.querySelector('.modal-relationships-section').classList.add('hidden');
        }
    }

    /**
     * Get node title
     */
    getNodeTitle(node) {
        if (node.title) return node.title;
        if (node.type === 'input') return 'User Input';
        if (node.type === 'output') return 'Assistant Output';
        if (node.type === 'skill') return node.skill_name || 'Skill Execution';
        if (node.type === 'auto') return node.detected_type || 'Auto-detected';
        return 'Node Details';
    }

    /**
     * Render metadata
     */
    renderMetadata(node) {
        const items = [];

        if (node.timestamp) {
            items.push({
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>`,
                label: 'Timestamp',
                value: this.formatTimestamp(node.timestamp)
            });
        }

        if (node.skill_name) {
            items.push({
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>`,
                label: 'Skill',
                value: this.escapeHtml(node.skill_name)
            });
        }

        if (node.detected_type) {
            items.push({
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>`,
                label: 'Detected Type',
                value: this.escapeHtml(node.detected_type)
            });
        }

        if (node.id) {
            items.push({
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>`,
                label: 'Node ID',
                value: `<code class="text-xs">${this.escapeHtml(node.id)}</code>`
            });
        }

        if (node.parent_id) {
            items.push({
                icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>`,
                label: 'Parent ID',
                value: `<code class="text-xs">${this.escapeHtml(node.parent_id)}</code>`
            });
        }

        return items.map(item => `
            <div class="metadata-item">
                <div class="metadata-icon">${item.icon}</div>
                <div class="metadata-info">
                    <div class="metadata-label">${item.label}</div>
                    <div class="metadata-value">${item.value}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Render content with markdown and syntax highlighting
     */
    renderContent(content) {
        if (!content) {
            return '<div class="empty-content">No content available</div>';
        }

        // Escape HTML first
        content = this.escapeHtml(content);

        // Simple markdown rendering
        content = this.renderMarkdown(content);

        return `<div class="formatted-content">${content}</div>`;
    }

    /**
     * Simple markdown renderer
     */
    renderMarkdown(text) {
        // Code blocks (triple backticks)
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
            const language = lang || 'text';
            return `<pre class="code-block"><code class="language-${language}">${code.trim()}</code></pre>`;
        });

        // Inline code
        text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

        // Bold
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Italic
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // Headers
        text = text.replace(/^### (.+)$/gm, '<h3 class="content-h3">$1</h3>');
        text = text.replace(/^## (.+)$/gm, '<h2 class="content-h2">$1</h2>');
        text = text.replace(/^# (.+)$/gm, '<h1 class="content-h1">$1</h1>');

        // Line breaks
        text = text.replace(/\n/g, '<br>');

        // Lists (simple)
        text = text.replace(/^- (.+)$/gm, '<li class="list-item">$1</li>');
        text = text.replace(/(<li class="list-item">.*<\/li>)/s, '<ul class="content-list">$1</ul>');

        return text;
    }

    /**
     * Get relationships (parent/children)
     */
    getRelationships(node) {
        if (!window.app || !window.app.canvas) return [];

        const data = window.app.canvas.getData();
        if (!data || !data.nodes) return [];

        const relationships = [];

        // Find parent
        if (node.parent_id) {
            const parent = data.nodes.find(n => n.id === node.parent_id);
            if (parent) {
                relationships.push({
                    type: 'parent',
                    node: parent
                });
            }
        }

        // Find children
        const children = data.nodes.filter(n => n.parent_id === node.id);
        children.forEach(child => {
            relationships.push({
                type: 'child',
                node: child
            });
        });

        return relationships;
    }

    /**
     * Render relationships
     */
    renderRelationships(relationships) {
        return relationships.map(rel => {
            const node = rel.node;
            const title = this.getNodeTitle(node);
            const icon = rel.type === 'parent' ? '↑' : '↓';

            return `
                <div class="relationship-item" data-node-id="${node.id}">
                    <span class="relationship-icon">${icon}</span>
                    <div class="relationship-badge relationship-type-${node.type}">${node.type}</div>
                    <div class="relationship-title">${this.escapeHtml(title)}</div>
                    <button class="relationship-focus" data-node-id="${node.id}" title="Focus node">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                </div>
            `;
        }).join('');
    }

    /**
     * Handle action buttons
     */
    handleAction(action) {
        if (!this.currentNode) return;

        switch (action) {
            case 'copy':
                this.copyContent();
                break;
            case 'export':
                this.exportNode();
                break;
            case 'close':
                this.close();
                break;
        }
    }

    /**
     * Copy content to clipboard
     */
    async copyContent() {
        if (!this.currentNode || !this.currentNode.content) return;

        try {
            await navigator.clipboard.writeText(this.currentNode.content);
            if (window.ui) {
                window.ui.success('Copied', 'Content copied to clipboard');
            }
        } catch (err) {
            console.error('Failed to copy:', err);
            if (window.ui) {
                window.ui.error('Copy Failed', 'Could not copy to clipboard');
            }
        }
    }

    /**
     * Export node as JSON
     */
    exportNode() {
        if (!this.currentNode) return;

        const json = JSON.stringify(this.currentNode, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `node-${this.currentNode.id.substring(0, 8)}.json`;
        a.click();

        URL.revokeObjectURL(url);

        if (window.ui) {
            window.ui.success('Exported', 'Node exported as JSON');
        }
    }

    /**
     * Format timestamp
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown';

        try {
            const date = new Date(timestamp);
            return date.toLocaleString();
        } catch (e) {
            return 'Invalid date';
        }
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroy modal
     */
    destroy() {
        if (this.modal && this.modal.parentNode) {
            this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
        this.currentNode = null;
        this.isOpen = false;
    }
}

// Export
window.Modal = Modal;
