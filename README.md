# git-account-setup

A local web wizard for configuring per-directory GitHub identity and credential switching on macOS.

## Why this exists

[Conductor](https://conductor.build) and similar AI coding tools only support a single connected GitHub account. If you work across multiple GitHub accounts (personal, work, client orgs), you have to manually switch credentials or risk pushing with the wrong identity.

This tool solves that at the git level — no app support required. It uses `includeIf "gitdir:..."` in `~/.gitconfig` to automatically apply the right identity and credentials based on where a repo lives on disk. Once set up, `git push`, `git fetch`, and all other git operations just work with the correct account.

## What it does

For each GitHub account you configure, the wizard:

1. Stores a personal access token in macOS Keychain via `gh auth login --with-token`
2. Writes `~/.git-credential-<slug>` — a credential helper script that retrieves the token from Keychain
3. Writes `~/.gitconfig-<slug>` — an identity file with your name, email, and credential helper
4. Adds an `includeIf "gitdir:<path>/"` entry to `~/.gitconfig` that activates the identity for all repos under that path

## Installation

```bash
git clone https://github.com/KipperBush/git-account-setup.git
cd git-account-setup
```

## Usage

### Web UI (recommended)

```bash
./setup.sh
```

Checks that `node`, `gh`, and `git` are installed, starts a local Express server, and opens a 5-step wizard in your browser.

### CLI (minimal, no Node.js required)

```bash
./setup-cli.sh
```

Prompts for path, name, email, username, and token directly in the terminal. Only requires `gh` and `git`.

## Requirements

| | Web UI | CLI |
|---|---|---|
| macOS | ✓ | ✓ |
| [Git](https://git-scm.com) | ✓ | ✓ |
| [GitHub CLI](https://cli.github.com) (`brew install gh`) | ✓ | ✓ |
| [Node.js](https://nodejs.org) (`brew install node`) | ✓ | — |

## Verify it worked

After setup, open a terminal in any repo under the configured path and run:

```bash
git config user.email
```

It should return the email you configured for that path.
