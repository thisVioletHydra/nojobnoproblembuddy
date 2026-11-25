# NoJobNoProblemBuddy

## API HH НЕТ

Доступ к API HH отключён. Сценарии работы с HH используют авторизованную вкладку браузера через расширение.

Browser extension for job search workflows in Chrome and Edge. The extension runs in the browser. Its local MCP bridge is available for compatible clients when you want to control a tab from an assistant.

## Install the extension

Requires **pnpm**, **Node 20+**, and **Edge** or **Chrome**.

```bash
git clone https://github.com/thisVioletHydra/nojobnoproblembuddy.git
cd nojobnoproblembuddy
pnpm install
pnpm build
```

Open `edge://extensions` or `chrome://extensions`, enable **Developer mode**, and use **Load unpacked** to select `apps/extension/dist`. Reload the extension after rebuilding.

## Local updates in Edge

Run `./scripts/update-local-edge.sh` from a worktree containing the version you want to install. Load the folder printed by the script once in `edge://extensions` using **Load unpacked**. If Edge already has an older local build, reload it once to activate the update check.

The script builds and validates updates before replacing the installed files. The local extension checks for a higher version every 30 seconds and reloads when autopilot is off. Refresh an open HH page if it still has the prior content script.

## Optional MCP bridge

Run `pnpm install-host` to register the native-messaging host for Edge and Chrome. Reload the extension after registration so the manifest key matches the registered host.

Configure your MCP client to launch this stdio server:

| Setting | Value |
| --- | --- |
| Command | `node` |
| Argument | `/ABS/PATH/nojobnoproblembuddy/apps/mcp/dist/index.js` |

Use the absolute path to your checkout. The bridge listens on `127.0.0.1:18765`. Use one bridge process at a time and reconnect your MCP client after tool schema changes.

| Popup | Bridge status |
| --- | --- |
| **NATIVE** | Connected through the native-messaging host. |
| **OFFSCREEN** | Connected through the fallback WebSocket. |
| **OFF** | The local bridge is disconnected. |

## Agent tools

Click / type / hover / select take **exactly one** of `ref` or `selector`.

| Tool | What it does |
| --- | --- |
| `browser_snapshot` | Accessibility tree, **all iframes**, shadow roots. Refs: `e12` (top) / `f3e12` (frame). |
| `browser_click` | Click by snapshot `ref` or CSS `selector`. |
| `browser_type` | Fill input / textarea / contenteditable. `submit: true` presses Enter. |
| `browser_hover` | Hover. |
| `browser_select_option` | `<select>`. |
| `browser_press_key` | Key on the focused element. |
| `browser_navigate` | Replace the **current** tab URL. |
| `browser_new_tab` | Open a new tab. Prefer this if the current page should stay. |
| `browser_go_back` / `browser_go_forward` | History. |
| `browser_wait` | Sleep, max 30s. |
| `browser_screenshot` | PNG of the visible tab. Edge sometimes fails if the tab is covered. |
| `browser_get_console_logs` | Page `console.*` buffer. |

Example: you already know the field.

```json
{
  "element": "chat composer",
  "selector": "textarea[data-qa=\"text-input\"]",
  "text": "hello",
  "submit": false
}
```

Otherwise snapshot → use `ref`.

---

## Layout

```
apps/mcp            Stdio MCP + WebSocket server on 127.0.0.1:18765
apps/native-host    Chrome native messaging relay (Node)
apps/extension      MV3 unpacked extension (offscreen = fallback WS + keepalive)
packages/protocol   Shared command names and wire types
```

The service worker is not allowed to live forever. `chrome.runtime.connectNative` is the Chromium-blessed way to keep it up while Edge is running. Offscreen WebSocket is the backup if the host is missing.

---

## Limits

- **Edge (or Chrome) must stay running.** Lid close / sleep / quit kills the channel. Background tabs are fine; a dead browser is not.
- `chrome://`, `edge://`, `about:` — no inject, no click.
- Screenshot wants a visible tab.
- Local only: the socket binds `127.0.0.1`. Nothing is exposed to the LAN.

---

## Scripts

```bash
pnpm build           # all packages
pnpm install-host    # register native host for Edge + Chrome
pnpm dev             # run the MCP in the foreground (debug)
```
