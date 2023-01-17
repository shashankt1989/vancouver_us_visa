let reloadTMRCount = 0;
function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
function logLikePro(message) {
	chrome.runtime.sendMessage({ logMessage: message });
}

async function beLazyLikeHuman() {
	let delaySec = 1 + Math.floor(Math.random() * 10);
	console.info('sleeping for ' + delaySec);
	await sleep(delaySec * 1000);
}

async function reloadTMRLikeHuman() {
	// reload upto 5 times with 20-40 seconds delay
	reloadTMRCount++;
	logLikePro('TMR reload attempt ' + reloadTMRCount);
	let delaySecs = 20 + Math.floor(Math.random() * 20);
	if (reloadTMRCount > 5) {
		delaySecs *= 60;
		reloadTMRCount = 0;
		console.info('too many attempts - lets reset');
	}
	logLikePro('TMR trying again after ' + delaySecs + ' seconds');
	window.setTimeout(function() {
		location.reload();
	}, 1000 * delaySecs);
}

async function handleLogin() {
	if ($("div[role='dialog']").length) {
		console.log('dialog showing up');
		await beLazyLikeHuman();
		$("div[role='dialog']").find("button[type='button']").click();
	}
	await beLazyLikeHuman();
	$("form[id='new_user']").find('#user_email').val('USERNAME');
	await beLazyLikeHuman();
	$("form[id='new_user']").find('#user_password').val('PASSWORD');
	await beLazyLikeHuman();
	$("form[id='new_user']").find("label[for='policy_confirmed']").click();
	await beLazyLikeHuman();
	$("form[id='new_user']").find("input[type='submit']").click();
}

async function handleAppointments() {
	let need_to_reload = true;
	await beLazyLikeHuman();
	// select vancouver as location
	$('#appointments_consulate_appointment_facility_id').children("option[value='95']").prop('selected', true);
	console.log('selected location - ' + $('#appointments_consulate_appointment_facility_id').val());
	await beLazyLikeHuman();

	if ($('#consulate_date_time_not_available').css('display') !== 'none') {
		logLikePro('No times available, lets retry again after a while');
	} else {
		$('#appointments_consulate_appointment_date').click();
		// data-month is 0 index based
		let total_available_dates = $('#ui-datepicker-div').find('td').not('.ui-datepicker-unselectable').find('a');
		let m1_available_dates = $('#ui-datepicker-div').find("td[data-month='0'][data-year='2023']").find('a');
		let m2_available_dates = $('#ui-datepicker-div').find("td[data-month='1'][data-year='2023']").find('a');
		logLikePro('Available dates in Month 1 - ' + m1_available_dates.length);
		logLikePro('Available dates in Month 2 - ' + m2_available_dates.length);
		logLikePro('total available dates - ' + total_available_dates.length);

		let found_available_date = false;
		if (m1_available_dates.length) {
			for (let i = 0; i < m1_available_dates.length; i++) {
				if (!$.inArray(m1_available_dates[i].text, [])) {
					logLikePro('Found date in Month 1 - ' + m1_available_dates[i].text);
					m1_available_dates[i].click();
					found_available_date = true;
					break;
				}
			}
		}
		if (m2_available_dates.length && !found_available_date) {
			for (let i = 0; i < m2_available_dates.length; i++) {
				if (!$.inArray(m2_available_dates[i].text, [])) {
					logLikePro('Found date in Month 2 - ' + m2_available_dates[i].text);
					m2_available_dates[i].click();
					found_available_date = true;
					break;
				}
			}
		}
		if (total_available_dates.length && !found_available_date) {
			for (let i = 0; i < total_available_dates.length; i++) {
				logLikePro('Found date in Total - ' + total_available_dates[i].text);
				total_available_dates[i].click();
				found_available_date = true;
				break;
			}
		}

		if (found_available_date) {
			// select first available time
			console.info(
				'Available times - ' + $('#appointments_consulate_appointment_time').children('option[value]').text()
			);
			$('#appointments_consulate_appointment_time').children('option[value]').prop('selected', true);
			$('#appointments_submit').click();
			chrome.runtime.sendMessage({ disableScript: true });
			need_to_reload = false;
			// make this active tab
			chrome.runtime.sendMessage({ setActive: true });
		}
	}
	if (need_to_reload) {
		// reload after 20-40 mins
		let delayMins = 20 + Math.floor(Math.random() * 20);
		window.setTimeout(function() {
			location.reload();
		}, 1000 * 60 * delayMins);
	}
	logLikePro('did not book anything - reloading after ' + delayMins + ' minutes');
}

// try to figure out which page we are in
let url = window.location.href;
console.log(url);
{
	let currentReloadTMRCount = reloadTMRCount;
	reloadTMRCount = 0;
	if (url === 'https://ais.usvisa-info.com/en-ca/niv/users/sign_in') {
		console.log('sign in page');
		chrome.runtime.sendMessage({ pageName: 'login' });
		handleLogin();
	} else if ($('#appointment-form').length) {
		console.info('appointment page');
		chrome.runtime.sendMessage({ pageName: 'appointment' });
		handleAppointments();
	} else if (document.title === '429 Too Many Requests') {
		reloadTMRCount = currentReloadTMRCount;
		chrome.runtime.sendMessage({ pageName: '429' });
		reloadTMRLikeHuman();
	} else {
		chrome.runtime.sendMessage({ pageName: 'unknown' });
		/*window.setTimeout(function () {
    $(location).attr(
      "href",
      "https://ais.usvisa-info.com/en-ca/niv/schedule/36352609/appointment"
    );
  }, 1000 * 5);*/
		// chrome.runtime.sendMessage({ setActive: true });
	}
}
