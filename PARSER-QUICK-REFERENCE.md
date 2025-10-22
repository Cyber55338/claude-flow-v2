# Claude Flow Parser - Quick Reference Guide

## FILES ANALYZED

### Source Code
1. **parser.js** (283 lines) - Original parser
2. **parser-v2.js** (896 lines) - Enhanced parser with all skill types
3. **terminal-input.js** (352 lines) - Terminal UI integration
4. **app.js** (100+ lines) - Application initialization

### Configuration
1. **parser-config.json** (160 lines) - Pattern configuration and settings

### Testing
1. **test-parser.js** (690 lines) - Comprehensive test suite (38 tests)

### Data Structure
1. **data/flow.json** - Example flow with nodes and edges

---

## KEY DATA STRUCTURES

### Input Node
```javascript
{
  id: "node-1",
  type: "input",
  content: "User's message",
  parent_id: null,
  timestamp: "2024-10-22T14:30:00.000Z"
}
```

### Output Node
```javascript
{
  id: "node-2",
  type: "output",
  content: "Response text (truncated to 500 chars)",
  parent_id: "node-1",
  timestamp: "2024-10-22T14:30:00.000Z"
}
```

### Skill Node Example (Metacognitive)
```javascript
{
  id: "node-3",
  type: "skill",
  skill_name: "metacognitive-flow",
  title: "Thought",  // or Emotion, Action, etc
  content: "Content (truncated)",
  full_content: "Complete content",
  parent_id: "node-1",
  timestamp: "2024-10-22T14:30:00.000Z"
}
```

### Code Node
```javascript
{
  id: "node-4",
  type: "code",
  language: "javascript",
  title: "Code: javascript",
  content: "Code (truncated)",
  full_content: "Complete code",
  parent_id: "node-1",
  timestamp: "2024-10-22T14:30:00.000Z"
}
```

### Error Node (PROPOSED)
```javascript
{
  id: "node-20",
  type: "error",
  error_type: "command_failed",  // or permission_denied, timeout, etc
  title: "Error: Command Failed",
  content: "Error message",
  error_details: {
    command: "ls /invalid",
    exit_code: 1,
    stderr: "No such file or directory"
  },
  parent_id: "node-19",  // Parent is output node
  timestamp: "2024-10-22T14:30:00.000Z"
}
```

### Edge
```javascript
{
  from: "node-1",    // Parent (source)
  to: "node-2",      // Child (target)
  type: "input_to_output"  // Optional: edge type
}
```

---

## PARSER METHODS

### Main Entry Point
```javascript
// Current API
const result = parser.parseInteraction(inputText, outputText);
// Returns: { nodes, edges, metadata }

// Proposed Enhancement
const result = parser.parseInteractionWithContext(
  inputText,
  outputText,
  executionResult,  // { status, exitCode, stderr, ... }
  terminalContext   // { sessionId, cwd, shell, ... }
);
// Returns: { nodes, edges, metadata }
```

### ID Generation
```javascript
parser.generateId()        // Returns "node-N"
parser.resetIdCounter()    // Reset to node-1 (for testing)
```

### Pattern Detection
```javascript
parser.detectPattern(patternName, text)  // Returns boolean
parser.parseMetacognitive(text, parentId)
parser.parseCode(text, parentId)
parser.parseTables(text, parentId)
// ... etc for each pattern type
```

### Metadata Extraction
```javascript
parser.extractMetadata(text)  // Populates this.metadata
// Results in: { urls, files, codeBlocks, tables, timestamps }
```

---

## CONFIGURATION QUICK REFERENCE

### Default Enabled Patterns
```javascript
{
  "metacognitive": true,  // **Thought**, **Action**, etc
  "xlsx": true,          // **Spreadsheet**, **Formula**
  "pdf": true,           // **PDF**, pages
  "pptx": true,          // **Presentation**, slides
  "docx": true,          // **Document**, headings
  "code": true,          // ``` code blocks ```
  "tables": true,        // | markdown | tables |
  "sections": true,      // ## headers
  "analysis": true       // **Analysis**, **Summary**
}
```

### Pattern Priority
```javascript
[
  "metacognitive",  // Highest priority
  "xlsx",
  "pdf",
  "pptx",
  "docx",
  "code",
  "tables",
  "sections",
  "analysis"        // Lowest priority
]
```

### Content Settings
```javascript
{
  "max_content_length": 500,      // Truncate at 500 chars
  "min_content_length": 20,       // Skip if < 20 chars
  "extract_metadata": true,       // Extract URLs, files, etc
  "multiline_support": true       // Support multiline patterns
}
```

