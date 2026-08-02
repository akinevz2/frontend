#!/usr/bin/env bash
# Manage allowed user IDs for the admin panel.
#
# Usage:
#   ./deploy/users.sh add    <user-id>   # append a user ID to .allowed-users, rebuild, restart
#   ./deploy/users.sh remove <user-id>   # remove a user ID from .allowed-users, rebuild, restart
#   ./deploy/users.sh list                # print current user IDs
#   ./deploy/users.sh rebuild             # rebuild image + restart container without editing the file
#
# After editing the file this commits and pushes so other machines / future
# rebuilds see the same allow-list.  The in-memory revocation done from the web
# UI is NOT persisted here — it only lasts until the next rebuild.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FILE="$ADMIN_DIR/.allowed-users"

usage() { sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'; exit 1; }

ensure_file() { touch "$FILE"; }

normalize() { sed -e 's/[[:space:]]*$//' -e 's/^[[:space:]]*//' <<<"$1"; }

cmd_list() {
    ensure_file
    echo "Allowed user IDs in $FILE:"
    while IFS= read -r line; do
        line="$(normalize "$line")"
        [[ -z "$line" || "$line" == \#* ]] && continue
        echo "  - $line"
    done < "$FILE"
}

edit_and_rebuild() {
    local action="$1" uid="$2"
    ensure_file
    uid="$(normalize "$uid")"
    [[ -z "$uid" ]] && { echo "user ID cannot be empty"; exit 1; }

    # Filter out the uid (and blank trailing lines), then maybe append
    local tmp; tmp="$(mktemp)"
    grep -vxF "$uid" "$FILE" > "$tmp" || true
    if [[ "$action" == "add" ]]; then
        echo "$uid" >> "$tmp"
        echo "Added: $uid"
    else
        echo "Removed: $uid"
    fi
    # collapse trailing blank lines
    sed -i -e :a -e '/^\n*$/{$d;N;ba}' "$tmp"
    mv "$tmp" "$FILE"

    (cd "$ADMIN_DIR" && git add .allowed-users && \
        git commit -m "chore(allowed-users): $action $uid" >/dev/null && \
        git push origin main) || echo "(no git changes / push skipped)"

    rebuild
}

rebuild() {
    echo "Building admin-panel image..."
    docker build -t admin-panel "$ADMIN_DIR" --no-cache
    echo "Restarting container..."
    docker rm -f admin >/dev/null 2>&1 || true
    docker run -d --name admin -p 8443:8443 -p 8080:8080 \
        -v admin-data:/app/data \
        -e DevPassword="${DevPassword:-test123}" \
        --restart unless-stopped admin-panel
    echo "Done. https://ws-vision:8443"
}

main() {
    [[ $# -eq 0 ]] && usage
    case "$1" in
        add)     [[ $# -ne 2 ]] && usage; edit_and_rebuild add "$2" ;;
        remove)  [[ $# -ne 2 ]] && usage; edit_and_rebuild remove "$2" ;;
        list|ls) cmd_list ;;
        rebuild) rebuild ;;
        *) usage ;;
    esac
}

main "$@"