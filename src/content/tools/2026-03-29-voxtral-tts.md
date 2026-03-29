---
title: "Voxtral TTS"
description: "Mistral's first open-weight text-to-speech model with streaming capabilities for low-latency multilingual voice generation."
url: "https://www.marktechpost.com/2026/03/28/mistral-ai-releases-voxtral-tts-a-4b-open-weight-streaming-speech-model-for-low-latency-multilingual-voice-generation/"
status: experimental
tags: [text-to-speech, streaming, open-weights, multilingual]
draft: false
---

Mistral has dropped their first text-to-speech model. Voxtral TTS is a 4 billion parameter model that streams audio in real-time rather than waiting to generate complete clips.

The streaming approach matters because it cuts latency dramatically. Instead of processing entire sentences before outputting audio, Voxtral generates speech as it processes text. This makes it viable for interactive applications where users expect immediate voice responses.

Mistral positioned this as the final piece of their audio stack, following their transcription and language models. They're clearly targeting developers who want to build voice applications without relying on proprietary APIs from the usual suspects.

The open-weight release means we can run it locally and modify it as needed. For anyone building voice agents or adding speech synthesis to applications, having a capable model that doesn't phone home to external services changes the game considerably.
