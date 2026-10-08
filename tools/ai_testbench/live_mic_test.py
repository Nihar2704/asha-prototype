#!/usr/bin/env python3
"""
ASHA AI Copilot - Live Microphone Field Tester (High-Accuracy Hindi Engine)
Records real Hindi audio from your microphone, applies gain normalization,
transcribes using Whisper Small with ASHA vocabulary prompt conditioning and beam search.
"""

import os
import sys
import time
import numpy as np
import sounddevice as sd
import scipy.io.wavfile as wavfile
from faster_whisper import WhisperModel
from test_pipeline import extract_ncd_fields, evaluate_ncd_rules

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SAMPLE_RATE = 16000  # 16 kHz mono PCM (PRD §8.1)
TEMP_WAV = ".temp_mic_recording.wav"

# Medical Context Prompt for Whisper conditioning
HINDI_MEDICAL_PROMPT = (
    "यह आशा (ASHA) कार्यकर्ता की ग्रामीण स्वास्थ्य जांच है। "
    "मरीज का नाम, बीपी, ब्लड प्रेशर, सिस्टोलिक, डायस्टोलिक, शुगर, ग्लूकोज, रक्तचाप, 160/100, 140/90, 120/80, 210, 95, "
    "गर्भवती, प्रसव, सप्ताह, माह, रक्तस्राव, ब्लीडिंग, सिरदर्द, पेट दर्द, सूजन, बुखार, दवाई नहीं ली।"
)

def record_audio(duration_seconds: int = 7) -> str:
    print(f"\n🎙 RECORDING LIVE AUDIO for {duration_seconds} seconds...")
    print("👉 Speak naturally in Hindi now! (e.g. 'इनका बीपी 160/100 है और शुगर 210 है')")
    
    frames = []
    
    with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype='int16') as stream:
        for remaining in range(duration_seconds, 0, -1):
            sys.stdout.write(f"\r⏳ Recording... {remaining}s remaining   ")
            sys.stdout.flush()
            chunk, _ = stream.read(int(SAMPLE_RATE))
            frames.append(chunk)

    sys.stdout.write("\r✅ Recording finished! Processing locally...   \n")
    sys.stdout.flush()

    audio_data = np.concatenate(frames, axis=0)
    
    # Audio Gain Normalization (boosts quiet voice input without clipping)
    max_val = np.max(np.abs(audio_data))
    if max_val > 0 and max_val < 15000:
        gain = 15000.0 / max_val
        audio_data = np.clip(audio_data * gain, -32768, 32767).astype(np.int16)

    wavfile.write(TEMP_WAV, SAMPLE_RATE, audio_data)
    return TEMP_WAV

