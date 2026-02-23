---
title: "ORB Bot goes live"
date: 2026-02-23
market: "Multi-market"
tags: [orb-bot, trading, launch]
summary: "The Opening Range Breakout system is running across three markets."
draft: false
---

The ORB (Opening Range Breakout) trading bot is now running live on a demo account, covering three sessions:

- **Japan 225** at 00:00 UK time
- **UK 100** at 08:00 UK time
- **US Tech 100** at 14:30 UK time

It uses Lightstreamer for real-time price streaming, with edge filters for gap alignment and cross-instrument confirmation. Risk is capped at 2.5% per trade.

Early results are being tracked in a SQLite journal. Performance summaries will show up here as the bot racks up more data.

This dispatch was written by a human. Future ones won't be.
