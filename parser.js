/**
 * Parser.js - Claude Code Output Parser
 * Detects and extracts nodes from Claude's responses
 */

class Parser {
    constructor() {
        // Detection patterns
        this.patterns = {
            // Metacognitive flow skill
            metacognitive: /\*\*(Thought|Emotion|Imagination|Belief|Action)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,

            // Section headers (markdown)
            sectionHeaders: /^##\s+(.+)$/gm,

            // Common structured patterns
            analysis: /\*\*Analysis\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
            summary: /\*\*Summary\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
            plan: /\*\*Plan\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
            recommendation: /\*\*Recommendation\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
        };

        this.nodeIdCounter = 1;
    }

    /**
     * Parse Claude output and generate nodes
     * @param {string} inputText - User input
     * @param {string} outputText - Claude's response
     * @returns {Object} - { nodes: [], edges: [] }
     */
    parseInteraction(inputText, outputText) {
        const nodes = [];
        const edges = [];

        // Create input node
        const inputNode = this.createNode('input', inputText, null);
        nodes.push(inputNode);

        // Parse output for different node types
        const outputNodes = this.parseOutput(outputText, inputNode.id);

        // Add all nodes and edges
        nodes.push(...outputNodes.nodes);
        edges.push(...outputNodes.edges);

        return { nodes, edges };
    }

    /**
     * Parse output text and extract nodes
     * @param {string} text - Claude's output
     * @param {string} parentId - Parent node ID
     * @returns {Object} - { nodes: [], edges: [] }
     */
    parseOutput(text, parentId) {
        const nodes = [];
        const edges = [];

        // 1. Check for metacognitive-flow skill
        if (this.isMetacognitiveFlow(text)) {
            const metacogNodes = this.parseMetacognitive(text, parentId);
            nodes.push(...metacogNodes);
            metacogNodes.forEach(node => {
                edges.push({ from: parentId, to: node.id });
            });
        }

        // 2. Check for auto-detectable sections
        const sectionNodes = this.parseSections(text, parentId);
        if (sectionNodes.length > 0) {
            nodes.push(...sectionNodes);
            sectionNodes.forEach(node => {
                edges.push({ from: parentId, to: node.id });
            });
        }

        // 3. Check for common patterns (Analysis, Summary, etc.)
        const patternNodes = this.parsePatterns(text, parentId);
        if (patternNodes.length > 0) {
            nodes.push(...patternNodes);
            patternNodes.forEach(node => {
                edges.push({ from: parentId, to: node.id });
            });
        }

        // 4. Always create main output node
        const outputNode = this.createNode('output', text, parentId);
        nodes.push(outputNode);
        edges.push({ from: parentId, to: outputNode.id });

        return { nodes, edges };
    }

    /**
     * Check if text contains metacognitive-flow skill
     */
    isMetacognitiveFlow(text) {
        return /\*\*(Thought|Emotion|Imagination|Belief|Action)\*\*/i.test(text);
    }

    /**
     * Parse metacognitive-flow nodes
     */
    parseMetacognitive(text, parentId) {
        const nodes = [];
        const regex = new RegExp(this.patterns.metacognitive);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, title, content] = match;
            const node = {
                id: this.generateId(),
                type: 'skill',
                skill_name: 'metacognitive-flow',
                title: title.trim(),
                content: content.trim(),
                parent_id: parentId,
                timestamp: new Date().toISOString()
            };
            nodes.push(node);
        }

        return nodes;
    }

    /**
     * Parse markdown section headers
     */
    parseSections(text, parentId) {
        const nodes = [];
        const regex = new RegExp(this.patterns.sectionHeaders);
        let match;

        const matches = [];
        while ((match = regex.exec(text)) !== null) {
            matches.push({
                title: match[1].trim(),
                index: match.index
            });
        }

        // Extract content for each section
        matches.forEach((section, i) => {
            const nextIndex = i < matches.length - 1 ? matches[i + 1].index : text.length;
            const sectionText = text.substring(section.index, nextIndex);

            // Extract content after header
            const contentMatch = sectionText.match(/^##\s+.+\n(.+)/s);
            const content = contentMatch ? contentMatch[1].trim() : '';

            // Skip if content is too short or likely not a real section
            if (content.length > 20 && !this.isCommonHeader(section.title)) {
                const node = {
                    id: this.generateId(),
                    type: 'auto',
                    detected_type: section.title.toLowerCase().replace(/\s+/g, '_'),
                    title: section.title,
                    content: content.substring(0, 200), // Truncate
                    parent_id: parentId,
                    timestamp: new Date().toISOString()
                };
                nodes.push(node);
            }
        });

        return nodes;
    }

    /**
     * Parse common patterns (Analysis, Summary, etc.)
     */
    parsePatterns(text, parentId) {
        const nodes = [];

        // Check each pattern
        ['analysis', 'summary', 'plan', 'recommendation'].forEach(patternName => {
            const regex = new RegExp(this.patterns[patternName]);
            let match;

            while ((match = regex.exec(text)) !== null) {
                const content = match[1].trim();

                if (content.length > 20) {
                    const node = {
                        id: this.generateId(),
                        type: 'auto',
                        detected_type: patternName,
                        title: this.capitalize(patternName),
                        content: content.substring(0, 200),
                        parent_id: parentId,
                        timestamp: new Date().toISOString()
                    };
                    nodes.push(node);
                }
            }
        });

        return nodes;
    }

    /**
     * Create a basic node
     */
    createNode(type, content, parentId) {
        return {
            id: this.generateId(),
            type: type,
            content: content,
            parent_id: parentId,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generate unique node ID
     */
    generateId() {
        return `node-${this.nodeIdCounter++}`;
    }

    /**
     * Reset ID counter (useful for testing)
     */
    resetIdCounter() {
        this.nodeIdCounter = 1;
    }

    /**
     * Check if header is a common markdown header (skip these)
     */
    isCommonHeader(title) {
        const commonHeaders = [
            'introduction',
            'conclusion',
            'overview',
            'table of contents',
            'toc'
        ];
        return commonHeaders.includes(title.toLowerCase());
    }

    /**
     * Capitalize first letter
     */
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Parse existing flow data and add new interaction
     */
    addToFlow(existingData, inputText, outputText) {
        // Parse new interaction
        const newData = this.parseInteraction(inputText, outputText);

        // Merge with existing data
        const mergedData = {
            conversation_id: existingData.conversation_id || this.generateId(),
            created_at: existingData.created_at || new Date().toISOString(),
            nodes: [...(existingData.nodes || []), ...newData.nodes],
            edges: [...(existingData.edges || []), ...newData.edges]
        };

        return mergedData;
    }

    /**
     * Create empty flow data structure
     */
    createEmptyFlow() {
        return {
            conversation_id: this.generateId(),
            created_at: new Date().toISOString(),
            nodes: [],
            edges: []
        };
    }
}

// Export for use in app.js
window.Parser = Parser;
