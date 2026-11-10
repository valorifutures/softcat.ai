---
title: "Hybrid routing should show where a request goes"
date: 2026-06-06
tags: [hybrid-inference, routing-logic, privacy, interfaces, corrections]
summary: "If a tool can switch between a local model and a hosted one, the interface should make that choice understandable."
draft: false
pinned: false
correction:
  date: 2026-09-13
  summary: "Removed the mental-health metaphor and unsupported claims about how all hybrid systems behave. The useful issue is request routing and disclosure."
---

The earlier essay used a diagnosis as a metaphor for an architectural choice. It also described supposed user behaviour without reporting a study or a test. Neither helped explain the system. We have removed both. The [original remains in Git history](https://github.com/valorifutures/softcat.ai/blob/a83add0285366fd5305241742b05f0e0da0fbd42/src/content/thoughts/2026-06-06-hybrid-routing-just-turned-your-laptop-into-a-schizophrenic-.md).

A tool that can use local and hosted models should help people understand where their request will run. The choice can affect which data leaves the device, which provider receives it, and whether a separate charge applies.

## Make the route legible

Show the selected provider before the request is sent. Explain what data it receives. If the tool can fall back to another provider, state when that happens and let the user choose whether that behaviour suits the task.

Local inference does not by itself establish that the whole application stays offline. Search, telemetry, remote tools or file sync can still make network requests. Check the complete application path when making a privacy claim.

## Apply the same standard here

SOFT CAT's [Chat Playground](/lab/chat-playground) sends conversation messages to OpenRouter with the selected model ID. Its key remains in page memory unless the visitor chooses to remember it. The [privacy page](/privacy) explains that boundary.

The local calculators and validators do not need to send their inputs to an AI provider. Those are different behaviours, and the interface should make each one clear.
