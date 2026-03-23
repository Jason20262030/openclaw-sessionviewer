# OpenClaw Session Viewer

[English](./README.en.md) | [简体中文](./README.zh-CN.md)

A lightweight local web tool for browsing agent session files under `.openclaw`.

## Features

- Automatically renders a tree in the left panel: `agent -> session files`
- Shows a structured, collapsible tree view for session content on the right
- Provides a raw text view for precise inspection
- Parses `.jsonl/.txt/.log` as JSONL entries and reports parse errors

## Run

```bash
cd /home/jason/openclaw-test/sessionviewer
npm start
```

Or run the startup script directly:

```bash
/home/jason/openclaw-test/sessionviewer/start.sh
```

`start.sh` uses port `4588` by default. If the port is occupied, it first tries to stop the process using that port and then starts the service.

Default URL:

- <http://localhost:4588>

## Optional Environment Variables

- `PORT`: custom port
- `OPENCLAW_DIR`: custom `.openclaw` root path (default: `~/.openclaw`)
