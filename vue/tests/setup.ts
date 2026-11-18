import { enableAutoUnmount } from '@vue/test-utils';
import { afterEach } from 'vitest';

enableAutoUnmount(afterEach);
afterEach(() => {
  // The bundle test runs in Node, without a document.
  if (typeof document !== 'undefined') document.body.innerHTML = '';
});
