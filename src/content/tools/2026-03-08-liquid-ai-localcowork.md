---
title: "Liquid AI LocalCowork"
description: "A privacy-first desktop agent that runs entirely locally using Model Context Protocol, eliminating API calls for sensitive workflows."
url: "https://www.marktechpost.com/2026/03/05/liquid-ai-releases-localcowork-powered-by-lfm2-24b-a2b-to-execute-privacy-first-agent-workflows-locally-via-model-context-protocol-mcp/"
status: experimental
tags: [local-ai, privacy, agent-frameworks, model-context-protocol]
draft: false
---

Liquid AI just released LocalCowork, a desktop agent application that runs entirely on your machine. No API calls, no data leaving your system, no cloud dependencies.

The tool is powered by their LFM2-24B-A2B model, which they've optimised for low-latency tool dispatch. What makes this interesting is the architecture. Everything happens locally using the Model Context Protocol, which means your sensitive workflows never touch external servers.

We've been watching the tension between powerful AI agents and data privacy. Most agent frameworks assume you're comfortable sending your data to cloud APIs. LocalCowork flips that assumption.

The code is open source in their Liquid4All GitHub cookbook. Early days, but this feels like the direction enterprise AI workflows need to go. Especially for organisations where data sovereignty isn't negotiable.
