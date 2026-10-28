'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'radar-auto-config-'));
process.env.HERDR_RADAR_STATE = path.join(sandbox, 'state');
process.env.XDG_CONFIG_HOME = path.join(sandbox, 'config');
process.env.HERDR_PLUGIN_CONFIG_DIR = path.join(sandbox, 'plugin');
fs.mkdirSync(process.env.HERDR_PLUGIN_CONFIG_DIR, { recursive: true });
fs.writeFileSync(path.join(process.env.HERDR_PLUGIN_CONFIG_DIR, 'config.toml'), 'auto_config = false\n');
const file = path.join(process.env.XDG_CONFIG_HOME, 'herdr', 'config.toml');
fs.mkdirSync(path.dirname(file), { recursive: true });
const before = '[ui]\n# maintained in dotfiles\n\n[theme]\nname = "catppuccin"\n';
fs.writeFileSync(file, before);

const config = require('../lib/config');
const managed = require('../lib/managed-config');
const setup = require('../lib/setup');
const font = require('../lib/font');
const herdr = require('../lib/herdr');
const appearance = require('../lib/appearance');
const { sync } = require('../bin/theme-sync');
test.after(() => fs.rmSync(sandbox, { recursive: true, force: true }));

test('automatic setup, repair and appearance sync preserve externally managed config', (t) => {
  assert.equal(config.autoConfig, false);
  t.mock.method(font, 'isInstalled', () => true);
  t.mock.method(font, 'installedPath', () => '/font.ttf');
  t.mock.method(herdr, 'reloadConfig', () => assert.fail('unexpected reload'));
  t.mock.method(herdr, 'configCheck', () => assert.fail('unexpected config write'));
  t.mock.method(appearance, 'takeChange', () => assert.fail('unexpected appearance probe'));
  assert.deepEqual(setup.ensure(), []);
  assert.equal(managed.apply({ automatic: true }).changed, false);
  assert.equal(managed.applyAppearance('light', { automatic: true }).changed, false);
  assert.equal(sync().off, true);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(process.env.HERDR_RADAR_STATE, 'backups')), false);
});

test('explicit configure and forced theme sync work with auto_config disabled', (t) => {
  t.mock.method(herdr, 'configCheck', () => ({ parses: true, ok: true, output: 'config: ok' }));
  assert.equal(managed.apply().ok, true);
  assert.match(fs.readFileSync(file, 'utf8'), /# >>> herdr-radar tab-bar block/);
  t.mock.method(appearance, 'current', () => 'light');
  t.mock.method(managed, 'applyAppearance', (variant, options) => {
    assert.equal(variant, 'light');
    assert.equal(options.automatic, false);
    return { ok: true, changed: false };
  });
  assert.equal(sync({ force: true }).variant, 'light');
});
