/**
 * History.js - Undo/Redo System for Claude Flow
 * Implements Command Pattern with memory-efficient state snapshots
 * Supports 50 actions with keyboard shortcuts
 */

class HistoryManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.undoStack = [];
        this.redoStack = [];
        this.maxHistorySize = 50;
        this.isExecuting = false; // Prevent recording during undo/redo

        // Debounce settings for grouping rapid changes
        this.debounceDelay = 300;
        this.debounceTimer = null;
        this.pendingCommand = null;

        this.setupKeyboardShortcuts();
    }

    /**
     * Setup keyboard shortcuts for undo/redo
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z / Cmd+Z - Undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
            }

            // Ctrl+Shift+Z / Cmd+Shift+Z - Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                this.redo();
            }

            // Ctrl+Y / Cmd+Y - Alternative Redo
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                this.redo();
            }
        });
    }

    /**
     * Record a command (with debouncing for similar commands)
     */
    record(command, options = {}) {
        if (this.isExecuting) return;

        const config = {
            debounce: true,
            merge: false,
            ...options
        };

        // Clear pending command timer if exists
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // If debouncing is enabled, wait before recording
        if (config.debounce) {
            this.pendingCommand = command;
            this.debounceTimer = setTimeout(() => {
                this._recordCommand(this.pendingCommand);
                this.pendingCommand = null;
            }, this.debounceDelay);
        } else {
            this._recordCommand(command);
        }
    }

    /**
     * Internal method to record command
     */
    _recordCommand(command) {
        // Add to undo stack
        this.undoStack.push(command);

        // Clear redo stack when new command is recorded
        this.redoStack = [];

        // Maintain max history size
        if (this.undoStack.length > this.maxHistorySize) {
            this.undoStack.shift();
        }

        console.log(`Command recorded: ${command.name}`);
    }

    /**
     * Undo last command
     */
    undo() {
        if (this.undoStack.length === 0) {
            console.log('Nothing to undo');
            return false;
        }

        const command = this.undoStack.pop();
        this.isExecuting = true;

        try {
            command.undo();
            this.redoStack.push(command);
            console.log(`Undid: ${command.name}`);

            // Trigger canvas update
            if (this.canvas.render) {
                this.canvas.render();
            }

            return true;
        } catch (error) {
            console.error('Undo failed:', error);
            // Put command back on undo stack
            this.undoStack.push(command);
            return false;
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Redo last undone command
     */
    redo() {
        if (this.redoStack.length === 0) {
            console.log('Nothing to redo');
            return false;
        }

        const command = this.redoStack.pop();
        this.isExecuting = true;

        try {
            command.execute();
            this.undoStack.push(command);
            console.log(`Redid: ${command.name}`);

            // Trigger canvas update
            if (this.canvas.render) {
                this.canvas.render();
            }

            return true;
        } catch (error) {
            console.error('Redo failed:', error);
            // Put command back on redo stack
            this.redoStack.push(command);
            return false;
        } finally {
            this.isExecuting = false;
        }
    }

    /**
     * Clear all history
     */
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        console.log('History cleared');
    }

    /**
     * Get history summary
     */
    getHistory() {
        return {
            undoStack: this.undoStack.map(cmd => ({
                name: cmd.name,
                timestamp: cmd.timestamp
            })),
            redoStack: this.redoStack.map(cmd => ({
                name: cmd.name,
                timestamp: cmd.timestamp
            })),
            canUndo: this.undoStack.length > 0,
            canRedo: this.redoStack.length > 0
        };
    }

    /**
     * Create command for adding nodes
     */
    createAddNodesCommand(nodes) {
        return new AddNodesCommand(this.canvas, nodes);
    }

    /**
     * Create command for removing nodes
     */
    createRemoveNodesCommand(nodeIds) {
        return new RemoveNodesCommand(this.canvas, nodeIds);
    }

    /**
     * Create command for modifying nodes
     */
    createModifyNodesCommand(oldNodes, newNodes) {
        return new ModifyNodesCommand(this.canvas, oldNodes, newNodes);
    }

    /**
     * Create command for canvas state change
     */
    createCanvasStateCommand(oldState, newState) {
        return new CanvasStateCommand(this.canvas, oldState, newState);
    }

    /**
     * Create command for clearing canvas
     */
    createClearCanvasCommand(savedState) {
        return new ClearCanvasCommand(this.canvas, savedState);
    }
}

/**
 * Base Command class
 */
class Command {
    constructor(name) {
        this.name = name;
        this.timestamp = new Date().toISOString();
    }

    execute() {
        throw new Error('execute() must be implemented');
    }

    undo() {
        throw new Error('undo() must be implemented');
    }
}

/**
 * Add Nodes Command
 */
