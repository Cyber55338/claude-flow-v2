/**
 * Conversations.js - Multi-Conversation Manager for Claude Flow
 * Handles saving, loading, switching, and archiving conversations
 * Provides conversation search and management UI
 */

class ConversationManager {
    constructor(canvas, persistence) {
        this.canvas = canvas;
        this.persistence = persistence;
        this.conversations = [];
        this.currentConversationId = null;
        this.storeName = 'conversations';

        this.init();
    }

    /**
     * Initialize conversation manager
     */
    async init() {
        try {
            await this.loadConversations();
            console.log('Conversation manager initialized');
        } catch (error) {
            console.error('Failed to initialize conversation manager:', error);
        }
    }

    /**
     * Load all conversations
     */
    async loadConversations() {
        try {
            if (this.persistence && this.persistence.db) {
                this.conversations = await this.persistence.getAllFromIndexedDB(this.storeName);
            } else {
                // Fallback to localStorage
                const stored = localStorage.getItem('claudeflow_conversations');
                this.conversations = stored ? JSON.parse(stored) : [];
            }

            console.log(`Loaded ${this.conversations.length} conversations`);
            return this.conversations;
        } catch (error) {
            console.error('Failed to load conversations:', error);
            return [];
        }
    }

    /**
     * Save all conversations to storage
     */
    async saveConversations() {
        try {
            if (this.persistence && this.persistence.db) {
                // Save each conversation to IndexedDB
                for (const conv of this.conversations) {
                    await this.persistence.saveToIndexedDB(this.storeName, conv);
                }
            } else {
                // Fallback to localStorage
                localStorage.setItem('claudeflow_conversations', JSON.stringify(this.conversations));
            }
            return true;
        } catch (error) {
            console.error('Failed to save conversations:', error);
            return false;
        }
    }

