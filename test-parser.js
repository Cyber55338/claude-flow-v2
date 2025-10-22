/**
 * Test Suite for Parser V2
 * Comprehensive testing for all skill patterns and edge cases
 */

// Import parser (for Node.js testing)
const ParserV2 = typeof require !== 'undefined' ? require('./parser-v2.js') : window.ParserV2;

class ParserTests {
    constructor() {
        this.parser = null;
        this.testResults = [];
        this.passCount = 0;
        this.failCount = 0;
    }

    /**
     * Run all tests
     */
    runAll() {
        console.log('=== Claude Flow Parser V2 Test Suite ===\n');

        this.testMetacognitiveFlow();
        this.testXLSXPatterns();
        this.testPDFPatterns();
        this.testPPTXPatterns();
        this.testDOCXPatterns();
        this.testCodeBlocks();
        this.testTables();
        this.testSections();
        this.testAnalysisPatterns();
        this.testMetadataExtraction();
        this.testEdgeCases();
        this.testConfiguration();
        this.testPerformance();

        this.printResults();
    }

    /**
     * Test metacognitive-flow patterns
     */
    testMetacognitiveFlow() {
        console.log('Testing Metacognitive Flow Patterns...');

        this.parser = new ParserV2();
        this.parser.resetIdCounter();

        const input = "Help me think through this";
        const output = `**Thought**: This problem requires systematic analysis.

**Emotion**: I feel confident about this approach.

**Imagination**: What if we approached it differently?

**Belief**: Based on evidence, this solution will work.

**Action**: Let's implement the solution step by step.`;

        const result = this.parser.parseInteraction(input, output);

        this.assert(
            result.nodes.filter(n => n.skill_name === 'metacognitive-flow').length === 5,
            'Should detect all 5 metacognitive nodes',
            result
        );

        this.assert(
            result.nodes.some(n => n.title === 'Thought'),
            'Should detect Thought node',
            result
        );

        this.assert(
            result.nodes.some(n => n.title === 'Action'),
            'Should detect Action node',
            result
        );
    }

    /**
     * Test XLSX/Spreadsheet patterns
     */
    testXLSXPatterns() {
        console.log('Testing XLSX Patterns...');

        this.parser = new ParserV2();
        this.parser.resetIdCounter();

        const input = "Create a budget spreadsheet";
        const output = `**Spreadsheet**: Creating a monthly budget tracker.

I'll set up the following:
- Cell A1: "Budget 2024"
- Cell B2: =SUM(B3:B10)
- Range A1:E20 for the main data

**Formula**: Using =AVERAGE(C2:C12) to calculate average expenses.`;

        const result = this.parser.parseInteraction(input, output);

        this.assert(
            result.nodes.filter(n => n.skill_name === 'xlsx').length >= 1,
            'Should detect XLSX skill usage',
            result
        );

        const xlsxNode = result.nodes.find(n => n.skill_name === 'xlsx');
        this.assert(
            xlsxNode && xlsxNode.cells && xlsxNode.cells.length > 0,
            'Should extract cell references',
            xlsxNode
        );

        this.assert(
            xlsxNode && xlsxNode.formulas && xlsxNode.formulas.length > 0,
            'Should extract formulas',
            xlsxNode
        );
    }

    /**
     * Test PDF patterns
     */
    testPDFPatterns() {
        console.log('Testing PDF Patterns...');

        this.parser = new ParserV2();
        this.parser.resetIdCounter();

        const input = "Extract data from PDF";
        const output = `**PDF**: Extracting content from the document.

I'll process pages 1, 3, and 5 to extract the key information.

**Extract**: Found relevant data on page 12.

**Merge**: Combining pages 1-10 into a single document.`;

        const result = this.parser.parseInteraction(input, output);

        this.assert(
            result.nodes.filter(n => n.skill_name === 'pdf').length >= 1,
            'Should detect PDF skill usage',
            result
        );

        const pdfNode = result.nodes.find(n => n.skill_name === 'pdf');
        this.assert(
            pdfNode && pdfNode.pages && pdfNode.pages.length > 0,
            'Should extract page numbers',
            pdfNode
        );
    }

