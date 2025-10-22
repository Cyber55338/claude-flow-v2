/**
 * Import.js - Import functionality for Claude Flow
 * Supports JSON import with validation, merging, and error handling
 */

class ImportEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.validationRules = {
            requiredFields: ['nodes', 'edges'],
            nodeRequiredFields: ['id', 'type'],
            edgeRequiredFields: ['from', 'to'],
            validNodeTypes: ['input', 'output', 'skill', 'auto', 'thought', 'action', 'result', 'error']
        };
    }

    /**
     * Validate imported data structure
     */
    validateFlowData(data) {
        const errors = [];
        const warnings = [];

        // Check if data is an object
        if (typeof data !== 'object' || data === null) {
            errors.push('Invalid data format: expected object');
            return { valid: false, errors, warnings };
        }

        // Extract flow data (handle both wrapped and unwrapped formats)
        const flowData = data.data || data;

        // Check required fields
        this.validationRules.requiredFields.forEach(field => {
            if (!flowData.hasOwnProperty(field)) {
                errors.push(`Missing required field: ${field}`);
            }
        });

        if (errors.length > 0) {
            return { valid: false, errors, warnings };
        }

        // Validate nodes
        if (!Array.isArray(flowData.nodes)) {
            errors.push('Invalid nodes format: expected array');
        } else {
            flowData.nodes.forEach((node, index) => {
                // Check required node fields
                this.validationRules.nodeRequiredFields.forEach(field => {
                    if (!node.hasOwnProperty(field)) {
                        errors.push(`Node ${index}: missing required field '${field}'`);
                    }
                });

                // Validate node type
                if (node.type && !this.validationRules.validNodeTypes.includes(node.type)) {
                    warnings.push(`Node ${index}: unknown type '${node.type}'`);
                }

                // Check for duplicate IDs
                const duplicates = flowData.nodes.filter(n => n.id === node.id);
                if (duplicates.length > 1) {
                    warnings.push(`Duplicate node ID found: ${node.id}`);
                }
            });
        }

        // Validate edges
        if (!Array.isArray(flowData.edges)) {
            errors.push('Invalid edges format: expected array');
        } else {
            flowData.edges.forEach((edge, index) => {
                // Check required edge fields
                this.validationRules.edgeRequiredFields.forEach(field => {
                    if (!edge.hasOwnProperty(field)) {
                        errors.push(`Edge ${index}: missing required field '${field}'`);
                    }
                });

                // Validate edge references
                if (flowData.nodes) {
                    const nodeIds = flowData.nodes.map(n => n.id);
                    if (edge.from && !nodeIds.includes(edge.from)) {
                        warnings.push(`Edge ${index}: 'from' node '${edge.from}' not found`);
                    }
                    if (edge.to && !nodeIds.includes(edge.to)) {
                        warnings.push(`Edge ${index}: 'to' node '${edge.to}' not found`);
                    }
                }
            });
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings,
            data: flowData
        };
    }

    /**
     * Import from JSON file
     */
    async importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const jsonData = JSON.parse(e.target.result);
                    const validation = this.validateFlowData(jsonData);

                    if (!validation.valid) {
                        reject({
                            message: 'Validation failed',
                            errors: validation.errors,
                            warnings: validation.warnings
                        });
                        return;
                    }

                    resolve({
                        data: validation.data,
                        warnings: validation.warnings,
                        metadata: {
                            filename: file.name,
                            size: file.size,
                            lastModified: new Date(file.lastModified),
                            importedAt: new Date()
                        }
                    });
                } catch (error) {
                    reject({
                        message: 'Failed to parse JSON',
                        error: error.message
                    });
                }
            };

            reader.onerror = () => {
                reject({
                    message: 'Failed to read file',
                    error: reader.error
                });
            };

            reader.readAsText(file);
        });
    }

    /**
     * Import from JSON string
     */
    async importFromJSON(jsonString) {
        try {
            const jsonData = JSON.parse(jsonString);
            const validation = this.validateFlowData(jsonData);

            if (!validation.valid) {
                throw new Error('Validation failed: ' + validation.errors.join(', '));
            }

            return {
                data: validation.data,
                warnings: validation.warnings,
                metadata: {
                    importedAt: new Date()
                }
            };
        } catch (error) {
            throw new Error('Failed to import JSON: ' + error.message);
        }
    }

    /**
     * Merge imported data with existing canvas data
     */
    mergeFlowData(existingData, importedData, options = {}) {
        const config = {
            strategy: 'append', // 'append', 'replace', 'merge'
            resolveConflicts: 'rename', // 'rename', 'skip', 'overwrite'
            ...options
        };

        if (config.strategy === 'replace') {
            return importedData;
        }

        if (config.strategy === 'append') {
            const mergedNodes = [...(existingData.nodes || [])];
            const mergedEdges = [...(existingData.edges || [])];
            const nodeIdMap = new Map(); // Maps old IDs to new IDs

            // Handle nodes
            (importedData.nodes || []).forEach(node => {
                const existingIds = mergedNodes.map(n => n.id);
                let newNode = { ...node };

                if (existingIds.includes(node.id)) {
                    if (config.resolveConflicts === 'rename') {
                        // Generate new unique ID
                        let newId = node.id;
                        let counter = 1;
                        while (existingIds.includes(newId)) {
                            newId = `${node.id}_${counter}`;
                            counter++;
                        }
                        nodeIdMap.set(node.id, newId);
                        newNode.id = newId;
                        mergedNodes.push(newNode);
                    } else if (config.resolveConflicts === 'skip') {
                        // Skip this node
                        return;
                    } else if (config.resolveConflicts === 'overwrite') {
                        // Replace existing node
                        const index = mergedNodes.findIndex(n => n.id === node.id);
                        mergedNodes[index] = newNode;
                    }
                } else {
                    mergedNodes.push(newNode);
                }
            });

            // Handle edges with updated node IDs
            (importedData.edges || []).forEach(edge => {
                const newEdge = { ...edge };

                // Update node references if IDs were renamed
                if (nodeIdMap.has(edge.from)) {
                    newEdge.from = nodeIdMap.get(edge.from);
                }
                if (nodeIdMap.has(edge.to)) {
                    newEdge.to = nodeIdMap.get(edge.to);
                }

                mergedEdges.push(newEdge);
            });

            return {
                nodes: mergedNodes,
                edges: mergedEdges,
                canvasState: importedData.canvasState || existingData.canvasState
            };
        }

        // Default merge strategy
        return importedData;
    }

    /**
     * Apply imported data to canvas
     */
    applyToCanvas(flowData, options = {}) {
        const config = {
            clearExisting: false,
            animate: true,
            restoreCanvasState: true,
            ...options
        };

        try {
            // Clear canvas if requested
            if (config.clearExisting && this.canvas.clear) {
                this.canvas.clear();
            }

            // Merge with existing data if not clearing
            let finalData = flowData;
            if (!config.clearExisting && this.canvas.nodes) {
                const existingData = {
                    nodes: this.canvas.nodes,
                    edges: this.canvas.edges
                };
                finalData = this.mergeFlowData(existingData, flowData, options);
            }

            // Apply nodes
            if (finalData.nodes && this.canvas.addNodes) {
                this.canvas.nodes = finalData.nodes;
            }

            // Apply edges
            if (finalData.edges && this.canvas.addEdges) {
                this.canvas.edges = finalData.edges;
            }

            // Restore canvas state
            if (config.restoreCanvasState && finalData.canvasState) {
                if (finalData.canvasState.zoom !== undefined) {
                    this.canvas.zoom = finalData.canvasState.zoom;
                }
                if (finalData.canvasState.panX !== undefined) {
                    this.canvas.panX = finalData.canvasState.panX;
                }
                if (finalData.canvasState.panY !== undefined) {
                    this.canvas.panY = finalData.canvasState.panY;
                }
                if (this.canvas.updateTransform) {
                    this.canvas.updateTransform();
                }
            }

            // Trigger canvas update
            if (this.canvas.render) {
                this.canvas.render();
            }

            return {
                success: true,
                nodesImported: finalData.nodes ? finalData.nodes.length : 0,
                edgesImported: finalData.edges ? finalData.edges.length : 0
            };
        } catch (error) {
            console.error('Failed to apply data to canvas:', error);
            throw error;
        }
    }

    /**
     * Create file input for drag-and-drop or file selection
     */
    createFileInput(callback) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';

        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const result = await this.importFromFile(file);
                    callback(null, result);
                } catch (error) {
                    callback(error, null);
                }
            }
        });

        return input;
    }

    /**
     * Setup drag-and-drop import
     */
    setupDragAndDrop(dropZone, onImport, onError) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Highlight drop zone when dragging over
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => {
                dropZone.classList.remove('drag-over');
            });
        });

        // Handle drop
        dropZone.addEventListener('drop', async (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];

                // Check file type
                if (!file.name.endsWith('.json')) {
                    if (onError) {
                        onError(new Error('Only JSON files are supported'));
                    }
                    return;
                }

                try {
                    const result = await this.importFromFile(file);
                    if (onImport) {
                        onImport(result);
                    }
                } catch (error) {
                    if (onError) {
                        onError(error);
                    }
                }
            }
        });
    }

    /**
     * Import and apply in one step
     */
    async importAndApply(file, options = {}) {
        try {
            const importResult = await this.importFromFile(file);
            const applyResult = this.applyToCanvas(importResult.data, options);

            return {
                ...importResult,
                ...applyResult
            };
        } catch (error) {
            throw error;
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ImportEngine = ImportEngine;
}
