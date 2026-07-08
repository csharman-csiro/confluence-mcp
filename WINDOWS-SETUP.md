# Windows Setup Guide (Claude Desktop)

This guide is for end users connecting Claude Desktop to Confluence on a
Windows PC. It assumes no coding experience and no Node.js installation —
you only need one file: `confluence-mcp-win-x64.exe`.

If you're the person building/distributing that file rather than the person
installing it, see [Building the .exe](#building-the-exe-for-maintainers)
at the bottom.

## 1. Get the two things you need

1. **`confluence-mcp-win-x64.exe`** — get this from whoever set up
   Confluence access for your team (IT, or the repo maintainer).
2. **A Confluence Personal Access Token (PAT)**:
   1. In Confluence, click your profile picture → **Settings** → **Personal
      Access Tokens**
   2. Click **Create token**, give it a name like `Claude Desktop`, and
      scope it to the spaces you need
   3. Copy the token somewhere safe — you won't be able to see it again

## 2. Put the .exe somewhere permanent

Create a folder like `C:\ConfluenceMCP\` and move
`confluence-mcp-win-x64.exe` into it.

Don't leave it in your **Downloads** folder — Windows sometimes cleans that
up automatically, which would silently break the connection later.

Right-click the file → **Properties**, and note the **Location** shown
there — you'll need the full path in the next step, e.g.:

```
C:\ConfluenceMCP\confluence-mcp-win-x64.exe
```

## 3. Edit Claude Desktop's config file

1. Press **Win + R**, type `%APPDATA%\Claude`, and press Enter. This opens
   the folder containing Claude Desktop's settings.
2. Open `claude_desktop_config.json` in Notepad (right-click → **Open
   with** → **Notepad**). If the file doesn't exist yet, create it.
3. Add a `confluence` entry under `mcpServers`, using the exact path from
   step 2 and your own Confluence details:

```json
{
  "mcpServers": {
    "confluence": {
      "command": "C:\\ConfluenceMCP\\confluence-mcp-win-x64.exe",
      "env": {
        "CONFLUENCE_BASE_URL": "https://confluence.your-internal-domain.com",
        "CONFLUENCE_API_TOKEN": "paste-your-personal-access-token-here",
        "ALLOWED_SPACES": "SPACE1,SPACE2"
      }
    }
  }
}
```

**Important:** Windows paths in JSON need double backslashes (`\\`), as
shown above. If the file already has other entries under `mcpServers`, add
`confluence` as another entry inside the same `{ }` block rather than
replacing the file — a trailing comma or missing brace will stop Claude
Desktop from starting.

- `CONFLUENCE_BASE_URL` — your Confluence URL. Ask whoever manages
  Confluence if you're not sure (include anything after the domain if your
  organization uses a custom path, e.g. `/confluence`).
- `ALLOWED_SPACES` — comma-separated space keys you're allowed to access
  (e.g. `ENG,HR`). Ask your Confluence admin if you don't know your space
  keys.

Save the file.

## 4. Restart Claude Desktop

Fully quit Claude Desktop — right-click its icon in the system tray (bottom
right of the screen, near the clock) and choose **Quit**, not just close
the window — then reopen it.

## 5. Test it

Ask Claude something like:

> List my Confluence spaces

If it responds with a list of spaces, you're connected. If not, see
Troubleshooting below.

## Troubleshooting

**"Windows protected your PC" warning when the .exe first runs**
The file isn't code-signed, so Windows SmartScreen flags it as unrecognized.
Click **More info**, then **Run anyway**. Only do this for a file you
obtained from a trusted source.

**Claude Desktop doesn't show a Confluence tool / doesn't respond to
Confluence questions**
- Double-check `claude_desktop_config.json` is valid JSON — a missing comma
  or brace will silently prevent the server from loading. Paste it into
  [jsonlint.com](https://jsonlint.com) to check.
- Confirm the `command` path matches exactly where you put the .exe.
- Make sure you fully quit and reopened Claude Desktop after editing.

**"Space access denied" or empty results**
- Check the space key is listed in `ALLOWED_SPACES`.
- Check your Confluence account actually has permission to view that space.

**TLS/certificate errors**
If your organization's Confluence uses an internally-issued certificate,
Windows may still trust it via the system certificate store, but if you see
certificate errors, ask IT whether the corporate root CA needs to be
installed on your machine.

---

## Building the .exe (for maintainers)

The `.exe` is a self-contained bundle — it embeds the Node.js runtime, so
end users don't need to install anything. To build it:

```bash
npm install
npm run package:win
```

This produces `release/confluence-mcp-win-x64.exe`. Under the hood it:

1. Bundles `src/` into a single CommonJS file with esbuild
   (`npm run bundle`)
2. Packages that bundle into a Windows executable with
   [`@yao-pkg/pkg`](https://github.com/yao-pkg/pkg), targeting `node22-win-x64`

Distribute the resulting `.exe` to end users — they don't need this repo,
Node.js, or npm at all.
