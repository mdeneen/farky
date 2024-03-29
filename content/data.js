// Allow access to global data (across browser windows).
//
// This is somewhat tricky, because javascript scope chains in different windows make
// accessing shared data difficult. This is a fairly easy solution, found on Usenet:
//
// http://groups.google.com/groups?hl=en&lr=&c2coff=1&selm=e1f24fe4.0307251555.105c1db7%40posting.google.com
//
//
// Note: The FARKY_DATA.init() could just be inline code, so that any XUL including this
// script would automagically hook up to the global data. But in FF 1.0 this resulted in a 5-10 second
// startup delay, so I'm leaving it to be explicitly called when ready.


var FARKY_DATA = {

    EXTENSION_NAME : "farky",
    _global_stub : null,
    _profileDir: null,

    filters : null,
    threads : null,
    friends : null,
    groups  : null,

    prefs : null,

    PREFS_BRANCH : "extensions.farky.",

    // Version history:
    // TF-only (0.3) release:
    //     used "farky-____-data.txt" and "____-001" header.
    //     filters not supported, so farky-filter-data.txt should never exist.
    // Public (1.0) release:
    //     changed filenames to "farky-____-data2.txt", as 0.3 would clobber "bad" data
    //     bumped header version to -002

    THREADS_FILE : "farky-thread-data2.txt",
    FRIENDS_FILE : "farky-friend-data2.txt",
    FILTERS_FILE : "farky-filter-data2.txt",

    THREADS_VERSION : "THREADS-002",
    FRIENDS_VERSION : "FRIENDS-002",
    FILTERS_VERSION : "FILTERS-002",

    FILEHEADER1 : "FARKY DATAFILE VERSION ",
    FILEHEADER2 : "DO NOT EDIT, this data generated by the Farky extension for Firefox.",


    ////////////////////////////////////////////////////////////////////////////
    // init
    //
    // Find the global object in the hidden window and save a reference to it.
    //
    init : function() {

	// Check to see if we've already been called.
	if (FARKY_DATA._global_stub != null) { return; }

	var hiddenWindow = Components.classes["@mozilla.org/appshell/appShellService;1"].getService(
			Components.interfaces.nsIAppShellService).hiddenDOMWindow;

	var initGlobal = (hiddenWindow.FARKY_DATA_STUB == undefined) ? true : false;

	// Only load the global data if it's not already there. This should happen once
	// per Firefox application load.
	//
	// Normally the Farky code in the main browser window will trigger the load,
	// and code is other windows (eg, Preferences) will then skip this step.
	// [Loading a subscript with "var foo = initvalue" twice will cause foo to be
	// reinitialized.]

	if (initGlobal) {

		// Loading a tiny subscript is slight overkill, but it makes adding global
		// functions there somewhat easier, as one does not need to worry about the
		// creation context of the function.

		// Load in the FARKY_DATA_STUB object (and anything else that needs loaded there once).
		const myScriptURL = "chrome://farky/content/global-stub.js";

		hiddenWindow.Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(
			Components.interfaces.mozIJSSubScriptLoader).loadSubScript(myScriptURL);

		hiddenWindow.FARKY_DATA_STUB.friends = new Array();
		hiddenWindow.FARKY_DATA_STUB.groups  = new Array();
		hiddenWindow.FARKY_DATA_STUB.threads = new Array();
		hiddenWindow.FARKY_DATA_STUB.filters = new Array();
	}

	FARKY_DATA.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(
			Components.interfaces.nsIPrefService).getBranch(FARKY_DATA.PREFS_BRANCH);

	FARKY_DATA._profileDir = FARKY_DATA.getProfileDir();
	FARKY_DATA._global_stub = hiddenWindow.FARKY_DATA_STUB;

	FARKY_DATA.friends = hiddenWindow.FARKY_DATA_STUB.friends;
	FARKY_DATA.groups  = hiddenWindow.FARKY_DATA_STUB.groups;
	FARKY_DATA.threads = hiddenWindow.FARKY_DATA_STUB.threads;
	FARKY_DATA.filters = hiddenWindow.FARKY_DATA_STUB.filters;

	if (initGlobal) {
		FARKY_DATA.load_friends();
		FARKY_DATA.load_threads();
		FARKY_DATA.load_filters();
	}
    },


    ////////////////////////////////////////////////////////////////////////////
    // thread_init
    //
    // Initialize data for a new discussion thread
    //
    thread_init : function(threadNum) {
	var thrdata = new Array();

	thrdata.numComments = 0;
	thrdata.lastRead    = 0;
	thrdata.posted      = false;
	thrdata.starred     = false;
	thrdata.lastSeen    = 0;
	thrdata.hotThread   = false;
	thrdata.userSetStar = false;

	FARKY_DATA.threads[threadNum] = thrdata;
	return (thrdata);
    },


    ////////////////////////////////////////////////////////////////////////////
    // check_expired_filters
    //
    // Check all of the keyword filters, and tag/delete any that have expired.
    check_expired_filters : function() {

	var filter, i;
	var expired = 0, removed = 0;
	var now = new Date();
	now = Math.round(now.getTime() / 1000);

	// Loop through in reverse order, so that we can delete
	// filters without having to tweak the iterator.
	for (i = FARKY_DATA.filters.length - 1; i >= 0; i--) {
		filter = FARKY_DATA.filters[i];

		// -1 is "never expire", 0 is "until end of session"
		if (filter.duration < 1) { continue; }

		// Nothing needs to be done for unexpired filters
		if (filter.endTime > now) { continue; }

		filter.expired = true;
		expired++;

		// Automatically delete expired filters
		if (filter.autodelete) {
			FARKY_DATA.filters.splice(i, 1);
			removed++;
		}
	}

	if (expired || removed) {
		FARKY.log("Keyword filter check: found " + expired + " expired filters, removed " + removed);
	}
    },


    ////////////////////////////////////////////////////////////////////////////
    // getProfileDir
    //
    // Return the location of the FF user's profile directory.
    //
    getProfileDir : function() {

	// for testing
	//return "C:\\";

	var DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1", "nsIProperties");
	var path = (new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path;

	// determine the file-separator
	if (path.search(/\\/) != -1) {
		path = path + "\\";
	} else {
		path = path + "/";
	}

	FARKY.log("User's profile path is " + path);
	return (path);
    },


    ////////////////////////////////////////////////////////////////////////////
    // load_file_init
    //
    // Generic routine for beginning to read from a datafile
    //
    load_file_init : function(filename, filetag) {

	var line = { value: "" };
	var inputStream, lineStream, hasMore;

	var file = Components.classes["@mozilla.org/file/local;1"].
			createInstance(Components.interfaces.nsILocalFile);

	file.initWithPath(FARKY_DATA._profileDir + filename);
	if (!file.exists()) {
		FARKY.log("Non-existant datafile " + filename);
		return null;
	}

	inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"].
				createInstance(Components.interfaces.nsIFileInputStream);
	inputStream.init(file, 0x01, 0600, null); // RD_ONLY
	lineStream = inputStream.QueryInterface(Components.interfaces.nsILineInputStream);

	hasMore = lineStream.readLine(line);
	if (!hasMore || line.value != FARKY_DATA.FILEHEADER1 + filetag) {
		FARKY.log("Invalid file header or version in " + filename);
		alert("Farky: Found corrupted header in " + filename + ". Datafile will be reset.");
		return null;
	}

	hasMore = lineStream.readLine(line);
	// Just ignore the 2nd line (FARKY_DATA.FILEHEADER2).

	return lineStream;
    },


    ////////////////////////////////////////////////////////////////////////////
    // load_file_final
    //
    // Generic routine for finishing reading from a datafile
    //
    load_file_final : function(lineStream) {
	lineStream.close();
    },


    ////////////////////////////////////////////////////////////////////////////
    //
    // Generic routine for beginning to write to a datafile
    //
    save_file_init : function(filename, filetag) {

	var file = Components.classes["@mozilla.org/file/local;1"].
			createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(FARKY_DATA._profileDir + filename + "-TEMP");

	var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
				createInstance( Components.interfaces.nsIFileOutputStream );

	/*
	 * Open flags
	 * #define PR_RDONLY       0x01
	 * #define PR_WRONLY       0x02
	 * #define PR_RDWR         0x04
	 * #define PR_CREATE_FILE  0x08
	 * #define PR_APPEND       0x10
	 * #define PR_TRUNCATE     0x20
	 * #define PR_SYNC         0x40
	 * #define PR_EXCL         0x80
	 */

	outputStream.init(file, 0x02 | 0x08 | 0x20, 0600, null); // WR_ONLY|CREAT|TRUNC

	FARKY_DATA.writeall(outputStream, FARKY_DATA.FILEHEADER1 + filetag + "\r\n");
	FARKY_DATA.writeall(outputStream, FARKY_DATA.FILEHEADER2 + "\r\n");

	return outputStream;
    },


    ////////////////////////////////////////////////////////////////////////////
    // writeall
    //
    // Utility function to handle fully writing a buffer.
    //
    writeall : function(outputStream, data) {
	var bytes, bytesWritten, bytesRemaining = data.length;
	var offset = 0;

	while (bytesRemaining) {
		bytesWritten = outputStream.write(data.substring(offset), bytesRemaining);
		bytesRemaining -= bytesWritten;
		offset += bytesWritten;
	}
    },


    ////////////////////////////////////////////////////////////////////////////
    // save_file_final
    //
    // Generic routine for finishing writing to a datafile
    //
    save_file_final : function(filename, outputStream) {

	outputStream.close();

	// Rename the "-TEMP" file we wrote to. This ensures a mid-write
	// crash will not corrupt the existing file.
	var file = Components.classes["@mozilla.org/file/local;1"].
			createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(FARKY_DATA._profileDir + filename + "-TEMP");
	file.moveTo(null, filename);
    },



    //////////////////////////////////////////////////////////
    //		BEGIN DATA-SPECIFIC FUNCTIONS...		//
    //////////////////////////////////////////////////////////



    ////////////////////////////////////////////////////////////////////////////
    // load_filters
    //
    //
    load_filters : function() {
	function parseBool(b) { if (b == "T") { return true; } else { return false; } };

	var lineStream = FARKY_DATA.load_file_init(FARKY_DATA.FILTERS_FILE, FARKY_DATA.FILTERS_VERSION);
	if (lineStream == null) {
		if (FARKY_DATA.prefs.getIntPref("data.filterVer") != 2) { FARKY_DATA.import_filters_v1(); }
		FARKY_DATA.prefs.setIntPref("data.filterVer", 2);
		return;
	}
	if (lineStream == null) { return; }

	var line = { value: "" };
	var hasmore, lineCount = 2;  //2 lines were read from the header
	var fields, filter;

	do {
		hasmore = lineStream.readLine(line);
		lineCount++;

		// Ignore any blank lines (eg, the last line)
		if (line.value == "") { continue; }

		fields = line.value.split(':');

		// If too few fields are found, report an error and skip.
		if (fields.length < 9) {
			FARKY.log("Bad entry at line " + lineCount + " of " + FARKY_DATA.FILTERS_FILE + ": '" + line.value + "'");
			continue;
		}

		filter = new Array();

		filter.keyword = FARKY_DATA.join_colon_fields(fields, 0);
		if (fields.length < 9) { continue; }

		filter.where      = fields[2];
		filter.action     = fields[3];
		filter.color      = fields[4];
		filter.duration   = parseInt(fields[5]);
		filter.autodelete = parseBool(fields[6]);
		filter.startTime  = parseInt(fields[7]);
		filter.endTime    = parseInt(fields[8]);

		if (fields.length > 9) {
			fields.splice(0,9); // remove 0-8
			filter.futureBlob = fields.join(':');
		}

		filter.expired = false; // This gets updated in check_expired_filters below...

		FARKY_DATA.filters.push(filter);

	} while (hasmore);

	FARKY_DATA.load_file_final(lineStream);

	FARKY.log("Loaded " + FARKY_DATA.filters.length + " keyword filters.");

	FARKY_DATA.check_expired_filters();
	// Could re-save filters if some expired (and were deleted), but no harm in keeping them.
    },


    ////////////////////////////////////////////////////////////////////////////
    // save_filters
    //
    //
    save_filters : function() {
	var i, outputStream;
	function sortByKeywords(a,b) { if (a.keyword<b.keyword) return -1; if (b.keyword>a.keyword) return 1; return 0; };

	FARKY_DATA.filters.sort(sortByKeywords);

	outputStream = FARKY_DATA.save_file_init(FARKY_DATA.FILTERS_FILE, FARKY_DATA.FILTERS_VERSION);

	for (i = 0; i < FARKY_DATA.filters.length; i++) {

		var f = FARKY_DATA.filters[i];

		// Don't save session filters.
		if (f.duration == 0) { continue; }

		FARKY_DATA.writeall(outputStream,
			(f.keyword.split(':').length - 1) + ":" +
			f.keyword    + ":" +
			f.where      + ":" +
			f.action     + ":" +
			f.color      + ":" +
			f.duration   + ":" +
			(f.autodelete ? "T" : "F") + ":" +
			f.startTime  + ":" +
			f.endTime    +
			(f.futureBlob ? ":" + f.futureBlob : "") +
			"\r\n");
	}

	FARKY_DATA.save_file_final(FARKY_DATA.FILTERS_FILE, outputStream);
    },


    ////////////////////////////////////////////////////////////////////////////
    // load_friends
    //
    // Loads friends and groups for comment hilighting. Assumes that the groups
    // are listed before friends in the data.
    load_friends : function() {

	var lineStream = FARKY_DATA.load_file_init(FARKY_DATA.FRIENDS_FILE, FARKY_DATA.FRIENDS_VERSION);
	if (lineStream == null) {
		if (FARKY_DATA.prefs.getIntPref("data.friendVer") != 2) { FARKY_DATA.import_friends_v1(); }
		FARKY_DATA.prefs.setIntPref("data.friendVer", 2);
		return;
	}

	var line = { value: "" };
	var hasmore, lineCount = 2, friends = 0, groups = 0;
	var fields, type, name, friend, group, colorOrGroup, note, futureBlob;

	do {
		hasmore = lineStream.readLine(line);
		lineCount++;

		// Ignore any blank lines (eg, the last line)
		if (line.value == "") { continue; }

		fields = line.value.split(':');

		// If too few fields are found, report an error and skip.
		if (fields.length < 5) {
			FARKY.log("Bad entry at line " + lineCount + " of " + FARKY_DATA.FRIENDS_FILE + ": '" + line.value + "'");
			continue;
		}

		type         = fields[0];
		name         = FARKY_DATA.join_colon_fields(fields, 1);
		colorOrGroup = FARKY_DATA.join_colon_fields(fields, 3);

		if (type == "U") {
			if (fields.length == 5) {
				note = "";
			} else {
				note = FARKY_DATA.join_colon_fields(fields, 5);
			}

			if (fields.length > 7) {
				fields.splice(0,7); // remove 0-6
				futureBlob = fields.join(':');
			}

			friend = new Array();

			if (colorOrGroup.charAt(0) == '#') {
				// It's a color!
				friend.color = colorOrGroup;
				friend.group = "";
			} else {
				// It's a group!
				friend.color = FARKY_DATA.groups[colorOrGroup].color;
				friend.group = colorOrGroup;
			}

			friend.note = note;
			friend.futureBlob = futureBlob;

			FARKY_DATA.friends[name] = friend;
			friends++;
		} else if (type == "G") {
			if (fields.length > 5) {
				fields.splice(0,5); // remove 0-4
				futureBlob = fields.join(':');
			}
			group = new Array();
			group.color = colorOrGroup;
			group.futureBlob = futureBlob;

			FARKY_DATA.groups[name] = group;
			groups++;
		} else {
			FARKY.log("Bad friend type at line " + lineCount + " of " + FARKY_DATA.FRIENDS_FILE + ": '" + line.value + "'");
			continue;
		}
	} while (hasmore);

	FARKY_DATA.load_file_final(lineStream);

	FARKY.log("Loaded " + friends + " friends in " + groups + " groups.");
    },


    ////////////////////////////////////////////////////////////////////////////
    // save_friends
    //
    //
    save_friends : function() {
	// First generate a sorted list of the friends
	var i, friend, group, name, gorc, sortedGroups = new Array(), sortedFriends = new Array();

	i = 0;
	for (var group in FARKY_DATA.groups)   { sortedGroups[i++] = group; }
	sortedGroups.sort();

	i = 0;
	for (var friend in FARKY_DATA.friends) { sortedFriends[i++] = friend; }
	sortedFriends.sort();

	var outputStream = FARKY_DATA.save_file_init(FARKY_DATA.FRIENDS_FILE, FARKY_DATA.FRIENDS_VERSION);

	for (i = 0; i < sortedGroups.length; i++) {

		name = sortedGroups[i];
		group = FARKY_DATA.groups[name];

		FARKY_DATA.writeall(outputStream,
			"G:" +
			(name.split(':').length - 1) + ":" +
			name + ":" +
			(group.color.split(':').length - 1) + ":" +
			group.color +
			(group.futureBlob ? ":" + group.futureBlob : "") +
			"\r\n");
	}

	for (i = 0; i < sortedFriends.length; i++) {

		name = sortedFriends[i];
		friend = FARKY_DATA.friends[name];

		gorc = friend.group;
		if (gorc == "") {
			gorc = friend.color;
		}

		FARKY_DATA.writeall(outputStream,
			"U:" +
			(name.split(':').length - 1) + ":" +
			name + ":" +
			(gorc.split(':').length - 1) + ":" +
			gorc + ":" +
			(friend.note.split(':').length - 1) + ":" +
			friend.note +
			(friend.futureBlob ? ":" + friend.futureBlob : "") +
			"\r\n");
	}

	FARKY_DATA.save_file_final(FARKY_DATA.FRIENDS_FILE, outputStream);
    },



    ////////////////////////////////////////////////////////////////////////////
    // load_threads
    //
    //
    load_threads : function() {

	var lineStream = FARKY_DATA.load_file_init(FARKY_DATA.THREADS_FILE, FARKY_DATA.THREADS_VERSION);
	if (lineStream == null) {
		if (FARKY_DATA.prefs.getIntPref("data.threadVer") != 2) { FARKY_DATA.import_threads_v1(); }
		FARKY_DATA.prefs.setIntPref("data.threadVer", 2);
		return;
	}

	var line = { value: "" };
	var hasmore, lineCount = 2;
	var thread, threadID, numThreads = 0;

	function parseBool(b) { if (b == "T") { return true; } else { return false; } };

	do {
		hasmore = lineStream.readLine(line);
		lineCount++;

		// Ignore any blank lines (eg, the last line)
		if (line.value == "") { continue; }

		fields = line.value.split(':');

		// If too few fields are found, report an error and skip.
		if (fields.length < 7) {
			FARKY.log("Bad entry at line " + lineCount + " of " + FARKY_DATA.THREADS_FILE + ": '" + line.value + "'");
			continue;
		}

		threadID = fields[0];
		thread = FARKY_DATA.thread_init(threadID);

		thread.lastSeen    = parseInt(fields[1] * 1000);
		thread.starred     = parseBool(fields[2]);
		thread.userSetStar = parseBool(fields[3]);
		thread.posted      = parseBool(fields[4]);
		thread.numComments = parseInt(fields[5]);
		thread.lastRead    = parseInt(fields[6]);

		if (fields.length > 7) {
			fields.splice(0,7); // remove 0-6
			thread.futureBlob = fields.join(':');
		}

		numThreads++;

	} while (hasmore);

	FARKY_DATA.load_file_final(lineStream);

	FARKY.log("Loaded data for " + numThreads + " threads.");
    },



    ////////////////////////////////////////////////////////////////////////////
    // save_threads
    //
    //
    save_threads : function() {
	// First generate a sorted list of the thread numbers
	var i = 0, c;
	var sortedThreads = new Array();
	for (var thread in FARKY_DATA.threads) { sortedThreads[i++] = thread; }
	sortedThreads.sort();

	var outputStream = FARKY_DATA.save_file_init(FARKY_DATA.THREADS_FILE, FARKY_DATA.THREADS_VERSION);

	// Special threads:
	// 1      (Fark Forum)
	// 550396 (Personals Forum)
	// 603784 (Photoshop Forum)
	// 99999  (TF Forum)
	// ...would be nice to always save this thread data, but because they are rotating threads
	// (eg, show last X days), we would need to use a different method to track posts.

	var maxdump = 10000;

	// Dump threads in reverse, so the newest threads go first
	for (i = sortedThreads.length - 1, c = 0; i >= 0 && c < maxdump; i--, c++) {

		var threadID = sortedThreads[i];
		var thread = FARKY_DATA.threads[threadID];

		FARKY_DATA.writeall(outputStream,
			threadID                         + ":" +
			(thread.lastSeen / 1000)         + ":" +
			(thread.starred     ? "T" : "F") + ":" +
			(thread.userSetStar ? "T" : "F") + ":" +
			(thread.posted      ? "T" : "F") + ":" +
			thread.numComments               + ":" +
			thread.lastRead                  +
			(thread.futureBlob ? ":" + friend.futureBlob : "") +
			"\r\n");
	}

	FARKY_DATA.save_file_final(FARKY_DATA.THREADS_FILE, outputStream);
    },


    ////////////////////////////////////////////////////////////////////////////
    // join_colon_fields
    //
    //
    join_colon_fields : function (fields, offset) {
	var colonCount, value;

	colonCount = parseInt(fields[offset]);
	value = fields[offset + 1];

	// Rejoin values that contained colons
	while(colonCount--) {
		value += ":" + fields[offset + 2];
		fields.splice(offset + 2, 1); // delete fields[offset+2]
	}

	return value;
    },


    ////////////////////////////////////////////////////////////////////////////
    // import_friends_v1
    //
    // Imports friends data from previous file format
    //
    import_friends_v1 : function() {
	var line = { value: "" };
	var hasmore, lineCount = 2;

	var lineStream = FARKY_DATA.load_file_init("farky-friend-data.txt", "FRIENDS-001");
	if (lineStream == null) { return; }

	do {
		hasmore = lineStream.readLine(line);
		lineCount++;

		// Ignore any blank lines (eg, the last line)
		if (line.value == "") { continue; }

		var matches = /^"(.+)" (#\w+)$/.exec(line.value);

		if (matches != null) {
			var f = matches[1];

			FARKY_DATA.friends[f] = new Array();
			FARKY_DATA.friends[f].color = matches[2];
			FARKY_DATA.friends[f].group = ""; // not supported in old version
		}

	} while (hasmore);

	FARKY_DATA.load_file_final(lineStream);

	FARKY_DATA.save_friends();

	// Delete the old data file
	var file = Components.classes["@mozilla.org/file/local;1"].
		createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(FARKY_DATA._profileDir + "farky-friend-data.txt");
	file.remove(false);

	FARKY.log("Converted friends file from v1 to v2");
    },


    ////////////////////////////////////////////////////////////////////////////
    // import_threads_v1
    //
    import_threads_v1 : function() {
	function parseBool(b) { if (b == "T") { return true; } else { return false; } };

	var line = { value: "" };
	var threadID, thread, hasmore, lineCount = 2;

	var lineStream = FARKY_DATA.load_file_init("farky-thread-data.txt", "THREADS-001");
	if (lineStream == null) { FARKY_DATA.save_threads(); return; }

	do {
		hasmore = lineStream.readLine(line);
		lineCount++;

		// Ignore any blank lines (eg, the last line)
		if (line.value == "") { continue; }

		var matches = /^(t\d+) (\d+) (\w+) (\w+) (\d+) (\d+)$/.exec(line.value);

		if (matches != null) {

			threadID = matches[1];
			thread = FARKY_DATA.thread_init(threadID);

			thread.lastSeen    = parseInt(matches[2]) * 1000;
			thread.starred     = parseBool(matches[3]);
			thread.posted      = parseBool(matches[4]);
			thread.numComments = parseInt(matches[5]);
			thread.lastRead    = parseInt(matches[6]);
		}

	} while (hasmore);

	FARKY_DATA.load_file_final(lineStream);

	FARKY_DATA.save_threads();

	// Delete the old data file
	var file = Components.classes["@mozilla.org/file/local;1"].
		createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(FARKY_DATA._profileDir + "farky-thread-data.txt");
	file.remove(false);

	FARKY.log("Converted threads file from v1 to v2");
    },


    ////////////////////////////////////////////////////////////////////////////
    // import_filters_v1
    //
    // Imports filters data from previous file format. Well, not really...
    //
    import_filters_v1 : function() {

	// There is no data to import, as filters were not previously supported.
	// It looks like it might have been possible to create one, though, so nuke the file anyway.

	// Delete the old data file (throws error if it
	var file = Components.classes["@mozilla.org/file/local;1"].
		createInstance(Components.interfaces.nsILocalFile);
	file.initWithPath(FARKY_DATA._profileDir + "farky-filter-data.txt");
	if (file.exists()) { file.remove(false); }

	FARKY_DATA.save_filters();
    }
};
