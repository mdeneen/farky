///////////////////////////////////////////////////////////////////////////
//
//			HEADLINES PAGE PROCESSING...
//
///////////////////////////////////////////////////////////////////////////

var FARKY_HEADLINES = {

    //
    // Current HTML / DOM structure of Fark article pages:
    //
    //
    //          TD  (center column of page)
    //          |
    // ..---.---'------------.------------------------.------.. (misc #text and #comment)
    //      |                |                        |
    //    TABLE (header)   TABLE  (1 for each hour)   TABLE (farkives)
    //                       |
    //           .------.----'-.  class=nilink
    //           |      |      |
    //        #text   TBODY   #text
    //                  |
    //         .--------'--.------------------------.---------------.---.---.-----... (misc #text too)
    //         |           |                        |               |   |   |
    //         TR (empty)  TR ("To read articles")  TR (date bar)   TR  TR  TR (articles)
    //                                                              |   |   |
    //      .-------------.------------.----------------.-----------'   .   .
    //      |             |            |                |
    //      TD (link)     TD (tag)     TD (headline)    TD (comment count)  [5 "#text"s here too]
    //

    ////////////////////////////////////////////////////////////////////////////
    //
    // Process the page. [Main entry point]
    //
    process : function(page, state) {
	var TABLE, TR, TD;
	var chunking, chunkbits = 0, chunksize, chunkdelay, doLater = false, resumingTABLE = false;
	var runtime_start, runtime_end, runtime, moreinfo;
	var firstSeen;

	runtime_start = new Date();

	var prefs = FARKY_DATA.prefs;
	chunking = prefs.getBoolPref("headlines.chunk");
	chunksize = prefs.getIntPref("headlines.chunkSize");
	chunkdelay = prefs.getIntPref("headlines.chunkDelay");

	// 'state' holds all the state needed for processing headlines. We store it so that we can
	// interrupt and resume via setTimeout(), if we're doing chunking.
	if (state == null)
	{
		filter = new Array();
		filter.star           = prefs.getBoolPref("headlines.filterStar");
		filter.newcomments    = prefs.getBoolPref("headlines.filterNew");
		filter.newthreads     = prefs.getBoolPref("headlines.filterNewThreads");
		filter.posted         = prefs.getBoolPref("headlines.filterPosted");
		filter.debug          = prefs.getBoolPref("debug.fakeFilter");
		filter.greenbar       = prefs.getBoolPref("headlines.greenbar");
		filter.greenbarColor  = prefs.getCharPref("headlines.greenbarColor");
		filter.greenlit       = prefs.getBoolPref("headlines.hideGreenlit");
		filter.NSFW           = prefs.getBoolPref("headlines.hideNSFW");
		filter.keywords       = prefs.getBoolPref("keywords");
		filter.slow           = prefs.getBoolPref("headlines.hideSlow");
		filter.slowThresh     = prefs.getIntPref( "headlines.hideSlowMax");
		filter.showNewCount   = prefs.getIntPref("headlines.showNewCount");

		state = new Array();
		state.filter      = filter;
		state.tables      = page.getElementsByTagName("table");
		state.tableNum    = 0;
		state.rowNum      = 0;
		state.sectionNum  = 0;
		state.submissions = 0;
		state.runtime     = 0;
		state.chunks	= 0;
		state.pageTime    = FARKY.getPageTime(page);
		state.finalTable = null;


		state.currController = null;
		state.prevController = null;
		state.prevHeadline = null;

		if (filter.keywords)
		{
			FARKY_DATA.check_expired_filters();
		}
	}
	else
	{
		// XXX - add explicit check to see if page is still active or not?
		resumingTABLE = true;
	}

	//FARKY.log("Processing @ section #" + state.sectionNum + ", row #" + state.rowNum);

	// Loop through each table in the page.
	for (; state.tableNum < state.tables.length; state.tableNum++)
	{
//		FARKY.log("state.tableNum " + state.tableNum " of " + state.tables.length);
		

		TABLE = state.tables[state.tableNum];

		// Skip if not a headline section container.
//		if (!TABLE.className || TABLE.className != "nilink") { continue; }
//		if (!TABLE.className || TABLE.className == "mainnotice") { continue; }
		if (!TABLE.rows || TABLE.rows.length == 0 || !TABLE.rows[0] || !TABLE.rows[0].className || TABLE.rows[0].className != "headlineRow")
			{ continue; }

// insert the icon line
//		if (TABLE.rows[0].cells.length != 1)
//		{
//			var _row = TABLE.insertRow(0);
//			_row.className = "headlineRow";
//			_cell = _row.insertCell(0);
//			_cell.colSpan = 4;
//			_cell.innerHTML = '<table width="100%"><tbody><tr><td class="dateheader" align="left" width="38%">&nbsp;</td><td class="topsubmit" align="center">&nbsp;</td><td class="dateheader" align="right" width="38%">&nbsp;</td></tr></tbody></table>';
//		}

		state.finalTable = TABLE;

		if (resumingTABLE) {
			// Don't change section/row if we just started a resume
			resumingTABLE = false;
		} else {
			state.sectionNum++;
			state.rowNum = 0;
			state.prevHeadline = null;
		}

		// Fark's current HTML format:
		//
//		// 1st TR is empty. Dunno why it suddenly appeared around March 2005. class="howto"
		// 2nd TR is the "To read articles instructions. class="howto"
		// 3rd TR is the grey section marker. [TotalFark = per-hour, Fark = per-day]
		// 4th (and on) TRs are the submissions
		//
		var tableLen = TABLE.rows.length;
		for(; !doLater && state.rowNum < tableLen; state.rowNum++)
		{

			TR = TABLE.rows[state.rowNum]; 

			// Figure out what kind of row we're looking at.
			// * The useless "To read articles..." instructions have a first TD with class="howto"
			// * Assume the first classless row is the section header, and the rest are headlines.
			//
			if (TR.cells.length == 4)
			{
				// ------------------  headline -------------------
				TD = TR.cells[3];
				state.submissions++;

				// Binding on the TD only shows up if we call replaceChild. No obvious performance hit, so who cares.
				//TR.replaceChild(TD, TD);
				TR.removeChild(TD);
				TR.appendChild(TD);


				// Init new thread data here, so we don't have to give all of FARKY_DATA to binding
				// XXX could make this a getter in FARKY_DATA?
				firstSeen = false;
				TD.wrappedJSObject.ghettoConstructor();

				var threadID = TD.wrappedJSObject._threadID;
				if (FARKY_DATA.threads[threadID] == null)
				{
					FARKY_DATA.thread_init(threadID);
					firstSeen = true;
				}

				TD.wrappedJSObject.init(state.filter, FARKY_DATA.threads[threadID], FARKY_DATA.filters, state.pageTime,
					state.currController, (state.prevHeadline ? state.prevHeadline.wrappedJSObject : null), firstSeen);

				state.prevHeadline = TD;

			}
			else if (TR.cells.length == 1)
			{
				// ------------------  junk row -------------------
//no 'howto' anymore
				// Hide the useless instructions above each section header
				// Can't seem to do this via CSS: no way to select TR based on child TD class
//				if (TR.cells[0].className && TR.cells[0].className == "howto")
//				{
//					TR.style.display = "none";
//					continue;
//				}

				// ------------------  section header -------------------


				// Note that TD.parentNode is a different TR, we're in an embedded table.
				TD = state.currController = FARKY_HEADLINES.getControllerForNode(TR, true);

				//TD.parentNode.replaceChild(TD, TD);
				var TR2 = TD.parentNode;
				TR2.removeChild(TD);
				TR2.appendChild(TD);

				TD.wrappedJSObject.init(state.filter, state.sectionNum,
					state.prevController ? state.prevController.wrappedJSObject : null);

			}
			else
			{
				FARKY.log("Warning: confused on row #" + state.rowNum + " of section #" + state.sectionNum);
			}

			if (chunking && ++chunkbits >= chunksize)
			{
				doLater = true;
				state.chunks++;
			}

		} // TR loop

		if (doLater)
		{
			break;
		}

		// Hide (or not) the section we just finished processing
		state.currController.wrappedJSObject.checkVisibility();
		state.prevController = state.currController;

	} // TABLE loop

	runtime_end = new Date();


	// Test on Nov 12:
	// Fark Lite    =  107 submissions, processing = 0.17sec
	// TF Commented = 1590 submissions, processing = 3.45sec
	// TF main      = 1694 submissions, processing = 3.70sec
	//
	if (FARKY_DATA.prefs.getBoolPref("debug.logPerf")) {
		runtime = (runtime_end.getTime() - runtime_start.getTime()) / 1000;
		state.runtime += runtime;
		if (doLater) {
			FARKY.log("Processed headline chunk #" + state.chunks + " in " + runtime.toString().substr(0,5) +
				" sec. (" + state.runtime.toString().substr(0,5) + " sec, " + state.submissions +
				" headlines total). Chunksize is " + chunksize + "." +
				" [" + page.location.pathname + page.location.search + "]");
			
		} else {
			FARKY.log("Finished processing " + state.submissions + " headlines in " +
				state.runtime.toString().substr(0,5) + " sec. [" +
				page.location.pathname + page.location.search + "] pagetime = " + state.pageTime);
		}
	}

	if (doLater) {
		setTimeout(FARKY_HEADLINES.process, chunkdelay, page, state);
		return;
	}

	// Display headline count at end of page.
	var statDIV = page.createElement("DIV");
	statDIV.appendChild(page.createTextNode("Farky found " + state.submissions + " headlines on this page."));
	statDIV.style.paddingTop = "1em";
	state.finalTable.parentNode.insertBefore(statDIV, state.finalTable.nextSibling);

	FARKY_DATA.save_threads();

	return;
    },


    ////////////////////////////////////////////////////////////////////////////
    //
    // getControllerForNode
    //
    // Get the controller that is a parent of the specified node.
    //
    // The specified node can be any TR in a section table (including the TR holding the controller).
    // Nodes outside the controller's child-tree will result in a return of null.
    //
    getControllerForNode :  function (origNode, prebind) {
	// TR is the row sibling to the headlines, which has an embedded table with the TR we really want.
	var i, node = origNode, TD = null, TABLE = null, TBODY = null, TR2 = null, TD2 = null;

	// If this is a prebind search, the specified node is already the TR we want. No need to look for it.
	// Otherwise find the first parent TR (which is usually a headline TR), then find the first TR in that TABLE.

	if (prebind) {
		TD = node.cells[0];
	} else {
		// Walk up DOM until we find a TR. Then jump to the first TR in that TBODY to search for header TR.

		while (node) {
			if (node.nodeName == "TR") { TBODY = node.parentNode; break; }
			node = node.parentNode;
		}

//CARL this might break things
		// The first few TR's are the junk rows at the top of a section (howto and stuff)
//		for (var i = 0; i < TBODY.rows.length; i++) {
//			TD = TBODY.rows[i].cells[0];
//			if (TD.className && TD.className == "howto") { TD = null; continue; }
//			break;
//		}
	}

	// Find the TABLE in the TD.
	TABLE = TD.firstChild;
	while (TABLE.nodeName != "TABLE") {
		TABLE = TABLE.nextSibling;
	}

	// first row
	TR2 = TABLE.rows[0];

	// last cell of row
	TD2 = TR2.cells[TR2.cells.length - 1];

	if (TD2 == null) {
		FARKY.log("Warning: while attempting locate controller XBL binding, found unexpected HTML." +
			"  origNode=" + origNode + "node= " + node +
			" TD=" + TD + " TBODY=" + TBODY + " TABLE=" + TABLE +
			" TR2=" + TR2 + " TD2=" + TD2 + " prebind? " + prebind);
		return null;
	}

	return TD2;
    },



    ///////////////////////////////////////////////////////////////////////////
    //
    //			USER-EVENT CALLBACKS...
    //
    ///////////////////////////////////////////////////////////////////////////


    addKeyword : function() {
	var keyword = new String(content.window.getSelection());

	window.openDialog("chrome://farky/content/pref-filters.xul", "farkyFilters", "modal, resizable=no",
		'add', keyword);

	FARKY_DATA.save_filters();
    },

};
