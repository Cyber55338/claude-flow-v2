# Claude Flow Parser System - Visual Diagrams & Architecture

## DIAGRAM 1: Complete Parser Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER TYPES COMMAND                                 │
│                     (in Terminal Input Widget)                              │
└──────────────────────────────┬──────────────────────────────────────────────┘
                               │
                               v
                    ┌──────────────────────┐
                    │ sendMessage()        │
                    │ - User input added   │
                    │   to terminal UI     │
                    │ - Clear input field  │
                    └──────────┬───────────┘
                               │
                               v
                    ┌──────────────────────────────┐
                    │ processMessage()             │
                    │ - Check for special commands │
                    │   (/help, /clear, /status)  │
                    │ - Or execute via server      │
                    └──────────┬───────────────────┘
                               │
                               v
                    ┌──────────────────────────────┐
                    │ executeCommand()             │
                    │ POST to /api/execute         │
                    │ { command, type: 'shell' }   │
                    └──────────┬───────────────────┘
                               │
                               v
                    ┌──────────────────────────────┐
                    │ Server processes command     │
                    │ - Execute in shell           │
                    │ - Capture stdout/stderr      │
                    │ - Track exit code            │
                    │ - Measure duration           │
                    └──────────┬───────────────────┘
                               │
                               v
                    ┌──────────────────────────────┐
                    │ Response returned:           │
                    │ {                            │
                    │   success: boolean,          │
                    │   output: string,            │
                    │   error: string,             │
                    │   exitCode: number,          │
                    │   duration: number           │
                    │ }                            │
                    └──────────┬───────────────────┘
                               │
                               v
                    ┌──────────────────────────────┐
                    │ addToTerminal()              │
                    │ - Display response           │
                    │ - Format output (markdown)   │
                    │ - Add timestamps             │
                    └──────────┬───────────────────┘
                               │
                               v
                    ┌──────────────────────────────┐
                    │ createNodes()                │
                    │ - Prepare execution context  │
                    │ - Call parser.parseInteraction│
                    └──────────┬───────────────────┘
                               │
                  ┌────────────┴────────────┐
                  │                        │
                  v                        v
        ┌──────────────────┐    ┌───────────────────┐
        │ Parser Instance  │    │ Window.parser or  │
        │ Available as:    │    │ window.ParserV2   │
        │ - window.parser  │    │                   │
        │ - app.parser     │    │ Config loaded from│
        │                  │    │ parser-config.json│
        └─────────┬────────┘    └──────────┬────────┘
                  │                        │
                  └────────────┬───────────┘
                               │
                               v
         ┌─────────────────────────────────────────────┐
         │         PARSEINTERACTION() CALLED           │
         │    (Main entry point to parser system)      │
         └──────────────────┬────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        v                   v                   v
    ┌────────────┐   ┌──────────────┐   ┌──────────────┐
    │ Step 1:    │   │ Step 2:      │   │ Step 3:      │
    │ Create     │   │ Extract      │   │ Parse        │
    │ Input Node │   │ Metadata     │   │ Output       │
    │            │   │              │   │              │
    │ id: node-1 │   │ URLs         │   │ Patterns:    │
    │ type:input │   │ Files        │   │ 1. Metacog   │
    │ parent:null│   │ Code blocks  │   │ 2. XLSX      │
    │ content:   │   │ Tables       │   │ 3. PDF       │
    │  message   │   │ Timestamps   │   │ 4. PPTX      │
    │            │   │ Store in:    │   │ 5. DOCX      │
    │            │   │ metadata{}   │   │ 6. Code      │
    └────────────┘   └──────────────┘   │ 7. Tables    │
        │                │                │ 8. Sections │
        │                │                │ 9. Analysis │
        │                │                │              │
        │                │                │ + Create     │
        │                │                │   output node│
        │                └────────────────┼──────────────┘
        │                                 │
        └─────────────────┬───────────────┘
                          │
                          v
          ┌───────────────────────────────────┐
          │ RETURN FROM PARSEINTERACTION()    │
          │                                   │
          │ {                                 │
          │   nodes: [                        │
          │     { id: node-1, type: input },  │
          │     { id: node-2, type: skill },  │
          │     { id: node-3, type: code },   │
          │     { id: node-4, type: output }  │
          │   ],                              │
          │   edges: [                        │
          │     { from: node-1, to: node-2 }, │
          │     { from: node-1, to: node-3 }, │
          │     { from: node-1, to: node-4 }  │
          │   ],                              │
          │   metadata: {                     │
          │     urls: [...],                  │
          │     files: [...],                 │
          │     ...                           │
          │   }                               │
          │ }                                 │
          └────────────┬──────────────────┘
                       │
           ┌───────────┴───────────┐
           │                       │
           v                       v
      ┌──────────────┐      ┌────────────────┐
      │ WebSocket    │      │ Fallback:      │
      │ Available?   │      │ Canvas update  │
      │              │      │ directly       │
      │ YES: Send    │      │                │
      │ node_update  │      │ Merge with     │
      │ message      │      │ existing data  │
      │              │      │                │
      │ NO: Fallback │      │ canvas.render()│
      └────────┬─────┘      └────────┬───────┘
               │                     │
               └──────────┬──────────┘
                          │
                          v
          ┌───────────────────────────────────┐
          │ Canvas receives node update        │
          │ - Update internal data store       │
          │ - Re-render SVG visualization      │
          │ - Display nodes and edges          │
          │ - Apply force-directed layout      │
          └───────────────────────────────────┘
