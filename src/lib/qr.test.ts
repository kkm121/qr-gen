import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPayload,
  normalizeUrl,
  validateInputs,
  contrastRatio,
  calculateScanScore,
  getScanWarnings,
  isValidHex,
  PRESETS,
  DEFAULT_OPTIONS,
  DEFAULT_FIELDS,
  type TypeFields,
} from './qr.ts';

test('QR Payload Generation', async (t: TestContext) => {
  await t.test('normalizes URL without scheme', () => {
    assert.equal(normalizeUrl('gdgsrm.com'), 'https://gdgsrm.com');
    assert.equal(normalizeUrl('https://example.com/page'), 'https://example.com/page');
    assert.equal(normalizeUrl('http://insecure.test'), 'http://insecure.test');
  });

  await t.test('builds valid URL payload', () => {
    const fields: TypeFields = {
      ...DEFAULT_FIELDS,
      url: { url: 'gdgsrm.com/events' },
    };
    assert.equal(buildPayload('url', fields), 'https://gdgsrm.com/events');
  });

  await t.test('builds valid Text payload', () => {
    const fields: TypeFields = {
      ...DEFAULT_FIELDS,
      text: { text: 'GDG SRM On Campus 2026' },
    };
    assert.equal(buildPayload('text', fields), 'GDG SRM On Campus 2026');
  });

  await t.test('builds valid Email payload with mailto scheme and query params', () => {
    const fields: TypeFields = {
      ...DEFAULT_FIELDS,
      email: { to: 'technical@gdgsrm.com', subject: 'Inquiry', body: 'Hello GDG' },
    };
    assert.equal(
      buildPayload('email', fields),
      'mailto:technical@gdgsrm.com?subject=Inquiry&body=Hello+GDG'
    );
  });

  await t.test('builds valid Phone payload with tel scheme', () => {
    const fields: TypeFields = {
      ...DEFAULT_FIELDS,
      phone: { phone: '+91 98765 43210' },
    };
    assert.equal(buildPayload('phone', fields), 'tel:+919876543210');
  });

  await t.test('builds valid Wi-Fi payload with escaping', () => {
    const fields: TypeFields = {
      ...DEFAULT_FIELDS,
      wifi: { ssid: 'Campus;Net', password: 'pass:word', encryption: 'WPA', hidden: false },
    };
    const payload = buildPayload('wifi', fields);
    assert.equal(payload, 'WIFI:T:WPA;S:Campus\\;Net;P:pass\\:word;;');
  });

  await t.test('builds open Wi-Fi network payload without password', () => {
    const fields: TypeFields = {
      ...DEFAULT_FIELDS,
      wifi: { ssid: 'GuestNet', password: '', encryption: 'nopass', hidden: true },
    };
    const payload = buildPayload('wifi', fields);
    assert.equal(payload, 'WIFI:T:nopass;S:GuestNet;H:true;;');
  });
});

test('Input Validation & Error Handling', async (t: TestContext) => {
  await t.test('validates URL correctly', () => {
    assert.deepEqual(validateInputs('url', { ...DEFAULT_FIELDS, url: { url: '' } }), [
      'URL is required.',
    ]);
    const invalidErrors = validateInputs('url', { ...DEFAULT_FIELDS, url: { url: 'not-a-domain' } });
    assert.ok(invalidErrors.length > 0);
  });

  await t.test('validates email format', () => {
    assert.deepEqual(validateInputs('email', { ...DEFAULT_FIELDS, email: { to: '', subject: '', body: '' } }), [
      'Recipient email is required.',
    ]);
    const badEmail = validateInputs('email', {
      ...DEFAULT_FIELDS,
      email: { to: 'bad-email-format', subject: '', body: '' },
    });
    assert.ok(badEmail.includes('Enter a valid email address.'));
  });

  await t.test('validates phone number digit requirements', () => {
    const emptyPhone = validateInputs('phone', { ...DEFAULT_FIELDS, phone: { phone: '' } });
    assert.ok(emptyPhone.includes('Phone number is required.'));

    const shortPhone = validateInputs('phone', { ...DEFAULT_FIELDS, phone: { phone: '123' } });
    assert.ok(shortPhone.some((e) => e.includes('valid phone number')));
  });

  await t.test('validates Wi-Fi network fields', () => {
    const emptySsid = validateInputs('wifi', {
      ...DEFAULT_FIELDS,
      wifi: { ssid: '', password: 'test', encryption: 'WPA', hidden: false },
    });
    assert.ok(emptySsid.includes('Wi-Fi network name (SSID) is required.'));
  });
});

