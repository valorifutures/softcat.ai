---
title: "cuda-oxide"
description: "NVIDIA's experimental Rust-to-CUDA compiler that lets you write GPU kernels in Rust and compile them directly to PTX."
url: "https://www.marktechpost.com/2026/05/09/nvidia-ai-just-released-cuda-oxide-an-experimental-rust-to-cuda-compiler-backend-that-compiles-simt-gpu-kernels-directly-to-ptx/"
status: experimental
tags: [cuda, rust, gpu-programming, compiler, nvidia]
draft: false
---

NVlabs just dropped cuda-oxide v0.1.0, and it's properly interesting. You can now write GPU kernels in Rust and compile them straight to PTX without touching CUDA C++.

The magic happens through a custom rustc backend that takes `#[kernel]`-annotated Rust functions and runs them through a pipeline: Rust → Stable MIR → Pliron IR → LLVM IR → PTX. One `cargo oxide build` command handles both host and device code from the same source.

This matters because Rust's memory safety and type system could prevent entire classes of GPU programming bugs. CUDA kernel development has always been a minefield of segfaults and race conditions. Having the borrow checker watch your back while you're optimising matrix multiplications sounds brilliant.

It's early days, so expect rough edges. But if you're already comfortable with Rust and want to experiment with GPU compute without learning CUDA's quirks, this could be your entry point. The single-source compilation is particularly clever, no more juggling separate build systems for host and device code.