```

---

## DIAGRAM 2: Node Type Distribution & Creation

```
NODES CREATED FROM SINGLE INTERACTION

INPUT: "Show me a code example"
OUTPUT: "Here's JavaScript and Python code..."

Result Structure:
─────────────────

node-1 (INPUT)
├─ type: 'input'
├─ content: "Show me a code example"
└─ parent_id: null

node-2 (SKILL - Metacognitive Check)
├─ type: 'skill'
├─ skill_name: 'metacognitive-flow'
├─ title: 'Thought'
├─ parent_id: node-1
└─ [ONLY IF output contains **Thought**, **Action**, etc]

node-3 (CODE - JavaScript)
├─ type: 'code'
├─ language: 'javascript'
├─ title: 'Code: javascript'
├─ content: 'function hello() {..}'
└─ parent_id: node-1

node-4 (CODE - Python)
├─ type: 'code'
├─ language: 'python'
├─ title: 'Code: python'
├─ content: 'def hello(): ...'
└─ parent_id: node-1

node-5 (OUTPUT)
├─ type: 'output'
├─ content: '[Full response from Claude]'
└─ parent_id: node-1

EDGES CREATED:
──────────────
node-1 → node-2  (if metacognitive detected)
node-1 → node-3  (JavaScript code block)
node-1 → node-4  (Python code block)
node-1 → node-5  (Always - output node)

VISUALIZATION (STAR TOPOLOGY):
──────────────────────────────

             ┌─────────┐
             │ node-2  │
             │ SKILL   │
             └────▲────┘
                  │
    ┌─────────┐   │   ┌─────────┐
    │ node-3  │   │   │ node-4  │
    │CODE(JS) ├───┼───┤CODE(Py) │
    └────▲────┘   │   └─────────┘
         │        │
         │     ┌──┴──┐
         └─────┤node1 ├─────┐
              │INPUT│  │
              └─────┘  │
                       v
                  ┌────────┐
                  │ node-5 │
                  │ OUTPUT │
                  └────────┘
```

---

## DIAGRAM 3: Parser ID Assignment Across Interactions

```
SESSION LIFETIME ID ASSIGNMENT
──────────────────────────────

Parser Instance Created:
┌────────────────────────┐
│ nodeIdCounter = 1      │
└──────────┬─────────────┘
           │

INTERACTION 1:
────────────
User: "Explain the concept"
┌─────────────────────────────────┐
│ parseInteraction()              │
│                                 │
│ node-1 ← input node             │
│ node-2 ← skill (Thought)        │
│ node-3 ← skill (Emotion)        │
│ node-4 ← skill (Action)         │
│ node-5 ← output node            │
│                                 │
│ Counter: 1 → 2 → 3 → 4 → 5 → 6 │
└─────────────────────────────────┘
           │
           v

