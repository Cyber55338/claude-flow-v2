# Skill Patterns Documentation

**Version:** 2.0.0
**Last Updated:** 2024-10-22

Complete guide to all detection patterns in Claude Flow Parser V2.

---

## Table of Contents

1. [Overview](#overview)
2. [Metacognitive Flow](#metacognitive-flow)
3. [XLSX/Spreadsheet Skills](#xlsxspreadsheet-skills)
4. [PDF Skills](#pdf-skills)
5. [PPTX/Presentation Skills](#pptxpresentation-skills)
6. [DOCX/Document Skills](#docxdocument-skills)
7. [Code Detection](#code-detection)
8. [Table Detection](#table-detection)
9. [Section Detection](#section-detection)
10. [Analysis Patterns](#analysis-patterns)
11. [Metadata Extraction](#metadata-extraction)
12. [Custom Patterns](#custom-patterns)
13. [Configuration Guide](#configuration-guide)

---

## Overview

The Parser V2 uses a priority-based pattern matching system to detect and extract structured content from Claude's responses. Each pattern type has specific indicators and extraction rules.

### Pattern Priority

Patterns are matched in this order (configurable):

1. Metacognitive-flow
2. XLSX
3. PDF
4. PPTX
5. DOCX
6. Code
7. Tables
8. Sections
9. Analysis

### Pattern Types

- **Skill Patterns**: Detect specific Claude Code skills in use
- **Content Patterns**: Extract structured content (code, tables)
- **Metadata Patterns**: Extract references (URLs, files, timestamps)

---

## Metacognitive Flow

### Pattern

```regex
\*\*(Thought|Emotion|Imagination|Belief|Action)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

### Indicators

- Bold keywords: Thought, Emotion, Imagination, Belief, Action
- Case insensitive matching

### Examples

```markdown
**Thought**: I need to break this problem down systematically.

**Emotion**: I'm feeling confident about this approach.

**Imagination**: What if we tried a completely different method?

**Belief**: Based on past experience, this will work well.

**Action**: Let's implement the solution step by step.
```

### Node Structure

```json
{
  "id": "node-1",
  "type": "skill",
  "skill_name": "metacognitive-flow",
  "title": "Thought",
  "content": "I need to break this problem down...",
  "full_content": "I need to break this problem down systematically.",
  "parent_id": "node-0",
  "timestamp": "2024-10-22T14:30:00.000Z"
}
```

### Configuration

```json
{
  "enabled_patterns": {
    "metacognitive": true
  }
}
```

---

## XLSX/Spreadsheet Skills

### Patterns

**Operations:**
```regex
\*\*(Spreadsheet|Excel|XLSX|Data Analysis|Formula|Chart|Pivot)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

**Cell References:**
```regex
Cell\s+([A-Z]+\d+)(?:\s*[:=]\s*(.+))?
```

**Formulas:**
```regex
=\s*([A-Z]+\([^)]*\))
```

**Ranges:**
```regex
([A-Z]+\d+:[A-Z]+\d+)
```

### Indicators

Keywords: spreadsheet, excel, xlsx, workbook, worksheet, cell, formula, pivot, chart

### Examples

```markdown
**Spreadsheet**: Creating a monthly budget tracker.

I'll set up the following:
- Cell A1: "Budget 2024"
- Cell B2: =SUM(B3:B10)
- Range A1:E20 for the main data

**Formula**: Using =AVERAGE(C2:C12) to calculate average expenses.

**Chart**: Adding a pie chart to visualize spending categories.
```

### Node Structure

```json
{
  "id": "node-2",
  "type": "skill",
  "skill_name": "xlsx",
  "title": "Spreadsheet",
  "content": "Creating a monthly budget tracker...",
  "full_content": "Creating a monthly budget tracker.\n\nI'll set up...",
  "cells": [
    {"cell": "A1", "value": "Budget 2024"},
    {"cell": "B2", "value": "=SUM(B3:B10)"}
  ],
  "formulas": ["SUM(B3:B10)", "AVERAGE(C2:C12)"],
  "parent_id": "node-0",
  "timestamp": "2024-10-22T14:30:00.000Z"
}
```

### Extracted Metadata

- Cell references with values
- Excel formulas
- Cell ranges
- Worksheet names

---

## PDF Skills

### Patterns

**Operations:**
```regex
\*\*(PDF|Extract|Merge|Split|Form|Annotation)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

**Page Numbers:**
```regex
(?:page|pg\.?)\s*(\d+)
```

### Indicators

Keywords: pdf, extract, merge, split, form field, annotation, page

### Examples

```markdown
**PDF**: Extracting content from the quarterly report.

I'll process pages 1, 3, and 5 to extract the key financial data.

**Extract**: Found the revenue table on page 12.

**Merge**: Combining pages 1-10 from Report A with pages 5-15 from Report B.

**Form**: Filling in the application form fields automatically.
```

### Node Structure

```json
{
  "id": "node-3",
  "type": "skill",
  "skill_name": "pdf",
  "title": "PDF",
  "content": "Extracting content from the quarterly...",
  "full_content": "Extracting content from the quarterly report...",
  "pages": [1, 3, 5, 12],
  "parent_id": "node-0",
  "timestamp": "2024-10-22T14:30:00.000Z"
}
```

### Extracted Metadata

- Page numbers referenced
- PDF operations performed
- Form fields mentioned

---

## PPTX/Presentation Skills

### Patterns

**Operations:**
```regex
\*\*(Presentation|Slide|Layout|PowerPoint|PPTX)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

**Slide Numbers:**
```regex
Slide\s+(\d+)(?:\s*[:]\s*(.+))?
```

**Layouts:**
```regex
Layout:\s*([^\n]+)
```

### Indicators

Keywords: presentation, powerpoint, pptx, slide, layout

### Examples

```markdown
**Presentation**: Creating a quarterly business review deck.

**Slide 1**: Title slide - "Q4 2024 Results"
**Slide 2**: Executive Summary with key metrics
**Slide 5**: Financial Performance - Revenue and Profit charts
**Slide 10**: Next Steps and Action Items

Layout: Using "Title and Content" layout for consistency across slides.
```

### Node Structure

```json
{
  "id": "node-4",
  "type": "skill",
  "skill_name": "pptx",
  "title": "Presentation",
  "content": "Creating a quarterly business review deck...",
  "full_content": "Creating a quarterly business review deck...",
  "slides": [
    {"number": 1, "title": "Title slide - \"Q4 2024 Results\""},
    {"number": 2, "title": "Executive Summary with key metrics"},
    {"number": 5, "title": "Financial Performance - Revenue and Profit charts"}
  ],
  "parent_id": "node-0",
  "timestamp": "2024-10-22T14:30:00.000Z"
}
```

### Extracted Metadata

- Slide numbers and titles
- Layout templates used
- Presentation structure

---

## DOCX/Document Skills

### Patterns

**Operations:**
```regex
\*\*(Document|DOCX|Word|Paragraph|Heading|Style)\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

**Tracked Changes:**
```regex
\*\*Track(?:ed)? Change\*\*:?\s*([^\n]+)
```

**Comments:**
```regex
\*\*Comment\*\*:?\s*([^\n]+)
```

### Indicators

Keywords: document, docx, word, paragraph, heading, tracked change, comment

### Examples

```markdown
**Document**: Updating the project proposal document.

**Heading**: Adding a new section titled "Implementation Timeline"

**Paragraph**: Inserting detailed project milestones with dates and deliverables.

**Tracked Change**: Modified the budget section to reflect updated estimates based on vendor quotes.

**Comment**: Note to review the technical requirements section with the engineering team.

**Style**: Applying the "Heading 2" style to all section titles for consistency.
```

### Node Structure

```json
{
  "id": "node-5",
  "type": "skill",
  "skill_name": "docx",
  "title": "Document",
  "content": "Updating the project proposal document...",
  "full_content": "Updating the project proposal document...",
  "parent_id": "node-0",
  "timestamp": "2024-10-22T14:30:00.000Z"
}
```

### Extracted Metadata

- Document operations
- Tracked changes
- Comments
- Style applications

---

## Code Detection

### Patterns

**Code Blocks:**
````regex
```(\w+)?\n([\s\S]*?)```
````

**Inline Code:**
```regex
`([^`]+)`
```

**Functions:**
```regex
(?:function|def|fn|func)\s+(\w+)
```

**Classes:**
```regex
(?:class|interface|struct)\s+(\w+)
```

### Indicators

- Triple backticks for code blocks
- Single backticks for inline code

### Examples

````markdown
Here's a JavaScript example:

```javascript
function calculateTotal(items) {
    return items.reduce((sum, item) => sum + item.price, 0);
}
```

And a Python version:

```python
def calculate_total(items):
    return sum(item['price'] for item in items)
```

You can also use inline code like `const x = 10;` within text.
````

### Node Structure

```json
{
  "id": "node-6",
  "type": "code",
  "language": "javascript",
  "title": "Code: javascript",
  "content": "function calculateTotal(items) {...",
  "full_content": "function calculateTotal(items) {\n    return items.reduce((sum, item) => sum + item.price, 0);\n}",
  "parent_id": "node-0",
  "timestamp": "2024-10-22T14:30:00.000Z"
}
```

### Supported Languages

JavaScript, Python, TypeScript, Java, C, C++, C#, Go, Rust, Ruby, PHP, Swift, Kotlin, SQL, HTML, CSS, Bash, Shell, PowerShell, and more.

---

## Table Detection

### Patterns

**Markdown Tables:**
```regex
(?:^\|.+\|$\n?)+
```

**Headers:**
```regex
^\|(.+)\|$
```

**Separator:**
```regex
^\|[\s:|-]+\|$
```

### Indicators

- Pipe-delimited rows
- Header separator line

### Examples

```markdown
Here's a comparison of our pricing plans:

| Feature    | Basic | Pro   | Enterprise |
|------------|-------|-------|------------|
| Storage    | 10GB  | 50GB  | Unlimited  |
| Users      | 5     | 20    | Unlimited  |
| Support    | Email | Phone | Dedicated  |
| Price/mo   | $10   | $25   | Custom     |

The table shows our three main pricing tiers.
```

### Node Structure

```json
{
  "id": "node-7",
  "type": "table",
  "title": "Data Table",
  "content": "| Feature | Basic | Pro | Enterprise |...",
  "full_content": "| Feature | Basic | Pro | Enterprise |\n|---------|-------|-----|------------|\n...",
  "headers": ["Feature", "Basic", "Pro", "Enterprise"],
  "row_count": 4,
  "parent_id": "node-0",
  "timestamp": "2024-10-22T14:30:00.000Z"
}
```

---

## Section Detection

### Patterns

**H2 Headers:**
```regex
^##\s+(.+)$
```

**H3 Headers:**
```regex
^###\s+(.+)$
```

**H4 Headers:**
```regex
^####\s+(.+)$
```

### Examples

```markdown
## System Architecture

The system consists of three main components: frontend, backend, and database.

### Frontend Layer

Built with React and TypeScript for a modern user experience.

### Backend Layer

Node.js microservices handling business logic.

#### API Gateway

Central entry point for all client requests.

## Deployment Strategy

Containerized deployment using Docker and Kubernetes.
```

### Node Structure

```json
{
  "id": "node-8",
  "type": "section",
  "level": "h2",
  "title": "System Architecture",
  "content": "The system consists of three main components...",
  "full_content": "The system consists of three main components: frontend, backend, and database.",
  "parent_id": "node-0",
  "timestamp": "2024-10-22T14:30:00.000Z"
}
```

### Common Headers (Skipped)

These headers are typically skipped as they're too generic:
- Introduction
- Conclusion
- Overview
- Table of Contents / TOC
- Contents

---

## Analysis Patterns

### Patterns

**Analysis:**
```regex
\*\*Analysis\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

**Summary:**
```regex
\*\*Summary\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

**Plan:**
```regex
\*\*Plan\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

**Recommendation:**
```regex
\*\*Recommendation\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

**Findings:**
```regex
\*\*Findings?\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

**Steps:**
```regex
\*\*Steps?\*\*:?\s*([^\n]+(?:\n(?!\*\*)[^\n]+)*)
```

### Examples

```markdown
**Analysis**: After reviewing the code, I've identified three key issues:
1. Memory leak in the event handler
2. Inefficient database queries
3. Missing error handling

**Summary**: The application needs optimization and better error handling.

**Recommendation**: Implement the following changes:
- Add connection pooling
- Implement proper error boundaries
- Add monitoring and logging

**Plan**: Execute improvements over 2 sprints:
- Sprint 1: Performance fixes
- Sprint 2: Error handling and monitoring

**Findings**: Performance tests show 40% improvement with caching.
```

### Node Structure

```json
{
  "id": "node-9",
  "type": "analysis",
  "detected_type": "recommendation",
  "title": "Recommendation",
  "content": "Implement the following changes...",
  "full_content": "Implement the following changes:\n- Add connection pooling\n- Implement proper error boundaries\n- Add monitoring and logging",
  "parent_id": "node-0",
  "timestamp": "2024-10-22T14:30:00.000Z"
}
```

---

## Metadata Extraction

### URL Extraction

**Pattern:**
```regex
https?:\/\/[^\s<>"{}|\\^`\[\]]+
```

**Markdown Links:**
```regex
\[([^\]]+)\]\(([^)]+)\)
```

**Example:**
```markdown
Visit https://example.com for documentation.
Check out [GitHub](https://github.com/user/repo) for the code.
```

### File Path Extraction

**Pattern:**
```regex
(?:\/[\w.-]+)+\.(\w+)|(?:\.?\/)?(?:[\w.-]+\/)+[\w.-]+\.(\w+)|~\/[\w./-]+
```

**Example:**
```markdown
File located at /home/user/documents/report.pdf
Config at ./config/settings.json
Home directory: ~/projects/app
```

### Timestamp Extraction

**ISO Format:**
```regex
\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}
```

**Human Readable:**
```regex
\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?
```

**Example:**
```markdown
Created at 2024-10-22T14:30:00
Meeting at 2:30 PM
```

### Metadata Structure

```json
{
  "metadata": {
    "urls": [
      "https://example.com",
      "https://github.com/user/repo"
    ],
    "files": [
      "/home/user/documents/report.pdf",
      "./config/settings.json"
    ],
    "codeBlocks": [
      {
        "language": "javascript",
        "code": "function test() { ... }"
      }
    ],
    "tables": [
      "| Header | Data |\n|--------|------|\n..."
    ],
    "timestamps": [
      "2024-10-22T14:30:00"
    ]
  }
}
```

---

## Custom Patterns

### Adding Custom Patterns

Edit `parser-config.json`:

```json
{
  "custom_patterns": {
    "enabled": true,
    "patterns": [
      {
        "name": "milestone",
        "description": "Project milestone tracking",
        "enabled": true,
        "regex": "\\*\\*Milestone\\*\\*:?\\s*([^\\n]+(?:\\n(?!\\*\\*)[^\\n]+)*)",
        "flags": "gi",
        "node_type": "custom",
        "skill_name": "project-tracker"
      }
    ]
  }
}
```

### Custom Pattern Structure

- **name**: Unique identifier for the pattern
- **description**: What the pattern matches
- **enabled**: Whether to use this pattern
- **regex**: Regular expression (double-escaped)
- **flags**: Regex flags (g, i, m, etc.)
- **node_type**: Type of node to create
- **skill_name**: Associated skill (optional)

### Example Usage

```javascript
// Load custom config
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./parser-config.json'));

// Create parser with config
const parser = new ParserV2(config);

// Parse with custom patterns
const result = parser.parseInteraction(
  "Track milestone",
  "**Milestone**: Completed Phase 1 development"
);
```

---

## Configuration Guide

### Loading Configuration

```javascript
// Method 1: Load from file
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./parser-config.json'));
const parser = new ParserV2(config);

// Method 2: Inline configuration
const parser = new ParserV2({
  enabled_patterns: {
    metacognitive: true,
    xlsx: true,
    code: true
  },
  max_content_length: 300
});

// Method 3: Update after creation
parser.loadConfig({
  extract_metadata: false
});
```

### Configuration Options

#### enabled_patterns

Enable/disable specific pattern types:

```json
{
  "enabled_patterns": {
    "metacognitive": true,
    "xlsx": true,
    "pdf": true,
    "pptx": true,
    "docx": true,
    "code": true,
    "tables": true,
    "sections": true,
    "analysis": true
  }
}
```

#### pattern_priority

Order in which patterns are matched:

```json
{
  "pattern_priority": [
    "metacognitive",
    "xlsx",
    "pdf",
    "pptx",
    "docx",
    "code",
    "tables",
    "sections",
    "analysis"
  ]
}
```

#### Content Limits

```json
{
  "max_content_length": 500,
  "min_content_length": 20
}
```

#### Feature Flags

```json
{
  "extract_metadata": true,
  "multiline_support": true
}
```

### Best Practices

1. **Disable Unused Patterns**: Better performance
2. **Adjust Priority**: Put most common patterns first
3. **Tune Content Limits**: Based on your use case
4. **Test Custom Patterns**: Use test-parser.js
5. **Document Changes**: Keep track of config modifications

### Performance Tuning

```json
{
  "performance": {
    "max_nodes_per_interaction": 100,
    "regex_timeout_ms": 5000,
    "cache_patterns": true
  }
}
```

---

## Pattern Testing

### Using the Test Suite

```bash
# Run all tests
node test-parser.js

# In browser
<script src="parser-v2.js"></script>
<script src="test-parser.js"></script>
<script>
  runParserTests();
</script>
```

### Writing Custom Tests

```javascript
const parser = new ParserV2();
parser.resetIdCounter();

const result = parser.parseInteraction(
  "Test input",
  "**YourPattern**: Your content here"
);

console.log('Nodes:', result.nodes);
console.log('Metadata:', result.metadata);
```

---

## Troubleshooting

### Pattern Not Detected

1. Check if pattern is enabled in config
2. Verify regex syntax
3. Check pattern priority order
4. Ensure content meets min_content_length
5. Test regex at regex101.com

### Content Truncated

- Increase `max_content_length` in config
- Access `full_content` field instead of `content`

### Duplicate Nodes

- Parser deduplicates based on type + title + content preview
- Check if content is identical

### Performance Issues

1. Disable unused patterns
2. Reduce max_nodes_per_interaction
3. Optimize custom regex patterns
4. Enable pattern caching

---

## Examples

### Complete Example

```javascript
const ParserV2 = require('./parser-v2.js');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync('./parser-config.json'));

// Create parser
const parser = new ParserV2(config);

// Sample conversation
const input = "Help me create a budget spreadsheet";
const output = `**Thought**: I'll create a comprehensive budget tracker.

**Spreadsheet**: Setting up the monthly budget workbook.

I'll create the following structure:
- Cell A1: "Monthly Budget 2024"
- Cell B2: =SUM(B3:B10) for total income
- Cell C2: =SUM(C3:C10) for total expenses

## Income Section

| Category | Amount |
|----------|--------|
| Salary   | $5000  |
| Bonus    | $500   |

\`\`\`javascript
// Budget calculation
function calculateBalance(income, expenses) {
  return income - expenses;
}
\`\`\`

**Summary**: Budget tracker is ready with formulas and visualizations.`;

// Parse interaction
const result = parser.parseInteraction(input, output);

// Display results
console.log('Nodes created:', result.nodes.length);
console.log('Skill nodes:', result.nodes.filter(n => n.type === 'skill').length);
console.log('Code blocks:', result.nodes.filter(n => n.type === 'code').length);
console.log('Tables:', result.nodes.filter(n => n.type === 'table').length);
console.log('Metadata:', result.metadata);

// Get stats
console.log('Parser stats:', parser.getStats());
```

---

## Version History

- **2.0.0** (2024-10-22): Initial enhanced parser with multi-skill support
- **1.0.0** (2024-10-21): Original parser with metacognitive-flow only

---

## Support

For issues or questions:
1. Check this documentation
2. Review test-parser.js for examples
3. Examine parser-config.json for options
4. Test patterns at regex101.com
5. Review parser-v2.js source code

---

**End of Documentation**