    /**
     * Test PPTX patterns
     */
    testPPTXPatterns() {
        console.log('Testing PPTX Patterns...');

        this.parser = new ParserV2();
        this.parser.resetIdCounter();

        const input = "Create a presentation";
        const output = `**Presentation**: Creating a quarterly review deck.

**Slide 1**: Title slide with company branding
**Slide 2**: Executive Summary
**Slide 5**: Financial Results

Layout: Using the "Title and Content" layout for consistency.`;

        const result = this.parser.parseInteraction(input, output);

        this.assert(
            result.nodes.filter(n => n.skill_name === 'pptx').length >= 1,
            'Should detect PPTX skill usage',
            result
        );

        const pptxNode = result.nodes.find(n => n.skill_name === 'pptx');
        this.assert(
            pptxNode && pptxNode.slides && pptxNode.slides.length > 0,
            'Should extract slide numbers',
            pptxNode
        );
    }

    /**
     * Test DOCX patterns
     */
    testDOCXPatterns() {
        console.log('Testing DOCX Patterns...');

        this.parser = new ParserV2();
        this.parser.resetIdCounter();

        const input = "Edit the document";
        const output = `**Document**: Updating the project proposal.

**Heading**: Adding a new section titled "Implementation Timeline"

**Paragraph**: Inserting detailed project milestones.

**Tracked Change**: Modified the budget section to reflect new estimates.`;

        const result = this.parser.parseInteraction(input, output);

        this.assert(
            result.nodes.filter(n => n.skill_name === 'docx').length >= 1,
            'Should detect DOCX skill usage',
            result
        );
    }

    /**
     * Test code block detection
     */
    testCodeBlocks() {
        console.log('Testing Code Block Detection...');

        this.parser = new ParserV2();
        this.parser.resetIdCounter();

        const input = "Show me example code";
        const output = `Here's a JavaScript example:

\`\`\`javascript
function calculateTotal(items) {
    return items.reduce((sum, item) => sum + item.price, 0);
}
\`\`\`

And a Python version:

\`\`\`python
def calculate_total(items):
    return sum(item['price'] for item in items)
\`\`\``;

        const result = this.parser.parseInteraction(input, output);

        this.assert(
            result.nodes.filter(n => n.type === 'code').length === 2,
            'Should detect 2 code blocks',
            result
        );

        this.assert(
            result.nodes.some(n => n.language === 'javascript'),
            'Should detect JavaScript code',
            result
        );

        this.assert(
            result.nodes.some(n => n.language === 'python'),
            'Should detect Python code',
            result
        );

        this.assert(
            result.metadata.codeBlocks.length === 2,
            'Should extract code blocks to metadata',
            result.metadata
        );
    }

    /**
     * Test table detection
     */
    testTables() {
        console.log('Testing Table Detection...');

        this.parser = new ParserV2();
        this.parser.resetIdCounter();

        const input = "Show me the data";
        const output = `Here's the comparison:

| Feature | Plan A | Plan B | Plan C |
|---------|--------|--------|--------|
| Storage | 10GB   | 50GB   | 100GB  |
| Users   | 5      | 20     | 50     |
| Price   | $10    | $25    | $50    |

The table shows our pricing tiers.`;

        const result = this.parser.parseInteraction(input, output);

        this.assert(
            result.nodes.filter(n => n.type === 'table').length >= 1,
            'Should detect table',
            result
        );

        const tableNode = result.nodes.find(n => n.type === 'table');
        this.assert(
            tableNode && tableNode.headers && tableNode.headers.length === 4,
            'Should extract table headers',
            tableNode
        );

        this.assert(
            tableNode && tableNode.row_count === 3,
            'Should count table rows',
            tableNode
        );
    }