INTERACTION 2:
────────────
User: "Give me code"
┌─────────────────────────────────┐
│ parseInteraction()              │
│                                 │
│ node-6  ← input node (counter=6)│
│ node-7  ← code (JavaScript)     │
│ node-8  ← code (Python)         │
│ node-9  ← output node           │
│                                 │
│ Counter: 6 → 7 → 8 → 9 → 10    │
└─────────────────────────────────┘
           │
           v

INTERACTION 3:
────────────
User: "Create a table"
┌─────────────────────────────────┐
│ parseInteraction()              │
│                                 │
│ node-10 ← input node (counter=10)
│ node-11 ← table node            │
│ node-12 ← output node           │
│                                 │
│ Counter: 10 → 11 → 12 → 13     │
└─────────────────────────────────┘

FULL FLOW.JSON:
───────────────
{
  "conversation_id": "conv-001",
  "nodes": [
    { id: "node-1",  type: "input" },
    { id: "node-2",  type: "skill" },
    { id: "node-3",  type: "skill" },
    { id: "node-4",  type: "skill" },
    { id: "node-5",  type: "output" },
    { id: "node-6",  type: "input" },
    { id: "node-7",  type: "code" },
    { id: "node-8",  type: "code" },
    { id: "node-9",  type: "output" },
    { id: "node-10", type: "input" },
    { id: "node-11", type: "table" },
    { id: "node-12", type: "output" }
  ],
  "edges": [
    { from: "node-1", to: "node-2" },
    { from: "node-1", to: "node-3" },
    { from: "node-1", to: "node-4" },
    { from: "node-1", to: "node-5" },
    { from: "node-6", to: "node-7" },
    { from: "node-6", to: "node-8" },
    { from: "node-6", to: "node-9" },
    { from: "node-10", to: "node-11" },
    { from: "node-10", to: "node-12" }
  ]
}

COUNTER PERSISTENCE:
───────────────────
If parser instance persists: IDs continue sequentially
If parser recreated: Counter resets to 1 (ID collision risk)
```

---

## DIAGRAM 4: Pattern Priority & Detection

```
PATTERN DETECTION FLOW
──────────────────────

INPUT TEXT: "**Thought**: I'm thinking...
             **Spreadsheet**: Create budget...
             ```javascript
             function test() {}
             ```
             ## Analysis Section
             Content here..."

┌─────────────────────────────────────────┐
│ ENABLED_PATTERNS CHECK                  │
│ (from parser-config.json)               │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────────────────────────┐
    │ All patterns enabled by default      │
    │ Can disable via config               │
    └────────────────────────────────────┘
             │
             v
┌─────────────────────────────────────────────────────────────┐
│ PATTERN_PRIORITY LOOP                                       │
│ Process in order: metacognitive, xlsx, pdf, pptx, docx,   │
│ code, tables, sections, analysis                          │
└─────────────────────────────────────────────────────────────┘
             │
    ┌────────┴─────────────┐
    │                      │
    v                      v

1. METACOGNITIVE CHECK
   detectPattern('metacognitive', text)
   ↓ Regex: /\*\*(Thought|Emotion|...)\*\*/i
   ✓ MATCH FOUND
   ↓ parseMetacognitive()
   → Creates: node-2 (Thought)
   → Edge: node-1 → node-2

2. XLSX CHECK
   detectPattern('xlsx', text)
   ↓ Regex: /\b(spreadsheet|excel|xlsx|...)\b/i
   ✓ MATCH FOUND
   ↓ parseXLSX()
   → Creates: node-3 (Spreadsheet)
   → Edge: node-1 → node-3

3. PDF/PPTX/DOCX
   ✗ No matches (skipped)

4. CODE CHECK
   parseCode()
   ↓ Always runs (no detection needed)
   ↓ Regex: /```(\w+)?\n([\s\S]*?)```/g
   ✓ MATCH FOUND
   → Creates: node-4 (Code: javascript)
   → Edge: node-1 → node-4

5. TABLES CHECK
   ✗ No matches (skipped)

6. SECTIONS CHECK
   detectPattern('sections', text)
   ↓ Regex: /^##\s+(.+)$/gm
   ✓ MATCH FOUND
   ↓ parseSections()
   → Creates: node-5 (Section: Analysis Section)
   → Edge: node-1 → node-5

7. ANALYSIS CHECK
   ✗ Would match but already processed as section

OUTPUT NODE (ALWAYS):
────────────────────
→ Creates: node-6 (Output)
→ Edge: node-1 → node-6

