///////////////////////////////////////////////////////////////////////////
//
//			COMMENT PAGE PROCESSING...
//
///////////////////////////////////////////////////////////////////////////

// Cthulhon:

// The thread post count on the headline pages includes posts that the current user is ignoring.
// The generated HTML for the comments page only counts the number of non-ignored posts.
// If we get a discrepancy we'll show the ignored posts as part of the unread message count.
// This will also happen wihen we're viewing only vote enabled posts.

// We may be able to get around these issues by storing the thread count from the headline page and using max value of that and the # of comments we see here.

/*
	Copyright Robert Nyman, http://www.robertnyman.com
	Free to use if this text is included
*/
function getElementsByAttribute(oElm, strTagName, strAttributeName, strAttributeValue){
	var arrElements = (strTagName == "*" && oElm.all)? oElm.all : oElm.getElementsByTagName(strTagName);
	var arrReturnElements = new Array();
	var oAttributeValue = (typeof strAttributeValue != "undefined")? new RegExp("(^|\s)" + strAttributeValue + "(\s|$)") : null;
	var oCurrent;
	var oAttribute;
	for(var i=0; i<arrElements.length; i++){
		oCurrent = arrElements[i];
		oAttribute = oCurrent.getAttribute && oCurrent.getAttribute(strAttributeName);
		if(typeof oAttribute == "string" && oAttribute.length > 0){
			if(typeof strAttributeValue == "undefined" || (oAttributeValue && oAttributeValue.test(oAttribute))){
				arrReturnElements.push(oCurrent);
			}
		}
	}
	return arrReturnElements;
}

