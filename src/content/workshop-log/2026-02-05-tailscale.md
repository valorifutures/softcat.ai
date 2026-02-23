---
title: "Tailscale: SSH from anywhere in about 5 minutes"
date: 2026-02-05
tags: [infrastructure, tailscale, networking]
summary: "Installed Tailscale on the Beelink for remote access without port forwarding."
draft: false
---

Tailscale is one of those tools that makes you wonder why you ever did it the hard way. Install it, log in, done. No port forwarding, no dynamic DNS, no punching holes in firewalls.

The Beelink now sits on a Tailscale network at `100.111.252.52`. I can SSH into it from my phone, from a coffee shop, from anywhere. Just `ssh coxy412@beelink1` and I'm in.

## Why not just port forward?

I could have opened port 22 on the router. But then I'd be exposing SSH to the entire internet, relying on key auth alone to keep people out. Tailscale wraps everything in WireGuard encryption and only devices on my network can see it. Much cleaner.

Took about 5 minutes from install to working. That's the kind of tool I like.
