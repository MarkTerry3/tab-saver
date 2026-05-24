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
      focused: true
    }).then((newWindow) => {
      // Open remaining tabs
      for (let i = 1; i < urls.length; i++) {
        browserAPI.tabs.create({
          windowId: newWindow.id,
          url: urls[i],
          active: false
        });
      }
    });
    
    sendResponse({ success: true });
  }
  
  return true; // Keep message channel open for async response
});
