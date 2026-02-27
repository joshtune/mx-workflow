# agent-browser CLI Reference

Quick reference for the [agent-browser](https://www.npmjs.com/package/agent-browser) CLI used by `/fv:e2e` and any browser automation tasks.

## Installation

```bash
npm install -g agent-browser
agent-browser install --with-deps   # Install Chromium + system deps (Linux/WSL)
```

## Core Workflow

1. Navigate: `agent-browser open <url>`
2. Snapshot: `agent-browser snapshot -i` (returns interactive elements with refs like `@e1`, `@e2`)
3. Interact using refs from the snapshot
4. Re-snapshot after navigation or significant DOM changes (refs become invalid)

## Commands

### Navigation
```bash
agent-browser open <url>          # Navigate to URL
agent-browser back                # Go back
agent-browser forward             # Go forward
agent-browser reload              # Reload page
agent-browser close               # Close browser
```

### Snapshot (page analysis)
```bash
agent-browser snapshot            # Full accessibility tree
agent-browser snapshot -i         # Interactive elements only (recommended)
agent-browser snapshot -c         # Compact output
agent-browser snapshot -d 3       # Limit depth to 3
agent-browser snapshot -s "#main" # Scope to CSS selector
```

### Interactions (use @refs from snapshot)
```bash
agent-browser click @e1           # Click
agent-browser dblclick @e1        # Double-click
agent-browser focus @e1           # Focus element
agent-browser fill @e2 "text"     # Clear and type
agent-browser type @e2 "text"     # Type without clearing
agent-browser press Enter         # Press key
agent-browser press Control+a     # Key combination
agent-browser hover @e1           # Hover
agent-browser check @e1           # Check checkbox
agent-browser uncheck @e1         # Uncheck checkbox
agent-browser select @e1 "value"  # Select dropdown
agent-browser scroll down 500     # Scroll page
agent-browser scrollintoview @e1  # Scroll element into view
agent-browser drag @e1 @e2        # Drag and drop
agent-browser upload @e1 file.pdf # Upload files
```

### Get information
```bash
agent-browser get text @e1        # Get element text
agent-browser get html @e1        # Get innerHTML
agent-browser get value @e1       # Get input value
agent-browser get attr @e1 href   # Get attribute
agent-browser get title           # Get page title
agent-browser get url             # Get current URL
agent-browser get count ".item"   # Count matching elements
agent-browser get box @e1         # Get bounding box
```

### Check state
```bash
agent-browser is visible @e1      # Check if visible
agent-browser is enabled @e1      # Check if enabled
agent-browser is checked @e1      # Check if checked
```

### Screenshots & PDF
```bash
agent-browser screenshot              # Screenshot to stdout
agent-browser screenshot path.png     # Save to file
agent-browser screenshot --full       # Full page
agent-browser screenshot --annotate   # With numbered element labels
agent-browser pdf output.pdf          # Save as PDF
```

### Video recording
```bash
agent-browser record start ./demo.webm    # Start recording
agent-browser record stop                 # Stop and save video
agent-browser record restart ./take2.webm # Stop current + start new
```

### Wait
```bash
agent-browser wait @e1                     # Wait for element
agent-browser wait 2000                    # Wait milliseconds
agent-browser wait --text "Success"        # Wait for text
agent-browser wait --url "**/dashboard"    # Wait for URL pattern
agent-browser wait --load networkidle      # Wait for network idle
agent-browser wait --fn "window.ready"     # Wait for JS condition
```

### Browser settings
```bash
agent-browser set viewport 1920 1080      # Set viewport size
agent-browser set device "iPhone 14"      # Emulate device
agent-browser set media dark              # Emulate color scheme
```

### Cookies & Storage
```bash
agent-browser cookies                     # Get all cookies
agent-browser cookies set name value      # Set cookie
agent-browser cookies clear               # Clear cookies
agent-browser storage local               # Get all localStorage
agent-browser storage local set k v       # Set value
agent-browser storage local clear         # Clear all
```

### Authentication state
```bash
agent-browser state save auth.json        # Save cookies/storage
agent-browser state load auth.json        # Restore saved state
```

### Tabs
```bash
agent-browser tab                 # List tabs
agent-browser tab new [url]       # New tab
agent-browser tab 2               # Switch to tab
agent-browser tab close           # Close tab
```

### Debugging
```bash
agent-browser open example.com --headed   # Show browser window
agent-browser console                     # View console messages
agent-browser errors                      # View page errors
agent-browser highlight @e1               # Highlight element
```

### Sessions (parallel browsers)
```bash
agent-browser --session test1 open site-a.com
agent-browser --session test2 open site-b.com
agent-browser session list
```

### JSON output
```bash
agent-browser snapshot -i --json          # Machine-readable output
agent-browser get text @e1 --json
```

## Example: Form submission

```bash
agent-browser open https://example.com/form
agent-browser snapshot -i
# Output: textbox "Email" [ref=e1], textbox "Password" [ref=e2], button "Submit" [ref=e3]

agent-browser fill @e1 "user@example.com"
agent-browser fill @e2 "password123"
agent-browser click @e3
agent-browser wait --load networkidle
agent-browser snapshot -i  # Check result
```
