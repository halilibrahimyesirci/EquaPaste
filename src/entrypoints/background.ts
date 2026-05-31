// MV3 service worker. Kept thin: it cannot touch the clipboard (that happens in
// the content script). Responsibilities: open onboarding on install, relay the
// keyboard-command shortcuts to the active tab's content script.
export default defineBackground(() => {
  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      void chrome.tabs.create({ url: chrome.runtime.getURL('/onboarding.html') });
    }
  });

  // Keyboard shortcuts (manifest `commands`) -> tell the focused tab to copy.
  chrome.commands.onCommand.addListener((command, tab) => {
    if (!tab?.id) return;
    void chrome.tabs.sendMessage(tab.id, { type: 'equapaste:command', command }).catch(() => {
      // No content script on this tab (not an AI chat page) — ignore.
    });
  });

  // The in-page "settings" menu item can't open the options page directly.
  chrome.runtime.onMessage.addListener((msg: unknown) => {
    if ((msg as { type?: string })?.type === 'equapaste:open-options') {
      void chrome.runtime.openOptionsPage();
    }
  });
});
