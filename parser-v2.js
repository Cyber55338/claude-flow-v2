/**
 * Parser-v2.js - Enhanced Claude Code Output Parser
 * Supports all Claude Code skills with extensible pattern detection
 *
 * Features:
 * - Multi-skill support (metacognitive, xlsx, pdf, pptx, docx)
 * - Code block detection
 * - Table extraction
 * - URL and file reference extraction
 * - Custom pattern configuration
 * - Metadata extraction
 * - Backward compatible with parser.js
 */

class ParserV2 {
    constructor(config = null) {
        // Load configuration with proper defaults
        const defaultConfig = this.getDefaultConfig();

        if (config) {
            this.config = {
                ...defaultConfig,
                ...config,
                enabled_patterns: {
                    ...defaultConfig.enabled_patterns,
                    ...(config.enabled_patterns || {})
                },
                pattern_priority: config.pattern_priority || defaultConfig.pattern_priority
            };
        } else {
            this.config = defaultConfig;
        }

        // Core detection patterns
        this.patterns = this.initializePatterns();

        // Node counter
        this.nodeIdCounter = 1;

        // Metadata store
        this.metadata = {
            urls: [],
            files: [],
            codeBlocks: [],
            tables: []
        };
    }

    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            enabled_patterns: {
                metacognitive: true,
                xlsx: true,
                pdf: true,
                pptx: true,
                docx: true,
                code: true,
                tables: true,
                sections: true,
                analysis: true
            },
            pattern_priority: [
                'metacognitive',
                'xlsx',
                'pdf',
                'pptx',
                'docx',
                'code',
                'tables',
                'sections',
                'analysis'
            ],
            extract_metadata: true,
            max_content_length: 500,
            min_content_length: 20,
            multiline_support: true
        };
    }

    /**
     * Initialize all detection patterns
     */
    initializePatterns() {
        return {
            // Metacognitive-flow skill patterns
            metacognitive: {
                nodes: /\*\*(Thought|Emotion|Imagination|Belief|Action)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
                indicator: /\*\*(Thought|Emotion|Imagination|Belief|Action)\*\*/i
            },

            // XLSX/Spreadsheet patterns
            xlsx: {
                operations: /\*\*(Spreadsheet|Excel|XLSX|Data Analysis|Formula|Chart|Pivot)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
                cells: /Cell\s+([A-Z]+\d+)(?:\s*[:=]\s*(.+))?/gi,
                formulas: /=\s*([A-Z]+\([^)]*\))/g,
                ranges: /([A-Z]+\d+:[A-Z]+\d+)/g,
                indicator: /\b(spreadsheet|excel|xlsx|workbook|worksheet|cell|formula|pivot)\b/i
            },

            // PDF patterns
            pdf: {
                operations: /\*\*(PDF|Extract|Merge|Split|Form|Annotation)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
                pages: /(?:page|pg\.?)\s*(\d+)/gi,
                sections: /\*\*Section\*\*:?\s*([^\n]+)/gi,
                indicator: /\b(pdf|extract|merge|split|form field|annotation)\b/i
            },

            // PPTX/Presentation patterns
            pptx: {
                operations: /\*\*(Presentation|Slide|Layout|PowerPoint|PPTX)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
                slides: /Slide\s+(\d+)(?:\s*[:]\s*(.+))?/gi,
                layouts: /Layout:\s*([^\n]+)/gi,
                indicator: /\b(presentation|powerpoint|pptx|slide|layout)\b/i
            },

            // DOCX/Document patterns
            docx: {
                operations: /\*\*(Document|DOCX|Word|Paragraph|Heading|Style)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
                headings: /^(#{1,6})\s+(.+)$/gm,
                tracked_changes: /\*\*Track(?:ed)? Change\*\*:?\s*([^\n]+)/gi,
                comments: /\*\*Comment\*\*:?\s*([^\n]+)/gi,
                indicator: /\b(document|docx|word|paragraph|heading|tracked change|comment)\b/i
            },

            // Code analysis patterns
            code: {
                blocks: /```(\w+)?\n([\s\S]*?)```/g,
                inline: /`([^`]+)`/g,
                functions: /(?:function|def|fn|func)\s+(\w+)/g,
                classes: /(?:class|interface|struct)\s+(\w+)/g,
                imports: /(?:import|require|use|include)\s+([^\n;]+)/g,
                indicator: /```|`[^`]+`/
            },

            // Table patterns
            tables: {
                markdown: /(?:^\|.+\|$\n?)+/gm,
                headers: /^\|(.+)\|$/m,
                separator: /^\|[\s:|-]+\|$/m,
                indicator: /^\|.+\|$/m
            },

            // File and path references
            files: {
                paths: /(?:\/[\w.-]+)+\.(\w+)|(?:\.?\/)?(?:[\w.-]+\/)+[\w.-]+\.(\w+)|~\/[\w./-]+/g,
                references: /\b(?:file|path|directory):\s*([^\s]+)/gi
            },

            // URL patterns
            urls: {
                http: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g,
                markdown_links: /\[([^\]]+)\]\(([^)]+)\)/g
            },

            // Section headers (markdown)
            sections: {
                h2: /^##\s+(.+)$/gm,
                h3: /^###\s+(.+)$/gm,
                h4: /^####\s+(.+)$/gm
            },

            // Common structured patterns
            analysis: {
                analysis: /\*\*Analysis\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
                summary: /\*\*Summary\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
                plan: /\*\*Plan\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
                recommendation: /\*\*Recommendation\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
                findings: /\*\*Findings?\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi,
                steps: /\*\*Steps?\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)/gi
            },

            // Timestamp patterns
            timestamps: {
                iso: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g,
                human: /\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?/gi
            }
        };
    }

    /**
     * Load custom configuration
     * @param {Object} customConfig - User-provided configuration
     */
    loadConfig(customConfig) {
        // Deep merge to preserve nested objects
        this.config = {
            ...this.config,
            ...customConfig,
            enabled_patterns: {
                ...this.config.enabled_patterns,
                ...(customConfig.enabled_patterns || {})
            },
            pattern_priority: customConfig.pattern_priority || this.config.pattern_priority
        };
        console.log('Loaded custom parser configuration');
    }

    /**
     * Main parse method - Parse interaction and generate nodes
     * @param {string} inputText - User input
     * @param {string} outputText - Claude's response
     * @returns {Object} - { nodes: [], edges: [], metadata: {} }
     */
    parseInteraction(inputText, outputText) {
        const nodes = [];
        const edges = [];

        // Reset metadata
        this.metadata = {
            urls: [],
            files: [],
            codeBlocks: [],
            tables: [],
            timestamps: []
        };

        // Create input node
        const inputNode = this.createNode('input', inputText, null);
        nodes.push(inputNode);

        // Extract metadata if enabled
        if (this.config.extract_metadata) {
            this.extractMetadata(outputText);
        }

        // Parse output for different node types based on priority
        const outputNodes = this.parseOutput(outputText, inputNode.id);

        // Add all nodes and edges
        nodes.push(...outputNodes.nodes);
        edges.push(...outputNodes.edges);

        return {
            nodes,
            edges,
            metadata: this.metadata
        };
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
        const addedNodes = new Set(); // Track to avoid duplicates

        // Process patterns based on priority
        for (const patternName of this.config.pattern_priority) {
            if (!this.config.enabled_patterns[patternName]) {
                continue;
            }

            let patternNodes = [];

            switch (patternName) {
                case 'metacognitive':
                    if (this.detectPattern('metacognitive', text)) {
                        patternNodes = this.parseMetacognitive(text, parentId);
                    }
                    break;

                case 'xlsx':
                    if (this.detectPattern('xlsx', text)) {
                        patternNodes = this.parseXLSX(text, parentId);
                    }
                    break;

                case 'pdf':
                    if (this.detectPattern('pdf', text)) {
                        patternNodes = this.parsePDF(text, parentId);
                    }
                    break;

                case 'pptx':
                    if (this.detectPattern('pptx', text)) {
                        patternNodes = this.parsePPTX(text, parentId);
                    }
                    break;

                case 'docx':
                    if (this.detectPattern('docx', text)) {
                        patternNodes = this.parseDOCX(text, parentId);
                    }
                    break;

                case 'code':
                    patternNodes = this.parseCode(text, parentId);
                    break;

                case 'tables':
                    patternNodes = this.parseTables(text, parentId);
                    break;

                case 'sections':
                    patternNodes = this.parseSections(text, parentId);
                    break;

                case 'analysis':
                    patternNodes = this.parseAnalysisPatterns(text, parentId);
                    break;
            }

            // Add unique nodes
            patternNodes.forEach(node => {
                const nodeKey = `${node.type}-${node.title}-${node.content.substring(0, 50)}`;
                if (!addedNodes.has(nodeKey)) {
                    nodes.push(node);
                    edges.push({ from: parentId, to: node.id });
                    addedNodes.add(nodeKey);
                }
            });
        }

        // Always create main output node
        const outputNode = this.createNode('output', text, parentId);
        nodes.push(outputNode);
        edges.push({ from: parentId, to: outputNode.id });

        return { nodes, edges };
    }

    /**
     * Detect if a pattern exists in text
     */
    detectPattern(patternName, text) {
        const pattern = this.patterns[patternName];
        if (!pattern || !pattern.indicator) {
            return false;
        }
        return pattern.indicator.test(text);
    }

    /**
     * Parse metacognitive-flow nodes
     */
    parseMetacognitive(text, parentId) {
        const nodes = [];
        const regex = new RegExp(this.patterns.metacognitive.nodes);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, title, content] = match;
            const cleanContent = this.cleanContent(content);

            if (cleanContent.length >= this.config.min_content_length) {
                const node = {
                    id: this.generateId(),
                    type: 'skill',
                    skill_name: 'metacognitive-flow',
                    title: title.trim(),
                    content: this.truncateContent(cleanContent),
                    full_content: cleanContent,
                    parent_id: parentId,
                    timestamp: new Date().toISOString()
                };
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * Parse XLSX/Spreadsheet operations
     */
    parseXLSX(text, parentId) {
        const nodes = [];
        const regex = new RegExp(this.patterns.xlsx.operations);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, title, content] = match;
            const cleanContent = this.cleanContent(content);

            if (cleanContent.length >= this.config.min_content_length) {
                // Extract from both the matched content and full text for context
                const cells = this.extractCellReferences(text);

                // Extract formulas
                const formulas = this.extractFormulas(text);

                const node = {
                    id: this.generateId(),
                    type: 'skill',
                    skill_name: 'xlsx',
                    title: title.trim(),
                    content: this.truncateContent(cleanContent),
                    full_content: cleanContent,
                    cells: cells,
                    formulas: formulas,
                    parent_id: parentId,
                    timestamp: new Date().toISOString()
                };
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * Parse PDF operations
     */
    parsePDF(text, parentId) {
        const nodes = [];
        const regex = new RegExp(this.patterns.pdf.operations);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, title, content] = match;
            const cleanContent = this.cleanContent(content);

            if (cleanContent.length >= this.config.min_content_length) {
                // Extract page numbers from full text for context
                const pages = this.extractPageNumbers(text);

                const node = {
                    id: this.generateId(),
                    type: 'skill',
                    skill_name: 'pdf',
                    title: title.trim(),
                    content: this.truncateContent(cleanContent),
                    full_content: cleanContent,
                    pages: pages,
                    parent_id: parentId,
                    timestamp: new Date().toISOString()
                };
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * Parse PPTX/Presentation operations
     */
    parsePPTX(text, parentId) {
        const nodes = [];
        const regex = new RegExp(this.patterns.pptx.operations);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, title, content] = match;
            const cleanContent = this.cleanContent(content);

            if (cleanContent.length >= this.config.min_content_length) {
                // Extract slide numbers from full text for context
                const slides = this.extractSlideNumbers(text);

                const node = {
                    id: this.generateId(),
                    type: 'skill',
                    skill_name: 'pptx',
                    title: title.trim(),
                    content: this.truncateContent(cleanContent),
                    full_content: cleanContent,
                    slides: slides,
                    parent_id: parentId,
                    timestamp: new Date().toISOString()
                };
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * Parse DOCX/Document operations
     */
    parseDOCX(text, parentId) {
        const nodes = [];
        const regex = new RegExp(this.patterns.docx.operations);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, title, content] = match;
            const cleanContent = this.cleanContent(content);

            if (cleanContent.length >= this.config.min_content_length) {
                const node = {
                    id: this.generateId(),
                    type: 'skill',
                    skill_name: 'docx',
                    title: title.trim(),
                    content: this.truncateContent(cleanContent),
                    full_content: cleanContent,
                    parent_id: parentId,
                    timestamp: new Date().toISOString()
                };
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * Parse code blocks
     */
    parseCode(text, parentId) {
        const nodes = [];
        const regex = new RegExp(this.patterns.code.blocks);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const [_, language, code] = match;
            const cleanCode = code.trim();

            if (cleanCode.length >= this.config.min_content_length) {
                const node = {
                    id: this.generateId(),
                    type: 'code',
                    language: language || 'text',
                    title: `Code: ${language || 'text'}`,
                    content: this.truncateContent(cleanCode),
                    full_content: cleanCode,
                    parent_id: parentId,
                    timestamp: new Date().toISOString()
                };
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * Parse markdown tables
     */
    parseTables(text, parentId) {
        const nodes = [];
        const regex = new RegExp(this.patterns.tables.markdown);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const tableText = match[0];
            const lines = tableText.trim().split('\n');

            if (lines.length >= 3) { // At least header, separator, and one row
                const headers = this.parseTableRow(lines[0]);

                const node = {
                    id: this.generateId(),
                    type: 'table',
                    title: 'Data Table',
                    content: this.truncateContent(tableText),
                    full_content: tableText,
                    headers: headers,
                    row_count: lines.length - 2, // Exclude header and separator
                    parent_id: parentId,
                    timestamp: new Date().toISOString()
                };
                nodes.push(node);
            }
        }

        return nodes;
    }

    /**
     * Parse markdown section headers
     */
    parseSections(text, parentId) {
        const nodes = [];
        const sections = [];

        // Collect all sections with their levels
        ['h2', 'h3', 'h4'].forEach(level => {
            const regex = new RegExp(this.patterns.sections[level]);
            let match;

            while ((match = regex.exec(text)) !== null) {
                sections.push({
                    level: level,
                    title: match[1].trim(),
                    index: match.index
                });
            }
        });

        // Sort by index
        sections.sort((a, b) => a.index - b.index);

        // Extract content for each section
        sections.forEach((section, i) => {
            const nextIndex = i < sections.length - 1 ? sections[i + 1].index : text.length;
            const sectionText = text.substring(section.index, nextIndex);

            // Extract content after header
            const lines = sectionText.split('\n');
            const content = lines.slice(1).join('\n').trim();

            if (content.length >= this.config.min_content_length && !this.isCommonHeader(section.title)) {
                const node = {
                    id: this.generateId(),
                    type: 'section',
                    level: section.level,
                    title: section.title,
                    content: this.truncateContent(content),
                    full_content: content,
                    parent_id: parentId,
                    timestamp: new Date().toISOString()
                };
                nodes.push(node);
            }
        });

        return nodes;
    }

    /**
     * Parse common analysis patterns
     */
    parseAnalysisPatterns(text, parentId) {
        const nodes = [];

        ['analysis', 'summary', 'plan', 'recommendation', 'findings', 'steps'].forEach(patternName => {
            const regex = new RegExp(this.patterns.analysis[patternName]);
            let match;

            while ((match = regex.exec(text)) !== null) {
                const content = this.cleanContent(match[1]);

                if (content.length >= this.config.min_content_length) {
                    const node = {
                        id: this.generateId(),
                        type: 'analysis',
                        detected_type: patternName,
                        title: this.capitalize(patternName),
                        content: this.truncateContent(content),
                        full_content: content,
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
     * Extract metadata from text
     */
    extractMetadata(text) {
        // Extract URLs
        const urlRegex = new RegExp(this.patterns.urls.http);
        let match;
        while ((match = urlRegex.exec(text)) !== null) {
            this.metadata.urls.push(match[0]);
        }

        // Extract file paths
        const fileRegex = new RegExp(this.patterns.files.paths);
        while ((match = fileRegex.exec(text)) !== null) {
            this.metadata.files.push(match[0]);
        }

        // Extract timestamps
        const timestampRegex = new RegExp(this.patterns.timestamps.iso);
        while ((match = timestampRegex.exec(text)) !== null) {
            this.metadata.timestamps.push(match[0]);
        }

        // Extract code blocks
        const codeRegex = new RegExp(this.patterns.code.blocks);
        while ((match = codeRegex.exec(text)) !== null) {
            this.metadata.codeBlocks.push({
                language: match[1] || 'text',
                code: match[2].trim()
            });
        }

        // Extract tables
        const tableRegex = new RegExp(this.patterns.tables.markdown);
        while ((match = tableRegex.exec(text)) !== null) {
            this.metadata.tables.push(match[0]);
        }
    }

    /**
     * Extract cell references from text
     */
    extractCellReferences(text) {
        const cells = [];
        const regex = /Cell\s+([A-Z]+\d+)(?:\s*[:=]\s*(.+))?/gi;
        let match;

        while ((match = regex.exec(text)) !== null) {
            cells.push({
                cell: match[1],
                value: match[2] ? match[2].trim() : null
            });
        }

        return cells;
    }

    /**
     * Extract formulas from text
     */
    extractFormulas(text) {
        const formulas = [];
        const regex = /=\s*([A-Z]+\([^)]*\))/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            formulas.push(match[1]);
        }

        return formulas;
    }

    /**
     * Extract page numbers from text
     */
    extractPageNumbers(text) {
        const pages = [];
        const regex = /(?:page|pg\.?)\s*(\d+)/gi;
        let match;

        while ((match = regex.exec(text)) !== null) {
            pages.push(parseInt(match[1]));
        }

        return [...new Set(pages)]; // Remove duplicates
    }

    /**
     * Extract slide numbers from text
     */
    extractSlideNumbers(text) {
        const slides = [];
        const regex = /Slide\s+(\d+)(?:\s*[:]\s*(.+))?/gi;
        let match;

        while ((match = regex.exec(text)) !== null) {
            slides.push({
                number: parseInt(match[1]),
                title: match[2] ? match[2].trim() : null
            });
        }

        return slides;
    }

    /**
     * Parse table row
     */
    parseTableRow(row) {
        return row.split('|')
            .map(cell => cell.trim())
            .filter(cell => cell.length > 0);
    }

    /**
     * Clean content - remove extra whitespace
     */
    cleanContent(content) {
        return content
            .trim()
            .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
            .replace(/[ \t]+/g, ' '); // Single spaces
    }

    /**
     * Truncate content to max length
     */
    truncateContent(content) {
        if (content.length <= this.config.max_content_length) {
            return content;
        }
        return content.substring(0, this.config.max_content_length) + '...';
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
            'toc',
            'contents'
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
     * Add to existing flow data
     */
    addToFlow(existingData, inputText, outputText) {
        const newData = this.parseInteraction(inputText, outputText);

        const mergedData = {
            conversation_id: existingData.conversation_id || this.generateId(),
            created_at: existingData.created_at || new Date().toISOString(),
            nodes: [...(existingData.nodes || []), ...newData.nodes],
            edges: [...(existingData.edges || []), ...newData.edges],
            metadata: {
                ...existingData.metadata,
                ...newData.metadata
            }
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
            edges: [],
            metadata: {}
        };
    }

    /**
     * Get parser statistics
     */
    getStats() {
        return {
            enabled_patterns: Object.keys(this.config.enabled_patterns).filter(
                key => this.config.enabled_patterns[key]
            ),
            node_count: this.nodeIdCounter - 1,
            metadata_counts: {
                urls: this.metadata.urls.length,
                files: this.metadata.files.length,
                code_blocks: this.metadata.codeBlocks.length,
                tables: this.metadata.tables.length,
                timestamps: this.metadata.timestamps.length
            }
        };
    }
}

// Export for use in app.js
if (typeof window !== 'undefined') {
    window.ParserV2 = ParserV2;
}

// Node.js export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParserV2;
}