var FARKY_COMMENTS = {
	////////////////////////////////////////////////////////////////////////////
	//
	//
	//
	process : function(page, state) {
	var chunking, chunkbits = 0, chunksize, chunkdelay;
	var threadID, comment, doLater = false;
	var runtime_start, runtime_end, runtime;

	runtime_start = new Date();

	var prefs = FARKY_DATA.prefs;

	chunking = prefs.getBoolPref("comments.chunk");
	chunksize = prefs.getIntPref("comments.chunkSize");
	chunkdelay = prefs.getIntPref("comments.chunkDelay");

	if (state == null) {
		state = new Array();

		state.doFriends  = FARKY_DATA.prefs.getBoolPref("friends");
		state.doFriendsNote  = FARKY_DATA.prefs.getBoolPref("friends.notes");
		state.markMyName = FARKY_DATA.prefs.getBoolPref("comments.markMyName");
		state.myUserName = FARKY_COMMENTS.getMyUsername(page);
		FARKY.log("Found my username from page: " + state.myUserName);
		state.myUserNameRE = new RegExp("(?:^|\\W)" + FARKY_COMMENTS.getMyUsername(page) + "(?:$|\\W)", "i");
		state.markUnread = FARKY_DATA.prefs.getBoolPref("comments.markUnread");
		state.markUnreadColor = FARKY_DATA.prefs.getCharPref("comments.markUnreadColor");
		state.scrollRead = FARKY_DATA.prefs.getBoolPref("comments.scrollRead");
		state.chunks = 0;
		state.runtime = 0;
		state.divNum = 0;
		state.backwards = false;
		state.isNarc    = false;
		state.isPosting = false;
		state.isPreview = false;
		state.isVoteResults = false;
		state.numComments = 0;
		// We need to look at divs outside the comment area for status messages
		state.DIV = page.getElementsByTagName("div");


		// Grab thread number from page title. Could be a party, blog or regular page
		if ( page.title.match(/^(TOTAL.)?FARK.com: Fark Party:/) )
		{
FARKY.log(page.title);
FARKY.log("PARTY link");

			var s = page.location.href.indexOf("comments/");
			var s_e = page.location.href.indexOf("/", s+9);
			var strThread = page.location.href.substring(s+9, s_e);
			
			state.threadID = threadID = "t" + strThread;///^(TOTAL.)?FARK.com:\s+\((\d+)\)/.exec(page.location.href)[2];
		}
		else if ( page.title.match(/^(TOTAL.)?FARK.com:\s+Blog/) )
		{
			// blog pages read the number from the narc box. If archived, no thread id
FARKY.log(page.title);
FARKY.log("BLOG link");

			var s = page.location.href.indexOf("comments/");
			var strThread = page.location.href.substring(s+9, s+100);
			
			state.threadID = threadID = "t" + strThread;
		}
		// RD 08242010 - check for FOOBIES page
		else if ( page.title.match(/FOOBIES.com:\s/) )
		{
FARKY.log(page.title);
FARKY.log("FOOBIES link");
			state.threadID = threadID = "t" + /^FOOBIES.com:\s+\((\d+)\)/.exec(page.title)[1];
		}
		else
		{
FARKY.log(page.title);
FARKY.log("NORMAL link");
			state.threadID = threadID = "t" + /^(TOTAL.)?FARK.com:\s+\((\d+)\)/.exec(page.title)[2];
		}
FARKY.log("Thread="+threadID);

		if (FARKY_DATA.threads[threadID] == null)
		{
			FARKY.log("Reading unseen thread " + threadID);
			FARKY_DATA.thread_init(threadID);
		}

	} else
	{
		threadID = state.threadID;
	}

	// Save the current time BEFORE farky processes the page.
	// It makes it easier to fix the comment count at the next refresh if someone else has  posted while we're processing.
	var pageTime = FARKY.getPageTime(page);
	//var freshData = FARKY_DATA.threads[threadID].lastSeen < pageTime; 20071019 HD this code isn't required and cause the comment count to go out of sync
	var updatedCommentCount = false;

	// This code mostly deals with the case when Mike sends us multiple commentArea blocks
	// The important idea is that realCommentsArea points to the correct block and state.numComments contains the # of comments inside it.
	var commentsAreaDivArray = getElementsByAttribute(page, "DIV", "id", "commentsArea");
	
	// HD: 20070725 only highlight if Mike is going to highlight. This will be set later if the red bar is found.
	var barArray = null;

	// HD: 20070725 find out whether Mike has added the new indicator. If not we don't need to do anything later.
	var newFound = page.getElementById("new");
	
	var realCommentsArea;
	state.numComments = 0;

	for (var i = 0; i < commentsAreaDivArray.length; i++)
	{
		var curDiv = commentsAreaDivArray[i];

		//The real comments area has some DIVs with ID attributes. The other one currently doesn't.
		var divArray = getElementsByAttribute(curDiv, "DIV", "id");
		if (divArray.length > 0)
		{
			state.numComments = curDiv.getElementsByTagName('table').length;
			realCommentsArea = curDiv;
			// HD: 20070725 Find out if Mike has highlighted anythng
			barArray = getElementsByAttribute(realCommentsArea, "HR", "class", "ncbar");

			FARKY.log("Div " + i + " has " + state.numComments + " comments.");
			break;
		}
	}
	if ( !realCommentsArea )
	{
		var ctext = getElementsByAttribute(curDiv, "DIV", "class", "ctext");
		if ( ctext.length > 0)
		{
			realCommentsArea = curDiv;
		}
		else
		{
			FARKY.log("Could not find comments or preview div! Everybody panic!");
			return;
		}
	}

	if (state.chunks == 0)
	{
		// Check if we're viewing comments in reverse-order (newest first)
		checkbox = page.getElementsByName("backwards");
		if (checkbox && checkbox.length > 0 && checkbox[0].checked) {
			state.backwards = true;
		}

		// Always reinitialize these
		state.isNarc    = false;
		state.isPosting = false;
		state.isPreview = false;
		state.isVoteResults = false;

		// Looks like these tests are sufficient for all cases (mod/admin, preview, post)
		const isPosting = /Comments successfully posted./;
		const isPreview = /Previewing comment\.\.\./;
		const isNarc    = /You're reporting link/;

		// Check to see if this is a voting-results thread (comment count is useless here)
		// This assumes the format of the URL will never change (it did)
		const voteCheck = /tt\=voteresults/;
		if (voteCheck.test(page.location))
		{
			state.isVoteResults = true;
			FARKY.log("Detected a voting results thread.");
		}

		// Look through the first few DIVs to see is there's a "preview" message,
		// and perhaps a "posted" message.
		for (var i = 0; i < state.DIV.length && i < 25; i++)
		{
			var DIV = state.DIV[i];

			// We need to look inside of all of these DIVs for status messages
			if (DIV.className == "mainerr" || DIV.className == "main" || DIV.className == "mainnotice")
			{
				// Note: Previewing a narc comment doesn't display "Previewing a comment..."
				if (isNarc.test(DIV.textContent))
				{
					state.isNarc = true;
					FARKY.log("Detected a narc to thread " + threadID);
				}
				else if (!state.isNarc && isPosting.test(DIV.textContent))
				{
					state.isPosting = true;
					state.isPreview = false;
					FARKY.log("Detected a post to thread " + threadID);
				}
				else if (!state.isNarc && !state.isPosting && isPreview.test(DIV.textContent))
				{
					state.isPreview = true;
					FARKY.log("Detected a preview in thread " + threadID);
				}
			}
		}
	}

	// Mark friends and indicate which comments mention our user name
	var curDiv = realCommentsArea;
	var commentsArray = getElementsByAttribute(curDiv, "DIV", "class", "ctext");

	for (;!doLater && state.divNum < commentsArray.length; state.divNum++)
	{
		comment = commentsArray[state.divNum];

		if (FARKY_DATA.prefs.getBoolPref("linksInNewWindow")) {
	                links = comment.getElementsByTagName('a');
        	        for (var i = 0; i < links.length; i++ ) {
                	        links[i].target = "_blank";
                	}
		}

		header = FARKY_COMMENTS.getHeaderForComment(comment);
		
		var username = FARKY_COMMENTS.getUsernameByNode(comment);
		if (username == state.myUserName) {
		  // in case you posted in a thread on a different computer
		  FARKY_DATA.threads[threadID].posted = true;
	  }

		if (state.doFriends || state.doFriendsNote || state.markMyName)
		{
			//var username = FARKY_COMMENTS.getUsernameByNode(comment);
			var friend = FARKY_DATA.friends[username]; // might be undefined (if not a friend)!

//		if (username == "Fnord" || username == "evulish" || username == "Cthulhon" || username == "HansensDisease" || username == "Mr. Fuzzypaws")
//		{
//			try
//			{
//				// Ugly hack, but who cares. Muahahaha!
//				var anchor = header.rows[0].cells[0].childNodes[2];
//				anchor.href = "http://www.ultrafark.com/";
//				var img = anchor.firstChild;
//				if (img && img.nodeName.toUpperCase() == "IMG")
//				{
//					img.alt = "[UltraFark]";
//				img.src = "chrome://farky/skin/ultrafark.gif";
//				}
//			}
//			catch(e)
//			{
//				FARKY.log(e);
//			} // just ignore if something goes wonky.
//		}


		if (state.doFriends)
			{
				if (friend)
				{
					comment.style.backgroundColor = friend.color;
				}
			}
			if (state.doFriendsNote && friend && friend.note != "")
			{
				FARKY_COMMENTS.addFriendNote(page, header, friend.note);
			}

			if (state.markMyName && username != state.myUserName)
			{
				// Normally comment.textContent would seem the obvious text to check, since
				// all the HTML-tag noise would be gone. However, I found that it doesn't
				// inject whitespace for <br> tags... "foo<br>bar" becomes "foobar", instead
				// of "foo bar". This sucks, since I'm trying to not trigger on word substrings
				// (for users with short usernames). EG, "foobar" is not a mention of user "foo".
				//
				// Using comment.innerHTML avoids this problem, at the slight cost of being unable
				// to handle usernames partially formatted with HTML (eg, making the first half bold).

				if (state.myUserNameRE.test(comment.innerHTML))
				{
					var arrow = page.createElement("IMG");
					arrow.src = "chrome://" + FARKY_DATA.EXTENSION_NAME + "/skin/arrow.gif";
					arrow.title = "Your username is mentioned in this comment.";
					arrow.style.marginLeft   = "-27px";
					arrow.style.marginBottom = "-4px";
					arrow.style.marginTop    = "-4px";
					arrow.style.paddingRight = "9px";

					var cell = header.rows[0].cells[0];
					cell.insertBefore(arrow, cell.firstChild);
					FARKY.log("Green Arrow!");
				}
			}

		}
		if (chunking && ++chunkbits >= chunksize)
		{
			doLater = true;
			state.chunks++;
		}
	}

	// Update our debug log
	if (!doLater) { // 20071019 HD removed  && !freshData
		FARKY.log("Ignoring stale data for thread " + threadID + " (" + pageTime +
			" <= " + FARKY_DATA.threads[threadID].lastSeen + ")");
	}

	// Update the thread count
	if (!doLater && !state.isVoteResults && !state.isNarc && !state.isPreview) // 20071019 HD removed  && freshData
	{
		// We have an issue with the count if there are ignored posters or only vote enabled posts are viewed
		if (state.isPosting)
		{
			FARKY.log("Posted new comment to thread");
			FARKY_DATA.threads[threadID].posted = true;
		}
		if (state.numComments > 0)
		{
			FARKY_DATA.threads[threadID].numComments = state.numComments;
			FARKY_DATA.threads[threadID].lastRead    = state.numComments;
			FARKY.log("updating thread lastRead to " + state.numComments);
			FARKY.log("Updated pagetime to " + pageTime);
			FARKY_DATA.threads[threadID].lastSeen = pageTime;
			updatedCommentCount = true;
		}
	}

	runtime_end = new Date();

	if (FARKY_DATA.prefs.getBoolPref("debug.logPerf")) {
		runtime = (runtime_end.getTime() - runtime_start.getTime()) / 1000;
		state.runtime += runtime;
		if (doLater) {
			FARKY.log("Processed comment chunk #" + state.chunks + " in " + runtime.toString().substr(0,5) +
				" sec. (" + state.runtime.toString().substr(0,5) + " sec, " + state.numComments +
				" comments total). Chunksize is " + chunksize + "." +
				" [" + page.location.pathname + page.location.search + "]");

		} else {
			FARKY.log("Finished processing " + state.numComments + " comments for thread " + threadID +
				" in " + state.runtime.toString().substr(0,5) + " sec. [" +
				page.location.pathname + page.location.search + "]");
		}
	}

	if (doLater) {
		setTimeout(FARKY_COMMENTS.process, chunkdelay, page, state);
		return;
	}

	// Display comment count at end of page.
	if (updatedCommentCount) {
		var statDIV = page.createElement("DIV");
		statDIV.appendChild(page.createTextNode("Farky found " + state.numComments + " comments in this thread."));
		statDIV.style.paddingTop = ".3em";
		statDIV.style.paddingBottom = ".7em";

		var node = comment; // last comment processed (always at bottom of page)
		if (node && node.parentNode.nodeName == "FORM") { node = node.parentNode; } // for voting threads
		//while (node && node.nodeName != "HR") { node = node.nextSibling; }
		if (node) { node.parentNode.insertBefore(statDIV, node.nextSibling); }
	}

	
	// HD: 20070725 Don't do any scrolling or highlighting unless Mike highlights something (emulates old Farky behavior)
	if (!state.isVoteResults && (barArray && barArray.length > 0))
	{
		// Scroll to the newest comment
		if (state.scrollRead && !page.location.hash) 
		{
			// HD: 20070725  Don't scroll by setting the hash. It breaks the backspace.
			barArray[0].scrollIntoView(true); 
		}

		// Highlight the newest comment        
		if (state.markUnread)
		{
			// HD: 20070725  If Mike hasn't added the new indicator.  we don't need to do anything.
			if (newFound)
			{
				var barFound = false;
				var curDiv = realCommentsArea;

				// Starting at the last child (to save search time) go up until we find the HR in the list
				var divLength = curDiv.childNodes.length;
				for (var i = divLength - 1; (!barFound) && (i >= 0);  i--)
				{
					var curNode = curDiv.childNodes[i];
					var curName = curNode.className;
					if (curName == "ncbar")
					{
						// Remove the HR if we found it
						barFound = true;
						curDiv.removeChild(curNode);
							
						// This section fixes things in reverse chron order mode if Mike puts the bar UNDER the newest post.
						var incrementer = 1;
						if (state.backwards)
						{
							incrementer = -1;
						}
					
						// Find the table element corresponding to the new post. Highlight it.
						for (; i >= 0 && i < divLength; i += incrementer)
						{
							curNode = curDiv.childNodes[i];
							curName = curNode.nodeName;
							if (curName == "TABLE")
							{
								// HD: 20070725 If we're scrolling compensate for the removal of the HR
								if (state.scrollRead && !page.location.hash) 
								{
									curNode.scrollIntoView(true); 
								}
								curNode.style.backgroundColor = state.markUnreadColor;
										
								curNode.rows[0].cells[0].style.backgroundColor = state.markUnreadColor;
								curNode.rows[0].cells[1].style.backgroundColor = state.markUnreadColor;
								curNode.rows[0].cells[2].style.backgroundColor = state.markUnreadColor;
								break;
							}
						}
					}
				}             
			}
		}
	}

	FARKY_DATA.save_threads();

	return;
	},



	///////////////////////////////////////////////////////////////////////////
	//
	//			USER-EVENT CALLBACKS...
	//
	///////////////////////////////////////////////////////////////////////////


	////////////////////////////////////////////////////////////////////////////
	//
	//
	//
	doFriend : function() {
	var username = FARKY_COMMENTS.getUsernameByNode(document.popupNode);
	var mode = "add";

	if (username && FARKY_DATA.friends[username]) { mode = "modify"; }

	window.openDialog("chrome://" + FARKY_DATA.EXTENSION_NAME + "/content/pref-friends.xul", "farkyFriends", "modal, resizable=no",
		mode, 'user', username);

	FARKY_DATA.save_friends();
	FARKY_COMMENTS.doFriendRecolor();
	},


	////////////////////////////////////////////////////////////////////////////
	// addFriendRecolor
	//
	// Called after adding (or editing) a friend, so the friend's comments
	// can be immediately colored (ie, visual feedback to command).
	//
	doFriendRecolor : function () {
	var i, username, friend, comments, page, header;

	page = window.content.document;
	comments = page.getElementsByTagName("div");

	for (i = 0; i < comments.length; i++) {

		if (!comments[i].className || comments[i].className != "ctext") { continue; }

		username = FARKY_COMMENTS.getUsernameByNode(comments[i]);

		friend = FARKY_DATA.friends[username];
		if (friend) {
			comments[i].style.backgroundColor = friend.color;

			header = FARKY_COMMENTS.getHeaderForComment(comments[i]);
			// Remove any existing note
			var TD = header.rows[0].cells[1];
			if (TD.lastChild.nodeName == "SPAN") {
				TD.removeChild(TD.lastChild);
			}

			if (friend.note != "") {
				FARKY_COMMENTS.addFriendNote(page, header, friend.note);
			}
		}
	}

	},


	////////////////////////////////////////////////////////////////////////////
	// addFriendNote
	//
	//
	addFriendNote : function (page, header, noteText) {
            // HD: 20070726
            var spanArray = getElementsByAttribute(header, "SPAN", "class", "farkyFriendNote");
            if (spanArray.length)
            {
                // If we already added a friends note before, remove it now since we may have edited it.
                spanArray[0].parentNode.removeChild(spanArray[0]);
            }
			var span = page.createElement("SPAN");
			span.style.paddingLeft = "2em";
			span.style.fontWeight = "normal";
            // HD: 20070726
            span.className="farkyFriendNote";
			var note = page.createTextNode(noteText);
			span.appendChild(note);
			header.rows[0].cells[0].appendChild(span);
	},


	////////////////////////////////////////////////////////////////////////////
	//
	//
	//
	markUser : function(hilight) {
	var i, color, hue = 0;
	var page = window.content.document;
	var username, markusername = FARKY_COMMENTS.getUsernameByNode(document.popupNode);

	// Hash the name into a color
	if (hilight) {
		for (i = 0; i < markusername.length; i++) {
			var ascii_code = markusername.charCodeAt(i);
			// 32- 127
			hue += 7 * (ascii_code - 31);
		}

		hue = (hue % 360) / 360.0;
		color = FARKY_COMMENTS.getRGB(hue, .9, .55);
	}

	var div = page.getElementsByTagName("div");
	for (i = 0; i < div.length; i++) {

		if(div[i].className != "ctext") { continue; }

		username = FARKY_COMMENTS.getUsernameByNode(div[i]);

		if (username == markusername) {
			if (hilight) {
				div[i].style.MozOutline = "3px solid " + color;
				div[i].style.MozOutlineRadius = "10px 10px 10px 10px";
			} else {
				div[i].style.MozOutline = "";
				div[i].style.MozOutlineRadius = "";
			}
		}
	}
	},




	///////////////////////////////////////////////////////////////////////////
	//
	//			UTILITY FUNCTIONS...
	//
	///////////////////////////////////////////////////////////////////////////




	////////////////////////////////////////////////////////////////////////////
	// getMyUsername
	//
	getMyUsername : function (page) {
	var username = "_____usernameNotFound_____";
	var i = 0;
	var loginArea = page.getElementById("userName");

	FARKY.log("looking for userName");


	var str = loginArea.innerHTML;
	var s = str.indexOf(">");
	var s_e = str.indexOf("</a>", s);
	username = str.substring(s+1, s_e-1);
	FARKY.log("userName:- " + username);


	return username;
	},


	////////////////////////////////////////////////////////////////////////////
	// getHeaderForComment
	//
	// Assumes the input node is the DIV containing the comment text.
	//
	getHeaderForComment : function (node) {
	// The comment header should be a previous sibling.
	while ((node = node.previousSibling) != null) {
		if (node.nodeName == "TABLE" && node.className && (node.className == "ctable" || node.className == "ctableTF")) {
			// For voting results, the first TD is className "chead". Ignore this
			// TABLE (contains voting results), and keep going for the previous TABLE
			// (a normal comment header).
			var firstTD = node.rows[0].cells[0];
			if (firstTD.className && firstTD.className == "clogin") {
				break;
			}
		}
	}

	return node;
	},


	////////////////////////////////////////////////////////////////////////////
	//
	//  Get the username associated with a DOM node
	//
	getUsernameByNode : function (orignode) {
	var username = null;
	var node, nodes;

	// Step up-and-out of any markup in the comment.
	for (node = orignode; node; node = node.parentNode) {

		// Node is in the comment body
		if (node && node.nodeName == "DIV" && node.className && node.className == "ctext") {
			break;
		}

		// Node is in the comment header
		if (node && node.nodeName == "TABLE" && node.className && (node.className == "ctable" || node.className == "ctableTF")) {
			break;
		}
	}
	if (node == null) { return null; }


	// Normalize results, so that node always points to the comment header with thet username.
	if (node.nodeName == "DIV") {
		node = FARKY_COMMENTS.getHeaderForComment(node);
	} else if (node.nodeName == "TABLE") {
		// Voting results have two headers for each comment. The first (top) header is normal,
		// the second (bottom) header contains the vote count. The first cell className differs.
		var firstTD = node.rows[0].cells[0];
		if (firstTD.className && firstTD.className == "chead") {
			for (node = node.previousSibling; node; node = node.previousSibling) {
				if (node && node.nodeName == "TABLE") { break; }
			}
		}
	}
	if (node == null) { return null; }


	// Extract the user name from the header.
	nodes = node.rows[0].cells;
	for (var i = 0; i < nodes.length; i++) {
		if (nodes[i].className && nodes[i].className == "clogin") {
			// Grab the TD -> A -> text directly
			//var username = nodes[i].firstChild.firstChild.nodeValue;
			var username = nodes[i].getElementsByTagName('a')[0].innerHTML;
			break;
		}
	}

	return username;
	},


	////////////////////////////////////////////////////////////////////////////
	//
	//
	//
	// HSL values from 0-1
	// RGB values from 0-255
	// I think S/L are reversed from photoshop?
	getRGB : function(H, S, L) {
	function hue_to_RGB(v1, v2, vH) {
		if (vH < 0) { vH += 1; }
		if (vH > 1) { vH -= 1; }

		if ((6 * vH) < 1) { return (v1 + (v2 - v1) * 6 * vH); }
		if ((2 * vH) < 1) { return (v2); }
		if ((3 * vH) < 2) { return (v1 + (v2 - v1) * ((2 / 3) - vH) * 6); }

		return (v1);
	}

	var R, G, B;
	var Rpad = "", Gpad = "", Bpad = "";

	if (S == 0) {	//HSL values = From 0 to 1
		R = L * 255;
		G = L * 255;
		B = L * 255;
	} else {
		var v1, v2;

		if (L < 0.5) {
			v2 = L * (1 + S);
		} else {
			v2 = (L + S) - (S * L);
		}

		v1 = 2 * L - v2;

		R = 255 * hue_to_RGB(v1, v2, H + (1/3));
		G = 255 * hue_to_RGB(v1, v2, H);
		B = 255 * hue_to_RGB(v1, v2, H - (1/3));
	}

	R = Math.floor(R);
	G = Math.floor(G);
	B = Math.floor(B);

	if (R < 10) { Rpad = "0"; }
	if (G < 10) { Gpad = "0"; }
	if (B < 10) { Bpad = "0"; }

	return ("#" + Rpad + R.toString(16) + Gpad + G.toString(16) + Bpad + B.toString(16));
	}
};
