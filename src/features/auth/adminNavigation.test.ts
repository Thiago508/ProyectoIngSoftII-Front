import assert from 'node:assert/strict';
import test from 'node:test';
import { adminPaths, adminReturnPath } from './adminNavigation.ts';

test('solo admite destinos internos administrativos conocidos', () => {
  for (const path of adminPaths) assert.equal(adminReturnPath({ returnTo: path }), path);
  for (const state of [null, undefined, '/admin/products', {}, { returnTo: 'https://example.com' }, { returnTo: '//example.com' }, { returnTo: '/admin/products?next=https://example.com' }, { returnTo: '/catalog' }, { returnTo: '/admin/desconocida' }]) {
    assert.equal(adminReturnPath(state), null);
  }
});
