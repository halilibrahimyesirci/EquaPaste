import { test, expect } from './extension';

// Smoke test: the conversion + clipboard-write path works end-to-end in a real
// Chromium with the extension loaded. (Native-Word paste itself is the manual
// the manual Word test — see docs/word-clipboard-findings.md.)
test('clipboard harness copies each format without error', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`chrome-extension://${extensionId}/clipboard-test.html`);

  for (const label of [
    'Copy ① OMML-in-HTML',
    'Copy ② MathML-in-HTML',
    'Copy ③ MathML (text)',
    'Copy ④ LaTeX (text)',
  ]) {
    await page.getByRole('button', { name: label }).click();
    await expect(page.locator('#status')).toContainText('Copied');
  }
});
