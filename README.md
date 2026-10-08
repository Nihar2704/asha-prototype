# ASHA AI Copilot 🩺🎙️

> **An offline-first, Hindi voice-enabled AI copilot that assists ASHA and frontline healthcare workers with natural speech capture, structured health records, deterministic protocol risk evaluation, and offline synchronization.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-v52-black.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.76-61DAFB.svg)](https://reactnative.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.121-009688.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## 📖 Overview

Frontline health workers (ASHAs) in rural and semi-urban settings often face poor connectivity, repetitive paperwork, and cognitive overload while conducting household screenings. 

**ASHA AI Copilot** introduces an intelligent assistance layer that converts spoken Hindi directly into structured health records, applies deterministic protocol rules to highlight follow-up priorities, and stores all records offline in local SQLite before syncing with supervisors when network connectivity is available.

### 🛡️ Core Philosophy & Clinical Safety

> **The application is NOT an autonomous medical diagnosis system.**

The system enforces a strict separation of concerns:
```
Speech Recognition (Whisper Hindi)
        ↓
Information Extraction (Needle 2)
        ↓
Validation Layer (Physiological & Range Checks)
        ↓
Deterministic Protocol Rules (Zero LLM Influence)
        ↓
Risk / Follow-up Flags (Configured Guidelines)
        ↓
AI Summary & Explanation (Qwen3-1.7B)
        ↓
Human-in-the-Loop Confirmation (ASHA Worker)
        ↓
Offline SQLite Persistence & Sync Queue
```

* **No Hallucinated Risks**: LLMs never independently diagnose patients or invent clinical thresholds.
* **Explainability First**: Every flag displays *why* it was triggered, citing the exact screening guideline.
* **Human Confirmation**: The worker must review and confirm all fields before a record is finalized.

---

## 🏗️ Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │           React Native / Expo App            │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                                      ▼
                                       ┌──────────────────────────────┐
                                       │     Screening Orchestrator   │
                                       │    (processVoiceScreening)   │
                                       └──────────────┬───────────────┘
                                                      │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       │                              │                              │
                       ▼                              ▼                              ▼
        ┌──────────────────────────────┐ ┌──────────────────────────────┐ ┌──────────────────────────────┐
        │       LocalAIService         │ │      Validation Layer        │ │   Deterministic Rule Engine  │
        │   (Cactus / DevSimulator)    │ │    (Range & Schema Checks)   │ │    (TypeScript Protocols)    │
        └──────────────┬───────────────┘ └──────────────────────────────┘ └──────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
 [Whisper Hindi]  [Needle 2 (45M)] [Qwen3-1.7B]
 (STT Speech)    (Extraction)     (Hindi Summary)
```

---

## 🗂️ Project Structure

```text
asha-ai-copilot/
├── packages/
│   └── shared/                       # Shared TypeScript domain models & contracts
│       ├── src/
│       │   ├── patient.ts            # Patient schema & SyncStatus
│       │   ├── screening.ts          # NCD & Pregnancy screening definitions
│       │   ├── rules.ts              # RuleResult & Protocol types
│       │   └── sync.ts               # SyncQueue, Followup, SyncPayload
│       └── package.json
│
├── apps/
│   └── mobile/                       # React Native / Expo application
│       ├── modules/
│       │   └── cactus/               # Thin Expo native bridge for Cactus C++ runtime
│       ├── src/
│       │   ├── ai/                   # AI services (Cactus, DevSimulator, Orchestrator)
│       │   ├── rules/                # Deterministic rule engine & protocol configs
│       │   │   ├── protocols/        # ncd-demo.json, pregnancy-demo.json
│       │   │   ├── validators.ts     # Physiological & contradiction validation
│       │   │   └── engine.ts         # Rule evaluation engine
│       │   └── db/                   # Expo SQLite offline layer & Repositories
│       └── jest.config.js            # Unit test configuration
│
├── tools/
│   └── ai_testbench/                 # Model verification & Live Microphone tools
│       ├── test_pipeline.py          # Benchmark runner for PRD Hindi utterances
│       ├── interactive_test.py       # Terminal interactive screening simulator
│       ├── live_mic_test.py          # Live PC mic capture & Whisper STT tester
│       └── web_mic_studio.py         # Browser Web Voice Studio UI (localhost:8000)
│
├── package.json                      # Monorepo workspaces & convenience scripts
├── tsconfig.json                     # Root TypeScript configuration
└── .gitignore                        # Git ignore rules (node_modules, caches, temp audio)
```

---

## ⚡ Quickstart & Setup

### Prerequisites
* **Node.js**: v18+ (tested on v22)
* **Python**: 3.10+ (tested on 3.13)
* **npm** or **pnpm**

### Installation
Clone the repository and install dependencies:
```bash
git clone <repo-url>
cd "Hackbios MVP Pre Phase"
npm install
```

---

## 🧪 Testing & Verification

The project includes automated test suites, an interactive CLI, and live microphone testing utilities.

### 1. Run Automated Unit Tests (Jest)
Runs all unit tests for validators, clinical protocol rules, pipeline orchestration, and offline SQLite repositories:
```bash
npm test
```
* **Coverage**: 16 unit tests verifying physiological bounds, maternal danger signs, high BP/glucose flags, and offline queue operations.

---

### 2. Run AI Model Test Bench (Python)
Evaluates speech-to-text accuracy, numeric extraction, and protocol rule correctness on benchmark Hindi utterances:
```bash
npm run test:models
# or: python tools/ai_testbench/test_pipeline.py
```
* **Cases Tested**:
  * Sunita Devi ($160/100$ BP, $210$ Sugar) $\rightarrow$ `High Priority Flag`
  * Ramesh Kumar ($120/80$ BP, $95$ Sugar) $\rightarrow$ `Normal Reading`
  * Meena Bai (Missing Glucose) $\rightarrow$ `Missing Glucose Warning`
  * Anita Verma (Maternal Danger Signs) $\rightarrow$ `High Priority Referral`

---

### 3. Interactive Web Voice Studio (Live Mic Testing)
Test live speech input through your browser with an interactive UI, real-time speech feedback, editable transcript, and instant rule triggers:
```bash
npm run test:studio
```
1. Open **[http://localhost:8000](http://localhost:8000)** in Chrome or Edge.
2. Click the **🎙 Microphone** button.
3. Speak in Hindi (e.g. *"इनका नाम सुनीता देवी है, बीपी 160/100 है और शुगर 210 है"*).
4. Click **⏹ Stop** to review the live transcript, extracted fields, and recommended clinical actions.

---

### 4. Terminal Live Microphone Tester (CLI)
Test your microphone directly in the command prompt:
```bash
npm run test:mic
```
* Records 7 seconds of 16kHz audio from your default headset/mic, runs Whisper Small with vocabulary conditioning, and outputs the extracted fields.

---

### 5. Interactive CLI Tester
Test preset patient scenarios or type custom Hindi screening sentences interactively:
```bash
npm run test:interactive
```

---

### 6. Full Monorepo Typecheck
Ensure 100% strict type safety across all packages and services:
```bash
npm run typecheck
```

---

## 📋 Protocols Supported

### 1. NCD Community Screening
* **Blood Pressure**: Configurable thresholds (Systolic $\ge 140$ OR Diastolic $\ge 90$ mmHg $\rightarrow$ High Priority).
* **Random Blood Glucose**: Threshold $\ge 200$ mg/dL $\rightarrow$ High Priority.
* **Missing Field Detection**: Flags unperformed glucose tests for follow-up scheduling.

### 2. Pregnancy Danger Signs Screening
* **Monitored Symptoms**: Vaginal bleeding, severe headache, blurred vision, severe abdominal pain, reduced fetal movement.
* **Workflow**: Any danger sign immediately triggers `HIGH PRIORITY REFERRAL` to the nearest FRU/District Hospital.

---

## 🔒 Privacy & Data Retention Policy

Following PRD §17.2 and §51:
* **Zero Cloud Inference for Core Workflow**: All audio transcription, field extraction, and protocol evaluation execute locally on the device.
* **Immediate Audio Deletion**: Raw audio recordings are discarded immediately after transcription to conserve disk space and protect patient privacy.
* **Append-Only Local Records**: Screenings are immutable once confirmed; only administrative follow-up statuses are updated.

---

## 📄 License

This project is licensed under the MIT License.
