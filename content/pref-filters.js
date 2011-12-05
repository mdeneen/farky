// Initialize when the options window opens
window.addEventListener("load", function() { FARKY_FILTERS.init(); }, false);

var FARKY_FILTERS = {

    keyword     : null,
    where       : null,
    action      : null,
    colorpicker : null,
    filtertime  : null,
    autodelete  : null,
    timereset   : null,

    editEntry   : null,


    init : function () {

	// Find data fields in the window.
	this.keyword     = document.getElementById("keyword");
	this.where       = document.getElementById("where");
	this.action      = document.getElementById("action");
	this.colorpicker = document.getElementById("hilight_colorpicker");
	this.filtertime  = document.getElementById("filtertime");
	this.autodelete  = document.getElementById("autodelete");
	this.timereset   = document.getElementById("timereset");

	// Customize colorpicker colors
	FARKY_COLORPICKER_CUSTOMIZE(this.colorpicker, document);

	// We can be triggered in a few different cases:
	// 1. User (optionally) selected word in headline and right-clicked for "Add Headline Filter".
	// 2. User clicked "Add" from Farky Options.
	// 3. User selected an existing filter from Farky Options and clicked "Edit". Arg is an Array.

	if (window.arguments && window.arguments[0] != "") {

		if (window.arguments[0] == "add" && window.arguments[1] != null) {
			// Pre-fill textbox with the cleaned-up word selected by the user.
			this.keyword.value = window.arguments[1].replace(/^\s+/,'').replace(/\s+$/,'').toLowerCase();
		} else if (window.arguments[0] == "modify") {
			// Fill in all fields with data from an existing filter.

			this.editEntry = window.arguments[1];

			this.keyword.value      = this.editEntry.keyword;
			this.where.value        = this.editEntry.where;
			this.action.value       = this.editEntry.action;
			// Only set color if needed, as non-hilight actions set the color to white.
			if (this.editEntry.action == "hilight") { this.colorpicker.color  = this.editEntry.color; }
			this.filtertime.value   = this.editEntry.duration;
			this.autodelete.checked = this.editEntry.autodelete;
			this.timereset.hidden    = false;

			if (this.editEntry.duration == 0 || this.editEntry.duration == -1) {
				this.autodelete.disabled = true;
			}

			if (this.editEntry.action == "hilight") {
				this.colorpicker.setAttribute('style', 'visibility: visible');
			}
		}
	}
    },


    save : function() {
	var entry;

	entry = this.editEntry ? this.editEntry : new Array();

	// Convert case and trim leading/trailing whitespace
	entry.keyword = this.keyword.value.replace(/^\s+/,'').replace(/\s+$/,'').toLowerCase();

	// Check for empty input
	if (entry.keyword == "") {
		alert("You must enter a keyword.");
		return false;
	}

	entry.where = this.where.value;
	entry.action = this.action.value;
	entry.color = entry.action == "hilight" ? this.colorpicker.color : "#ffffff";
	entry.duration = parseInt(this.filtertime.value);
	entry.autodelete = this.autodelete.checked;

	// Always true for a new filter
	if (this.timereset.checked) {
		now = new Date();
		entry.startTime = Math.round(now.getTime() / 1000);
		entry.expired = false;
	}

	if (entry.duration > 0) {
		entry.endTime = entry.startTime + entry.duration;
	} else {
		entry.endTime = entry.duration;
	}

	if (!this.editEntry) { FARKY_DATA.filters.push(entry); }

	FARKY_DATA.save_filters();

	return true;
    }
};