DEDUPLICATION:
──────────────
nodeKey = type + title + content[0:50]
Compare each new node against Set of added keys
If key exists: Skip node (but counter still increments!)
```

---

## DIAGRAM 5: Error Handling & Terminal Context (PROPOSED)

```
CURRENT FLOW (Success Case):
────────────────────────────
Terminal Input
    ↓
Execute Command
    ↓
Parse Output (generic)
    ↓
Create Nodes
    ↓
Render in Canvas
    ↓
No Error Information

PROPOSED FLOW (With Error Handling):
─────────────────────────────────────

Terminal Input: "ls /invalid"
    │
    v
Execute Command
    ├─ status: 'error'
    ├─ exitCode: 2
    ├─ stderr: "No such file or directory"
    └─ stdout: ""
    │
    v
Capture Execution Result
    ├─ success: false
    ├─ command: "ls /invalid"
    ├─ duration: 45ms
    └─ timestamp: 2024-10-22T14:30:00Z
    │
    v
createNodesWithContext()
    │
    v
parseInteractionWithContext()
    ├─ Input Node (node-1)
    ├─ [Parsing stage - no matches]
    ├─ Output Node (node-2)
    └─ Error Node (node-3) ← NEW!
    │
    v
RESULT GRAPH:
─────────────

ctx-1 (CONTEXT)
  └─→ node-1 (INPUT): "ls /invalid"
       └─→ node-2 (OUTPUT): "No such file..."
            └─→ node-3 (ERROR)
                 ├─ error_type: "command_failed"
                 ├─ exit_code: 2
                 ├─ stderr: "No such file..."
                 └─ parent: node-2

CONTEXT NODE:
─────────────
ctx-1 (CONTEXT SESSION)
├─ sessionId: "sess-abc123"
├─ cwd: "/home/user/projects"
├─ shell: "/bin/bash"
├─ platform: "linux"
└─ environment: { PATH: "...", USER: "..." }
```

---

## DIAGRAM 6: Terminal State Tracking (PROPOSED)

```
TERMINAL SESSION LIFECYCLE
───────────────────────────

[1] User Opens Terminal
    ↓
    Initialize TerminalInput
    ├─ sessionId: generate UUID
    └─ Track: cwd, environment, command history
    │
    ├─→ Parser Created
    │   └─ nodeIdCounter: 1
    │
    └─→ Canvas Created
        └─ data: { nodes: [], edges: [], metadata: {} }

[2] User Types Command #1
    ↓
    "cd /home/user/projects"
    │
    ├─→ Execute
    ├─→ Parse
    ├─→ Create Nodes:
    │   - node-1: INPUT
    │   - node-2: OUTPUT (success)
    │   - cwd updated: /home/user/projects
    │
    └─→ Render

[3] User Types Command #2
    ↓
    "ls -la"
    │
    ├─→ Execute (in updated cwd)
    ├─→ Parse (output contains file list)
    ├─→ Create Nodes:
    │   - node-3: INPUT
    │   - node-4: TABLE (if output parsed as table)
    │   - node-5: OUTPUT (success)
    │   - Context: cwd=/home/user/projects
    │
    └─→ Render

[4] User Types Command #3 (FAILS)
    ↓
    "cat /etc/shadow"
    │
    ├─→ Execute (permission denied)
    ├─→ Capture: { status: 'error', exitCode: 1, stderr: '...' }
    ├─→ Parse
    ├─→ Create Nodes:
    │   - node-6: INPUT
    │   - node-7: OUTPUT (error message)
    │   - node-8: ERROR (permission_denied)
    │   - Context: cwd, failed command logged
    │
    └─→ Render (highlight error)

