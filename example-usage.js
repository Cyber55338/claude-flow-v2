/**
 * Example Usage of Parser V2
 *
 * This file demonstrates various ways to use the enhanced parser
 * for different Claude Code skills.
 */

// For Node.js
const ParserV2 = typeof require !== 'undefined' ? require('./parser-v2.js') : window.ParserV2;

console.log('=== Parser V2 Example Usage ===\n');

// Example 1: Basic Metacognitive Flow
console.log('1. Metacognitive Flow Example:');
console.log('─'.repeat(50));

const parser1 = new ParserV2();
parser1.resetIdCounter();

const result1 = parser1.parseInteraction(
    "Help me think through this problem",
    `**Thought**: I should break this down into smaller steps.

**Emotion**: I'm feeling confident about finding a solution.

**Imagination**: What if we approached it from a different angle?

**Belief**: Based on similar problems, this approach should work.

**Action**: Let's start by identifying the core requirements.`
);

console.log(`Nodes created: ${result1.nodes.length}`);
console.log(`Metacognitive nodes: ${result1.nodes.filter(n => n.skill_name === 'metacognitive-flow').length}`);
result1.nodes.filter(n => n.skill_name === 'metacognitive-flow').forEach(n => {
    console.log(`  - ${n.title}: ${n.content.substring(0, 60)}...`);
});
console.log();

// Example 2: XLSX/Spreadsheet
console.log('2. XLSX/Spreadsheet Example:');
console.log('─'.repeat(50));

const parser2 = new ParserV2();
parser2.resetIdCounter();

const result2 = parser2.parseInteraction(
    "Create a budget spreadsheet",
    `**Spreadsheet**: I'll create a monthly budget tracker for you.

Here's the structure:

- Cell A1: "Monthly Budget 2024"
- Cell B1: "Income"
- Cell C1: "Expenses"
- Cell B2: =SUM(B3:B10) for total income
- Cell C2: =SUM(C3:C10) for total expenses
- Cell D2: =B2-C2 for balance

**Formula**: The budget balance uses =AVERAGE(D2:D13) to show monthly average.

I'll also add a chart to visualize spending patterns.`
);

const xlsxNode = result2.nodes.find(n => n.skill_name === 'xlsx');
console.log(`XLSX node detected: ${xlsxNode ? 'Yes' : 'No'}`);
if (xlsxNode) {
    console.log(`Cells found: ${xlsxNode.cells.length}`);
    console.log(`Formulas found: ${xlsxNode.formulas.length}`);
    xlsxNode.cells.slice(0, 3).forEach(cell => {
        console.log(`  - ${cell.cell}: ${cell.value || 'N/A'}`);
    });
}
console.log();

// Example 3: Code and Table Detection
console.log('3. Code and Table Detection:');
console.log('─'.repeat(50));

const parser3 = new ParserV2();
parser3.resetIdCounter();

const result3 = parser3.parseInteraction(
    "Show me a comparison",
    `Here's a JavaScript implementation:

\`\`\`javascript
function calculatePrice(quantity, unitPrice, discount = 0) {
    const subtotal = quantity * unitPrice;
    const discountAmount = subtotal * discount;
    return subtotal - discountAmount;
}
\`\`\`

And here's the pricing table:

| Quantity | Unit Price | Discount | Total  |
|----------|------------|----------|--------|
| 1-10     | $10.00     | 0%       | $10.00 |
| 11-50    | $10.00     | 10%      | $9.00  |
| 51+      | $10.00     | 20%      | $8.00  |

The code above implements the pricing logic from the table.`
);

const codeNodes = result3.nodes.filter(n => n.type === 'code');
const tableNodes = result3.nodes.filter(n => n.type === 'table');

console.log(`Code blocks: ${codeNodes.length}`);
codeNodes.forEach(node => {
    console.log(`  - Language: ${node.language}`);
});
console.log(`Tables: ${tableNodes.length}`);
tableNodes.forEach(node => {
    console.log(`  - Headers: ${node.headers.join(', ')}`);
    console.log(`  - Rows: ${node.row_count}`);
});
console.log();

// Example 4: Multiple Skills Combined
console.log('4. Multiple Skills Combined:');
console.log('─'.repeat(50));

const parser4 = new ParserV2();
parser4.resetIdCounter();

