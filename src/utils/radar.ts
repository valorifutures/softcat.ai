// Public-facing radar page count.
//
// The bot's MAX_ARCHIVE_DAYS (in bot/radar_bot.py) may be much larger so the
// horizon bot has enough manifest history to scan for promotion candidates,
// but we only render the most recent N days as actual /radar/<date> routes
// to keep the public site bounded. Older dates stay in the manifest and on
// disk for the horizon bot's use, just not as public pages.
export const RADAR_VISIBLE_DAYS = 30;
