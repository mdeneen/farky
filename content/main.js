// Initialize Farky once the main FF window has been created. (has nothing to do with web pages loading)
window.addEventListener("load", function() { FARKY.init(); }, false);


//
// Extension code stored in a single object. This elimiates problems with namespace collisions.
//
var FARKY = {
    _debuglog   : true,  // will be reset to whatever the pref value is.
    _logService : null,
//    _version : null,

    ////////////////////////////////////////////////////////////////////////////
    //
    // Log debug messages to the Javascript console.
    // (assuming javascript.options.showInConsole is true in about:config)
    //
    log : function (message) {

	if (!FARKY._debuglog) { return; }

	if (FARKY._logService == null) {
		FARKY._logService = Components.classes['@mozilla.org/consoleservice;1'].getService();
		FARKY._logService.QueryInterface(Components.interfaces.nsIConsoleService);
	}

	FARKY._logService.logStringMessage("Farky: " + message);
    },



    ////////////////////////////////////////////////////////////////////////////
    //
    // Initialize Farky
    //
    init : function() {

	FARKY.log("Initializing FARKY...");

	var appcontent = document.getElementById("appcontent");
	if (appcontent) {
		// Previously we were using the onload event, which doesn't fire until all content
		// (such as images) loaded. Photoshop threads were unbearable:
		//	appcontent.addEventListener("load", farky_onPageLoad, true);
		//
		// I stumbled up the GreaseMonkey extension at http://greasemonkey.mozdev.org/ which
		// was using the undocumented DOMContentLoaded event to process the page earlier.
		// FWIW, IE apparently uses (document.?)readyState == "interactive" and onreadystatechange
		// to do the same thing.
		appcontent.addEventListener("DOMContentLoaded", FARKY.onPageLoad, true);

	}

	var contextmenu = document.getElementById("contentAreaContextMenu");
	if (contextmenu) {
		contextmenu.addEventListener("popupshowing", FARKY.setMenuEntries, false);
	}

	FARKY_DATA.init();

	// Load needed stylesheets
	FARKY.cssSync(true, "farky");

	if (FARKY_DATA.prefs.getBoolPref("headlines.colorblind"))
	{
		FARKY.cssSync(true, "colorblind");
	}

	if (FARKY_DATA.prefs.getBoolPref("widescreen"))
	{
		FARKY.cssSync(true, "wide");
	}

	FARKY.log("FARKY Initialization done.");

	FARKY._debuglog = FARKY_DATA.prefs.getBoolPref("debug.log");

	// Open JS Console when debugging. [This function is what the FF menu calls]
	// Check for undefined if we're loading in our preferences window.
	if (FARKY_DATA.prefs.getBoolPref("debug.openConsole") && typeof toJavaScriptConsole != "undefined")
	{
		toJavaScriptConsole();
	}
    },


    ////////////////////////////////////////////////////////////////////////////
    //
    // Main onload handler. Figure out what to do based on URL.
    //
    onPageLoad : function(event) {

	//				!!! NOTICE !!!
	//
	// Can't use content.document or window.content.document, as these point
	// to the stuff in the user's ACTIVE tab. If we were triggered by an event
	// from a page loading in a background tab, we'll be looking at the wrong data!
	// We thus pass around "page" instead, which is specific to the triggering event.
	//
//	var page = event.target;
	var page = event.originalTarget;

	// If current site isn't Fark, bail out quickly.
	// Note that page.location has no properties for the about:* pages. Also, for XUL error
	// pages page.location points to the failed website, whereas page.URL is about:neterror
	//
	if ((page.location.protocol == "http:") || (page.location.protocol == "https:"))
	{
		var thehost = page.location.host.toLowerCase();
		FARKY.log("Host is [" + thehost  + "]");
		if (! (thehost.match("foobies.com") || thehost.match("fark.com")))
		{
		  // Definetly not foobies, fark or totalfark. bail! CJE 20090518
		  // ultrafark.com can fend for itself later on.
		  FARKY.log("Bailing");
		  return;
		}
	} else if (page.location.protocol == "file:") {
		if (FARKY_DATA.prefs.getCharPref("debug.localfileAs") == "normal") { return; }
	} else {
		return;
	}


//        if (FARKY._version == null) {
//                var em = Components.classes["@mozilla.org/extensions/manager;1"]
//                                      .getService(Components.interfaces.nsIExtensionManager);
//        	var addon = em.getItemForID("{9c9c8cff-c707-48b9-b81e-6fceeb4ce43e}");
//                FARKY._version = addon.version;
//        }
//        window.content.wrappedJSObject._farky_version = FARKY._version;

	// Reset logging to current user value.
	FARKY._debuglog = FARKY_DATA.prefs.getBoolPref("debug.log");

	// Determine if this page is full of headlines or comments
	if (FARKY.isCommentPage(page) && FARKY_DATA.prefs.getBoolPref("comments")) {
		FARKY.log("Reading comments");
		FARKY_COMMENTS.process(page, null);
	} else if (FARKY.isHeadlinePage(page) && FARKY_DATA.prefs.getBoolPref("headlines")) {
		FARKY.log("Reading headlines");
		FARKY_HEADLINES.process(page, null);
	} else {
		FARKY.log("Skipped processing unknown pagetype. [" +
			page.location.pathname + page.location.search + "]");
	}
    },


    ////////////////////////////////////////////////////////////////////////////
    //
    // Determine if the current page is a comment page
    //
    isCommentPage : function(page) {

	if (page.location.protocol == "file:" && FARKY_DATA.prefs.getCharPref("debug.localfileAs") == "comments") {
		return true;
	}

	theurl = page.location.href.toLowerCase();
	// We already know we're likely on Fark. Don't duplicate that check here. CJE 20090518
	if (theurl.match("comments.pl") || theurl.match("/comments"))
	{
		return true;
	}

	return false;
    },


    ////////////////////////////////////////////////////////////////////////////
    //
    // Determine if the current page is a headlines page
    //
    // There are many headlines pages on Fark/TotalFark - the main
    // page, the archives, headlines by category, commented threads, etc.
    // They don't seem to change often, so we'll just compare the URL to a list.

	// Ignore what the man said up there. The URLs change a lot.
	// It breaks Farky every time.
	//
	// This madness must stop! Muahahahahahhahahaha!
	//
	// Err... umm.... I mean.... here's an attempt to invert the logic:
	// Let's assume most pages on fark are either headlines or comments.
	// We just dealt with all the comments pages in the function above this.
	//
	// Rather than keeping up with a list of headline pages, lets just bail out
	// on pages that we absolutley know we don't need to deal with.
	//
	// If something slips through we'll trust our headline processing code to be
	// smart enough to deal with it.
    //
    isHeadlinePage : function(page) {

	if (page.location.protocol == "file:" && FARKY_DATA.prefs.getCharPref("debug.localfileAs") == "headlines") {
		return true;
	}

	// the old code sucked. CJE 20090518
	var theurl = page.location.pathname.toLowerCase();
	var thehost = page.location.host.toLowerCase();

	// At this point we're fairly sure we're on Fark.
	// Bail out of pages we know *don't* contain headlines.
	if (theurl.match("/users")) {return false;}
	if (theurl.match("/submit")) {return false;}
	if (theurl.match("/login")) {return false;}	if (theurl.match("cgi")) {return false;}
	if (theurl.match("linkvote")) {return false;}
	if (theurl.match("toplinks")) {return false;}
	if (theurl.match("topcomments")) {return false;}
	if (theurl.match("topsubmitters")) {return false;}
	if (theurl.match("toptopicsource")) {return false;}
	if (theurl.match("hotw")) {return false;}
	if (theurl.match("farq")) {return false;}
	if (theurl.match("fark.rss")) {return false;}
	if (theurl.match("topboobies")) {return false};

	// This is where we'll make absolutely sure we're on a Fark website.
	if (thehost == "www.fark.com" || thehost == "www.totalfark.com" || thehost == "total.fark.com" || thehost == "www.foobies.com" ||
	    thehost == "fark.com" || thehost == "totalfark.com" || thehost == "foobies.com" ||
		thehost == "network.yardbarker.com") { return true; }

    // Now the powers that be can add any tab they'd like or rename them at random!
	FARKY.log("We are not on Fark");

    return false;
    },




    ///////////////////////////////////////////////////////////////////////////
    //
    //			USER-EVENT CALLBACKS...
    //
    ///////////////////////////////////////////////////////////////////////////




    ////////////////////////////////////////////////////////////////////////////
    //
    // setMenuEntries
    //
    // Adjust the context menu to only display appropriate options.
    //
    setMenuEntries : function(event) {
	var isFark1 = /^http:\/\/(www|total)\.fark\.com\//i;
	var isFark2 = /^https:\/\/(www|total)\.(fark)\.com\//i;
	var topmenu = document.getElementById("farkyContextMenu");

	// If current site isn't Fark, bail out quickly.
	if ( (!isFark1.test(window._content.document.location.href)) && (!isFark2.test(window._content.document.location.href)))
	{
		topmenu.hidden = true;
		return;
	}

	topmenu.hidden = false;


	// Get the sub-menu entries.
	var doFriend   = document.getElementById("farkyDoFriend");
	var markUser   = document.getElementById("farkyMarkUser");
	var unmarkUser = document.getElementById("farkyUnmarkUser");
	var addFilter  = document.getElementById("farkyAddFilter");

	var commentpage = FARKY.isCommentPage(window.content.document);
	var hidefriend = true;

	if(commentpage) {
		// XXX need Farkit's getNearestComment() here. Right-click in the comment padding returns null.
		var username = FARKY_COMMENTS.getUsernameByNode(document.popupNode);

		if (username == null) {
			doFriend.setAttribute("label", "Add friend...");
			markUser.setAttribute("disabled", true);
			unmarkUser.setAttribute("disabled", true);
		} else {
			if (FARKY_DATA.friends[username]) {
				doFriend.setAttribute("label", "Edit \"" + username + "\" in friends list...");
				doFriend.setAttribute("accesskey", "E");
			} else {
				doFriend.setAttribute("label", "Add \"" + username + "\" to friends list...");
				doFriend.setAttribute("accesskey", "A");
			}

			// XXX we should check the comment to see if it's outlined, and only display the appropriate menu
			markUser.setAttribute("disabled", false);
			unmarkUser.setAttribute("disabled", false);
		}
		hidefriend = false;
	}

	if (commentpage) {
		doFriend.hidden   = false;
		markUser.hidden   = false;
		unmarkUser.hidden = false;
		addFilter.hidden  = true;
	} else {
		var unprocessed = !FARKY_DATA.prefs.getBoolPref("headlines");

		addFilter.hidden  = false;
		doFriend.hidden   = true;
		markUser.hidden   = true;
		unmarkUser.hidden = true;
	}
    },



    ///////////////////////////////////////////////////////////////////////////
    //
    //			UTILITY FUNCTIONS...
    //
    ///////////////////////////////////////////////////////////////////////////



    ////////////////////////////////////////////////////////////////////////////
    //
    // getPageTime
    //
    getPageTime : function(page) {
	var date = new Date(page.lastModified);
	var pagetime = date.getTime(); // ms since 1970
	return pagetime;
    },


    ////////////////////////////////////////////////////////////////////////////
    //
    // parse_bool
    //
    parse_bool : function (aString) {
	if (aString == "true") { return true; }
	if (aString == "false") { return false; }

	FARKY.log("Can't parse boolean string '" + aString + "'");
	return null;
    },


    ///////////////////////////////////////////////////////////
    // cssSync
    //
    // Called by prefwindow checkbox so that we can load/unload
    // stylesheets
    //
    cssSync : function (enable, what) {
	var sss, ios, u, sheet, registered;

	switch (what)
	{
		case "farky":
			sheet = "chrome://farky/skin/farky-fixup.css"
			break;
		case "colorblind":
			sheet = "chrome://farky/skin/farky-colorblind.css"
			break;
		case "wide":
			sheet = "chrome://farky/skin/farky-wide.css"
			break;
		default:
			FARKY.log("cssSync called with unknown sheet type: " + what);
			return;
	}

	sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
		.getService(Components.interfaces.nsIStyleSheetService);

	ios = Components.classes["@mozilla.org/network/io-service;1"]
		.getService(Components.interfaces.nsIIOService);

	u = ios.newURI(sheet, null, null);

	registered = sss.sheetRegistered(u, sss.USER_SHEET);

	if (enable) {
		if(registered) {
 			 FARKY.log("notice: tried to load " + what + " CSS when already registered.");
		} else {
			sss.loadAndRegisterSheet(u, sss.USER_SHEET);
		}
	} else {
		if(registered) {
 			 sss.unregisterSheet(u, sss.USER_SHEET);
		} else {
			FARKY.log("error: tried to unload " + what + " CSS when it wasn't registered.");
		}
	}
    }
};
