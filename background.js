let debugMode = false;

function funkyLog(msg) {
	console.info(Date().toString() + ' --- ' + msg);
}

chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.local.set({
		scriptDisabled: false,
		scriptPaused: true,
		tabId: -1,
		loginLoad: 0,
		appointmentLoad: 0,
		tmrLoad: 0,
		unknownLoad: 0
	});
	funkyLog('background script onInstalled');
	let currentDate = new Date();
	let startDate = null;
	let stopDate = null;
	let alarmDate = null;
	let currHour = currentDate.getHours();
	if (currHour < 2) {
		// start from today
		console.info('set alarms for today');
		alarmDate = currentDate;
	} else {
		console.info('set alarms for tomorrow');
		// start from next day
		alarmDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
	}
	startDate = new Date(alarmDate.getFullYear(), alarmDate.getMonth(), alarmDate.getDate(), 2);
	if (currHour < 17) {
		console.info('kick start script right now!');
		alarmDate = currentDate;
		startProcess();
	}
	stopDate = new Date(alarmDate.getFullYear(), alarmDate.getMonth(), alarmDate.getDate(), 23);

	console.info('startAlarm - ' + startDate.toString());
	console.info('pauseAlarm - ' + stopDate.toString());
	chrome.alarms.clearAll();
	chrome.alarms.create('startProcess', { when: startDate.valueOf(), periodInMinutes: 24 * 60 });
	chrome.alarms.create('pauseProcess', { when: stopDate.valueOf(), periodInMinutes: 24 * 60 });
	if (debugMode) {
		chrome.alarms.clearAll();
		chrome.alarms.create('startProcess', { when: Date.now() + 100, periodInMinutes: 24 * 60 });
	}
});

function startProcess() {
	console.info('startProcess called');
	chrome.storage.local.get('scriptDisabled', ({ scriptDisabled }) => {
		if (!scriptDisabled) {
			console.info('script not disabled');
			chrome.storage.local.set({
				scriptPaused: false
			});
			chrome.storage.local.get('tabId', ({ tabId }) => {
				if (tabId !== -1) {
					chrome.tabs.get(tabId).catch((error) => {
						funkyLog('Old tab with id ' + tabId + ' not found. will create new tab');
						tabId = -1;
					});
				}
				if (tabId == -1) {
					funkyLog('creating new tab');
					chrome.tabs
						.create({
							url: 'APPOINTMENT_URL',
							active: false,
							pinned: true,
							index: 0
						})
						.then(function(newTab) {
							chrome.storage.local.set({
								tabId: newTab.id,
								loginLoad: 0,
								appointmentLoad: 0,
								tmrLoad: 0,
								unknownLoad: 0
							});
						});
				}
			});
			chrome.storage.local.get('tabId', ({ tabId }) => {
				if (tabId != -1) {
					funkyLog('target tab id - ' + tabId + ' , reloading');
					chrome.tabs.update(tabId, {
						url: 'APPOINTMENT_URL'
					});
				}
			});
		}
	});
}

function pauseProcess() {
	funkyLog('pausing script for now');
	chrome.storage.local.set({
		scriptPaused: true
	});
	// potentially tear down tab?
}

chrome.alarms.onAlarm.addListener((alarm) => {
	funkyLog('got alarm - ' + alarm.name);
	if (alarm.name === 'startProcess') {
		startProcess();
	} else if (alarm.name === 'pauseProcess') {
		pauseProcess();
	}
});

chrome.webNavigation.onCompleted.addListener((details) => {
	chrome.storage.local.get([ 'tabId', 'scriptDisabled', 'scriptPaused' ], (result) => {
		if (details.tabId !== result.tabId || details.frameId !== 0) {
			return;
		}
		if (result.scriptDisabled || result.scriptPaused) {
			console.info('not loading content script is script is paused/disabled');
			return;
		}
		console.info(details.url);
		chrome.scripting.executeScript({
			target: { tabId: result.tabId },
			files: [ 'contentScript.js' ]
		});
	});
});

chrome.webNavigation.onErrorOccurred.addListener((details) => {
	chrome.storage.local.get('tabId', ({ tabId }) => {
		if (details.tabId !== tabId || details.frameId !== 0) {
			return;
		}
		funkyLog('my tab got some error - lets wait for divine intervention');
		console.info(details.error);
		//chrome.tabs.update(tabId, {
		//	url: 'APPOINTMENT_URL'
		//});
	});
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.logMessage) {
		funkyLog(request.logMessage);
		return;
	}
	if (request.setActive === true) {
		chrome.storage.local.get('tabId', ({ tabId }) => {
			chrome.tabs.update(tabId, { active: true });
		});
		return;
	}
	if (request.disableScript === true) {
		chrome.storage.local.get('tabId', ({ tabId }) => {
			chrome.tabs.update(tabId, { active: true });
		});
		chrome.storage.local.set({
			tabId: -1,
			scriptDisabled: true
		});
		funkyLog('rescheduled - disabling script');
		return;
	}
	if (request.pageName) {
		funkyLog(request.pageName);
	}
	if (request.pageName === 'login') {
		chrome.storage.local.get('loginLoad', ({ loginLoad }) => {
			chrome.storage.local.set({
				loginLoad: loginLoad + 1
			});
			console.log('login page');
		});
	} else if (request.pageName === 'appointment') {
		chrome.storage.local.get('appointmentLoad', ({ appointmentLoad }) => {
			chrome.storage.local.set({
				appointmentLoad: appointmentLoad + 1
			});
			console.log('appointment page');
		});
	} else if (request.pageName === '429') {
		chrome.storage.local.get('tmrLoad', ({ tmrLoad }) => {
			chrome.storage.local.set({
				tmrLoad: tmrLoad + 1
			});
			console.log('429 page');
		});
	} else if (request.pageName === 'unknown') {
		chrome.storage.local.get('unknownLoad', ({ unknownLoad }) => {
			chrome.storage.local.set({
				unknownLoad: unknownLoad + 1
			});
			console.log('unknown page');
		});
	} else {
		return;
	}
});
