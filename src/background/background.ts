function polling() {
  // console.log("polling");
  setTimeout(polling, 1000 * 30);
}

polling();

// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'start-focus',
      title: 'Start Focus',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'start-short-break',
      title: 'Start Short Break',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'start-long-break',
      title: 'Start Long Break',
      contexts: ['action']
    });

    chrome.contextMenus.create({
      id: 'view-history',
      title: 'View History',
      contexts: ['action']
    });
  });
});

// Handle menu item clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'start-focus':
      // TODO: Implement focus timer start
      break;
    case 'start-short-break':
      // TODO: Implement short break timer start
      break;
    case 'start-long-break':
      // TODO: Implement long break timer start
      break;
    case 'view-history':
      // TODO: Open history view
      chrome.runtime.openOptionsPage();
      break;
  }
});
