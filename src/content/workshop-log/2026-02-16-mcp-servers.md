---
title: "MCP servers: giving AI models actual superpowers"
date: 2026-02-16
tags: [mcp, claude, tool-use, protocol]
summary: "The Model Context Protocol lets you plug tools into Claude like USB devices. Tested a few."
draft: false
---

Anthropic's Model Context Protocol (MCP) is one of those things that sounds boring on paper but changes everything in practice. It's a standard way to give AI models access to external tools and data sources.

## How it works

You run an MCP server that exposes tools. Claude connects to it and can call those tools during a conversation. Want Claude to query your database? Run a Postgres MCP server. Want it to search your files? There's one for that too.

## What I tested

Set up three MCP servers: filesystem access, web search, and a custom one that reads from an SQLite database. Claude Code picks them up automatically and uses them when relevant.

The filesystem one is the most immediately useful. Claude can read, search, and navigate your project without you having to copy-paste file contents. The web search one is handy for checking current information.

## The custom server

Building your own MCP server is straightforward. Define your tools as functions, describe the parameters, and the protocol handles the rest. Took about an hour to get a working server that lets Claude query a database and format the results.

This is how AI tools should work. Open protocol, plug and play, no vendor lock-in.