FLOW.JSON SESSION:
──────────────────
{
  "conversation_id": "sess-abc123",
  "created_at": "2024-10-22T14:00:00Z",
  "nodes": [
    { id: "ctx-1", type: "context", context_data: { sessionId, cwd, shell, ... } },
    { id: "node-1", type: "input", content: "cd /home/user/projects", parent: null },
    { id: "node-2", type: "output", parent: "node-1" },
    { id: "node-3", type: "input", content: "ls -la", parent: null },
    { id: "node-4", type: "table", parent: "node-3" },
    { id: "node-5", type: "output", parent: "node-3" },
    { id: "node-6", type: "input", content: "cat /etc/shadow", parent: null },
    { id: "node-7", type: "output", parent: "node-6" },
    { id: "node-8", type: "error", error_type: "permission_denied", parent: "node-7" }
  ],
  "edges": [
    { from: "ctx-1", to: "node-1" },  ← Context linked
    { from: "node-1", to: "node-2" },
    { from: "node-3", to: "node-4" },
    { from: "node-3", to: "node-5" },
    { from: "node-6", to: "node-7" },
    { from: "node-7", to: "node-8" }  ← Error chained from output
  ],
  "execution_history": [
    { cmd: "cd ...", status: "success", cwd: "/home/user/projects" },
    { cmd: "ls -la", status: "success", output_lines: 15 },
    { cmd: "cat /etc/shadow", status: "error", errno: 13, message: "Permission denied" }
  ]
}
```

---

## DIAGRAM 7: Node Type Hierarchy

```
NODE TYPES AND CREATION LOGIC
──────────────────────────────

BASE STRUCTURE:
┌──────────────────┐
│ All Nodes        │
├──────────────────┤
│ id: "node-N"     │
│ type: enum       │
│ parent_id: ref   │
│ content: string  │
│ timestamp: ISO   │
└──────────────────┘
        ▲
        │ extends
        │
    ┌───┴───┬────────┬─────────┬──────────┬────────┬──────────┬─────────┬──────┐
    │       │        │         │          │        │          │         │      │
    v       v        v         v          v        v          v         v      v

INPUT  OUTPUT  SKILL   CODE   TABLE   SECTION  ANALYSIS  AUTO   ERROR  CONTEXT
────── ────── ────── ────── ────── ──────── ──────────  ──── (PROP) (PROP)
                           
INPUT NODE:
├─ Created: parseInteraction() line 221
├─ Parent: null (root)
├─ Always: Yes
└─ Fields: id, type, content, parent_id, timestamp

OUTPUT NODE:
├─ Created: parseOutput() line 322
├─ Parent: Input node
├─ Always: Yes
└─ Fields: id, type, content, parent_id, timestamp

SKILL NODE:
├─ Created: parseXXX() methods
├─ Parent: Input node
├─ Subtypes:
│  ├─ metacognitive-flow
│  ├─ xlsx
│  ├─ pdf
│  ├─ pptx
│  └─ docx
├─ Always: Depends on pattern
└─ Fields: id, type, skill_name, title, content, full_content, 
           parent_id, timestamp, [extra_data]

CODE NODE:
├─ Created: parseCode()
├─ Parent: Input node
├─ Language: javascript, python, bash, etc
├─ Always: If code block exists
└─ Fields: id, type, language, title, content, full_content, parent_id, timestamp

TABLE NODE:
├─ Created: parseTables()
├─ Parent: Input node
├─ Structure: headers, row_count
├─ Always: If markdown table exists
└─ Fields: id, type, title, content, full_content, headers, row_count, 
           parent_id, timestamp

SECTION NODE:
├─ Created: parseSections()
├─ Parent: Input node
├─ Level: h2, h3, h4
├─ Always: If header exists (and passes min length)
└─ Fields: id, type, level, title, content, full_content, parent_id, timestamp

ANALYSIS NODE:
├─ Created: parseAnalysisPatterns()
├─ Parent: Input node
├─ Types: analysis, summary, plan, recommendation, findings, steps
├─ Always: If pattern exists
└─ Fields: id, type, detected_type, title, content, full_content, 
           parent_id, timestamp

AUTO NODE:
├─ Created: parseSections() for unrecognized sections
├─ Parent: Input node
├─ Type: Custom section
├─ Always: For non-common headers
└─ Fields: id, type, detected_type, title, content, full_content, 
           parent_id, timestamp

ERROR NODE: [PROPOSED]
├─ Created: createErrorNode() [if execution fails]
├─ Parent: Output node [NOT input]
├─ Types: command_failed, permission_denied, timeout, parsing_error
├─ Always: If execution status = 'error'
└─ Fields: id, type, error_type, title, content, full_content, error_details,
           parent_id, timestamp

