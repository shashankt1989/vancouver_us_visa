document.addEventListener(
	'DOMContentLoaded',
	function() {
		chrome.storage.local.get('loginLoad', ({ loginLoad }) => {
			document.getElementById('loginCount').textContent = loginLoad;
		});
		chrome.storage.local.get('appointmentLoad', ({ appointmentLoad }) => {
			document.getElementById('appointmentCount').textContent = appointmentLoad;
		});
		chrome.storage.local.get('tmrLoad', ({ tmrLoad }) => {
			document.getElementById('tmrCount').textContent = tmrLoad;
		});
		chrome.storage.local.get('unknownLoad', ({ unknownLoad }) => {
			document.getElementById('unknownCount').textContent = unknownLoad;
		});
	},
	false
);