    /**
     * Create a new conversation
     */
    async createConversation(name, options = {}) {
        const config = {
            captureCurrentState: true,
            switchTo: true,
            ...options
        };

        const conversation = {
            id: this.generateId(),
            name: name || `Conversation ${this.conversations.length + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            flowData: config.captureCurrentState ? {
                nodes: this.canvas.nodes ? [...this.canvas.nodes] : [],
                edges: this.canvas.edges ? [...this.canvas.edges] : []
            } : {
                nodes: [],
                edges: []
            },
            canvasState: {
                zoom: this.canvas.zoom || 1,
                panX: this.canvas.panX || 0,
                panY: this.canvas.panY || 0
            },
            metadata: {
                nodeCount: config.captureCurrentState ? (this.canvas.nodes ? this.canvas.nodes.length : 0) : 0,
                tags: options.tags || [],
                archived: false
            }
        };

        this.conversations.push(conversation);
        await this.saveConversations();

        if (config.switchTo) {
            this.currentConversationId = conversation.id;
        }

        console.log(`Created conversation: ${conversation.name}`);
        return conversation;
    }

    /**
     * Save current canvas state to conversation
     */
    async saveCurrentConversation(conversationId = null) {
        const id = conversationId || this.currentConversationId;

        if (!id) {
            console.warn('No conversation selected');
            return false;
        }

        const conversation = this.conversations.find(c => c.id === id);
        if (!conversation) {
            console.error(`Conversation not found: ${id}`);
            return false;
        }

        // Update conversation data
        conversation.flowData = {
            nodes: this.canvas.nodes ? [...this.canvas.nodes] : [],
            edges: this.canvas.edges ? [...this.canvas.edges] : []
        };
        conversation.canvasState = {
            zoom: this.canvas.zoom || 1,
            panX: this.canvas.panX || 0,
            panY: this.canvas.panY || 0
        };
        conversation.updatedAt = new Date().toISOString();
        conversation.metadata.nodeCount = this.canvas.nodes ? this.canvas.nodes.length : 0;

        await this.saveConversations();
        console.log(`Saved conversation: ${conversation.name}`);
        return true;
    }

    /**
     * Load and switch to a conversation
     */
    async loadConversation(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) {
            console.error(`Conversation not found: ${conversationId}`);
            return false;
        }

        try {
            // Save current conversation before switching
            if (this.currentConversationId) {
                await this.saveCurrentConversation();
            }

            // Load conversation data to canvas
            if (conversation.flowData) {
                this.canvas.nodes = conversation.flowData.nodes ? [...conversation.flowData.nodes] : [];
                this.canvas.edges = conversation.flowData.edges ? [...conversation.flowData.edges] : [];
            }

            // Restore canvas state
            if (conversation.canvasState) {
                this.canvas.zoom = conversation.canvasState.zoom || 1;
                this.canvas.panX = conversation.canvasState.panX || 0;
                this.canvas.panY = conversation.canvasState.panY || 0;
                if (this.canvas.updateTransform) {
                    this.canvas.updateTransform();
                }
            }

            // Trigger canvas render
            if (this.canvas.render) {
                this.canvas.render();
            }

            this.currentConversationId = conversationId;
            console.log(`Loaded conversation: ${conversation.name}`);
            return true;
        } catch (error) {
            console.error('Failed to load conversation:', error);
            return false;
        }
    }

    /**
     * Delete a conversation
     */
    async deleteConversation(conversationId) {
        const index = this.conversations.findIndex(c => c.id === conversationId);
        if (index === -1) {
            console.error(`Conversation not found: ${conversationId}`);
            return false;
        }

        const conversation = this.conversations[index];
        this.conversations.splice(index, 1);

        // Delete from IndexedDB
        if (this.persistence && this.persistence.db) {
            try {
                await this.persistence.deleteFromIndexedDB(this.storeName, conversationId);
            } catch (error) {
                console.warn('Failed to delete from IndexedDB:', error);
            }
        }

        await this.saveConversations();

        // Clear current if deleted
        if (this.currentConversationId === conversationId) {
            this.currentConversationId = null;
        }

        console.log(`Deleted conversation: ${conversation.name}`);
        return true;
    }

    /**
     * Archive/unarchive a conversation
     */
    async archiveConversation(conversationId, archived = true) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) {
            console.error(`Conversation not found: ${conversationId}`);
            return false;
        }

        conversation.metadata.archived = archived;
        conversation.updatedAt = new Date().toISOString();
        await this.saveConversations();

        console.log(`${archived ? 'Archived' : 'Unarchived'} conversation: ${conversation.name}`);
        return true;
    }

    /**
     * Rename a conversation
     */
    async renameConversation(conversationId, newName) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) {
            console.error(`Conversation not found: ${conversationId}`);
            return false;
        }

        conversation.name = newName;
        conversation.updatedAt = new Date().toISOString();
        await this.saveConversations();

        console.log(`Renamed conversation to: ${newName}`);
        return true;
    }

    /**
     * Search conversations
     */
    searchConversations(query, options = {}) {
        const config = {
            includeArchived: false,
            fields: ['name', 'metadata.tags'],
            ...options
        };

        const lowerQuery = query.toLowerCase();

        return this.conversations.filter(conv => {
            // Skip archived if not included
            if (!config.includeArchived && conv.metadata.archived) {
                return false;
            }

            // Search in name
            if (conv.name.toLowerCase().includes(lowerQuery)) {
                return true;
            }

            // Search in tags
            if (conv.metadata.tags && conv.metadata.tags.some(tag =>
                tag.toLowerCase().includes(lowerQuery)
            )) {
                return true;
            }

            return false;
        });
    }

    /**
     * Get conversations sorted by date
     */
    getConversationsSorted(options = {}) {
        const config = {
            includeArchived: false,
            sortBy: 'updatedAt', // 'createdAt', 'updatedAt', 'name', 'nodeCount'
            order: 'desc', // 'asc', 'desc'
            ...options
        };

        let filtered = this.conversations;

        // Filter archived
        if (!config.includeArchived) {
            filtered = filtered.filter(c => !c.metadata.archived);
        }

        // Sort
        const sorted = [...filtered].sort((a, b) => {
            let valA, valB;

            switch (config.sortBy) {
                case 'name':
                    valA = a.name.toLowerCase();
                    valB = b.name.toLowerCase();
                    break;
                case 'nodeCount':
                    valA = a.metadata.nodeCount || 0;
                    valB = b.metadata.nodeCount || 0;
                    break;
                case 'createdAt':
                    valA = new Date(a.createdAt).getTime();
                    valB = new Date(b.createdAt).getTime();
                    break;
                case 'updatedAt':
                default:
                    valA = new Date(a.updatedAt).getTime();
                    valB = new Date(b.updatedAt).getTime();
                    break;
            }

            if (config.order === 'asc') {
                return valA > valB ? 1 : valA < valB ? -1 : 0;
            } else {
                return valA < valB ? 1 : valA > valB ? -1 : 0;
            }
        });

        return sorted;
    }

    /**
     * Export conversation
     */
    async exportConversation(conversationId, format = 'json') {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) {
            console.error(`Conversation not found: ${conversationId}`);
            return null;
        }

        return {
            conversation,
            format,
            exportedAt: new Date().toISOString()
        };
    }

    /**
     * Import conversation
     */
    async importConversation(conversationData) {
        try {
            const newConv = {
                ...conversationData.conversation,
                id: this.generateId(), // Generate new ID
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.conversations.push(newConv);
            await this.saveConversations();

            console.log(`Imported conversation: ${newConv.name}`);
            return newConv;
        } catch (error) {
            console.error('Failed to import conversation:', error);
            throw error;
        }
    }

    /**
     * Duplicate conversation
     */
    async duplicateConversation(conversationId) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (!conversation) {
            console.error(`Conversation not found: ${conversationId}`);
            return null;
        }

        const duplicate = {
            ...JSON.parse(JSON.stringify(conversation)), // Deep copy
            id: this.generateId(),
            name: `${conversation.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.conversations.push(duplicate);
        await this.saveConversations();

        console.log(`Duplicated conversation: ${conversation.name}`);
        return duplicate;
    }

    /**
     * Get conversation statistics
     */
    getStatistics() {
        return {
            total: this.conversations.length,
            active: this.conversations.filter(c => !c.metadata.archived).length,
            archived: this.conversations.filter(c => c.metadata.archived).length,
            totalNodes: this.conversations.reduce((sum, c) => sum + (c.metadata.nodeCount || 0), 0),
            averageNodes: this.conversations.length > 0
                ? Math.round(this.conversations.reduce((sum, c) => sum + (c.metadata.nodeCount || 0), 0) / this.conversations.length)
                : 0
        };
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clear all conversations
     */
    async clearAll() {
        this.conversations = [];
        this.currentConversationId = null;
        await this.saveConversations();
        console.log('All conversations cleared');
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ConversationManager = ConversationManager;
}
