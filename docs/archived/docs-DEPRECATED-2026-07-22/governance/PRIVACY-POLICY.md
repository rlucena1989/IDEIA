# Privacy Policy

**Last updated:** July 18, 2026

## Overview

IDEIA is designed with privacy as a core principle. Your source code, prompts, and project data remain on your machine by default. This policy describes what information is collected, how it is used, and your control over it.

## 1. Data Collection

### 1.1 What We Collect (Opt-In Only)

When you explicitly opt in, IDEIA collects minimal telemetry:

- **Usage events:** feature activation counts (e.g., "IDE mode started", "command executed") — no prompt content
- **Performance metrics:** execution duration, memory usage, error counts — no identifying information
- **Version info:** IDEIA version, Node.js version, operating system — for compatibility analysis

### 1.2 What We Never Collect

- **Source code or file contents** — all processing is local
- **Prompts or AI responses** — these never leave your machine unless you configure a cloud LLM
- **Authentication credentials** — no passwords, tokens, or API keys are transmitted
- **Personal identifiable information (PII)** — we do not collect names, emails, or IP addresses
- **Project structure or file names** — your project topology is private

### 1.3 Third-Party LLM Providers

If you configure a cloud LLM provider (OpenAI, DeepSeek, etc.):

- Prompts and context are sent to the provider's API as configured
- Each provider has its own privacy policy governing data handling
- You are responsible for reviewing that provider's data practices
- No provider receives data from IDEIA beyond what is necessary to fulfill your request

## 2. Data Usage

Collected telemetry is used solely for:

- Improving Software performance and reliability
- Prioritizing feature development based on usage patterns
- Detecting and diagnosing errors

## 3. Data Storage

Telemetry data is stored temporarily in aggregated form. No per-user profiles are maintained. Retention is limited to 90 days unless otherwise required by law.

## 4. Data Sharing

We do not sell, rent, or share your data with third parties. Aggregated, anonymized statistics may be shared publicly for transparency (e.g., "X active installations").

## 5. User Rights

You have the right to:

- **Opt out** at any time by running `ai-devkit config telemetry false`
- **Delete** collected data by contacting us via the issue tracker
- **Access** information about what telemetry is stored upon request

Opting out will have no effect on Software functionality.

## 6. Security

- Telemetry transmission uses TLS encryption
- No telemetry is linked to personal identity
- All cryptographic operations (audit hashing, key management) are performed locally

## 7. Contact

For privacy-related inquiries, open an issue at:

[https://github.com/anomalyco/opencode/issues](https://github.com/anomalyco/opencode/issues)

---

## Changes

This policy may be updated periodically. Material changes will be noted in the CHANGELOG and communicated via the project repository.
