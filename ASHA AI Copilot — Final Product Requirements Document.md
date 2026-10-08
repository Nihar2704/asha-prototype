# ASHA AI COPILOT
## Final Product Requirements Document

**Version:** 1.0  
**Project Type:** Hackathon MVP  
**Target Platform:** Android mobile app + Web supervisor dashboard  
**Primary Language:** Hindi, with Hinglish/English input tolerance  
**Architecture:** Offline-first, on-device AI, delayed synchronization  
**Primary Workflow:** NCD community screening + follow-up  
**Secondary Workflow:** Pregnancy danger-sign screening  
**Deployment Target:** Demo-ready prototype, not a production clinical system

---

# 1. Product Overview

## 1.1 Product Name

**ASHA AI Copilot**

## 1.2 One-line Description

An offline-first, Hindi voice-enabled AI copilot that helps ASHA/frontline workers capture field information, convert speech into structured health records, identify configured follow-up risks through transparent rules, generate simple summaries, and synchronize records with supervisors when connectivity returns.

## 1.3 Core Product Philosophy

The application is **not a medical diagnosis system**.

The system must separate:

```text
Speech Recognition
        ↓
Information Extraction
        ↓
Data Validation
        ↓
Deterministic Protocol Rules
        ↓
Risk / Follow-up Flags
        ↓
AI Explanation / Summary
        ↓
Human Confirmation
```

The LLM must never independently diagnose a patient or determine clinical risk.

---

# 2. Problem Statement

ASHA and other frontline health workers operate in field environments where connectivity may be unreliable and where collecting information can require navigating forms, remembering multiple fields, identifying follow-up requirements, and communicating information accurately.

Existing public-health workflows already include digital/offline support for community screening and data collection. Therefore, the product should not attempt to replace existing government health-record infrastructure.

The opportunity is to add an intelligent assistance layer that reduces:

- documentation burden
- manual form filling
- language barriers
- missed follow-ups
- incomplete screening records
- repetitive data entry
- cognitive load during household visits

The application should allow the worker to primarily **speak naturally in Hindi**, while the software handles transcription, extraction, validation, organization, and follow-up flagging.

Existing NHM materials describe ASHA responsibilities around identifying pregnancy danger signs and facilitating referral, while Ministry/NCD materials support screening and follow-up workflows for NCDs. The MVP therefore focuses on a small, protocol-driven subset instead of attempting to cover every public-health program.

---

# 3. Product Goals

## 3.1 Primary Goals

The MVP must:

1. Accept Hindi/Hinglish speech from an ASHA worker.
2. Transcribe speech locally on the device.
3. Convert the transcript into structured screening fields.
4. Validate extracted fields before saving.
5. Apply deterministic rules to identify configured follow-up/risk flags.
6. Generate a concise Hindi summary.
7. Work without internet.
8. Store records locally.
9. Queue unsynchronized records.
10. Synchronize records when connectivity returns.
11. Show pending/high-priority follow-ups to a supervisor.
12. Clearly explain why a rule was triggered.
13. Require human confirmation before a record becomes final.

---

# 4. Non-Goals

The hackathon MVP must NOT attempt to implement:

- ABDM production integration
- ABHA authentication
- real government authentication
- FHIR production interoperability
- electronic prescriptions
- autonomous diagnosis
- medical chatbot functionality
- disease prediction models
- autonomous treatment recommendations
- facial recognition
- biometric identification
- real-time emergency dispatch
- nationwide multilingual support
- all ASHA programs
- complete maternal-health management
- complete NCD management
- production-grade hospital integration
- real patient deployment

The application should use **synthetic/demo data only** during the hackathon.

---

# 5. Target Users

## 5.1 Primary User — ASHA / Field Worker

Needs:

- extremely simple interaction
- Hindi voice input
- minimal typing
- offline operation
- immediate feedback
- correction before submission
- clear follow-up actions

## 5.2 Secondary User — Supervisor

Needs:

- overview of workers
- pending records
- high-priority cases
- missed follow-ups
- latest screening information
- synchronization visibility

---

# 6. Core MVP Workflow

The complete demo workflow is:

```text
ASHA opens app
       ↓
Selects/creates household/patient
       ↓
Starts screening
       ↓
Presses microphone
       ↓
Speaks naturally in Hindi/Hinglish
       ↓
Local Whisper Hindi STT
       ↓
Transcript displayed
       ↓
Needle 2 extracts structured fields
       ↓
Schema validation
       ↓
Rule engine evaluates configured protocol rules
       ↓
Risk / follow-up flags generated
       ↓
Qwen3-1.7B generates simple Hindi summary
       ↓
ASHA reviews fields
       ↓
ASHA edits if necessary
       ↓
ASHA confirms
       ↓
Record written to SQLite
       ↓
Sync Queue entry created
       ↓
Record remains available offline
       ↓
Internet becomes available
       ↓
Sync worker uploads record
       ↓
FastAPI
       ↓
Supabase/PostgreSQL
       ↓
Supervisor dashboard updates
```

---

# 7. Final Technology Stack

## 7.1 Mobile

**React Native + Expo + TypeScript**

The application must use an **Expo Development Build**, not Expo Go, because Cactus and other required native functionality need custom native modules. Expo documents that custom native libraries require a development build rather than the fixed Expo Go runtime.

Use:

- Expo
- React Native
- TypeScript
- Expo Router
- Expo SQLite
- Expo SecureStore
- Expo Network
- Expo Audio
- React Native native-module integration where necessary

---

# 8. AI Stack

## 8.1 Speech-to-Text

### Selected Model

**`collabora/whisper-tiny-hindi`**

This is the fixed MVP STT model.

The model card reports substantially improved Hindi FLEURS performance over the base Whisper Tiny model, with a reported 10.10% WER under Whisper normalization on the held-out Hindi FLEURS test set.

### Responsibility

Whisper is responsible ONLY for:

```text
Audio → Hindi/Hinglish transcript
```

It must not:

- extract medical meaning
- decide risk
- diagnose
- generate recommendations

### Input

Preferred format:

```text
16 kHz
mono
16-bit PCM
```

Cactus supports Whisper transcription using WAV or raw PCM, including streaming transcription from 16 kHz mono PCM.

### Transcription settings

Use:

```json
{
  "language": "hi",
  "temperature": 0,
  "max_tokens": 448,
  "use_vad": true
}
```

Keep transcription deterministic.

---

# 9. On-device AI Runtime

## Selected Runtime

**Cactus**

Use the current Cactus engine/repository and its current React Native bindings rather than building the MVP around the archived standalone `cactus-react-native` repository.

As of September 27, 2026, the Cactus core repository has v2.2.2 as its latest release and provides Android/iOS builds plus React Native bindings.