    /**
     * Test section detection
     */
    testSections() {
        console.log('Testing Section Detection...');

        this.parser = new ParserV2();
        this.parser.resetIdCounter();

        const input = "Explain the architecture";
        const output = `## System Overview

This is a distributed system with multiple components.

## Backend Architecture

The backend consists of microservices written in Go.

### Database Layer

We use PostgreSQL for persistent storage.

## Frontend Design

React-based single-page application.`;

        const result = this.parser.parseInteraction(input, output);

        this.assert(
            result.nodes.filter(n => n.type === 'section').length >= 3,
            'Should detect multiple sections',
            result
        );

        this.assert(
            result.nodes.some(n => n.level === 'h2'),
            'Should detect h2 headers',
            result
        );

        this.assert(
            result.nodes.some(n => n.level === 'h3'),
            'Should detect h3 headers',
            result
        );
    }

    /**
     * Test analysis patterns
     */
    testAnalysisPatterns() {
        console.log('Testing Analysis Patterns...');

        this.parser = new ParserV2();
        this.parser.resetIdCounter();

        const input = "Analyze this situation";
        const output = `**Analysis**: After reviewing the data, three key issues emerge.

**Summary**: The project is on track but needs resource adjustments.

**Recommendation**: I recommend increasing the development team size.

**Plan**: Execute the following steps over the next quarter.

**Findings**: Discovered performance bottlenecks in the database layer.`;

        const result = this.parser.parseInteraction(input, output);

        this.assert(
            result.nodes.filter(n => n.type === 'analysis').length >= 4,
            'Should detect multiple analysis patterns',
            result
        );

        this.assert(
            result.nodes.some(n => n.detected_type === 'recommendation'),
            'Should detect recommendation',
            result
        );

        this.assert(
            result.nodes.some(n => n.detected_type === 'findings'),
            'Should detect findings',
            result
        );
    }

    /**
     * Test metadata extraction
     */
    testMetadataExtraction() {
        console.log('Testing Metadata Extraction...');

        this.parser = new ParserV2();
        this.parser.resetIdCounter();

        const input = "Test metadata";
        const output = `Check out https://example.com for more info.

File located at /home/user/documents/report.pdf

Visit https://github.com/user/repo

Timestamp: 2024-10-22T14:30:00

\`\`\`bash
echo "Hello World"
\`\`\``;

        const result = this.parser.parseInteraction(input, output);

        this.assert(
            result.metadata.urls.length >= 2,
            'Should extract URLs',
            result.metadata
        );

        this.assert(
            result.metadata.files.length >= 1,
            'Should extract file paths',
            result.metadata
        );

        this.assert(
            result.metadata.timestamps.length >= 1,
            'Should extract timestamps',
            result.metadata
        );

        this.assert(
            result.metadata.codeBlocks.length >= 1,
            'Should extract code blocks',
            result.metadata
        );
    }

    /**
     * Test edge cases
     */
    testEdgeCases() {
        console.log('Testing Edge Cases...');

        this.parser = new ParserV2();

        // Test 1: Empty input
        let result = this.parser.parseInteraction("", "");
        this.assert(
            result.nodes.length >= 2, // input + output
            'Should handle empty input',
            result
        );

        // Test 2: Very long content
        this.parser.resetIdCounter();
        const longContent = "A".repeat(10000);
        result = this.parser.parseInteraction("test", longContent);
        this.assert(
            result.nodes.length >= 2,
            'Should handle very long content',
            result
        );

        // Test 3: Special characters
        this.parser.resetIdCounter();
        result = this.parser.parseInteraction(
            "Test <>&\"'",
            "Response with **bold** and `code` and [link](url)"
        );
        this.assert(
            result.nodes.length >= 2,
            'Should handle special characters',
            result
        );

        // Test 4: Nested patterns
        this.parser.resetIdCounter();
        const nested = `**Thought**: Consider this **Analysis**: nested pattern`;
        result = this.parser.parseInteraction("test", nested);
        this.assert(
            result.nodes.length >= 2,
            'Should handle nested patterns',
            result
        );

        // Test 5: Multiline content
        this.parser.resetIdCounter();
        const multiline = `**Thought**: This is a thought
that spans multiple lines
and continues here
until we reach another pattern.

**Action**: Now we take action.`;
        result = this.parser.parseInteraction("test", multiline);
        const thoughtNode = result.nodes.find(n => n.title === 'Thought');
        this.assert(
            thoughtNode && thoughtNode.content.includes('multiple lines'),
            'Should capture multiline content',
            thoughtNode
        );
    }