class AddNodesCommand extends Command {
    constructor(canvas, nodes) {
        super('Add Nodes');
        this.canvas = canvas;
        this.nodes = nodes;
    }

    execute() {
        if (!this.canvas.nodes) {
            this.canvas.nodes = [];
        }
        this.canvas.nodes.push(...this.nodes);
    }

    undo() {
        const nodeIds = this.nodes.map(n => n.id);
        this.canvas.nodes = this.canvas.nodes.filter(n => !nodeIds.includes(n.id));
    }
}

/**
 * Remove Nodes Command
 */
class RemoveNodesCommand extends Command {
    constructor(canvas, nodeIds) {
        super('Remove Nodes');
        this.canvas = canvas;
        this.nodeIds = nodeIds;
        this.removedNodes = [];
        this.removedEdges = [];
    }

    execute() {
        // Save nodes before removing
        this.removedNodes = this.canvas.nodes.filter(n => this.nodeIds.includes(n.id));

        // Remove nodes
        this.canvas.nodes = this.canvas.nodes.filter(n => !this.nodeIds.includes(n.id));

        // Remove connected edges
        if (this.canvas.edges) {
            this.removedEdges = this.canvas.edges.filter(e =>
                this.nodeIds.includes(e.from) || this.nodeIds.includes(e.to)
            );
            this.canvas.edges = this.canvas.edges.filter(e =>
                !this.nodeIds.includes(e.from) && !this.nodeIds.includes(e.to)
            );
        }
    }

    undo() {
        // Restore nodes
        this.canvas.nodes.push(...this.removedNodes);

        // Restore edges
        if (this.canvas.edges && this.removedEdges.length > 0) {
            this.canvas.edges.push(...this.removedEdges);
        }
    }
}

/**
 * Modify Nodes Command
 */
class ModifyNodesCommand extends Command {
    constructor(canvas, oldNodes, newNodes) {
        super('Modify Nodes');
        this.canvas = canvas;
        this.oldNodes = JSON.parse(JSON.stringify(oldNodes)); // Deep copy
        this.newNodes = JSON.parse(JSON.stringify(newNodes)); // Deep copy
    }

    execute() {
        const nodeIds = this.newNodes.map(n => n.id);
        this.canvas.nodes = this.canvas.nodes.map(node => {
            const index = nodeIds.indexOf(node.id);
            return index !== -1 ? this.newNodes[index] : node;
        });
    }

    undo() {
        const nodeIds = this.oldNodes.map(n => n.id);
        this.canvas.nodes = this.canvas.nodes.map(node => {
            const index = nodeIds.indexOf(node.id);
            return index !== -1 ? this.oldNodes[index] : node;
        });
    }
}

/**
 * Canvas State Command (zoom, pan)
 */
class CanvasStateCommand extends Command {
    constructor(canvas, oldState, newState) {
        super('Canvas State Change');
        this.canvas = canvas;
        this.oldState = { ...oldState };
        this.newState = { ...newState };
    }

    execute() {
        this.applyState(this.newState);
    }

    undo() {
        this.applyState(this.oldState);
    }

    applyState(state) {
        if (state.zoom !== undefined) {
            this.canvas.zoom = state.zoom;
        }
        if (state.panX !== undefined) {
            this.canvas.panX = state.panX;
        }
        if (state.panY !== undefined) {
            this.canvas.panY = state.panY;
        }
        if (this.canvas.updateTransform) {
            this.canvas.updateTransform();
        }
    }
}

/**
 * Clear Canvas Command
 */
class ClearCanvasCommand extends Command {
    constructor(canvas, savedState) {
        super('Clear Canvas');
        this.canvas = canvas;
        this.savedNodes = savedState.nodes ? [...savedState.nodes] : [];
        this.savedEdges = savedState.edges ? [...savedState.edges] : [];
    }

    execute() {
        this.canvas.nodes = [];
        this.canvas.edges = [];
    }

    undo() {
        this.canvas.nodes = [...this.savedNodes];
        this.canvas.edges = [...this.savedEdges];
    }
}

/**
 * Batch Command - Execute multiple commands as one
 */
class BatchCommand extends Command {
    constructor(commands, name = 'Batch Operation') {
        super(name);
        this.commands = commands;
    }

    execute() {
        this.commands.forEach(cmd => cmd.execute());
    }

    undo() {
        // Undo in reverse order
        for (let i = this.commands.length - 1; i >= 0; i--) {
            this.commands[i].undo();
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.HistoryManager = HistoryManager;
    window.Command = Command;
    window.AddNodesCommand = AddNodesCommand;
    window.RemoveNodesCommand = RemoveNodesCommand;
    window.ModifyNodesCommand = ModifyNodesCommand;
    window.CanvasStateCommand = CanvasStateCommand;
    window.ClearCanvasCommand = ClearCanvasCommand;
    window.BatchCommand = BatchCommand;
}