The standalone `cactus-react-native` repository was archived in July 2026, so it must not be treated as the long-term integration boundary.

### Cactus responsibilities

Cactus will provide the local inference runtime for:

1. Whisper Hindi STT
2. Needle 2 structured extraction/tool calling
3. Qwen3-1.7B local summarization

Cactus supports mobile inference and React Native bindings.

---

# 10. Structured Extraction Model

## Selected Model

**Cactus Needle 2**

Needle 2 is a 45M-parameter on-device model specifically designed for tool calling and structured extraction. Cactus reports it as a 14 MB binary with approximately 28 MB session RAM usage.

### Needle responsibility

Needle performs:

```text
Hindi transcript
      ↓
field extraction
      ↓
strict JSON
```

It must NOT determine clinical risk.

---

# 11. LLM

## Selected Model

**Qwen3-1.7B**

Qwen3-1.7B supports 100+ languages and is explicitly designed for multilingual instruction following and agentic/tool-oriented use cases.

Use a quantized mobile-compatible model artifact.

### Qwen responsibility

Qwen is responsible ONLY for:

- converting validated structured data into a readable summary
- explaining existing rule flags
- identifying missing fields already marked as missing
- producing simple Hindi explanations

Qwen must not:

- determine risk
- calculate medical thresholds
- diagnose
- invent data
- modify numerical values
- recommend medication
- create new clinical rules

Use **non-thinking mode** for this task. The application does not need hidden chain-of-thought reasoning for summaries.

---

# 12. AI Responsibility Matrix

| Component | Responsibility | Must NOT do |
|---|---|---|
| Whisper Tiny Hindi | Speech → transcript | Medical interpretation |
| Needle 2 | Transcript → structured JSON | Risk determination |
| Validation layer | Verify schema/data consistency | Medical diagnosis |
| Rule Engine | Execute configured protocol rules | Free-form reasoning |
| Qwen3-1.7B | Summary/explanation | Independent clinical decisions |
| Human worker | Review and confirm | — |
| SQLite | Offline persistence | — |
| FastAPI | Sync/API | Clinical decisions |
| Supervisor | Review workload/follow-up | Autonomous treatment |

---

# 13. Overall Architecture

```text
┌───────────────────────────────────────────────────────────┐
│                    MOBILE APP                            │
│                  React Native + Expo                     │
│                                                           │
│ ┌─────────────┐   ┌────────────────────────────────────┐ │
│ │ UI Layer    │   │ Application Services               │ │
│ │             │   │                                    │ │
│ │ Screens     │──▶│ Screening Service                  │ │
│ │ Components  │   │ AI Pipeline Service                │ │
│ │ Navigation  │   │ Risk Engine                        │ │
│ └─────────────┘   │ Sync Service                       │ │
│                   └───────────────┬────────────────────┘ │
│                                   │                      │
│        ┌──────────────────────────┼────────────────┐     │
│        │                          │                │     │
│        ▼                          ▼                ▼     │
│  ┌────────────┐          ┌─────────────┐   ┌──────────┐│
│  │ SQLite     │          │ Cactus      │   │ Secure   ││
│  │ Local DB   │          │ AI Runtime  │   │ Storage  ││
│  └────────────┘          └──────┬──────┘   └──────────┘│
│                                 │                       │
│                  ┌──────────────┼──────────────┐        │
│                  ▼              ▼              ▼        │
│              Whisper         Needle          Qwen       │
│              Hindi           2               1.7B       │
│                                                           │
└──────────────────────────────┬────────────────────────────┘
                               │
                       Internet available
                               │
                               ▼
                    ┌──────────────────────┐
                    │ FastAPI Backend      │
                    │                      │
                    │ REST API             │
                    │ Sync API             │
                    │ Validation            │
                    │ Authentication       │
                    └───────────┬──────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Supabase        │
                       │ PostgreSQL      │
                       └────────┬────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │ Supervisor Dashboard │
                    │ React + Tailwind     │
                    └──────────────────────┘
```

---

# 14. Mobile Architecture

Use a layered architecture.

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓
Data
    ↓
Native / AI / Network
```

## Recommended mobile directory

```text
apps/mobile/

├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── auth/
│   ├── home/
│   ├── patients/
│   ├── screening/
│   ├── review/
│   ├── followups/
│   └── settings/
│
├── src/
│   ├── components/
│   ├── features/
│   │   ├── patients/
│   │   ├── screening/
│   │   ├── followups/
│   │   └── sync/
│   │
│   ├── ai/
│   │   ├── cactus/
│   │   ├── stt/
│   │   ├── extraction/
│   │   └── summary/
│   │
│   ├── rules/
│   │   ├── engine.ts
│   │   ├── validators.ts
│   │   └── protocols/
│   │
│   ├── db/
│   │   ├── schema.ts
│   │   ├── migrations.ts
│   │   ├── repositories/
│   │   └── sqlite.ts
│   │
│   ├── sync/
│   │   ├── queue.ts
│   │   ├── syncWorker.ts
│   │   └── conflictResolver.ts
│   │
│   ├── services/
│   │   ├── screeningService.ts
│   │   ├── patientService.ts
│   │   └── followupService.ts
│   │
│   ├── types/
│   ├── constants/
│   └── utils/
│
├── modules/
│   └── cactus/
│
├── assets/
└── package.json
```

---

# 15. Why a Local Expo Module Is Required

Cactus exposes native mobile functionality. Expo supports custom native modules through the Expo Modules API. These modules can contain Kotlin/Swift code and integrate with the React Native application.

Create:

```text
modules/cactus/
```

This module acts as a thin bridge:

```text
React Native
     ↓
CactusExpoModule
     ↓
Cactus native runtime
```

The JavaScript layer should never directly manage C++ details.

---

# 16. AI Service Interface

Create one abstraction so the rest of the application doesn't depend directly on Cactus.

```ts
interface LocalAIService {
  transcribe(audioPath: string): Promise<TranscriptionResult>;

  extractScreeningData(
    transcript: string,
    schema: ExtractionSchema
  ): Promise<ExtractionResult>;

  generateSummary(
    verifiedRecord: VerifiedScreeningRecord
  ): Promise<SummaryResult>;
}
```

Implementation:

```text
LocalAIService
      ↓
CactusAIService
      ↓
Whisper / Needle / Qwen
```

This is important because AI implementation details should remain isolated from the healthcare workflow.

---

# 17. Audio Pipeline

## 17.1 Recording

User presses:

```text
[🎙 Start Recording]
```

Application:

1. requests microphone permission
2. initializes audio session
3. records voice
4. stops recording
5. converts/ensures 16 kHz mono PCM16
6. sends audio to local STT

## 17.2 Audio Lifecycle

```text
Recording
   ↓
