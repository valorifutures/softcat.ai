---
title: "Building a Grafana dashboard from a SQLite database"
date: 2026-02-10
tags: [grafana, monitoring, sqlite]
summary: "Wired up Grafana to read directly from a SQLite file. Simpler than expected."
draft: false
---

Wanted a proper dashboard for one of my projects. Nothing fancy, just some charts and KPIs pulled from a SQLite database. Turns out Grafana can do this natively with the right plugin.

## The setup

Installed `frser-sqlite-datasource` which lets Grafana query `.db` files directly. No API layer, no middleware. Just point it at the file.

The tricky bit was permissions. Grafana runs as its own user, and the database file lives under my home directory. Had to add the `grafana` user to my group and set a systemd override to relax `ProtectHome`. Not ideal from a security standpoint, but for a home server it's fine.

## What I learned

SQLite and Grafana together is a surprisingly good combo for small projects. You get a real database without running a server, and you get proper dashboards without writing a frontend. 20 panels up and running in an afternoon.
