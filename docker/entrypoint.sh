#!/bin/sh
set -e

# Ensure uploads directory exists and is owned by runtime UID:GID (1001:1001)
mkdir -p /app/public/media
chown -R 1001:1001 /app/public/media
chmod -R 775 /app/public/media || true

# Favor group-write for created files/dirs (helps when shelling in)
umask 0002

# Drop privileges to nextjs user and exec the given command (PID 1)
exec su-exec 1001:1001 "$@"