Temporary file
   ↓
STT
   ↓
Transcript
   ↓
Audio deleted
```

The application should NOT retain raw audio after successful transcription in the MVP.

This reduces local storage usage and unnecessary handling of sensitive information.

---

# 18. STT Output

Example input:

> "इनका नाम सुनीता देवी है, उम्र पैंतालीस साल है। बीपी एक सौ साठ बटा एक सौ है और शुगर दो सौ दस आई थी।"

Expected transcript:

```text
इनका नाम सुनीता देवी है, उम्र पैंतालीस साल है।
बीपी एक सौ साठ बटा एक सौ है और शुगर दो सौ दस आई थी।
```

The application may normalize obvious numeric expressions during extraction, but it must not silently alter the original transcript.

---

# 19. Needle Extraction Contract

Needle must receive a strict schema.

Example:

```json
{
  "patient_name": "Sunita Devi",
  "age": 45,
  "sex": "female",
  "pregnancy_status": null,
  "bp_systolic": 160,
  "bp_diastolic": 100,
  "blood_glucose": 210,
  "symptoms": [],
  "medication_adherence": null,
  "follow_up_required": null,
  "follow_up_reason": null
}
```

Every extracted value must have one of these states:

```text
known
missing
uncertain
not_applicable
```

For example:

```json
{
  "age": {
    "value": 45,
    "status": "known"
  },
  "blood_glucose": {
    "value": null,
    "status": "missing"
  }
}
```

---

# 20. Extraction Schema

## Patient

```text
id
name
age
sex
phone
village
household_id
```

## NCD Screening

```text
screening_id
patient_id
bp_systolic
bp_diastolic
blood_glucose
tobacco_use
alcohol_use
known_hypertension
known_diabetes
medication_adherence
symptoms
measurement_date
```

## Pregnancy Screening

```text
pregnancy_status
gestational_age_weeks
vaginal_bleeding
severe_headache
blurred_vision
severe_abdominal_pain
reduced_fetal_movement
swelling
fever
follow_up_required
```

These are screening/workflow fields, not a diagnostic model.

---

# 21. Data Validation Layer

After Needle returns JSON:

```text
Needle
  ↓
JSON Parse
  ↓
Schema Validation
  ↓
Type Validation
  ↓
Range Validation
  ↓
Consistency Validation
  ↓
Verified Structured Record
```

Validation must detect:

- invalid numbers
- impossible age
- malformed BP
- missing mandatory fields
- duplicate values
- conflicting statements
- pregnancy status contradictions
- invalid dates

Example:

```text
BP = "160/100"
        ↓
Parser
        ↓
160, 100
        ↓
Numeric validation
        ↓
Valid
```

Example:

```text
BP = "one hundred sixty"
        ↓
Incomplete extraction
        ↓
status = uncertain
        ↓
human confirmation required
```

---

# 22. Rule Engine

The risk engine is **deterministic TypeScript code**.

It must not call the LLM.

Architecture:

```text
Verified Record
      ↓
Rules Engine
      ↓
Rule Results
```

Each rule should have:

```ts
interface HealthRule {
  id: string;
  name: string;
  protocol: string;
  enabled: boolean;
  evaluate(record: VerifiedScreeningRecord): RuleResult;
}
```

Result:

```ts
interface RuleResult {
  ruleId: string;
  triggered: boolean;
  priority: "low" | "medium" | "high";
  reason: string;
  nextWorkflow: string;
}
```

---

# 23. Clinical Rule Configuration

Clinical threshold values must NOT be scattered through application code.

Store them in:

```text
src/rules/protocols/ncd-demo.json
```

Example:

```json
{
  "protocol": "ncd_demo_v1",
  "bp": {
    "high_reading_rule": {
      "enabled": true,
      "parameters": {
        "systolic": 0,
        "diastolic": 0
      },
      "source": "validated_protocol"
    }
  }
}
```

The actual medical thresholds used in the hackathon must be populated from the selected official screening/referral protocol and reviewed before the demo.

The PRD intentionally does not hard-code medical threshold numbers as universal clinical truth.

---

# 24. Rule Examples

## NCD

Examples of non-diagnostic workflow rules:

```text
BP measurement present
      ↓
Evaluate against configured protocol
      ↓
Flag if protocol threshold is triggered
```

```text
Blood glucose missing
      ↓
MISSING_INFORMATION
```

```text
Known diabetic patient
+
follow-up due
      ↓
FOLLOW_UP_REQUIRED
```

## Pregnancy

For example:

```text
pregnancy_status = pregnant
+
reported danger-sign field = true
      ↓
HIGH_PRIORITY_REFERRAL_WORKFLOW
```

NHM training materials explicitly discuss pregnancy danger signs and immediate facilitation of referral when such signs occur.

The application's role is to surface the configured workflow—not independently diagnose the patient.

---

# 25. "Why Was This Flagged?" Requirement

Every risk/follow-up flag must be explainable.

Example:

```text
HIGH PRIORITY

Reason:
The recorded BP triggered the configured screening protocol.

Source:
NCD screening protocol

Next workflow:
Confirm reading and follow the configured referral/follow-up procedure.
```

Never display:

```text
AI diagnosed hypertension.
```

Instead display:

```text
Screening rule triggered.
```

---

# 26. Qwen Summary Pipeline

Qwen receives only verified data.

Input:

```json
{
  "patient": {
    "name": "Sunita Devi",
    "age": 45
  },
  "screening": {
    "bp_systolic": 160,
    "bp_diastolic": 100,
    "blood_glucose": 210
  },
  "rule_flags": [
    {
      "priority": "high",
      "reason": "Configured screening rule triggered"
    }
  ],
  "missing_fields": []
}
```

Output:

```text
सुनीता देवी, उम्र 45 वर्ष।

आज की स्क्रीनिंग में:
• BP: 160/100
• Blood Sugar: 210

एक screening rule trigger हुआ है।
कार्यप्रवाह के अनुसार reading confirm करके follow-up/referral प्रक्रिया पूरी करें।
```

---

# 27. Qwen System Prompt

Use a fixed system prompt:

```text
You are the explanation and summarization assistant inside an offline
frontline health-worker application.

You are NOT a doctor and you must NOT diagnose.

Use ONLY the verified structured information supplied to you.

Rules:

