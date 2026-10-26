const STORAGE_KEY = 'stackerbox-arweave-consent';

let consentGiven = typeof localStorage !== 'undefined'
	? (localStorage.getItem(STORAGE_KEY) === 'true')
	: false;

let courtesyNoticeGiven = typeof localStorage !== 'undefined'
	? (localStorage.getItem(STORAGE_KEY + '-courtesy') === 'true')
	: false;

export const consentStore = {
	get consentGiven(): boolean {
		return consentGiven;
	},

	get courtesyNoticeGiven(): boolean {
		return courtesyNoticeGiven;
	},

	giveConsent() {
		consentGiven = true;
		localStorage.setItem(STORAGE_KEY, 'true');
	},

	giveCourtesyNotice() {
		courtesyNoticeGiven = true;
		localStorage.setItem(STORAGE_KEY + '-courtesy', 'true');
	},

	hasAnyConsent(): boolean {
		return consentGiven || courtesyNoticeGiven;
	}
};