test('Options & Scan Reliability', async (t: TestContext) => {
  await t.test('validates hex colors', () => {
    assert.equal(isValidHex('#ffffff'), true);
    assert.equal(isValidHex('#000'), true);
    assert.equal(isValidHex('#123456'), true);
    assert.equal(isValidHex('rgb(0,0,0)'), false);
    assert.equal(isValidHex('#12345'), false);
  });

  await t.test('calculates correct contrast ratio and scan reliability score', () => {
    const maxContrast = contrastRatio('#000000', '#ffffff');
    assert.ok(maxContrast > 20 && maxContrast <= 21);

    const minContrast = contrastRatio('#ffffff', '#ffffff');
    assert.equal(minContrast, 1);

    const optimalScore = calculateScanScore(21, 'H', 2, false);
    assert.equal(optimalScore, 100);

    const penaltyScore = calculateScanScore(1.2, 'L', 0, true);
    assert.ok(penaltyScore < 30);
  });

  await t.test('flags warnings on low contrast', () => {
    const warnings = getScanWarnings('https://gdgsrm.com', {
      ...DEFAULT_OPTIONS,
      fg: '#777777',
      bg: '#888888',
    });
    assert.ok(warnings.some((w) => w.level === 'error' && w.message.includes('Very low contrast')));
  });

  await t.test('flags warning on logo with low error correction level', () => {
    const warnings = getScanWarnings('https://gdgsrm.com', {
      ...DEFAULT_OPTIONS,
      ec: 'L',
      logoDataUrl: 'data:image/png;base64,mock',
      logoSize: 0.35,
    });
    assert.ok(warnings.some((w) => w.message.includes('Logo with low error correction')));
  });

  await t.test('presets have complete and valid configurations', () => {
    assert.ok(PRESETS.length >= 4);
    for (const preset of PRESETS) {
      assert.ok(preset.id && preset.name);
      if (preset.patch.fg) assert.ok(isValidHex(preset.patch.fg));
      if (preset.patch.bg) assert.ok(isValidHex(preset.patch.bg));
    }
  });
});

test('Recent Generations Database Engine', async (t: TestContext) => {
  const { dbSaveRecent, dbGetRecents, dbDeleteRecent, dbClearRecents, dbExportJSON } = await import('./db.ts');

  await t.test('saves, retrieves, and deduplicates recent records', async () => {
    await dbClearRecents();
    const item1 = {
      type: 'url' as const,
      payload: 'https://example.com/test1',
      options: DEFAULT_OPTIONS,
    };
    const saved = await dbSaveRecent(item1);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].payload, 'https://example.com/test1');

    // Duplicate save should not create redundant entry
    const dupe = await dbSaveRecent(item1);
    assert.equal(dupe.length, 1);

    // Save second different item
    const item2 = {
      type: 'text' as const,
      payload: 'Hello Database',
      options: DEFAULT_OPTIONS,
    };
    const saved2 = await dbSaveRecent(item2);
    assert.equal(saved2.length, 2);
    assert.equal(saved2[0].payload, 'Hello Database');
  });

  await t.test('deletes individual records and clears database', async () => {
    const list = await dbGetRecents();
    assert.ok(list.length > 0);
    const targetId = list[0].id;

    const afterDelete = await dbDeleteRecent(targetId);
    assert.ok(!afterDelete.some((r) => r.id === targetId));

    await dbClearRecents();
    const afterClear = await dbGetRecents();
    assert.equal(afterClear.length, 0);
  });

  await t.test('exports valid formatted JSON archive', async () => {
    await dbSaveRecent({
      type: 'url' as const,
      payload: 'https://test-export.com',
      options: DEFAULT_OPTIONS,
    });
    const jsonStr = await dbExportJSON();
    assert.ok(jsonStr.length > 0);
    const parsed = JSON.parse(jsonStr);
    assert.equal(parsed.database, 'QRStudioDB');
    assert.ok(parsed.records.length >= 1);
  });
});
