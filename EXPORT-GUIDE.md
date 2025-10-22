# Claude Flow - Export & Persistence Guide

**Complete guide to exporting, importing, and managing conversations in Claude Flow**

---

## Table of Contents

1. [Export Functionality](#export-functionality)
2. [Import Functionality](#import-functionality)
3. [Multi-Conversation Support](#multi-conversation-support)
4. [Session Persistence](#session-persistence)
5. [Undo/Redo System](#undoredo-system)
6. [Share Features](#share-features)
7. [Advanced Tips](#advanced-tips)

---

## Export Functionality

Claude Flow supports exporting your conversation flows in multiple formats for sharing, archiving, or documentation purposes.

### Supported Export Formats

#### 1. PNG Export
**High-quality raster image (300 DPI equivalent)**

- **Use case**: Presentations, documentation, social media
- **Quality**: 3x scaling for crisp, high-resolution output
- **Background**: Optional (default: included)
- **File size**: Medium to large depending on canvas size

**How to export:**
```
1. Click the Export button in the header
2. Select "Export as PNG"
3. File downloads automatically
```

**Options:**
- Include/exclude background
- Custom resolution scale (1x-5x)
- Background color selection

#### 2. SVG Export
**Scalable vector graphics**

- **Use case**: Print materials, infinite zoom without quality loss
- **Quality**: Vector-based, perfectly scalable
- **Fonts**: Can embed Google Fonts for consistency
- **File size**: Small to medium

**How to export:**
```
1. Click the Export button
2. Select "Export as SVG"
3. File downloads automatically
```

**Features:**
- Embedded fonts for consistent rendering
- Preserves all gradients and filters
- Fully editable in vector graphics software

#### 3. JSON Export
**Structured data format**

- **Use case**: Data backup, programmatic access, version control
- **Content**: Complete flow data with metadata
- **Format**: Pretty-printed with 2-space indentation
- **File size**: Small

**How to export:**
```
1. Click the Export button
2. Select "Export as JSON"
3. File downloads automatically
```

**JSON Structure:**
```json
{
  "version": "1.0.0",
  "exportedAt": "2025-10-22T14:30:00.000Z",
  "metadata": {
    "nodeCount": 15,
    "edgeCount": 12,
    "exportEngine": "Claude Flow Export Engine v1.0"
  },
  "data": {
    "nodes": [...],
    "edges": [...],
    "canvasState": {
      "zoom": 1,
      "panX": 0,
      "panY": 0
    }
  }
}
```

#### 4. Markdown Export
**Human-readable conversation format**

- **Use case**: Documentation, blog posts, sharing conversations
- **Content**: Formatted conversation with metadata
- **Format**: GitHub-flavored Markdown
- **File size**: Small

**How to export:**
```
1. Click the Export button
2. Select "Export as Markdown"
3. File downloads automatically
```

**Features:**
- Hierarchical conversation structure
- Syntax highlighting for code blocks
- Timestamps (optional)
- Node metadata preservation

#### 5. Standalone HTML Export
**Self-contained web page**

- **Use case**: Sharing interactive visualizations, archiving
- **Content**: Complete HTML page with embedded SVG
- **Interactivity**: Optional zoom/pan controls
- **File size**: Medium

**How to export:**
```
1. Click the Export button
2. Select "Export as HTML"
3. File downloads automatically
```

**Features:**
- No external dependencies
- Embedded flow data (optional)
- Professional styling
- Mobile-responsive

### Export Tips

**Best Practices:**
- Export regularly for backup
- Use PNG for quick sharing
- Use SVG for high-quality prints
- Use JSON for data backup
- Use Markdown for documentation

**Performance:**
- Exports complete in <2 seconds for 100 nodes
- Large canvases (500+ nodes) may take 5-10 seconds
- PNG export is slowest due to rendering

---

## Import Functionality

Import previously exported flow data to restore conversations or merge flows.

### How to Import

**Method 1: Drag and Drop**
```
1. Click the Import button
2. Drag a JSON file onto the drop zone
3. Review validation results
4. Confirm import
```

**Method 2: File Selection**
```
1. Click the Import button
2. Click "Select File"
3. Choose a JSON file
4. Confirm import
```

### Import Options

**Replace Mode**
- Clears existing canvas
- Loads imported data fresh
- Use for starting a new session

**Append Mode** (Default)
- Keeps existing nodes
- Adds imported nodes
- Resolves ID conflicts automatically

**Merge Mode**
- Intelligent merging
- Preserves relationships
- Advanced conflict resolution

### Validation

All imports are validated for:
- ✓ Required fields (nodes, edges)
- ✓ Node structure (id, type)
- ✓ Edge references
- ✓ Data integrity
- ⚠ Warnings for unknown types
- ⚠ Warnings for missing references

**Validation Example:**
```
✓ Valid: All required fields present
✓ 15 nodes validated
✓ 12 edges validated
⚠ Warning: Node 5 has unknown type 'custom'
⚠ Warning: Edge 3 references missing node 'node_99'
```

### Error Handling

**Common Import Errors:**

1. **Invalid JSON**
   - Error: "Failed to parse JSON"
   - Solution: Validate JSON syntax

2. **Missing Required Fields**
   - Error: "Missing required field: nodes"
   - Solution: Ensure export was complete

3. **Corrupt Data**
   - Error: "Validation failed"
   - Solution: Re-export from source

---

## Multi-Conversation Support

Manage multiple conversations simultaneously with the Conversation Manager.

### Creating Conversations

**New Conversation:**
```
1. Click Conversations button
2. Click "New Conversation"
3. Enter name (optional)
4. Choose to capture current state or start fresh
```

**From Current State:**
- Saves all current nodes and edges
- Preserves canvas position and zoom
- Creates timestamped snapshot

### Managing Conversations

**Switch Conversations:**
```
1. Open Conversations panel
2. Click on conversation to load
3. Current state is auto-saved before switching
```

**Rename Conversation:**
```
1. Click edit icon on conversation
2. Enter new name
3. Changes saved immediately
```

**Archive Conversation:**
```
1. Click archive icon
2. Conversation moved to archive
3. Won't appear in default list
```

**Delete Conversation:**
```
1. Click delete icon (trash)
2. Confirm deletion
3. Cannot be undone!
```

### Search Conversations

**Search Features:**
- Search by name
- Search by tags
- Filter archived/active
- Sort by date, name, or size

**Search Example:**
```
1. Open Conversations panel
2. Type in search box
3. Results filter in real-time
```

### Conversation Metadata

Each conversation stores:
- Name
- Creation date
- Last updated date
- Node count
- Tags (custom)
- Archived status
- Canvas state (zoom, pan)

---

## Session Persistence

Automatic saving and session recovery.

### Auto-Save

**Features:**
- Saves every 5 seconds (when changes detected)
- Saves on tab switch
- Saves on page unload
- Uses IndexedDB for large data
- Falls back to localStorage

**What's Saved:**
- Canvas state (zoom, pan, position)
- All nodes and edges
- UI preferences
- Current conversation

### Session Recovery

**Automatic Recovery:**
```
1. Close browser
2. Reopen Claude Flow
3. Last session automatically restored
4. Canvas returns to exact position
```

**Manual Recovery:**
- Session data stored locally
- No server required
- Works offline
- Persists across browser restarts

### Storage Information

**IndexedDB:**
- Primary storage
- Unlimited size (typically)
- Fast and efficient
- Stores conversations and snapshots

**localStorage:**
- Backup storage
- ~5MB limit
- Stores preferences
- Session state cache

**Storage Usage:**
```javascript
// Check storage info programmatically
const info = await persistence.getStorageInfo();
console.log(info);
// {
//   localStorage: { used: 125000, limit: 5242880 },
//   indexedDB: { quota: 50000000, usage: 2500000 }
// }
```

### Privacy

- All data stored locally
- No cloud sync
- No telemetry
- Your data stays on your device

---

## Undo/Redo System

Full undo/redo support with keyboard shortcuts.

### Keyboard Shortcuts

**Undo:**
- `Ctrl+Z` (Windows/Linux)
- `Cmd+Z` (Mac)

**Redo:**
- `Ctrl+Shift+Z` (Windows/Linux)
- `Cmd+Shift+Z` (Mac)
- `Ctrl+Y` (Windows/Linux)

### Supported Operations

The undo/redo system tracks:
- ✓ Adding nodes
- ✓ Removing nodes
- ✓ Modifying nodes
- ✓ Canvas state changes (zoom, pan)
- ✓ Clearing canvas
- ✓ Batch operations

### History Limits

- **Maximum history**: 50 actions
- **Memory management**: Automatic cleanup
- **Debouncing**: Similar actions grouped (300ms)

### Using Undo/Redo

**Example Flow:**
```
1. Add some nodes
2. Realize you made a mistake
3. Press Ctrl+Z to undo
4. Changes reverted
5. Press Ctrl+Shift+Z to redo if needed
```

**Programmatic Use:**
```javascript
// Undo last action
history.undo();

// Redo last undone action
history.redo();

// Get history summary
const summary = history.getHistory();
console.log(summary.canUndo); // true/false
console.log(summary.canRedo); // true/false
```

### Command Pattern

**Architecture:**
- Each action is a Command object
- Commands have execute() and undo() methods
- Stack-based history management
- Memory-efficient state snapshots

---

## Share Features

Share your flows with others.

### Copy to Clipboard

**Available Formats:**

1. **JSON**
   ```
   1. Click Share
   2. Select "Copy JSON"
   3. Paste in your editor
   ```

2. **Markdown**
   ```
   1. Click Share
   2. Select "Copy Markdown"
   3. Paste in documentation
   ```

3. **Plain Text**
   ```
   1. Click Share
   2. Select "Copy Text"
   3. Paste anywhere
   ```

### QR Code Generation

**Create QR Code:**
```
1. Click Share
2. Select "Generate QR"
3. QR code displayed
4. Scan with mobile device
```

**Limitations:**
- Max 2953 characters
- Use for small flows only
- For larger flows, use shareable links

### Shareable Links

**Note:** Requires backend support (not implemented by default)

**Alternative:**
Use the standalone HTML export to share:
```
1. Export as HTML
2. Host on web server
3. Share URL
```

---

## Advanced Tips

### Batch Operations

**Export Multiple Formats:**
```javascript
// Export all formats at once
const results = await exportEngine.exportAll('my-flow');
console.log(results);
// [
//   { format: 'PNG', success: true },
//   { format: 'SVG', success: true },
//   { format: 'JSON', success: true },
//   { format: 'Markdown', success: true }
// ]
```

### Custom Export Options

**PNG with Custom Settings:**
```javascript
await exportEngine.exportAndDownloadPNG('custom.png', {
  scale: 5,
  quality: 1.0,
  includeBackground: false,
  backgroundColor: '#FFFFFF'
});
```

**SVG without Background:**
```javascript
await exportEngine.exportAndDownloadSVG('transparent.svg', {
  includeBackground: false,
  embedFonts: true
});
```

### Programmatic Import

**Import from JSON String:**
```javascript
const jsonData = '{"nodes": [...], "edges": [...]}';
const result = await importEngine.importFromJSON(jsonData);
```

**Merge with Existing Data:**
```javascript
await importEngine.importAndApply(file, {
  strategy: 'append',
  resolveConflicts: 'rename',
  clearExisting: false
});
```

### Conversation Automation

**Auto-Save Conversations:**
```javascript
// Save every 30 seconds
setInterval(() => {
  conversationManager.saveCurrentConversation();
}, 30000);
```

**Duplicate and Modify:**
```javascript
// Duplicate conversation
const duplicate = await conversationManager.duplicateConversation(id);

// Load duplicate
await conversationManager.loadConversation(duplicate.id);

// Make changes...
```

### Performance Optimization

**Large Canvases:**
- Export in batches
- Use JSON for fastest export
- SVG is faster than PNG
- Disable auto-save during bulk operations

**Memory Management:**
- Clear undo history: `history.clear()`
- Archive old conversations
- Delete unused snapshots
- Monitor storage usage

---

## Troubleshooting

### Export Issues

**Problem: PNG export is blurry**
- Solution: Increase scale option (3-5x)

**Problem: Export takes too long**
- Solution: Reduce canvas size or use SVG/JSON

**Problem: SVG doesn't display correctly**
- Solution: Ensure fonts are embedded

### Import Issues

**Problem: Import fails with validation error**
- Solution: Check JSON structure matches expected format

**Problem: Imported nodes appear in wrong location**
- Solution: Restore canvas state option enabled

**Problem: Duplicate node IDs**
- Solution: Use 'rename' conflict resolution

### Performance Issues

**Problem: Auto-save is slow**
- Solution: Reduce auto-save frequency
- Solution: Clear old snapshots

**Problem: Too many conversations**
- Solution: Archive old conversations
- Solution: Delete unused conversations

---

## API Reference

### Export Engine

```javascript
const exporter = new ExportEngine(canvas, parser);

// Export methods
await exporter.exportToPNG(options);
await exporter.exportToSVG(options);
await exporter.exportToJSON(flowData, options);
await exporter.exportToMarkdown(flowData, options);

// Download methods
await exporter.exportAndDownloadPNG(filename, options);
await exporter.exportAndDownloadSVG(filename, options);
await exporter.exportAndDownloadJSON(flowData, filename, options);
await exporter.exportAndDownloadMarkdown(flowData, filename, options);
```

### Import Engine

```javascript
const importer = new ImportEngine(canvas);

// Import methods
await importer.importFromFile(file);
await importer.importFromJSON(jsonString);

// Apply to canvas
importer.applyToCanvas(flowData, options);

// Setup drag and drop
importer.setupDragAndDrop(dropZone, onImport, onError);
```

### Persistence Engine

```javascript
const persistence = new PersistenceEngine(canvas);

// Save/Load
await persistence.saveSessionState();
await persistence.loadSessionState();

// Preferences
persistence.savePreferences(prefs);
const prefs = persistence.loadPreferences();

// Storage info
const info = await persistence.getStorageInfo();
```

### History Manager

```javascript
const history = new HistoryManager(canvas);

// Undo/Redo
history.undo();
history.redo();

// Record commands
history.record(command);

// Get history
const summary = history.getHistory();
```

### Conversation Manager

```javascript
const conversations = new ConversationManager(canvas, persistence);

// Create/Load
await conversations.createConversation(name, options);
await conversations.loadConversation(id);

// Manage
await conversations.saveCurrentConversation();
await conversations.deleteConversation(id);
await conversations.archiveConversation(id, true);
await conversations.renameConversation(id, newName);

// Search
const results = conversations.searchConversations(query, options);
const sorted = conversations.getConversationsSorted(options);
```

---

## Support

For issues or questions:
1. Check this guide first
2. Review the code examples
3. Check browser console for errors
4. Ensure browser supports IndexedDB
5. Try clearing browser cache

**Browser Compatibility:**
- Chrome/Edge: ✓ Full support
- Firefox: ✓ Full support
- Safari: ✓ Full support
- Mobile browsers: ✓ Basic support

---

**Version**: 1.0.0
**Last Updated**: October 2025
**License**: MIT