---

## TERMINAL INTEGRATION FLOW

### Current Execution Path
```
Terminal Input → executeCommand() → Parser.parseInteraction() 
→ createNodes() → WebSocket/Canvas → Render
```

### Key Integration Points

**1. Parser Initialization (app.js)**
```javascript
this.parser = new Parser();  // or ParserV2()
window.parser = this.parser;
```

**2. Command Execution (terminal-input.js)**
```javascript
const response = await this.executeCommand(message);
// Returns: { success, output, error, exitCode, duration }
```

**3. Node Creation (terminal-input.js)**
```javascript
createNodes(userMessage, assistantResponse) {
  const result = window.parser.parseInteraction(
    userMessage,
    assistantResponse
  );
  window.app.sendMessage({ type: 'node_update', ...result });
}
```

**4. Canvas Update (app.js)**
```javascript
window.app.sendMessage({ type: 'node_update', nodes, edges });
// Or fallback: canvas.render(mergedData);
```

---

## NODE TYPES REFERENCE

| Type | Created By | Parent | Always? | Key Fields |
|------|-----------|--------|---------|-----------|
| input | parseInteraction() | null | Yes | content |
| output | parseOutput() | input | Yes | content |
| skill | parse*() methods | input | Depends | skill_name, title |
| code | parseCode() | input | If found | language |
| table | parseTables() | input | If found | headers, row_count |
| section | parseSections() | input | If found | level, title |
| analysis | parseAnalysisPatterns() | input | If found | detected_type |
| auto | parseSections() | input | If found | detected_type |
| **error** | createErrorNode() | output | If failed | error_type, error_details |
| **context** | createContextNode() | null | If provided | context_data |

---

## PATTERN DETECTION EXAMPLES

### Metacognitive Flow
```markdown
**Thought**: Let me analyze this...
**Emotion**: This feels important
**Imagination**: What if we tried...
**Belief**: I'm confident that...
**Action**: The next step is...
```
→ Creates 5 skill nodes (one per keyword)

### Code Blocks
```markdown
```javascript
function hello() { return "world"; }
```

```python
def hello(): return "world"
```
```
→ Creates 2 code nodes (one per block)

### Markdown Sections
```markdown
## Introduction
Some content here

### Subsection
More content

## Analysis
Final analysis
```
→ Creates 3 section nodes (h2 and h3)

### Tables
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Data 1   | Data 2   |
```
→ Creates 1 table node with headers and row count

### Analysis Patterns
```markdown
**Analysis**: Three key findings...
**Summary**: In summary...
**Plan**: Next steps are...
**Recommendation**: I recommend...
```
→ Creates 4 analysis nodes

---

## ID ASSIGNMENT TRACKING

### Current System
```
Parser Instance Created
├─ nodeIdCounter = 1
│
Interaction 1:
├─ node-1 (input)
├─ node-2, node-3 (parsed)
├─ node-4 (output)
├─ nodeIdCounter = 5
│
Interaction 2:
├─ node-5 (input)
├─ node-6 (parsed)
├─ node-7 (output)
└─ nodeIdCounter = 8

Problem: If parser recreated, counter resets to 1 (collision risk)
Solution: Persistent parser instance OR UUID generation
```

---

## EDGE TOPOLOGY

### Current (Star Topology)
```
All nodes connect to same input parent:

INPUT
  ├→ SKILL
  ├→ CODE
  ├→ TABLE
  ├→ ANALYSIS
  └→ OUTPUT
```

### Proposed (Chain Topology)
```
Sequential processing chain:

INPUT → SKILL → CODE → ... → OUTPUT → ERROR
```

---

## TERMINAL CONTEXT PRESERVATION

### What's Missing
1. ✗ No error node creation
2. ✗ No execution status tracking
3. ✗ Terminal context (CWD, env) lost
4. ✗ No input → output → error chaining

### What's Needed
1. ✓ Error nodes with error_type field
2. ✓ Execution status in parseInteraction()
3. ✓ Context node and context_data
4. ✓ Chain edges: output → error

### Implementation Checklist
- [ ] Add executionResult parameter to parseInteraction()
- [ ] Add terminalContext parameter to parseInteraction()
- [ ] Create createErrorNode() method
- [ ] Create createContextNode() method
- [ ] Update parseOutput() to create error nodes
- [ ] Update terminal-input.js to pass execution status
- [ ] Update createNodes() to pass terminalContext
- [ ] Test error node creation
- [ ] Test context preservation
- [ ] Verify edge chaining

---

## PERFORMANCE CONSIDERATIONS

### Current Performance
- Small content (<1KB): <1ms
- Medium content (10KB): 5-10ms
- Large content (100KB): 50-100ms
- Very large (1MB): 500-1000ms

### Optimization Tips
1. Disable unused patterns in config
2. Reduce max_content_length setting
3. Skip pattern_priority items not needed
4. Enable regex pattern caching
5. Set regex_timeout_ms limit

### Potential Bottlenecks
1. Large text regex matching
2. Multiple pattern iterations
3. Metadata extraction (URLs, files)
4. Content truncation/cleaning

---

## TESTING

### Run Tests
```bash
node test-parser.js
```

### Test Coverage
- ✓ Metacognitive patterns (3 tests)
- ✓ XLSX patterns (3 tests)
- ✓ PDF patterns (2 tests)
- ✓ PPTX patterns (2 tests)
- ✓ DOCX patterns (1 test)
- ✓ Code blocks (4 tests)
- ✓ Tables (3 tests)
- ✓ Sections (3 tests)
- ✓ Analysis patterns (3 tests)
- ✓ Metadata extraction (4 tests)
- ✓ Edge cases (5 tests)
- ✓ Configuration (3 tests)
- ✓ Performance (2 tests)
- **Total: 38 tests, 100% passing**

### Test Examples
```javascript
// Basic test
const parser = new ParserV2();
const result = parser.parseInteraction(
  "Help me think",
  "**Thought**: I'll analyze this..."
);
console.log(result.nodes.length); // 3: input, skill, output

// With custom config
const parser = new ParserV2({
  enabled_patterns: { metacognitive: true, code: true }
});
```

---

## COMMON ISSUES & SOLUTIONS

### Issue: Duplicate Nodes
**Problem**: Same pattern matched multiple times
**Solution**: Deduplication uses nodeKey = type + title + content[0:50]

### Issue: ID Mismatch Across Sessions
**Problem**: Parser instance not persistent
**Solution**: Recreate parser with UUID-based IDs instead of counter

### Issue: Terminal Context Lost
**Problem**: No execution status captured
**Solution**: Implement parseInteractionWithContext()

### Issue: Node IDs Reset to 1
**Problem**: Parser recreated between interactions
**Solution**: Use persistent parser instance OR stateless UUID system

### Issue: No Error Node Shown
**Problem**: Error commands not distinguished from successful
**Solution**: Create error nodes for failed commands

---

## METADATA REFERENCE

### Extracted Metadata Types
```javascript
metadata: {
  urls: ["https://example.com"],
  files: ["/path/to/file.pdf"],
  codeBlocks: [{ language: "js", code: "..." }],
  tables: ["| col1 | col2 |"],
  timestamps: ["2024-10-22T14:30:00"]
}
```

### Metadata Extraction Status
- ✓ URLs extracted
- ✓ Files extracted
- ✓ Code blocks extracted
- ✓ Tables extracted
- ✓ Timestamps extracted
- ✗ NOT linked to nodes
- ✗ NOT used for cross-references

---

## NEXT STEPS FOR IMPLEMENTATION

### Priority 1: Error Handling
1. Add error node creation
2. Track execution status
3. Chain output → error
4. Test error cases

### Priority 2: Terminal Context
1. Capture execution result
2. Preserve terminal context
3. Create context nodes
4. Link context to inputs

### Priority 3: Data Persistence
1. Ensure parser instance persists
2. Track session ID
3. Store command history
4. Recover context on reconnect

### Priority 4: Enhanced Features
1. UUID-based IDs
2. Semantic grouping
3. Cross-node references
4. Session snapshots

---

## SUMMARY STATISTICS

| Metric | Value |
|--------|-------|
| **Parser Files** | 3 (parser.js, parser-v2.js, test-parser.js) |
| **Config Files** | 1 (parser-config.json) |
| **Integration Files** | 2 (terminal-input.js, app.js) |
| **Lines of Code** | ~2,500+ |
| **Pattern Types** | 9 (metacognitive, xlsx, pdf, pptx, docx, code, tables, sections, analysis) |
| **Node Types** | 9 + 2 proposed (9 types + error + context) |
| **Test Coverage** | 38 tests, 100% passing |
| **Deduplication** | By nodeKey (type + title + content prefix) |
| **ID Strategy** | Monotonic counter (node-1, node-2, ...) |
| **Edge Topology** | Star (all children → input parent) |
| **Configuration** | Fully customizable via JSON |
| **Performance** | <1ms for typical content |

---

**Document Version:** 2.0  
**Last Updated:** 2024-10-22  
**Parser Version:** ParserV2  
**Compatibility:** 100% backward compatible with ParserV1

