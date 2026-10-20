import assert from 'node:assert/strict';
import fsPromises from 'node:fs/promises';
import process from 'node:process';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('batched idle ticks refresh status without filling the journal', async () => {
  const dir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'watch-pulse-'));
  process.env.HH_STORE = path.join(dir, 'hh.sqlite');
  const { watchPulse, watchView } = await import('./src/watch/watch.ts');
  const idle = sec => `~queue.idle|очередь|-|${sec}|queue.wake|w|1`;
  try {
    await watchPulse(`${idle(86381)}\n${idle(86382)}\n${idle(86383)}`, '0.5.133', 'full');
    assert.deepEqual(watchView().rows.map(row => row.text), ['жду очередь']);
    assert.equal(watchView().pulse.line, idle(86383));
    const at = watchView().pulse.at;
    await watchPulse(`[full] ${idle(86384)}\r\n[full] ${idle(86385)}`);
    assert.equal(watchView().rows.length, 1);
    assert.equal(watchView().pulse.line, idle(86385));
    assert.ok(watchView().pulse.at >= at);

    await watchPulse(`открыл вакансию\n${idle(1)}\n${idle(2)}`);
    assert.deepEqual(watchView().rows.map(row => row.text), ['жду очередь', 'открыл вакансию', 'жду очередь']);
    await watchPulse('сервер молчит');
    assert.equal(watchView().rows.at(-1).death, true);
    assert.equal(watchView().rows.at(-1).text, 'сервер молчит');
  }
  finally {
    await fsPromises.rm(dir, { recursive: true, force: true });
  }
});
