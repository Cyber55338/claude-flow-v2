/**
 * Terminal Input - Interactive Terminal for Claude Flow
 * Allows users to type commands and see nodes appear in real-time
 */

class TerminalInput {
    constructor() {
        this.historyIndex = -1;
        this.commandHistory = [];
        this.currentInput = '';

        // Terminal session tracking
        this.sessionId = `session-${Date.now()}`;
        this.commandIndex = 0;
        this.lastOutputId = null;
        this.commandQueue = [];  // For sequential processing
        this.isProcessing = false;

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

    async processMessage(message) {
        // Add to queue for sequential processing
        this.commandQueue.push(message);

        // Process queue if not already processing
        if (!this.isProcessing) {
            await this.processQueue();
        }
    }

    async processQueue() {
        this.isProcessing = true;

        while (this.commandQueue.length > 0) {
            const message = this.commandQueue.shift();
            await this.executeAndVisualize(message);
        }

        this.isProcessing = false;
    }

    async executeAndVisualize(message) {
        const startTime = Date.now();

        try {
            // Show processing indicator
            this.addToTerminal('system', 'Processing...');

            // Handle special commands
            if (message.startsWith('/')) {
                await this.handleSpecialCommand(message);
                // Remove processing message
                const processingMsg = document.querySelector('.terminal-output .system-message');
                if (processingMsg) {
                    processingMsg.parentElement.remove();
                }
                return;
            }

            // Execute command
            const result = await this.executeCommand(message);
            const duration = Date.now() - startTime;

            // Display in terminal
            this.addToTerminal('assistant', result);

            // Create nodes with full context
            await this.createTerminalNodes(message, result, {
                duration,
                startTime
            });

        } catch (error) {
            console.error('Terminal error:', error);

            // Create error node even for execution failures
            await this.createTerminalErrorNode(message, error, {
                duration: Date.now() - startTime
            });

            this.addToTerminal('system', `❌ Error: ${error.message}`);
        }
    }

    async handleSpecialCommand(command) {
        const cmd = command.toLowerCase().trim();

        if (cmd === '/help') {
            const helpText = `Claude Flow Terminal - Available Commands:

Shell Commands:
  • Type any shell command to execute (ls, pwd, echo, etc.)
  • Commands are executed in the server environment

Claude Integration:
  • Ask questions naturally to get AI responses
  • Responses are visualized as nodes in the canvas

Special Commands:
  • /help - Show this help message
  • /clear - Clear terminal history
  • /status - Show system status
  • Ctrl+L - Clear terminal
  • ↑↓ - Navigate command history`;

            this.addToTerminal('assistant', helpText);
        } else if (cmd === '/clear') {
            this.clearTerminal();
        } else if (cmd === '/status') {
            const status = `Server: Connected
WebSocket: ${window.app?.ws?.readyState === WebSocket.OPEN ? 'Active' : 'Disconnected'}
Nodes: ${window.app?.canvas?.getData()?.nodes?.length || 0}
Edges: ${window.app?.canvas?.getData()?.edges?.length || 0}`;
            this.addToTerminal('assistant', status);
        } else {
            this.addToTerminal('system', 'Unknown command. Type /help for available commands.');
        }
    }

    determineCommandType(message) {
        // Check if it's a known shell command
        const shellCommands = [
            'ls', 'pwd', 'cd', 'cat', 'echo', 'grep', 'find', 'ps', 'kill',
            'mkdir', 'rm', 'cp', 'mv', 'touch', 'chmod', 'chown',
            'which', 'whereis', 'whoami', 'date', 'cal', 'uptime',
            'df', 'du', 'free', 'top', 'htop', 'curl', 'wget',
            'git', 'npm', 'node', 'python', 'python3', 'pip',
            'apt', 'pkg', 'termux-info', 'termux-setup-storage'
        ];

        const firstWord = message.trim().split(/\s+/)[0].toLowerCase();

        // Check for pipes, redirects, or chained commands
        if (message.includes('|') || message.includes('>') || message.includes('&&') || message.includes(';')) {
            return 'shell';
        }

        // Check if first word is a known shell command
        if (shellCommands.includes(firstWord)) {
            return 'shell';
        }

        // Check if it looks like a file path
        if (message.startsWith('./') || message.startsWith('/')) {
            return 'shell';
        }

        // Everything else goes to Claude
        return 'claude';
    }

    async executeCommand(message) {
        try {
            // Determine command type (shell vs claude)
            const commandType = this.determineCommandType(message);

            // Send command to server for execution
            const response = await fetch('http://localhost:3000/api/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    command: message,
                    type: commandType
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error (${response.status}): ${response.statusText}`);
            }

            const data = await response.json();

            if (data.error) {
                // Command executed but failed
                return `Command failed:\n${data.output || data.error}`;
            }

            return data.output || data.result || 'Command executed (no output)';
        } catch (fetchError) {
            if (fetchError.message.includes('fetch')) {
                throw new Error('Cannot connect to server. Is it running?');
            }
            throw fetchError;
        }
    }

    async createTerminalNodes(command, result, context) {
        if (!window.app?.parser?.parseTerminalExecution) {
            console.warn('Parser terminal support not available');
            // Fallback to old method
            return this.createNodesOld(command, result);
        }

        // Determine if command was successful
        const isSuccess = !result.includes('Error:') && !result.includes('failed:') && !result.includes('Command failed');

        // Parse execution result
        const parseResult = window.app.parser.parseTerminalExecution(
            command,
            {
                success: isSuccess,
                output: result,
                exit_code: isSuccess ? 0 : 1,
                duration_ms: context.duration
            },
            {
                session_id: this.sessionId,
                command_index: this.commandIndex,
                previous_output_id: this.lastOutputId,
                cwd: '/current/path'
            }
        );

        // Store last output ID for next sequential link
        this.lastOutputId = parseResult.lastOutputId;
        this.commandIndex++;

        // Send to canvas
        if (window.app?.ws?.readyState === WebSocket.OPEN) {
            const success = window.app.sendMessage({
                type: 'node_update',
                nodes: parseResult.nodes,
                edges: parseResult.edges
            });

            if (!success) {
                this.directRenderNodes(parseResult.nodes, parseResult.edges);
            }
        } else {
            this.directRenderNodes(parseResult.nodes, parseResult.edges);
        }

        // Show success notification
        if (window.ui) {
            const nodeType = parseResult.nodes[1].type === 'terminal_error' ? 'error' : 'success';
            window.ui[nodeType === 'error' ? 'error' : 'success'](
                'Nodes Created',
                `Command ${nodeType === 'error' ? 'failed' : 'executed'} - ${parseResult.nodes.length} nodes added`
            );
        }
    }

    async createTerminalErrorNode(command, error, context) {
        // Create error node for execution failures
        await this.createTerminalNodes(command, `Error: ${error.message}`, context);
    }

    // Old method as fallback
    createNodesOld(userMessage, assistantResponse) {
        if (!window.app?.parser) {
            console.warn('Parser not available');
            return;
        }

        const result = window.app.parser.parseInteraction(userMessage, assistantResponse);

        if (window.app?.ws?.readyState === WebSocket.OPEN) {
            window.app.sendMessage({
                type: 'node_update',
                nodes: result.nodes,
                edges: result.edges
            });
        } else {
            this.directRenderNodes(result.nodes, result.edges);
        }
    }

    directRenderNodes(nodes, edges) {
        if (!window.app?.canvas) {
            console.error('Canvas not available');
            return;
        }

        const currentData = window.app.canvas.getData();
        const mergedData = {
            conversation_id: currentData.conversation_id || this.sessionId,
            created_at: currentData.created_at || new Date().toISOString(),
            nodes: [...currentData.nodes, ...nodes],
            edges: [...currentData.edges, ...edges]
        };

        window.app.canvas.render(mergedData);

        // Auto-scroll to latest node
        this.scrollToLatestNode();
    }

    scrollToLatestNode() {
        const canvas = document.getElementById('canvas');
        if (!canvas) return;

        // Smooth scroll to bottom
        const lastNode = document.querySelector('[data-node-type^="terminal_"]:last-child');
        if (lastNode) {
            lastNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
