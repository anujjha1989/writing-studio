// Exercise the real installer without contacting Apple or installing on a device.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ws-signing-'));
try {
  const scripts = path.join(root, 'ios/scripts'), bin = path.join(root, 'bin');
  fs.mkdirSync(scripts, { recursive: true }); fs.mkdirSync(bin);
  fs.copyFileSync(new URL('../ios/scripts/install.sh', import.meta.url), path.join(scripts, 'install.sh'));
  const stub = (name, body) => fs.writeFileSync(path.join(bin, name), '#!/bin/bash\n' + body, { mode: 0o755 });
  stub('defaults', 'exit 1\n');
  stub('xcodegen', 'exit 0\n');
  stub('xcrun', 'echo "$*" >> "$CALLS"\n');
  stub('xcodebuild', `echo "$*" >> "$CALLS"
case "$SCENARIO:$*" in
  local:*) exit 0 ;;
  missing:*allowProvisioningUpdates*) exit 0 ;;
  account:*allowProvisioningUpdates*) echo 'error: No Accounts'; exit 65 ;;
  missing:*|account:*) echo 'error: No profiles for com.anujjha.writingstudio were found'; exit 65 ;;
  *) echo 'error: Swift compilation failed'; exit 65 ;;
esac
`);
  for (const scenario of ['local', 'missing', 'account', 'compile', 'no-team']) {
    const calls = path.join(root, `${scenario}.log`);
    const result = spawnSync('bash', [path.join(scripts, 'install.sh')], {
      encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, DEVELOPMENT_TEAM: scenario === 'no-team' ? '' : 'TESTTEAM', DEVICE: 'test-phone', SCENARIO: scenario, CALLS: calls },
    });
    const log = fs.existsSync(calls) ? fs.readFileSync(calls, 'utf8') : '';
    assert.equal(result.status, ['local', 'missing'].includes(scenario) ? 0 : 1, result.stderr);
    assert.equal(log.includes('device install app'), ['local', 'missing'].includes(scenario), 'never install a failed build');
    assert.equal(log.includes('-allowProvisioningUpdates'), ['missing', 'account'].includes(scenario), 'refresh only for signing errors');
    if (scenario === 'account') assert.match(result.stdout, /may already be signed in/);
    if (scenario === 'no-team') assert.match(result.stdout, /No Apple team found/);
  }
  console.log('iOS installer tests passed');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
