# ARCHITECTURAL DECISIONS & RULES (TRUTH)

## 1. TABLET KIOSK PERFORMANCE (The "Truth")
**Context**: The Check-in Kiosk runs on legacy hardware (Galaxy Tab A6 10.1).
**Rule**: Performance and responsiveness > Feature complexity.

### Protected Logic (Do NOT Change Without Explicit Confirmation)
1.  **NO Real-time Listeners**: `storageService` must ALWAYS skip `onSnapshot` subscriptions in 'kiosk' mode.
2.  **NO Heavy Animations**: `InteractiveParticles` and `ai-glow` CSS animations must NEVER be enabled on the check-in page.
3.  **20-Minute Refresh Cycle**: The only allowed background process is a simple `fetchWeather()` every 20 minutes to keep the greeting/weather fresh. 
    *   **Do NOT** increase frequency (e.g., to 1 minute).
    *   **Do NOT** remove this entirely (the greeting must update on context change).

> **PROTOCOL**: If a request contradicts these rules, ask the user **2-3 times** to confirm they truly intend to degrade tablet performance.

---

## 2. APP & AI PHILOSOPHY (The "Silent Service")
**Context**: The app is a "Recorder", not a "Coach". The tablet is a "Gate", not a "Host".

### Protected Logic (Do NOT Change)
1.  **Strict Tablet UX**: 
    - **No AI Messages** on Check-in Success.
    - **No Emotion/Greeting**.
    - **3-4.5s Display Time** (Balance flow vs recognition).
    - **Static 1-Line Declaration Only** (e.g., "Practice starts").
2.  **AI Neutrality**:
    - AI prompts MUST explicitly forbid "Good job", "Cheer up", "Fighting".
    - Output must be **Declarative** (Message) + **Objective** (Log).
3.  **Strict Error/Timezone Handling**:
    - Backend Timezone is explicitly `Asia/Seoul`. Do NOT rely on default UTC `new Date()`.
    - Error responses must maintain consistent `{ success: false, message: '...' }` structure for client stability.

---
**Last Updated**: 2026-01-20