1. Never invent missing information.
2. Never modify numeric measurements.
3. Never create medical thresholds.
4. Never create new risk classifications.
5. Never recommend medication.
6. Never claim a disease is diagnosed.
7. Risk flags are produced exclusively by the application's deterministic rule engine.
8. Explain existing flags in simple Hindi.
9. Mention missing information clearly.
10. Keep the output short and easy for a frontline worker to understand.
11. Prefer simple Hindi with commonly understood medical terms.
12. Do not mention internal model reasoning.
```

---

# 28. Human-in-the-Loop Requirement

The AI pipeline must never immediately finalize medical records.

Required sequence:

```text
AI extraction
      ↓
AI result shown
      ↓
Worker reviews
      ↓
Worker edits
      ↓
Rule engine reruns
      ↓
Summary regenerated
      ↓
Worker confirms
      ↓
Final record
```

This is one of the most important product-safety requirements.

---

# 29. Main Mobile Screens

The visual designs already exist and can be adapted.

Functional responsibilities should remain:

## Screen 1 — Splash / Initialization

Responsibilities:

- initialize SQLite
- check local session
- check model availability
- check sync queue
- check connectivity

State:

```text
Initializing...
AI models ready
Offline mode ready
```

---

## Screen 2 — Worker Login / Demo Profile

Requirements:

- worker name
- worker ID
- role
- offline session persistence

Hackathon implementation can use seeded demo credentials and locally cached session information.

---

## Screen 3 — Home Dashboard

Show:

```text
Today's visits
Pending follow-ups
High-priority cases
Unsynced records
Offline/Online status
```

Primary CTA:

```text
+ New Screening
```

---

## Screen 4 — Patient Selection

Functions:

- search patient
- recent patients
- household list
- create patient

Search must work offline.

---

## Screen 5 — Screening Type

Options displayed according to MVP:

```text
NCD Screening
Pregnancy Screening
```

---

# 30. Voice Capture Screen

Primary interaction:

```text
┌───────────────────────┐
│       🎙              │
│                       │
│    Listening...       │
│                       │
│   00:08               │
│                       │
│ [Stop Recording]      │
└───────────────────────┘
```

After recording:

```text
Processing locally...
Transcribing...
Extracting information...
```

The UI should explicitly communicate:

```text
Works offline
```

---

# 31. Transcript Review Screen

Display:

```text
What we heard:

"इनका बीपी 160/100 है..."
```

Actions:

```text
[Edit Transcript]
[Continue]
[Record Again]
```

The original transcript should remain accessible for traceability.

---

# 32. Structured Review Screen

Display fields:

```text
Name       Sunita Devi
Age        45
BP         160 / 100
Sugar      210
Pregnancy  No

Missing information
None
```

Each field should be editable.

Every AI-extracted field should be visually distinguishable from a manually confirmed field internally.

---

# 33. Risk Summary Screen

Display:

```text
Screening Result

🔴 High Priority

Why?
A configured screening rule was triggered.

What to do?
Confirm the reading and follow the configured workflow.

Missing information:
None
```

Actions:

```text
[Edit Record]
[Confirm & Save]
```

---

# 34. Offline Records Screen

Show:

```text
All Records

Sunita Devi
Today
Synced

Meena Bai
Today
Pending Sync

Ramesh Kumar
Yesterday
Synced
```

Use statuses:

```text
SYNCED
PENDING
SYNCING
FAILED
```

---

# 35. Follow-up Screen

Display:

```text
High Priority
2

Due Today
4

