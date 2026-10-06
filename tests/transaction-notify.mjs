import assert from 'node:assert/strict';
import { commitThenNotify } from '../lib/commit-notify.mjs';

let committed = false;
let notifications = 0;
const result = await commitThenNotify(
  async () => { committed = true; return { revision: 17 }; },
  async value => { assert.equal(committed, true, 'notify runs after commit resolves'); assert.equal(value.revision, 17); notifications++; },
);
assert.equal(result.revision, 17);
assert.equal(notifications, 1);

await assert.rejects(() => commitThenNotify(
  async () => { throw new Error('rollback'); },
  async () => { notifications++; },
));
assert.equal(notifications, 1, 'a rolled-back transaction emits no notification');
console.log('PASS Realtime notification occurs after commit and not after rollback.');
