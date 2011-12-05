/*
 * Default preferences for extension.
 *
 * Developer note: when testing extension, one can quickly "install"
 * the new code by copying the new extension .jar into the existing
 * extension directory (profile/extensions/{xx-xx-xx}/chrome/), instead
 * of going through the normal .xpi install process.
 *
 * ...but extension defaults must be copied to the extension dir
 * (profile/extensions/{xx-xx-xx}/defaults/preferences/), even
 * though they're in the .jar. Further, when adding preferences to an
 * extension when none previously existed, one must go through the normal
 * .xpi install process, or else Firefox won't recognize the prefs.
 */
pref("extensions.farky.headlines",			true);
pref("extensions.farky.headlines.chunk",		true);
pref("extensions.farky.headlines.chunkSize",		20);
pref("extensions.farky.headlines.chunkDelay",		60);
pref("extensions.farky.headlines.colorblind",		false);
pref("extensions.farky.headlines.showNewCount",		1);
pref("extensions.farky.headlines.greenbar",		false);
pref("extensions.farky.headlines.greenbarColor",	"#f0f0f0");
pref("extensions.farky.headlines.hideSlow",		false);
pref("extensions.farky.headlines.hideSlowMax",		1);
pref("extensions.farky.headlines.hideNSFW",		false);
pref("extensions.farky.headlines.hideGreenlit",		false);
pref("extensions.farky.headlines.markHidden",		false);
pref("extensions.farky.headlines.filterNew",		false);
pref("extensions.farky.headlines.filterStar",		false);
pref("extensions.farky.headlines.filterPosted",		false);
pref("extensions.farky.headlines.filterNewThreads",	false);
pref("extensions.farky.comments",			true);
pref("extensions.farky.comments.chunk",			true);
pref("extensions.farky.comments.chunkSize",		150);
pref("extensions.farky.comments.chunkDelay",		60);
pref("extensions.farky.comments.markUnread",		true);
pref("extensions.farky.comments.markUnreadColor",	"#ff6666");
pref("extensions.farky.comments.markMyName",		true);
pref("extensions.farky.comments.scrollRead",		true);
pref("extensions.farky.options.randomIcons",		true);
pref("extensions.farky.keywords",			true);
pref("extensions.farky.friends",			true);
pref("extensions.farky.friends.notes",			true);
pref("extensions.farky.data.friendVer",			0);
pref("extensions.farky.data.threadVer",			0);
pref("extensions.farky.data.filterVer",			0);
pref("extensions.farky.debug",				false);
pref("extensions.farky.debug.log",			false);
pref("extensions.farky.debug.openConsole",		false);
pref("extensions.farky.debug.logPerf",			false);
pref("extensions.farky.debug.fakeFilter",		false);
pref("extensions.farky.debug.localfileAs",		"normal");
pref("extensions.farky.linksInNewWindow",                     false); 
pref("extensions.farky.widescreen",		true);