const result4 = parser4.parseInteraction(
    "Analyze this data and create a presentation",
    `**Thought**: I'll analyze the sales data and create a comprehensive presentation.

**Analysis**: The sales data shows three key trends:
1. Revenue increased 25% year-over-year
2. Customer acquisition cost decreased by 15%
3. Retention rate improved to 92%

**Spreadsheet**: Creating the analysis workbook:
- Cell A1: "Sales Analysis Q4 2024"
- Cell B5: =GROWTH(B2:B4) for trend projection
- Range A1:E20 contains the raw data

**Presentation**: I'll create a 10-slide deck:

**Slide 1**: Title - "Q4 2024 Sales Review"
**Slide 2**: Executive Summary
**Slide 3**: Revenue Trends with charts
**Slide 5**: Customer Metrics

## Summary

**Summary**: Strong performance across all metrics with room for continued growth.

**Recommendation**: Focus on scaling customer acquisition while maintaining retention.`
);

console.log(`Total nodes: ${result4.nodes.length}`);
console.log('Node types:');
const nodeTypes = {};
result4.nodes.forEach(n => {
    const key = n.skill_name || n.type;
    nodeTypes[key] = (nodeTypes[key] || 0) + 1;
});
Object.entries(nodeTypes).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
});
console.log();

// Example 5: Custom Configuration
console.log('5. Custom Configuration:');
console.log('─'.repeat(50));

const customConfig = {
    enabled_patterns: {
        metacognitive: true,
        code: true,
        analysis: true,
        // Disable document-focused patterns for this use case
        xlsx: false,
        pdf: false,
        pptx: false,
        docx: false,
        tables: false,
        sections: false
    },
    max_content_length: 200,
    extract_metadata: true
};

const parser5 = new ParserV2(customConfig);
parser5.resetIdCounter();

const result5 = parser5.parseInteraction(
    "Code review please",
    `**Analysis**: This code has several issues to address.

\`\`\`javascript
// Current implementation
function processData(data) {
    for (let i = 0; i < data.length; i++) {
        console.log(data[i]);
    }
}
\`\`\`

**Recommendation**: Use array methods for better readability:

\`\`\`javascript
// Improved version
function processData(data) {
    data.forEach(item => console.log(item));
}
\`\`\`

Check the documentation at https://developer.mozilla.org/en-US/docs/Web/JavaScript

**Summary**: Refactored for modern JavaScript practices.`
);

console.log(`Nodes with custom config: ${result5.nodes.length}`);
console.log(`Metadata extracted:`);
console.log(`  - URLs: ${result5.metadata.urls.length}`);
console.log(`  - Code blocks: ${result5.metadata.codeBlocks.length}`);
result5.metadata.urls.forEach(url => {
    console.log(`    ${url}`);
});
console.log();

// Example 6: Metadata Extraction
console.log('6. Metadata Extraction:');
console.log('─'.repeat(50));

const parser6 = new ParserV2();
parser6.resetIdCounter();

const result6 = parser6.parseInteraction(
    "Process these files",
    `I'll process the following files:

- /home/user/documents/report.pdf
- ./config/settings.json
- ~/projects/app/src/main.js

Visit https://github.com/user/repo for the source code.

The files were created at 2024-10-22T14:30:00.

\`\`\`bash
ls -la /home/user/documents/
\`\`\`

Documentation: https://example.com/docs`
);

console.log(`Metadata extracted:`);
console.log(`  - URLs: ${result6.metadata.urls.length}`);
result6.metadata.urls.forEach(url => console.log(`    ${url}`));
console.log(`  - Files: ${result6.metadata.files.length}`);
result6.metadata.files.forEach(file => console.log(`    ${file}`));
console.log(`  - Timestamps: ${result6.metadata.timestamps.length}`);
result6.metadata.timestamps.forEach(ts => console.log(`    ${ts}`));
console.log(`  - Code blocks: ${result6.metadata.codeBlocks.length}`);
result6.metadata.codeBlocks.forEach(cb => console.log(`    ${cb.language}`));
console.log();

// Example 7: Performance Stats
console.log('7. Parser Statistics:');
console.log('─'.repeat(50));

const stats = parser6.getStats();
console.log(`Enabled patterns: ${stats.enabled_patterns.join(', ')}`);
console.log(`Nodes created: ${stats.node_count}`);
console.log(`Metadata counts:`, stats.metadata_counts);
console.log();

console.log('=== Examples Complete ===');

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        result1,
        result2,
        result3,
        result4,
        result5,
        result6
    };
}