Missed
3
```

Each follow-up:

```text
Patient
Reason
Date
Priority
Status
```

---

# 36. Supervisor Dashboard

Web application:

```text
React
Tailwind
TypeScript
```

Functional sections:

## Overview

```text
Workers
Today's Screenings
High Priority
Pending Follow-ups
Missed Follow-ups
Unsynced
```

## Worker Overview

```text
Worker name
Visits today
Pending actions
Last sync
```

## Patient/Case Detail

Display:

```text
Patient
Screening
Measurements
Flags
Summary
Follow-up
Timestamp
Worker
```

## Sync Monitor

Display:

```text
Last sync
Records received
Records failed
Pending devices
```

---

# 37. Local Database

Use **Expo SQLite**.

## Table: workers

```sql
workers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL
)
```

## Table: patients

```sql
patients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER,
    sex TEXT,
    phone TEXT,
    village TEXT,
    household_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL
)
```

## Table: screenings

```sql
screenings (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    screening_type TEXT NOT NULL,
    transcript TEXT,
    structured_data TEXT NOT NULL,
    rule_results TEXT NOT NULL,
    summary TEXT,
    confirmed INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL
)
```

## Table: followups

```sql
followups (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    screening_id TEXT,
    reason TEXT NOT NULL,
    priority TEXT NOT NULL,
    due_date TEXT,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL
)
```

## Table: sync_queue

```sql
sync_queue (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
```

## Table: app_state

```sql
app_state (
    key TEXT PRIMARY KEY,
    value TEXT
)
```

---

# 38. UUID Strategy

Every local entity receives a UUID at creation.

Example:

```text
patient_id:
550e8400-e29b-41d4-a716-446655440000
```

The client ID must remain the same during synchronization.

This provides idempotency.

---

# 39. Offline-First Principle

The application must assume the internet does NOT exist.

Therefore:

```text
UI → Local DB first
```

Never:

```text
UI → API → DB → UI
```

All critical operations must work with:

```text
network = OFF
```

---

# 40. Sync Architecture

When a record is created:

```text
SQLite write
      ↓
sync_queue insert
```

When network becomes available:

```text
Network listener
      ↓
Sync Worker
      ↓
read sync_queue
      ↓
send request
      ↓
server confirms
      ↓
mark synced
      ↓
remove queue item
```

---

# 41. Sync State Machine

```text
LOCAL_ONLY
    ↓
PENDING_SYNC
    ↓
SYNCING
   / \
  /   \
SUCCESS FAILURE
  |       |
SYNCED   RETRY
          ↓
       SYNCING
```

---

# 42. Idempotent Sync

Server must accept:

```text
client_record_id
```

and enforce uniqueness.

If the same record is uploaded twice:

```text
Request 1 → CREATE
Request 2 → ALREADY_EXISTS
```

The server must not create a duplicate.

---

# 43. Conflict Strategy

The MVP should deliberately avoid complex multi-device editing.

Rules:

1. Mobile-created screening records are append-only.
2. Supervisors do not modify measurement values.
3. Follow-up status can be updated by the supervisor.
4. Latest `updated_at` wins for editable administrative fields.
5. Immutable original screening data remains preserved.

This avoids unnecessary CRDT/event-sourcing complexity.

---

# 44. Backend Architecture

Use:

**FastAPI + Python**

Structure:

```text
services/api/

├── app/
│   ├── main.py
│   ├── routes/
│   │   ├── auth.py
│   │   ├── patients.py
│   │   ├── screenings.py
│   │   ├── followups.py
│   │   ├── sync.py
│   │   └── dashboard.py
│   │
│   ├── schemas/
│   ├── services/
│   ├── repositories/
│   ├── middleware/
│   └── utils/
│
└── requirements.txt
```

---

# 45. Backend API

## Auth

```http
POST /auth/login
```

## Patients

```http
GET /patients
GET /patients/{id}
POST /patients
```

## Screenings

```http
GET /screenings
GET /screenings/{id}
POST /screenings
```

## Follow-ups

```http
GET /followups
PATCH /followups/{id}
```

## Sync

```http
POST /sync/push
GET /sync/pull
```

## Dashboard

```http
GET /dashboard/summary
GET /dashboard/high-priority
GET /dashboard/followups
GET /dashboard/workers
```

---

# 46. Sync Payload

Example:

```json
{
  "device_id": "device-001",
  "worker_id": "worker-001",
  "records": [
    {
      "client_record_id": "uuid",
      "entity": "screening",
      "operation": "create",
      "timestamp": "2026-09-27T10:30:00Z",
      "payload": {}
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "processed": [
    {
      "client_record_id": "uuid",
      "status": "created"
    }
  ],
  "failed": []
}
```

---

# 47. Supabase Schema

Tables:

```text
workers
patients
screenings
followups
devices
sync_events
```

Optional:

```text
audit_events
```

Do not store raw audio.

---

# 48. Server-Side Data Validation

FastAPI must validate:

- UUID
- worker ID
- screening type
- numeric field types
- timestamps
- required fields
- duplicate client record IDs

The server should never blindly trust the mobile client.

---

# 49. Authentication

For the hackathon:

```text
Seeded demo accounts
+
role
+
cached mobile session
```

Roles:

```text
ASHA
SUPERVISOR
```

The architecture should keep authentication separate from the application data layer.

Production identity systems are out of scope.

---

# 50. Security Requirements

Even though the hackathon uses synthetic data, build the architecture as though records are sensitive.

Requirements:

- HTTPS for API
- SecureStore for tokens/session secrets
- no credentials in source code
- no sensitive logs
- no raw audio persistence
- no patient information in console logs
- no AI request sent to cloud by default
- local data separated from temporary AI files
- environment variables for backend secrets
- `.env` excluded from Git

---

# 51. Privacy Principle

The default architecture must be:

```text
Patient data
     ↓
Device
     ↓
Local AI
     ↓
Local DB
```

The cloud is used for synchronization, not for every AI interaction.

This is one of the main product differentiators.

---

# 52. Model Management

The app needs a model manager.

On first installation:

```text
Model Setup
```

Download/prepare:

```text
Whisper Hindi
Needle 2
Qwen3-1.7B
```

Status:

```text
Whisper     ✓ Ready
Needle      ✓ Ready
Qwen        ✓ Ready
```

Models should be downloaded before the first field workflow.

The app should never require internet for inference after model installation.

---

# 53. Model Storage

Use an application-private directory:

```text
/models/
    whisper-hindi/
    needle2/
    qwen3-1.7b/
```

Store:

```text
model_version
model_size
quantization
download_status
checksum
```

---

# 54. AI Loading Strategy

Do not load all large models into memory simultaneously unless the tested device handles it.

Use:

```text
Whisper
   ↓ destroy/release

Needle
   ↓ destroy/release

Qwen
   ↓ destroy/release
```

The AI service should explicitly release unused model resources.

This is especially important on low-memory Android devices.

---

# 55. Model Performance Targets

The MVP does not require enterprise-grade latency.

Target:

```text
Voice recording:
5–30 sec

STT:
acceptable interactive latency

Extraction:
< 3 sec target

Summary:
< 5 sec target

Screen save:
< 500 ms local
```

The exact latency should be measured on the actual demo Android device.

---

# 56. Model Evaluation Dataset

Create a small internal Hindi test set.

Minimum:

**30 voice examples**

Categories:

```text
10 normal Hindi
5 Hinglish
5 numerical readings
5 medical terminology
5 noisy/hesitant speech
```

Example:

```text
"ब्लड प्रेशर एक सौ साठ बटा एक सौ है"

"शुगर दो सौ दस है"

"दवाई पिछले दस दिन से नहीं ली"

"महिला आठ महीने की गर्भवती है"

"कल से बच्चे की तबीयत खराब है"
```

Evaluate:

```text
STT correctness
number correctness
field extraction
missing-field detection
rule correctness
summary correctness
```

---

# 57. AI Acceptance Thresholds

For hackathon validation:

### STT

At least:

```text
90%+ of demo test utterances should produce
human-usable transcripts.
```

More important than raw WER:

```text
numeric accuracy
medical-term preservation
```

### Extraction

Target:

```text
>= 90% correct field extraction
on the curated demo dataset.
```

### Rule Engine

Target:

```text
100% correctness
on unit-test scenarios.
```

The rule engine should be deterministic, so there is no acceptable "approximately correct" behavior.

---

# 58. Critical Number Handling

Numbers are a special priority.

Test:

```text
160 / 100
120 / 80
140 / 90
210
95
45 years
8 months
```

Hindi expressions:

```text
एक सौ साठ
एक सौ दस
दो सौ दस
पैंतालीस
आठ
```

The extraction layer must preserve numerical values accurately.

---

# 59. Important Edge Cases

The application must handle:

## Missing data

```text
"बीपी नहीं लिया"
```

Result:

```text
bp_status = missing
```

## Uncertain speech

```text
"शायद एक सौ साठ..."
```

Result:

```text
bp_status = uncertain
```

and require confirmation.

## Conflicting statements

```text
"बीपी 150/90 था... नहीं 160/100 था"
```

Result:

```text
conflict_detected = true
```

Worker must manually confirm.

## Multiple patients

The system should never automatically merge information between patients.

## Empty voice input

Show:

```text
No speech detected.
Please try again.
```

---

# 60. Rule Execution Sequence

After extraction:

```text
1. Parse JSON
2. Validate schema
3. Normalize numeric values
4. Detect conflicts
5. Mark uncertain fields
6. Run rules only on verified/known fields
7. Generate flags
8. Generate summary
9. Present for confirmation
```

---

# 61. AI Failure Handling

If Whisper fails:

```text
Speech recognition unavailable.
[Try Again]
```

If Needle fails:

```text
We couldn't structure the information automatically.

[Enter Manually]
```

If Qwen fails:

```text
Summary unavailable.

The verified record and screening flags
are still available.
```

The record must remain usable even if the LLM fails.

---

# 62. Important Resilience Principle

AI is an assistant—not a dependency for data persistence.

Therefore:

```text
AI FAILURE
     ↓
Manual form remains available
     ↓
Record can still be saved
```

---

# 63. Manual Entry Fallback

Every AI-created field must be manually editable.

Required action:

```text
Enter manually
```

The user must be able to complete the screening without AI.

---

# 64. Supervisor Dashboard Data

Dashboard should calculate:

```text
total screenings
today's screenings
high priority
pending follow-ups
missed follow-ups
synced records
unsynced records
workers active
```

No AI is needed to calculate these statistics.

Use SQL aggregation.

---

# 65. Dashboard Priority Logic

```text
high-priority follow-ups
        ↓
top of dashboard

due today
        ↓
next

missed
        ↓
next

normal
        ↓
bottom
```

Do not use an LLM to rank cases.

Priority comes from deterministic rule results.

---

# 66. Follow-up Lifecycle

```text
CREATED
  ↓
PENDING
  ↓
DUE
  ↓
COMPLETED
```

If overdue:

```text
MISSED
```

Supervisor can update:

```text
PENDING
COMPLETED
```

---

# 67. Offline Connectivity Indicator

Global UI must always expose:

```text
🟢 Online
🔴 Offline
```

When offline:

```text
Offline mode active
Records will sync automatically when connection returns.
```

When online:

```text
Online
Syncing 3 records...
```

---

# 68. Sync UX

Display:

```text
3 records pending sync
```

After success:

```text
All records synced
```

After failure:

```text
2 records could not sync.
Will retry automatically.
```

Never block normal field work because synchronization failed.

---

# 69. Demo Mode

Provide a seeded demo environment.

Worker:

```text
ASHA Demo
```

Supervisor:

```text
Supervisor Demo
```

Seed patients:

```text
Sunita Devi
Ramesh Kumar
Meena Bai
Anita Verma
```

Use synthetic measurements.

---

# 70. Demo Data

Create at least:

```text
5 patients
10 screenings
5 follow-ups
2 high-priority cases
2 missed follow-ups
3 pending sync records
```

This ensures the dashboard is visually populated.

---

# 71. Demo Scenarios

## Scenario A — Normal

```text
ASHA speaks Hindi
↓
STT
↓
Extraction
↓
No risk flag
↓
Save offline
↓
Sync
```

## Scenario B — High Priority

```text
ASHA speaks
↓
BP recorded
↓
Rule triggered
↓
Reason shown
↓
Worker confirms
↓
Supervisor sees high priority
```

## Scenario C — Offline

```text
Disable internet
↓
Create screening
↓
Save successfully
↓
Open records
↓
Record visible as pending
↓
Reconnect internet
↓
Automatic sync
↓
Dashboard updates
```

## Scenario D — AI Error

```text
Deliberately provide ambiguous speech
↓
Needle marks uncertain
↓
UI asks worker to verify
↓
Worker edits
↓
Record finalized
```

---

# 72. Backend Deployment

Recommended hackathon deployment:

```text
Mobile
   ↓
FastAPI
   ↓
Render
   ↓
Supabase PostgreSQL

Dashboard
   ↓
Vercel / Netlify
```

The backend must remain minimal.

It does not run the mobile AI pipeline.

---

# 73. Environment Variables

## Mobile

```env
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_ENV=
```

## Backend

```env
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
JWT_SECRET=
ENVIRONMENT=
```

Never expose:

```text
SUPABASE_SERVICE_KEY
JWT_SECRET
```

to the mobile application.

---

# 74. Repository Structure

Use a simple monorepo:

```text
asha-ai-copilot/

├── apps/
│   ├── mobile/
│   └── dashboard/
│
├── services/
│   └── api/
│
├── packages/
│   └── shared/
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── ai.md
│   └── rules.md
│
├── .env.example
├── README.md
└── package.json
```

---

# 75. Shared Types

Create shared schemas for:

```text
Patient
Screening
RiskFlag
FollowUp
SyncPayload
Worker
DashboardStats
```

TypeScript side:

```text
packages/shared/src/
```

FastAPI side should use corresponding Pydantic models.

---

# 76. State Management

Use a lightweight state solution.

Application state:

```text
current worker
current patient
current screening
AI processing state
network state
sync state
```

Persistent state remains SQLite.

Do not store the complete patient database in React state.

---

# 77. React Query / Server State

Use network-query logic only for:

```text
dashboard
server refresh
sync status
```

Offline patient and screening workflows must use repositories over SQLite.

---

# 78. Repository Pattern

Example:

```ts
patientRepository.create()
patientRepository.getById()
patientRepository.search()
patientRepository.update()

screeningRepository.create()
screeningRepository.getById()
screeningRepository.list()

followupRepository.create()
followupRepository.complete()
```

The UI should not directly execute SQL.

---

# 79. Screening Service

Central orchestration:

```ts
async function processVoiceScreening(audioPath) {
  const transcript =
    await ai.transcribe(audioPath);

  const extracted =
    await ai.extractScreeningData(transcript);

  const validated =
    validateExtraction(extracted);

  const ruleResults =
    evaluateRules(validated);

  const summary =
    await ai.generateSummary({
      record: validated,
      rules: ruleResults
    });

  return {
    transcript,
    validated,
    ruleResults,
    summary
  };
}
```

---

# 80. Important Rule

Never allow:

```text
Qwen → Rule Engine
```

Correct:

```text
Record → Rule Engine
Record + Rule Results → Qwen
```

---

# 81. AI Prompt Data Flow

## Needle

```text
SYSTEM:
You extract fields from a frontline health-worker transcript.

USER:
<transcript>

SCHEMA:
<strict JSON schema>
```

## Qwen

```text
SYSTEM:
<safe summary system prompt>

USER:
Verified Record:
<JSON>

Rule Results:
<JSON>
```

No raw patient transcript is needed for Qwen.

---

# 82. Auditability

Store:

```text
original transcript
structured extraction
worker corrections
final structured record
rule results
summary
timestamps
```

For the hackathon, this allows judges to see:

```text
What was spoken
↓
What AI extracted
↓
What worker corrected
↓
Why rule triggered
↓
What supervisor received
```

This provides a strong explainability story.

---

# 83. Logging Policy

Do log:

```text
AI processing time
model version
success/failure
sync success/failure
```

Do not log:

```text
patient name
phone
health measurements
raw transcript
```

---

# 84. Testing Strategy

## Unit Tests

Test:

- validators
- rule engine
- sync queue
- conflict resolution
- schema conversion
- numerical normalization

## Integration Tests

Test:

```text
Voice
→ STT
→ extraction
→ validation
→ rules
→ summary
→ SQLite
```

## Offline Tests

Disable network completely.

Verify:

```text
new patient
new screening
AI processing
save
review
follow-up
```

All must work.

## Sync Tests

Test:

```text
1 record
10 records
duplicate record
failed request
retry
reconnect
```

---

# 85. Required Rule Unit Tests

Create explicit cases:

```text
valid BP
invalid BP
missing BP
uncertain BP
high BP according to configured protocol
normal BP according to configured protocol
missing glucose
follow-up required
follow-up not required
pregnancy danger-sign flag
no pregnancy danger-sign flag
```

All expected outcomes must be known in advance.

---

# 86. Critical Acceptance Criteria

The MVP is successful only if all are true:

### Voice

- Hindi speech can be recorded.
- Speech is transcribed locally.
- No internet is required for STT.

### Extraction

- Important fields are extracted into structured JSON.
- Missing fields are detected.
- Uncertain values require confirmation.

### Safety

- Risk flags come only from deterministic rules.
- Qwen cannot create risk flags.
- No diagnosis language is displayed.

### Offline

- Screening works completely offline.
- Records remain available after app restart.
- Sync happens later.

### Sync

- No duplicate records after repeated upload.
- Failed uploads retry.
- Supervisor sees synchronized records.

### Dashboard

- High-priority cases appear.
- Follow-ups appear.
- Worker information appears.
- Latest sync status appears.

---

# 87. 24-Hour Implementation Plan

The implementation should be done in phases, not feature-by-feature randomly.

---

## PHASE 0 — AI Runtime Feasibility Gate

### Time

**Hour 0–2**

### Objective

Verify the hardest technical dependency before building the entire app around it.

### Tasks

1. Create Expo project.
2. Create development build.
3. Integrate native Cactus module.
4. Verify Cactus loads on the target Android device.
5. Load Needle 2.
6. Run one structured extraction.
7. Load Qwen3-1.7B.
8. Run one short summary.
9. Load Whisper Hindi.
10. Transcribe a Hindi WAV file.
11. Measure RAM and latency.

### Must pass:

```text
Android app launches
Cactus initializes
Whisper works
Needle works
Qwen works
```

### Deliverable

A tiny test application proving:

```text
audio → whisper
text → needle
JSON → qwen
```

Do not proceed with the full application until this smoke test works on the actual demo device.

---

# 88. PHASE 1 — Project Foundation

### Time

**Hour 2–4**

### Tasks

1. Create final monorepo.
2. Configure TypeScript.
3. Configure Expo Router.
4. Create dashboard application.
5. Create FastAPI service.
6. Configure Supabase.
7. Configure environment variables.
8. Configure SQLite.
9. Create shared types.
10. Create Git branches/workflow.
11. Configure EAS/development build.

### Deliverable

```text
mobile ✓
dashboard ✓
backend ✓
database ✓
native AI ✓
```

---

# 89. PHASE 2 — Offline Data Layer

### Time

**Hour 4–7**

### Tasks

Implement:

```text
patients
screenings
followups
sync_queue
app_state
```

Build repositories.

Implement:

```text
createPatient()
createScreening()
createFollowUp()
getPatient()
searchPatients()
listScreenings()
```

Implement:

```text
UUID creation
timestamps
sync_status
```

### Deliverable

Create/edit/read records while completely offline.

---

# 90. PHASE 3 — Core Voice + AI Pipeline

### Time

**Hour 7–11**

### Tasks

Implement:

```text
recordAudio()
transcribe()
extract()
validate()
runRules()
summarize()
```

Build:

```text
Whisper service
Needle service
Qwen service
AI orchestrator
```

### Deliverable

A complete working pipeline:

```text
Hindi Voice
     ↓
Transcript
     ↓
Structured JSON
     ↓
Validated JSON
     ↓
Risk flags
     ↓
Hindi summary
```

---

# 91. PHASE 4 — Worker Workflow Integration

### Time

**Hour 11–15**

Connect the AI pipeline to your existing UI.

Implement:

```text
patient selection
↓
screening selection
↓
voice recording
↓
transcript review
↓
structured review
↓
flag review
↓
confirmation
↓
SQLite save
```

### Deliverable

One complete worker journey working end-to-end.

At this point, the app should already be demoable.

---

# 92. PHASE 5 — Sync + Backend

### Time

**Hour 15–18**

Implement:

```text
POST /sync/push
GET /sync/pull
```

Implement:

```text
sync worker
retry
idempotency
network detection
sync status
```

Build backend:

```text
FastAPI
Supabase
```

### Deliverable

```text
offline record
    ↓
reconnect
    ↓
automatic sync
    ↓
Supabase
```

---

# 93. PHASE 6 — Supervisor Dashboard

### Time

**Hour 18–20**

Implement:

```text
dashboard overview
workers
screenings
high priority
followups
missed followups
sync status
case detail
```

### Deliverable

A supervisor can immediately understand:

```text
What happened today?
Who needs attention?
Which cases are high priority?
Which follow-ups were missed?
Which records are synced?
```

---

# 94. PHASE 7 — Testing + Demo Hardening

### Time

**Hour 20–22**

Run:

```text
Hindi voice tests
number tests
offline tests
sync tests
duplicate tests
AI failure tests
rule tests
dashboard tests
```

Record actual performance:

```text
STT time
Needle time
Qwen time
total pipeline time
memory
```

Fix only critical bugs.

Do not add features.

---

# 95. PHASE 8 — Demo Preparation

### Time

**Hour 22–24**

Freeze feature development.

Prepare:

```text
demo account
demo patients
demo records
dashboard
offline scenario
voice scenario
high-priority scenario
sync scenario
backup walkthrough
```

Create one polished demo sequence.

---

# 96. Final Hackathon Demo Flow

Use exactly this sequence:

## Step 1

Open ASHA app.

Show:

```text
Offline ready
```

## Step 2

Open a patient.

## Step 3

Turn off internet.

## Step 4

Press microphone.

Speak in Hindi:

```text
इनका नाम सुनीता देवी है, उम्र पैंतालीस साल है।
बीपी एक सौ साठ बटा एक सौ है और शुगर दो सौ दस है।
```

## Step 5

Show transcript.

## Step 6

Show extracted:

```text
Age: 45
BP: 160/100
Sugar: 210
```

## Step 7

Show rule:

```text
High-priority screening flag

Reason:
Configured protocol rule triggered.
```

## Step 8

Worker confirms.

## Step 9

Show:

```text
Saved locally
Pending sync
```

## Step 10

Turn internet back on.

## Step 11

Show:

```text
Syncing...
Synced
```

## Step 12

Open supervisor dashboard.

Show the case immediately appearing.

This should be the centerpiece of the presentation.

---

# 97. Hackathon Presentation Story

The presentation should follow:

```text
Problem
↓
Existing digital systems still require manual field interaction
↓
Our solution
↓
Voice-first AI copilot
↓
Offline-first
↓
Transparent rules
↓
Human confirmation
↓
Supervisor visibility
```

Then demonstrate the workflow.

Do not spend most of the presentation explaining model architecture.

Show the product working.

---

# 98. Key Differentiators

## 1. Hindi-first

The worker speaks naturally rather than navigating a long form.

## 2. Offline-first

The field worker is not blocked by network availability.

## 3. On-device AI

Core intelligence works locally.

## 4. Structured extraction

AI converts natural speech into usable fields.

## 5. Deterministic risk engine

Clinical workflow flags do not depend on generative model hallucination.

## 6. Human-in-the-loop

The worker verifies information before finalization.

## 7. Supervisor synchronization

The field interaction produces actionable downstream work.

---

# 99. What Makes This Different From a Generic AI Healthcare App

Do not position the product as:

```text
"AI doctor for rural India"
```

Position it as:

```text
"AI copilot for frontline healthcare workers"
```

The actual product is:

```text
Voice
+
Offline
+
Structured data
+
Protocol rules
+
Follow-up workflow
+
Supervisor sync
```

That is a much more coherent system.

---

# 100. Major Engineering Risks

## Risk 1 — Native AI Integration

Highest technical risk.

Mitigation:

```text
Phase 0 feasibility gate
```

Do this before building the application.

## Risk 2 — Hindi Numeric Recognition

Numbers can be more important than ordinary transcription quality.

Mitigation:

```text
Dedicated Hindi numeric test dataset
+
human confirmation
```

## Risk 3 — Mobile RAM

Three models can consume significant memory.

Mitigation:

```text
load model
→ run
→ release
→ load next model
```

## Risk 4 — Sync Bugs

Mitigation:

```text
UUID
+
idempotency
+
queue
+
retry
```

## Risk 5 — LLM Hallucination

Mitigation:

```text
LLM has no authority over rule evaluation
```

---

# 101. What NOT to Spend Time On

During the hackathon, do not spend significant time on:

```text
ABDM
FHIR
complex authentication
advanced analytics
RAG
vector databases
push notifications
multiple AI agents
multi-language expansion
beautiful animations
production infrastructure
complex conflict resolution
```

The product works without them.

---

# 102. Future Roadmap

After the hackathon:

## Phase 2

```text
Additional Indian languages
Better ASR
More ASHA workflows
Improved sync
Device management
```

## Phase 3

```text
ABDM integration
FHIR interoperability
Consent workflows
Production identity
Encrypted cloud storage
Audit logging
```

## Phase 4

```text
Larger workflow coverage
Population analytics
ASHA performance analytics
Public-health program integration
Advanced multilingual capabilities
```

None of these belong in the hackathon MVP.

---

# 103. Final Architecture Summary

```text
                    ASHA AI COPILOT

                     MOBILE DEVICE
                         │
                         ▼
                 ┌──────────────┐
                 │ React Native │
                 │    Expo      │
                 └──────┬───────┘
                        │
                ┌───────▼────────┐
                │ Screening       │
                │ Orchestrator    │
                └───────┬────────┘
                        │
             ┌──────────┼───────────┐
             │          │           │
             ▼          ▼           ▼
         Whisper      Needle      Qwen
         Hindi        2           1.7B
             │          │           │
             ▼          ▼           ▼
       Transcript   Structured   Summary
                        │
                        ▼
                  Validation
                        │
                        ▼
                  Rule Engine
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
        Risk / Follow-up       Missing Data
             │                     │
             └──────────┬──────────┘
                        ▼
                Human Confirmation
                        │
                        ▼
                     SQLite
                        │
                 Sync Queue
                        │
              Network Available
                        │
                        ▼
                     FastAPI
                        │
                        ▼
                  Supabase DB
                        │
                        ▼
               Supervisor Dashboard
```

---

# 104. Final Technology Decisions

These are the fixed MVP decisions:

```text
Mobile:
React Native + Expo + TypeScript

Native runtime:
Cactus v2.2.2

Mobile integration:
Expo Development Build + local/native Cactus module

STT:
collabora/whisper-tiny-hindi

Structured extraction:
Cactus Needle 2

LLM:
Qwen3-1.7B quantized for mobile inference

Clinical logic:
Deterministic TypeScript rule engine

Local database:
Expo SQLite

Secure storage:
Expo SecureStore

Backend:
FastAPI

Cloud database:
Supabase PostgreSQL

Web dashboard:
React + Tailwind + TypeScript

Mobile AI:
On-device

Network requirement:
None for core screening workflow

Cloud dependency:
Synchronization only

Authentication:
Seeded hackathon role-based authentication

Primary workflow:
NCD screening

Secondary workflow:
Pregnancy danger-sign screening

Clinical decision authority:
Configured protocol rules + human confirmation
```

Cactus currently provides mobile bindings and supports local model execution on Android/iOS, while Expo's development-build workflow is designed for apps that require custom native code.

---

# 105. Definition of Done

The ASHA AI Copilot MVP is considered complete when:

```text
[✓] Hindi voice can be recorded
[✓] Hindi speech is transcribed locally
[✓] Transcript can be converted to structured fields
[✓] Structured fields are validated
[✓] Missing/uncertain values are detected
[✓] Deterministic screening rules execute
[✓] Rule reasons are displayed
[✓] Qwen generates a short Hindi explanation
[✓] Worker can edit AI output
[✓] Worker confirms final record
[✓] Record saves offline
[✓] App survives restart while offline
[✓] Sync queue works
[✓] Duplicate upload does not duplicate records
[✓] Reconnection triggers sync
[✓] Supervisor receives synced record
[✓] Dashboard shows priority cases
[✓] Follow-ups are visible
[✓] No raw audio is unnecessarily retained
[✓] No cloud AI is required for the core workflow
[✓] Demo works on the actual target Android device
```

---

# 106. Final Product Principle

The most important architectural rule for the entire project is:

```text
AI interprets input.
Rules determine workflow.
Humans confirm records.
Database preserves truth.
Sync connects the field to the supervisor.
```

The system should never become:

```text
Voice → LLM → Medical Decision
```

It should remain:

```text
Voice
  ↓
Local STT
  ↓
Structured extraction
  ↓
Validation
  ↓
Deterministic protocol rules
  ↓
Human confirmation
  ↓
Offline record
  ↓
Supervisor synchronization
```

That architecture keeps the MVP technically ambitious enough for a hackathon while remaining understandable, demonstrable, and much safer than an unconstrained AI healthcare chatbot.