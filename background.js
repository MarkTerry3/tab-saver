// Background script for Tab Saver
// This persists even when popup closes

const browserAPI = typeof browser !== 'undefined' ? browser : chrome;

// Listen for messages from popup
browserAPI.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openAllTabs') {
    const urls = message.urls;
    
    if (!urls || urls.length === 0) {
      sendResponse({ success: false, error: 'No URLs provided' });
      return;
    }
    
    // Create window with first URL
    browserAPI.windows.create({
      url: urls[0],
      focused: true,
      incognito: !!message.incognito
    }).then((newWindow) => {
      // Open remaining tabs
      for (let i = 1; i < urls.length; i++) {
        browserAPI.tabs.create({
          windowId: newWindow.id,
          url: urls[i],
          active: false
        });
      }
      sendResponse({ success: true });
    }).catch((err) => {
      // Most common cause: extension not allowed in private/incognito windows.
      // Firefox: about:addons -> Tab Saver -> Run in Private Windows
      // Chrome: extension details -> Allow in Incognito
      if (message.incognito) {
        const isFirefox = typeof browser !== 'undefined';
        const setting = isFirefox ? '"Run in Private Windows"' : '"Allow in Incognito"';
        sendResponse({
          success: false,
          error: `Enable ${setting} for Tab Saver in your browser's extension settings`
        });
      } else {
        sendResponse({ success: false, error: err.message });
      }
    });
  }
  
  return true; // Keep message channel open for async response
});
