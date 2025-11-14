# Claude Flow Terminal Integration

## Overview

The Claude Flow web terminal now executes **real shell commands** and visualizes their outputs as nodes in the interactive canvas.

## Changes Made

### 1. Updated `terminal-input.js`
- **Removed**: Mock/test responses
- **Added**: Real command execution via server API
- **Added**: Special commands (`/help`, `/clear`, `/status`)
- **Improved**: Error handling and async processing

### 2. Updated `server.js`
- **Added**: `/api/execute` endpoint for command execution
- **Added**: Child process integration for shell commands
- **Added**: Security features (timeout, buffer limits)
- **Added**: Support for both 'shell' and 'claude' command types

## Usage

### Starting the Server

```bash
cd ~/claude-flow
./start.sh
```

The server will start on `http://localhost:3000`

### Opening the Web Interface

1. Open your browser
2. Navigate to `http://localhost:3000`
3. The terminal panel is on the left side of the interface

### Executing Commands

#### Shell Commands

Type any standard shell command:

```bash
pwd
ls -la
echo "Hello World"
whoami
date
uname -a
```

Commands are executed on the server and results appear in the terminal and as nodes in the canvas.

#### Special Commands

- `/help` - Show available commands
- `/clear` - Clear terminal history
- `/status` - Show system status (WebSocket, nodes, edges)
- `Ctrl+L` - Clear terminal
- `↑` / `↓` - Navigate command history

### Command Flow

```
User Input
    ↓
Terminal (browser)
    ↓
HTTP POST to /api/execute
    ↓
Server (Node.js)
    ↓
Execute shell command
    ↓
Return output
    ↓
Display in terminal
    ↓
Parse & create nodes
    ↓
Visualize in canvas
```

## API Endpoint

### POST /api/execute

Execute a command on the server.

**Request:**
```json
{
  "command": "ls -la",
  "type": "shell"
}
```

**Response:**
```json
{
  "success": true,
  "output": "total 963\ndrwx------...",
  "error": null,
  "command": "ls -la",
  "type": "shell",
  "timestamp": "2025-10-22T06:18:33.651Z"
}
```

**Parameters:**
- `command` (string, required): The command to execute
- `type` (string, optional): Either "shell" (default) or "claude"

**Security Features:**
- 30-second timeout per command
- 1MB output buffer limit
- Error handling for failed commands

## Testing

You can test the API directly with curl:

```bash
# Test pwd command
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "pwd", "type": "shell"}'

# Test ls command
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la", "type": "shell"}'
```

## Future Enhancements

### Claude Code Integration (Coming Soon)

The infrastructure is in place for Claude Code integration:

```javascript
// In terminal, type:
/claude "Explain this project structure"
```

The server will:
1. Receive the Claude prompt
2. Execute Claude Code CLI
3. Stream the response back
4. Parse and visualize Claude's reasoning as nodes

### Planned Features

- [ ] Claude Code CLI integration
- [ ] Command aliases
- [ ] Command history persistence
- [ ] Multi-line command support
- [ ] Syntax highlighting
- [ ] Auto-completion
- [ ] Command output filtering
- [ ] Export terminal session

## Architecture

### Client-Side (terminal-input.js)

```javascript
class TerminalInput {
  async processMessage(message) {
    // Check for special commands
    if (message.startsWith('/')) {
      await this.handleSpecialCommand(message);
      return;
    }

    // Execute via server
    const response = await this.executeCommand(message);

    // Display and parse
    this.addToTerminal('assistant', response);
    this.createNodes(message, response);
  }
}
```

### Server-Side (server.js)

```javascript
app.post('/api/execute', async (req, res) => {
  const { command, type = 'shell' } = req.body;

  if (type === 'shell') {
    const { stdout, stderr } = await execPromise(command, {
      timeout: 30000,
      maxBuffer: 1024 * 1024
    });

    return res.json({
      success: true,
      output: stdout || stderr,
      timestamp: new Date().toISOString()
    });
  }
});
```

## Troubleshooting

### Commands not executing

1. Check server is running: `curl http://localhost:3000/api/health`
2. Check browser console for errors
3. Verify WebSocket connection in `/status`

### Permission errors

Some commands may require elevated permissions. The server runs with the same permissions as the Node.js process.

### Timeout errors

Long-running commands (>30 seconds) will timeout. Adjust the timeout in `server.js` if needed:

```javascript
const { stdout, stderr } = await execPromise(command, {
  timeout: 60000, // Increase to 60 seconds
  maxBuffer: 1024 * 1024
});
```

## Security Considerations

⚠️ **WARNING**: This terminal executes real commands on the server. Use with caution:

1. **Local use only**: Do not expose this server to the internet
2. **No authentication**: Anyone with access can execute commands
3. **Command validation**: Consider adding command whitelisting for production
4. **Resource limits**: Timeout and buffer limits prevent resource exhaustion

### Production Security

#### Implemented Security Features

- ✅ **Audit Logging** - All command executions are logged to `data/audit.log` with:
  - Timestamp
  - Client IP address
  - Command type (shell/claude)
  - Command text
  - Execution status (started/success/failed/rejected/error)
  - Error details (if applicable)
  - Output length (for successful commands)

The audit log uses JSON line format for easy parsing and analysis. Each command execution creates multiple log entries tracking the full lifecycle from start to completion.

**Viewing Audit Logs:**

```bash
# View all audit logs
cat data/audit.log

# View recent logs (last 10 entries)
tail -n 10 data/audit.log

# View logs in real-time
tail -f data/audit.log

# Parse and pretty-print JSON logs
cat data/audit.log | jq '.'

# Filter failed commands
cat data/audit.log | jq 'select(.status == "failed")'

# Filter by IP address
cat data/audit.log | jq 'select(.ip == "::1")'
```

#### Additional Security Features for Production (TODO)

For enhanced production security, consider adding:

- Authentication/authorization
- Command whitelisting
- Rate limiting
- Sandboxed execution environment

## Files Modified

- `terminal-input.js` - Client-side terminal logic (removed mocks, added real execution)
- `server.js` - Server with command execution endpoint
- `TERMINAL-INTEGRATION.md` - This documentation

## Version

- Initial Release: 2025-10-22
- Status: ✅ Working
- Tests: ✅ Passed (pwd, ls -la)