CONTEXT NODE: [PROPOSED]
├─ Created: createContextNode() [if terminal session]
├─ Parent: null (root, linked to first input)
├─ Type: terminal_session
├─ Always: If terminalContext provided
└─ Fields: id (ctx-*), type, context_type, title, content, context_data,
           timestamp
```

---

## DIAGRAM 8: Data Flow - Terminal to Canvas

```
TERMINAL INPUT WIDGET                    PARSER SYSTEM               CANVAS/UI
──────────────────────────────────────────────────────────────────────────────

User Types:
┌──────────────┐
│"Show code"   │
└──────┬───────┘
       │
       v
┌────────────────────┐
│ sendMessage()      │
│ - User input       │
│ - Add to terminal  │
│ - Clear field      │
└────────┬───────────┘
         │
         v
    ┌─────────────────────────┐
    │ processMessage()         │
    │ - Check special commands │
    └─────────┬───────────────┘
              │
              v
      ┌─────────────────┐
      │ executeCommand()│
      │ POST /api/...   │
      └────────┬────────┘
               │
               │ (HTTP response)
               v
      ┌─────────────────┐
      │ Response {      │
      │   success,      │
      │   output,       │
      │   error,        │
      │   exitCode      │
      │ }               │
      └────────┬────────┘
               │
               v
      ┌─────────────────┐
      │ addToTerminal() │
      │ Display response│
      └────────┬────────┘
               │
               v
      ┌──────────────────────────┐
      │ createNodes()            │
      │ Prepare:                 │
      │ - userMessage            │
      │ - assistantResponse      │
      │ - (executionResult) [NEW]│
      │ - (terminalContext) [NEW]│
      └──────────┬───────────────┘
                 │
                 v
            ┌─────────────────────────────────┐
            │ parser.parseInteraction()       │
            │ OR                              │
            │ parser.parseInteractionWithCtx()│ [NEW]
            └────────┬────────────────────────┘
                     │
                     v
       ┌─────────────────────────────────┐
       │ CREATE NODES:                   │
       │ [input, ...parsed, output, etc] │
       └────────┬────────────────────────┘
                │
                v
       ┌─────────────────────────────────┐
       │ CREATE EDGES:                   │
       │ [parent→child relationships]    │
       └────────┬────────────────────────┘
                │
                v
       ┌─────────────────────────────────┐
       │ RETURN:                         │
       │ {                               │
       │   nodes: [...],                 │
       │   edges: [...],                 │
       │   metadata: {...}               │
       │ }                               │
       └────────┬────────────────────────┘
                │
                └──────────────┬─────────────────────────────┐
                               │                             │
                    ┌──────────┴────────────┐                │
                    │                       │                │
                    v                       v                v
            ┌─────────────────┐   ┌──────────────────┐  ┌──────────────┐
            │ WebSocket send? │   │ WebSocket open?  │  │ Fallback:    │
            │                 │   │                  │  │ canvas.      │
            └────────┬────────┘   │ YES → send()     │  │ getData() +  │
                     │            │                  │  │ merge +      │
                  YES│            │ NO → Fallback    │  │ canvas.      │
                     │            └──────────────────┘  │ render()     │
                     v                                  │              │
            ┌──────────────────┐                       │  │
            │ sendMessage()    │                       │  │
            │ type:            │                       │  │
            │   'node_update'  │                       │  │
            │ nodes: [...]     │                       │  │
            │ edges: [...]     │                       │  │
            │ metadata: {...}  │                       │  │
            └────────┬─────────┘                       │  │
                     │                                 │  │
                     └────────────────┬────────────────┘  │
                                      │                  │
                                      v                  v
                            ┌──────────────────────────────────────┐
                            │ Canvas Updated                       │
                            │ - Merge nodes array                  │
                            │ - Merge edges array                  │
                            │ - Update internal SVG data           │
                            │ - Recalculate layout                 │
                            │ - Render/redraw visualization        │
                            └──────────────────────────────────────┘
                                      │
                                      v
                            ┌──────────────────────────────────────┐
                            │ Canvas Displayed                     │
                            │ - Node circles with labels           │
                            │ - Edge lines showing connections     │
                            │ - Force-directed graph layout        │
                            │ - Interactive pan/zoom               │
                            └──────────────────────────────────────┘
```

This comprehensive documentation provides all the visual representations needed to understand the parser system.

