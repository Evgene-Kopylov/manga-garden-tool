
function setActive() {
	chrome.action.setIcon( { path: 'images/btn_16.png' } );
	chrome.action.setTitle( { title: 'Click to select element' });
}

function setInactive() {
	chrome.action.setIcon( { path: 'images/btn_48.png' } );
	chrome.action.setTitle( { title: 'Click to select element' });
}

function checkActive() {
	chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
		if (!tabs || tabs.length === 0) return;
		const tab = tabs[0];
		if (!tab || tab.id < 0) return; // not really a tab, most likely a devtools window

		chrome.action.enable(tab.id);

		
		chrome.tabs.sendMessage(tab.id, { action: 'getStatus' }, function(isActive) {
			if (chrome.runtime.lastError) return;

			if (isActive) {
				setActive();
			} else {
				setInactive();
			}
		});
	});
}


chrome.contextMenus.create({
  id: 'manga-garden-menu',
  contexts: ['all'],
  title: 'manga.garden'
});


chrome.contextMenus.onClicked.addListener(function(info, tab) {
	if (info.menuItemId === 'manga-garden-menu') {
		chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
			if (!tabs || tabs.length === 0) return;
			const tab = tabs[0];
			
			chrome.tabs.sendMessage(tab.id, { 'action': 'rmb_event' }, function(response) {
				if (chrome.runtime.lastError) {
					// lastError needs to be checked, otherwise Chrome may throw an error
				}

				if (!response) {
					// Отправляем сообщение контент-скрипту для перезагрузки
					chrome.tabs.sendMessage(tab.id, { 'action': 'reload_page' });
				}
			});
		});
	}
});

chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
	if (msg.action == 'status' && msg.active == true) {
		setActive();
	} else if (msg.action == 'status' && msg.active == false) {
		setInactive();
	}

	if (msg.action == 'get_saved_elms') {
		chrome.storage.local.get(['web:' + msg.website], function(result) {
			sendResponse(result['web:' + msg.website] || '[]');
		});
		return true; // Keep message channel open for async response
	} else if (msg.action == 'set_saved_elms') {
		chrome.storage.local.set({ ['web:' + msg.website]: msg.data });
	} else if (msg.action == 'get_settings') {
		chrome.storage.local.get(['settings'], function(result) {
			sendResponse(result.settings || '{}');
		});
		return true; // Keep message channel open for async response
	} else if (msg.action == 'set_settings') {
		chrome.storage.local.set({ settings: msg.data });
	}
});

chrome.tabs.onActivated.addListener(function(activeInfo) {
	checkActive();
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	checkActive();
});

checkActive();


