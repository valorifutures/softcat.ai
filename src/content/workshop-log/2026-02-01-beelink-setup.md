---
title: "Setting up the Beelink as a headless server"
date: 2026-02-01
tags: [infrastructure, beelink, ubuntu]
summary: "Wiped Windows 11, installed Ubuntu Server, and got SSH working."
draft: false
---

Took delivery of a Beelink SER5 MAX. AMD Ryzen 7 6800U, 18GB RAM, 500GB NVMe. Tiny little box, barely bigger than a sandwich.

First job was wiping Windows 11 Pro. Made a recovery USB just in case, then installed Ubuntu Server 25.10. No desktop environment, no GUI. Just a terminal.

## The basics

- Set up passwordless sudo so I'm not typing my password every 30 seconds
- Configured SSH so I can run it headless from my Surface
- Ethernet as primary network, WiFi as failover
- Static IP on the ethernet side so it doesn't wander off

The idea is this thing sits under the desk and runs 24/7. Always on, always reachable. A proper little home server for whatever I want to throw at it.

Next step is getting Tailscale on there so I can reach it from anywhere.