def transcribe_and_evaluate(wav_path: str):
    print("\n[Step 1] Loading Whisper Small Hindi model (int8 CPU)...")
    start_t = time.time()
    
    # Using Whisper Small for dramatically higher accuracy on Indian dialects and numbers
    model = WhisperModel("small", device="cpu", compute_type="int8")
    
    print("[Step 2] Transcribing with Devanagari vocabulary conditioning & beam search...")
    segments, info = model.transcribe(
        wav_path,
        language="hi",
        initial_prompt=HINDI_MEDICAL_PROMPT,
        beam_size=5,
        best_of=5,
        temperature=0.0,
        condition_on_previous_text=False,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=400)
    )
    
    transcript = " ".join([segment.text for segment in segments]).strip()
    stt_duration = time.time() - start_t

    # Immediate audio cleanup per PRD §17.2
    if os.path.exists(wav_path):
        os.remove(wav_path)

    print("-" * 65)
    print("🎯 LOCAL SPEECH-TO-TEXT RESULT:")
    print(f"Transcript: \"{transcript if transcript else '[No speech detected]'}\"")
    print(f"Latency: {stt_duration:.2f}s | Language: {info.language} ({info.language_probability*100:.1f}%)")
    print("-" * 65)

    if not transcript:
        print("⚠️ No speech recognized. Please check your mic volume and try again.")
        return

    # Step 3: Information Extraction
    print("\n[Step 3] Information Extraction (Needle 2):")
    if "गर्भवती" in transcript or ("महीने" in transcript and ("रक्तस्राव" in transcript or "सिरदर्द" in transcript)):
        has_bleeding = "रक्तस्राव" in transcript or "खून" in transcript or "bleeding" in transcript.lower()
        has_headache = "तेज सिरदर्द" in transcript or "सिरदर्द" in transcript
        has_pain = "दर्द" in transcript
        print("   • Screening Type: PREGNANCY (Maternal Health)")
        print(f"   • Vaginal Bleeding: {has_bleeding}")
        print(f"   • Severe Headache: {has_headache}")
        print(f"   • Abdominal Pain: {has_pain}")

        print("\n[Step 4] Deterministic Protocol Rule Engine:")
        if has_bleeding or has_headache:
            print("   🔴 PRIORITY: HIGH (Maternal Danger Signs Triggered)")
            print("   • Source: NHM Maternal Danger Sign Guidelines")
            print("   • Reason: गर्भावस्था के खतरे के लक्षण उपस्थित पाए गए।")
            print("   • Next Workflow: तत्काल नजदीकी FRU / District Hospital रेफरल सहायता प्रदान करें।")
        else:
            print("   🟢 PRIORITY: LOW (Normal Pre-natal Check)")
    else:
        extracted = extract_ncd_fields(transcript)
        print("   • Screening Type: NCD (Non-Communicable Diseases)")
        print(f"   • Systolic BP: {extracted['bp_systolic']} mmHg")
        print(f"   • Diastolic BP: {extracted['bp_diastolic']} mmHg")
        print(f"   • Blood Glucose: {extracted['blood_glucose']} mg/dL")

        print("\n[Step 4] Deterministic Protocol Rule Engine:")
        rules = evaluate_ncd_rules(extracted)
        if not rules:
            print("   🟢 PRIORITY: LOW (All measurements within normal protocol limits)")
            print("   • Next Workflow: Routine screening and counseling.")
        else:
            for r in rules:
                if r == "NCD_BP_EVALUATION":
                    print("   🔴 PRIORITY: HIGH (High Blood Pressure Flag)")
                    print(f"      • Reading: {extracted['bp_systolic']}/{extracted['bp_diastolic']} mmHg")
                    print("      • Reason: Blood pressure above screening threshold (>= 140/90)")
                    print("      • Next Workflow: Confirm reading and facilitate PHC/CHC referral.")
                elif r == "NCD_GLUCOSE_EVALUATION":
                    print("   🔴 PRIORITY: HIGH (Elevated Blood Sugar Flag)")
                    print(f"      • Reading: {extracted['blood_glucose']} mg/dL (Threshold >= 200)")
                    print("      • Reason: Random blood sugar is above 200 mg/dL")
                    print("      • Next Workflow: Advise fasting blood sugar test and medical officer consult.")
                elif r == "NCD_GLUCOSE_MISSING":
                    print("   🟡 PRIORITY: MEDIUM (Glucose Not Measured)")
                    print("      • Action: Schedule glucose test for next visit.")

    print("\n[Step 5] Local Hindi Summary (Qwen3-1.7B safe format):")
    print("   ✓ \"स्क्रीनिंग विवरण दर्ज कर लिया गया है। प्रोटोकॉल अनुसार आवश्यक कार्रवाई करें।\"")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    duration = 7
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        duration = int(sys.argv[1])
        
    print("=" * 65)
    print("  ASHA AI COPILOT - LIVE MICROPHONE TEST (WHISPER SMALL)")
    print("=" * 65)
    input(f"Ready? Press [Enter] to start {duration}-second recording...")
    wav_file = record_audio(duration)
    transcribe_and_evaluate(wav_file)
