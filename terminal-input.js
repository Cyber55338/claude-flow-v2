/**
 * Terminal Input - Interactive Terminal for Claude Flow
 * Allows users to type commands and see nodes appear in real-time
 */

class TerminalInput {
    constructor() {
        this.historyIndex = -1;
        this.commandHistory = [];
        this.currentInput = '';

        this.init();
    }

    init() {
        // Get existing terminal input (if already in HTML)
        this.input = document.getElementById('terminal-input');

        // If input doesn't exist, create it
        if (!this.input) {
            const terminalContent = document.getElementById('terminal');
            if (!terminalContent) return;

            // Add interactive terminal at the bottom
            const inputContainer = document.createElement('div');
            inputContainer.className = 'terminal-input-container';
            inputContainer.innerHTML = `
                <div class="terminal-prompt">
                    <span class="prompt-symbol">$</span>
                    <input type="text"
                           id="terminal-input"
                           class="terminal-input"
                           placeholder="Type your message to Claude Code..."
                           autocomplete="off" />
                </div>
                <div class="terminal-help">
                    <span class="help-hint">Press Enter to send | ↑↓ for history | Ctrl+L to clear</span>
                </div>
            `;

            terminalContent.appendChild(inputContainer);

            // Get input element
            this.input = document.getElementById('terminal-input');
        }

        // Setup event listeners
        this.setupEventListeners();

        // Focus on input
        this.input.focus();
    }

    setupEventListeners() {
        if (!this.input) return;

        // Enter key - send message
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.sendMessage();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateHistory(-1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.navigateHistory(1);
            } else if (e.key === 'l' && e.ctrlKey) {
                e.preventDefault();
                this.clearTerminal();
            }
        });

        // Ctrl+L to clear
        document.addEventListener('keydown', (e) => {
            if (e.key === 'l' && e.ctrlKey) {
                e.preventDefault();
                this.clearTerminal();
            }
        });
    }

    sendMessage() {
        const message = this.input.value.trim();
        if (!message) return;

        // Add to history
        this.commandHistory.push(message);
        this.historyIndex = this.commandHistory.length;

        // Display in terminal
        this.addToTerminal('user', message);

        // Clear input
        this.input.value = '';

        // Process message
        this.processMessage(message);
    }

    processMessage(message) {
        // Show processing indicator
        this.addToTerminal('system', 'Processing...');

        // Simulate Claude Code response (in real integration, this would call actual Claude Code)
        setTimeout(() => {
            const response = this.generateResponse(message);
            this.addToTerminal('assistant', response);

            // Parse and send to flow
            this.createNodes(message, response);
        }, 500);
    }

    generateResponse(message) {
        // Simple mock responses for testing
        const responses = {
            'hello': 'Hello! Claude Flow V2 is ready. I can help you visualize our conversation as nodes.',
            'help': 'Available commands:\n• hello - Greeting\n• test - Generate test nodes\n• clear - Clear terminal\n• metacognitive - Test metacognitive flow',
            'test': 'This is a test response. You should see this appear as nodes in the canvas!',
            'metacognitive': '**Thought**: Let me analyze this systematically.\n**Emotion**: I\'m excited to demonstrate the visualization.\n**Imagination**: Imagine seeing all these cognitive nodes connected.\n**Belief**: Visual thinking aids understanding.\n**Action**: Create the visualization now.',
        };

        // Check for known commands
        const lowerMessage = message.toLowerCase();
        for (const [key, value] of Object.entries(responses)) {
            if (lowerMessage.includes(key)) {
                return value;
            }
        }

        // Default response
        return `I received: "${message}"\n\nThis is a demo response. In production, this would be actual Claude Code output.`;
    }

    createNodes(userMessage, assistantResponse) {
        // Use the parser to create nodes
        if (!window.parser) {
            console.warn('Parser not available');
            return;
        }

        const result = window.parser.parseInteraction(userMessage, assistantResponse);

        // Send to server if WebSocket available
        if (window.app && window.app.ws && window.app.ws.readyState === WebSocket.OPEN) {
            window.app.sendMessage({
                type: 'node_update',
                nodes: result.nodes,
                edges: result.edges
            });
        } else {
            // Fallback: update canvas directly
            if (window.app && window.app.canvas) {
                const currentData = window.app.canvas.getData();
                const mergedData = {
                    conversation_id: currentData.conversation_id || 'terminal-session',
                    created_at: currentData.created_at || new Date().toISOString(),
                    nodes: [...currentData.nodes, ...result.nodes],
                    edges: [...currentData.edges, ...result.edges]
                };
                window.app.canvas.render(mergedData);
            }
        }

        // Show success message
        if (window.ui) {
            window.ui.success('Nodes Created', `${result.nodes.length} node(s) added to canvas`);
        }
    }

    addToTerminal(type, message) {
        const terminalOutput = document.querySelector('.terminal-output');
        if (!terminalOutput) return;

        const entry = document.createElement('div');
        entry.className = `terminal-entry terminal-${type}`;

        const timestamp = new Date().toLocaleTimeString();

        if (type === 'user') {
            entry.innerHTML = `
                <div class="entry-header">
                    <span class="entry-time">${timestamp}</span>
                    <span class="entry-label user-label">You</span>
                </div>
                <div class="entry-content">${this.escapeHtml(message)}</div>
            `;
        } else if (type === 'assistant') {
            entry.innerHTML = `
                <div class="entry-header">
                    <span class="entry-time">${timestamp}</span>
                    <span class="entry-label assistant-label">Claude</span>
                </div>
                <div class="entry-content">${this.formatResponse(message)}</div>
            `;
        } else if (type === 'system') {
            entry.innerHTML = `
                <div class="entry-content system-message">
                    <span class="system-icon">⚙</span>
                    ${this.escapeHtml(message)}
                </div>
            `;
        }

        // Remove processing message if it exists
        const processingMsg = terminalOutput.querySelector('.system-message');
        if (processingMsg && type !== 'system') {
            processingMsg.parentElement.remove();
        }

        terminalOutput.appendChild(entry);

        // Scroll to bottom
        const terminalContent = document.getElementById('terminal');
        if (terminalContent) {
            terminalContent.scrollTop = terminalContent.scrollHeight;
        }
    }

    formatResponse(text) {
        // Basic markdown-style formatting
        let formatted = this.escapeHtml(text);

        // Bold
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Line breaks
        formatted = formatted.replace(/\n/g, '<br>');

        return formatted;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;

        this.historyIndex += direction;

        if (this.historyIndex < 0) {
            this.historyIndex = 0;
        } else if (this.historyIndex >= this.commandHistory.length) {
            this.historyIndex = this.commandHistory.length;
            this.input.value = '';
            return;
        }

        this.input.value = this.commandHistory[this.historyIndex] || '';
    }

    clearTerminal() {
        const terminalOutput = document.querySelector('.terminal-output');
        if (!terminalOutput) return;

        // Keep welcome message, clear the rest
        const entries = terminalOutput.querySelectorAll('.terminal-entry');
        entries.forEach(entry => entry.remove());

        if (window.ui) {
            window.ui.info('Terminal Cleared', 'Chat history cleared');
        }
    }

    focus() {
        if (this.input) {
            this.input.focus();
        }
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.terminalInput = new TerminalInput();
    });
} else {
    window.terminalInput = new TerminalInput();
}

// Export
window.TerminalInput = TerminalInput;
