# Destroys all Docker volumes and recreates the dev stack from scratch.
# This re-triggers the postgres init scripts (01-init-app-role.sh, 02-init-rxresume.sh) and runs all migrations.
$ErrorActionPreference = "Stop"

Write-Host "Tearing down dev stack and destroying volumes..."
docker compose down -v

Write-Host "Starting dev stack..."
docker compose up -d

Write-Host "Waiting for migrations to complete..."
docker compose logs -f migrate 2>&1 | ForEach-Object {
    Write-Host $_
    if ($_ -match "(no change|error|done)") {
        break
    }
}

Write-Host "Database reset complete."
