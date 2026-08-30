#!/bin/sh
set -eu

# EasyPanel mounts the host socket at runtime. Its group ID is host-specific,
# so resolve it here and add the unprivileged Node user to that numeric group.
socket_path="/var/run/docker.sock"
if [ -S "$socket_path" ]; then
  socket_gid="$(stat -c '%g' "$socket_path")"
  socket_group="$(awk -F: -v gid="$socket_gid" '$3 == gid { print $1; exit }' /etc/group)"

  if [ -z "$socket_group" ]; then
    socket_group="docker-socket"
    addgroup -g "$socket_gid" "$socket_group"
  fi

  addgroup node "$socket_group" 2>/dev/null || true
fi

exec su-exec node "$@"
