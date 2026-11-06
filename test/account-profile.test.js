'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const state = require('../lib/state');
const herdr = require('../lib/herdr');
const { logoFor } = require('../lib/logos');

test('profile metadata travels into the same logo token in every state', async (t) => {
  for (const name of ['claude', 'codex']) {
    for (const profile of ['P', 'W', undefined, 'invalid']) {
      t.mock.method(herdr, 'agentsAsync', async () => [
        {
          pane_id: 'w1:p1',
          agent: name,
          agent_status: 'idle',
          tokens: { account_profile: profile },
        },
      ]);
      const [entry] = await state.snapshot();
      for (const display of state.STATES) {
        const line = state.composeLine(entry, display, '', '', 0);
        assert.equal(line.logo, logoFor(name) + (['P', 'W'].includes(profile) ? '\u2009' + profile : ''));
      }
    }
  }
});
