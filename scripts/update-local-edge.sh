#!/usr/bin/env bash
set -euo pipefail

source_root="$(cd "$(dirname "$0")/.." && pwd -P)"
cd "$source_root"
git_dir="$(git rev-parse --path-format=absolute --git-common-dir)"
install_root="$(dirname "$git_dir")/local-debug/edge-local"

mkdir -p "$install_root"
lock="$install_root/.update-lock"
if ! mkdir "$lock" 2>/dev/null; then
  echo "An Edge update is already running or left a lock at $lock" >&2
  exit 1
fi
trap 'rmdir "$lock"' EXIT

pnpm --filter @cursor-chrome/extension build

python3 - "$source_root" "$install_root" <<'PY'
import json
import shutil
import sys
import tempfile
from pathlib import Path

source, root = map(Path, sys.argv[1:])
build = source / 'apps/extension/dist'
installed = root / 'NoJobNoProblemBuddy'
version = json.loads((source / 'package.json').read_text())['version']
manifest = json.loads((build / 'manifest.json').read_text())
if manifest.get('version') != version or not manifest.get('key'):
    raise SystemExit('The build has an unexpected version or no extension key.')

if installed.exists():
    active = json.loads((installed / 'manifest.json').read_text())
    if active.get('key') != manifest['key']:
        raise SystemExit('The build has a different extension key.')
    if tuple(map(int, active['version'].split('.'))) > tuple(map(int, version.split('.'))):
        raise SystemExit('The installed version is newer than this build.')

with tempfile.TemporaryDirectory(dir=root) as temp:
    stage = Path(temp) / 'next'
    shutil.copytree(build, stage)
    manifest['version_name'] = f'{version} (local)'
    (stage / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    (stage / 'local-build-version.txt').write_text(version + '\n')
    backup = root / '.previous'
    if backup.exists():
        raise SystemExit(f'Previous update left a backup at {backup}. Inspect it before retrying.')
    if installed.exists():
        installed.rename(backup)
    try:
        stage.rename(installed)
    except OSError:
        if backup.exists():
            backup.rename(installed)
        raise
    if backup.exists():
        shutil.rmtree(backup)

print(f'NoJobNoProblemBuddy {version}: {installed}')
PY
