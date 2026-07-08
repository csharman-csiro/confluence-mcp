# macOS Setup Guide (Claude Desktop)

This guide is for end users connecting Claude Desktop to Confluence on a
Mac. It assumes no coding experience and no Node.js installation — you
only need one file, plus a handful of copy-pasted Terminal commands to get
past macOS's security checks for an unsigned tool.

If you're the person building/distributing that file rather than the
person installing it, see [Building the binaries](#building-the-binaries-for-maintainers)
at the bottom.

## 1. Get the two things you need

1. **The confluence-mcp binary** — download the one matching your Mac's
   chip from the latest release:
   - [`confluence-mcp-macos-arm64`](https://github.com/csharman-csiro/confluence-mcp/releases/latest/download/confluence-mcp-macos-arm64) — Apple Silicon Macs (M1/M2/M3/M4).
     This is almost every Mac sold since late 2020.
   - [`confluence-mcp-macos-x64`](https://github.com/csharman-csiro/confluence-mcp/releases/latest/download/confluence-mcp-macos-x64) — older Intel Macs.

   Not sure which you have? Click the Apple menu (top-left) → **About
   This Mac**. If it says **Chip: Apple M...**, use the `arm64` file. If
   it says **Processor: Intel...**, use the `x64` file.

2. **A Confluence Personal Access Token (PAT)**:
   1. In Confluence, click your profile picture → **Settings** → **Personal
      Access Tokens**
   2. Click **Create token**, give it a name like `Claude Desktop`, and
      scope it to the spaces you need
   3. Copy the token somewhere safe — you won't be able to see it again

## 2. Put the file somewhere permanent and unblock it

1. Create a folder, e.g. **ConfluenceMCP** inside your **Documents**
   folder, and move the binary into it.
2. Open **Terminal** (press **Cmd + Space**, type `Terminal`, press Enter).
3. Paste the following, replacing the path and filename with your own
   (drag the file from Finder into the Terminal window after typing
   `chmod +x ` to auto-fill the correct path):

   ```bash
   chmod +x ~/Documents/ConfluenceMCP/confluence-mcp-macos-arm64
   xattr -dr com.apple.quarantine ~/Documents/ConfluenceMCP/confluence-mcp-macos-arm64
   ```

   This marks the file as runnable and removes the "downloaded from the
   internet" flag that would otherwise make macOS refuse to run an
   unsigned tool. This is a one-time step per machine.

## 3. Edit Claude Desktop's config file

1. In Terminal, paste this to create the config folder/file if they don't
   already exist, and open it in TextEdit:

   ```bash
   mkdir -p ~/Library/"Application Support"/Claude
   touch ~/Library/"Application Support"/Claude/claude_desktop_config.json
   open -e ~/Library/"Application Support"/Claude/claude_desktop_config.json
   ```

2. Add a `confluence` entry under `mcpServers`, using the full path from
   step 2 and your own Confluence details:

   ```json
   {
     "mcpServers": {
       "confluence": {
         "command": "/Users/yourname/Documents/ConfluenceMCP/confluence-mcp-macos-arm64",
         "env": {
           "CONFLUENCE_BASE_URL": "https://confluence.your-internal-domain.com",
           "CONFLUENCE_API_TOKEN": "paste-your-personal-access-token-here",
           "ALLOWED_SPACES": "SPACE1,SPACE2"
         }
       }
     }
   }
   ```

   Replace `/Users/yourname/...` with the real path — Terminal's title
   bar or `pwd` won't give you this automatically, but you can get it by
   right-clicking the binary in Finder, holding **Option**, and choosing
   **Copy "..." as Pathname**.

   If the file already has other entries under `mcpServers`, add
   `confluence` as another entry inside the same `{ }` block rather than
   replacing the file — a stray comma or missing brace will stop Claude
   Desktop from starting.

   - `CONFLUENCE_BASE_URL` — your Confluence URL. Ask whoever manages
     Confluence if you're not sure.
   - `ALLOWED_SPACES` — comma-separated space keys you're allowed to
     access (e.g. `ENG,HR`). Ask your Confluence admin if you don't know
     your space keys.

3. Save (**Cmd + S**). TextEdit should already be in plain-text mode
   because of the `.json` extension; if it warns about formatting, choose
   **Format → Make Plain Text** first, then save again.

## 4. Restart Claude Desktop

Fully quit Claude Desktop — **Claude menu → Quit Claude**, or **Cmd + Q**
while it's focused, not just closing the window — then reopen it.

## 5. Test it

Ask Claude something like:

> List my Confluence spaces

If it responds with a list of spaces, you're connected. If not, see
Troubleshooting below.

## Troubleshooting

**"'confluence-mcp-macos-arm64' cannot be opened because the developer
cannot be verified" or "...is damaged and can't be opened"**
The quarantine flag wasn't cleared, or was reapplied (this can happen if
you re-download the file). Re-run the two commands from step 2:
```bash
chmod +x /path/to/confluence-mcp-macos-arm64
xattr -dr com.apple.quarantine /path/to/confluence-mcp-macos-arm64
```

**Claude Desktop doesn't show a Confluence tool / doesn't respond to
Confluence questions**
- Double-check `claude_desktop_config.json` is valid JSON — a missing
  comma or brace will silently prevent the server from loading. Paste it
  into [jsonlint.com](https://jsonlint.com) to check.
- Confirm the `command` path matches exactly where you put the binary,
  and that you picked the file matching your Mac's chip.
- Make sure you fully quit and reopened Claude Desktop after editing.

**"Space access denied" or empty results**
- Check the space key is listed in `ALLOWED_SPACES`.
- Check your Confluence account actually has permission to view that
  space.

**TLS/certificate errors**
If your organization's Confluence uses an internally-issued certificate,
macOS may still trust it via the system Keychain, but if you see
certificate errors, ask IT whether the corporate root CA needs to be
installed on your machine.

---

## Building the binaries (for maintainers)

The binaries are self-contained — they embed the Node.js runtime, so end
users don't need to install anything. To build both architectures:

```bash
npm install
npm run package:mac
```

This produces `release/confluence-mcp-macos-x64` and
`release/confluence-mcp-macos-arm64`. Under the hood it:

1. Bundles `src/` into a single CommonJS file with esbuild
   (`npm run bundle`)
2. Packages that bundle into macOS executables with
   [`@yao-pkg/pkg`](https://github.com/yao-pkg/pkg), targeting
   `node22-macos-x64` and `node22-macos-arm64`
3. Ad-hoc code-signs both — macOS's kernel refuses to run unsigned code on
   Apple Silicon, even for local testing

**Code signing when building:**
- **On a Mac**: the built-in `codesign` tool (from Xcode Command Line
  Tools — install with `xcode-select --install` if needed) is used
  automatically.
- **On Linux** (cross-building, as this repo's CI/dev environment does):
  `codesign` doesn't exist, so `pkg` falls back to the open-source `ldid`
  tool. Install it and put it on `PATH` before running `npm run
  package:mac`:
  ```bash
  curl -sL -o /usr/local/bin/ldid \
    https://github.com/ProcursusTeam/ldid/releases/latest/download/ldid_linux_x86_64
  chmod +x /usr/local/bin/ldid
  ```

Distribute the resulting binaries to end users — they don't need this
repo, Node.js, or npm at all. Both are ad-hoc signed only (not notarized
by Apple), which is why end users still need the one-time
`xattr -dr com.apple.quarantine` step in [Section 2](#2-put-the-file-somewhere-permanent-and-unblock-it).