    /**
     * Test configuration loading
     */
    testConfiguration() {
        console.log('Testing Configuration...');

        // Test custom config
        const customConfig = {
            enabled_patterns: {
                metacognitive: true,
                xlsx: false,
                pdf: false,
                pptx: false,
                docx: false,
                code: true,
                tables: false,
                sections: false,
                analysis: false
            },
            max_content_length: 100
        };

        this.parser = new ParserV2(customConfig);

        this.assert(
            this.parser.config.enabled_patterns.xlsx === false,
            'Should apply custom config',
            this.parser.config
        );

        this.assert(
            this.parser.config.max_content_length === 100,
            'Should override default settings',
            this.parser.config
        );

        // Test that disabled patterns don't create nodes
        this.parser.resetIdCounter();
        const result = this.parser.parseInteraction(
            "test",
            "**Spreadsheet**: This should be ignored"
        );

        this.assert(
            result.nodes.filter(n => n.skill_name === 'xlsx').length === 0,
            'Should not detect disabled patterns',
            result
        );
    }

    /**
     * Test performance
     */
    testPerformance() {
        console.log('Testing Performance...');

        this.parser = new ParserV2();

        // Generate large test content
        const largeContent = `
**Thought**: First thought
**Emotion**: First emotion
**Action**: First action

## Section 1
Content for section 1 with multiple paragraphs and details.

\`\`\`javascript
function test1() { return 1; }
\`\`\`

## Section 2
More content here.

\`\`\`python
def test2(): return 2
\`\`\`

**Analysis**: Detailed analysis here.
**Summary**: Summary of findings.
**Recommendation**: Recommendations follow.

| Col1 | Col2 | Col3 |
|------|------|------|
| A    | B    | C    |
| D    | E    | F    |

`.repeat(10); // Repeat to make it large

        const startTime = Date.now();
        const result = this.parser.parseInteraction("Large test", largeContent);
        const endTime = Date.now();
        const duration = endTime - startTime;

        this.assert(
            duration < 5000, // Should complete in less than 5 seconds
            `Should process large content quickly (took ${duration}ms)`,
            { duration, nodeCount: result.nodes.length }
        );

        this.assert(
            result.nodes.length < 1000, // Reasonable limit
            'Should not create excessive nodes',
            { nodeCount: result.nodes.length }
        );
    }

    /**
     * Assert helper
     */
    assert(condition, message, data = null) {
        const result = {
            passed: condition,
            message: message,
            data: data
        };

        this.testResults.push(result);

        if (condition) {
            this.passCount++;
            console.log(`  ✓ ${message}`);
        } else {
            this.failCount++;
            console.log(`  ✗ ${message}`);
            if (data) {
                console.log('    Data:', JSON.stringify(data, null, 2));
            }
        }
    }

    /**
     * Print test results summary
     */
    printResults() {
        console.log('\n=== Test Results ===');
        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`Passed: ${this.passCount}`);
        console.log(`Failed: ${this.failCount}`);
        console.log(`Success Rate: ${((this.passCount / this.testResults.length) * 100).toFixed(1)}%`);

        if (this.failCount > 0) {
            console.log('\nFailed Tests:');
            this.testResults
                .filter(r => !r.passed)
                .forEach(r => console.log(`  - ${r.message}`));
        }

        return {
            total: this.testResults.length,
            passed: this.passCount,
            failed: this.failCount,
            successRate: (this.passCount / this.testResults.length) * 100
        };
    }
}

// Export for use in browser or Node.js
if (typeof window !== 'undefined') {
    window.ParserTests = ParserTests;
    window.runParserTests = () => {
        const tests = new ParserTests();
        return tests.runAll();
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ParserTests;
}

// Auto-run in Node.js
if (typeof require !== 'undefined' && require.main === module) {
    const tests = new ParserTests();
    tests.runAll();
    const results = tests.printResults();
    process.exit(results.failed > 0 ? 1 : 0);
}
