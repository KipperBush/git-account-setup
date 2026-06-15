#!/bin/bash
set -e

# --- Dependency checks ---
for dep in gh git; do
  if ! command -v "$dep" &>/dev/null; then
    echo "Error: '$dep' is required but not installed." >&2
    case "$dep" in
      gh) echo "  Install: brew install gh" >&2 ;;
    esac
    exit 1
  fi
done

GH_PATH=$(command -v gh)

# --- Prompt ---
echo "Git Account Setup"
echo "-----------------"
read -rp "Repo root path (e.g. ~/Repo/my-org): " REPO_PATH
read -rp "Full name: " GIT_NAME
read -rp "Email address: " GIT_EMAIL
read -rp "GitHub username: " GH_USERNAME
read -rsp "Personal access token (hidden): " GH_TOKEN
echo

# --- Derive slug (matches Node.js toSlug logic) ---
SLUG=$(echo "$GH_USERNAME" \
  | sed -E 's/([a-z])([A-Z])/\1-\2/g' \
  | tr '[:upper:]' '[:lower:]' \
  | tr -cs 'a-z0-9-' '-' \
  | sed 's/-*$//')

# --- Expand and normalize path ---
EXPANDED="${REPO_PATH/#\~/$HOME}"
[[ "$EXPANDED" != */ ]] && EXPANDED="$EXPANDED/"

CRED_SCRIPT="$HOME/.git-credential-$SLUG"
IDENTITY_FILE="$HOME/.gitconfig-$SLUG"

echo ""
echo "Will configure:"
echo "  Path:     $EXPANDED"
echo "  Identity: $GIT_NAME <$GIT_EMAIL>"
echo "  Username: $GH_USERNAME (slug: $SLUG)"
echo ""
read -rp "Continue? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
echo ""

# --- Step 1: Store token ---
echo "→ Storing token in macOS Keychain..."
echo "$GH_TOKEN" | "$GH_PATH" auth login --with-token --hostname github.com
echo "✓ Token stored"

# --- Step 2: Credential script ---
echo "→ Writing $CRED_SCRIPT..."
printf '#!/bin/sh\necho username="%s"\necho password=$("%s" auth token --user "%s")\n' \
  "$GH_USERNAME" "$GH_PATH" "$GH_USERNAME" > "$CRED_SCRIPT"
chmod 755 "$CRED_SCRIPT"
echo "✓ Credential script created"

# --- Step 3: Identity file ---
echo "→ Writing $IDENTITY_FILE..."
cat > "$IDENTITY_FILE" <<EOF
[user]
    name = $GIT_NAME
    email = $GIT_EMAIL
[credential "https://github.com"]
    helper =
    helper = !$CRED_SCRIPT
EOF
echo "✓ Identity file created"

# --- Step 4: includeIf ---
echo "→ Updating ~/.gitconfig..."
if git config --global --get "includeIf.gitdir:${EXPANDED}.path" &>/dev/null; then
  echo "✓ gitconfig already has an entry for this path"
else
  git config --global "includeIf.gitdir:${EXPANDED}.path" "$IDENTITY_FILE"
  echo "✓ gitconfig updated"
fi

echo ""
echo "Done! Verify with:"
echo "  cd ${EXPANDED%/} && git config user.email"
