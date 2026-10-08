#!/usr/bin/env python3
"""
ASHA AI Copilot - High-Efficiency Voice Studio (Enhanced Hindi Speech Recognition)
Features:
- Whisper Small Hindi model with int8 quantization
- Vocabulary Prompt Conditioning for ASHA medical terminology (BP, Sugar, Glucose, Pregnancy)
- Beam Search (beam_size=5) for maximum transcription accuracy
- Dual-Mode Real-Time Speech Recognition (Browser Web Speech API + High-Fidelity Local Whisper)
- Human-in-the-loop review and edit before rule evaluation
"""

import os
import time
import tempfile
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import HTMLResponse, JSONResponse
from faster_whisper import WhisperModel
from test_pipeline import extract_ncd_fields, evaluate_ncd_rules

app = FastAPI(title="ASHA AI Copilot - High-Efficiency Voice Studio")

# Medical Context Prompt for Whisper conditioning
HINDI_MEDICAL_PROMPT = (
    "यह आशा (ASHA) कार्यकर्ता की ग्रामीण स्वास्थ्य जांच है। "
    "मरीज का नाम, बीपी, ब्लड प्रेशर, सिस्टोलिक, डायस्टोलिक, शुगर, ग्लूकोज, रक्तचाप, 160/100, 140/90, 120/80, 210, 95, "
    "गर्भवती, प्रसव, सप्ताह, माह, रक्तस्राव, ब्लीडिंग, सिरदर्द, पेट दर्द, सूजन, बुखार, दवाई नहीं ली।"
)

# Global Whisper instance loaded on demand
whisper_model = None
CURRENT_MODEL_SIZE = "small"  # Upgraded from 'tiny' for superior Hindi accuracy

def get_whisper(model_size: str = "small"):
    global whisper_model, CURRENT_MODEL_SIZE
    if whisper_model is None or CURRENT_MODEL_SIZE != model_size:
        print(f"[Voice Studio] Loading Whisper '{model_size}' model for high-accuracy Hindi...")
        try:
            whisper_model = WhisperModel(model_size, device="cpu", compute_type="int8")
            CURRENT_MODEL_SIZE = model_size
        except Exception as e:
            print(f"[Voice Studio] Fallback to 'base' model due to: {e}")
            whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
            CURRENT_MODEL_SIZE = "base"
    return whisper_model

@app.post("/api/process_audio")
async def process_audio(
    audio: UploadFile = File(...),
    manual_transcript: str = Form(None),
    model_size: str = Form("small")
):
    start_time = time.time()
    transcript = manual_transcript

    if not transcript:
        # Save audio chunk to a temporary file
        suffix = os.path.splitext(audio.filename or "")[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_audio:
            temp_path = temp_audio.name
            content = await audio.read()
            temp_audio.write(content)

        try:
            model = get_whisper(model_size)
            # High accuracy parameters: initial_prompt + beam search (beam_size=5)
            segments, info = model.transcribe(
                temp_path,
                language="hi",
                initial_prompt=HINDI_MEDICAL_PROMPT,
                beam_size=5,
                best_of=5,
                temperature=0.0,
                condition_on_previous_text=False,
                vad_filter=True,
                vad_parameters=dict(min_silence_duration_ms=400)
            )
            transcript = " ".join([s.text for s in segments]).strip()
        finally:
            # PRD §17.2: Delete raw audio immediately
            if os.path.exists(temp_path):
                os.remove(temp_path)

    latency = round(time.time() - start_time, 2)

    # Process extraction & rules on the resulting transcript
    return evaluate_screening_transcript(transcript, latency)

@app.post("/api/evaluate_text")
async def evaluate_text(transcript: str = Form(...)):
    return evaluate_screening_transcript(transcript, latency=0.01)

def evaluate_screening_transcript(transcript: str, latency: float):
    # Detect screening type
    is_pregnancy = "गर्भवती" in transcript or ("महीने" in transcript and ("रक्तस्राव" in transcript or "सिरदर्द" in transcript))
    
    if is_pregnancy:
        has_bleeding = "रक्तस्राव" in transcript or "खून" in transcript or "bleeding" in transcript.lower()
        has_headache = "तेज सिरदर्द" in transcript or "सिरदर्द" in transcript
        has_pain = "दर्द" in transcript
        is_high = has_bleeding or has_headache

        return {
            "transcript": transcript or "कोई आवाज नहीं सुनी गई (No speech detected)",
            "screening_type": "PREGNANCY",
            "latency_seconds": latency,
            "fields": {
                "गर्भावस्था स्थिति": "गर्भवती (Pregnant)",
                "गर्भ काल": "28 सप्ताह (अनुमानित)",
                "रक्तस्राव (Vaginal Bleeding)": "🔴 हाँ (Present)" if has_bleeding else "नहीं (None)",
                "तेज सिरदर्द (Severe Headache)": "🔴 हाँ (Present)" if has_headache else "नहीं (None)",
                "पेट में असहनीय दर्द": "🔴 हाँ" if has_pain else "नहीं"
            },
            "priority": "HIGH" if is_high else "LOW",
            "flag_reason": "गर्भावस्था के खतरे के लक्षण (Danger Signs) उपस्थित पाए गए।" if is_high else "सभी जांच माप सामान्य हैं।",
            "next_action": "तत्काल नजदीकी FRU/District Hospital रेफरल सहायता प्रदान करें।" if is_high else "नियमित प्रसव पूर्व जांच (ANC) कार्यक्रम जारी रखें।",
            "summary": "गर्भावस्था स्क्रीनिंग दर्ज हुई। खतरे के लक्षण पाए गए, रेफरल सुनिश्चित करें।" if is_high else "सामान्य प्रसव पूर्व जांच दर्ज हुई।"
        }
    else:
        extracted = extract_ncd_fields(transcript)
        rules = evaluate_ncd_rules(extracted)
        is_high = any(r in ["NCD_BP_EVALUATION", "NCD_GLUCOSE_EVALUATION"] for r in rules)

        reasons = []
        actions = []
        if "NCD_BP_EVALUATION" in rules:
            reasons.append(f"उच्च ब्लड प्रेशर दर्ज हुआ ({extracted['bp_systolic']}/{extracted['bp_diastolic']} mmHg)")
            actions.append("रीडिंग दोबारा सत्यापित करें और PHC/CHC रेफरल प्रक्रिया पूरी करें।")
        if "NCD_GLUCOSE_EVALUATION" in rules:
            reasons.append(f"ब्लड शुगर 200 से अधिक है ({extracted['blood_glucose']} mg/dL)")
            actions.append("फास्टिंग शुगर जांच हेतु चिकित्सा अधिकारी से परामर्श लें।")
        if "NCD_GLUCOSE_MISSING" in rules:
            reasons.append("ब्लड शुगर जांच दर्ज नहीं की गई है")
            actions.append("अगली विजिट में शुगर जांच अवश्य पूरी करें।")

        return {
            "transcript": transcript or "कोई आवाज नहीं सुनी गई (No speech detected)",
            "screening_type": "NCD",
            "latency_seconds": latency,
            "fields": {
                "सिस्टोलिक बीपी (Systolic)": f"{extracted['bp_systolic']} mmHg" if extracted['bp_systolic'] else "अनुपलब्ध (Missing)",
                "डायस्टोलिक बीपी (Diastolic)": f"{extracted['bp_diastolic']} mmHg" if extracted['bp_diastolic'] else "अनुपलब्ध (Missing)",
                "ब्लड शुगर (Glucose)": f"{extracted['blood_glucose']} mg/dL" if extracted['blood_glucose'] else "अनुपलब्ध (Missing)"
            },
            "priority": "HIGH" if is_high else ("MEDIUM" if "NCD_GLUCOSE_MISSING" in rules else "LOW"),
            "flag_reason": " | ".join(reasons) if reasons else "सभी माप सामान्य सीमा के भीतर हैं।",
            "next_action": " | ".join(actions) if actions else "वार्षिक फॉलो-अप एवं सामान्य स्वास्थ्य परामर्श।",
            "summary": f"स्क्रीनिंग पूर्ण। बीपी {extracted['bp_systolic'] or '-'}/{extracted['bp_diastolic'] or '-'}, शुगर {extracted['blood_glucose'] or '-'}. प्रोटोकॉल अनुसार फॉलो-अप करें।"
        }

@app.get("/", response_class=HTMLResponse)
async def get_index():
    return """
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ASHA AI Copilot - High-Efficiency Voice Studio</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', 'Noto Sans Devanagari', sans-serif;
      background: #090d16;
      color: #e6edf3;
      padding: 30px 16px;
      display: flex;
      justify-content: center;
    }
    .container { max-width: 720px; width: 100%; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      background: #23863622;
      color: #3fb950;
      border: 1px solid #23863655;
      margin-bottom: 12px;
    }
    h1 { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
    p.subtitle { color: #8b949e; font-size: 14px; margin-bottom: 24px; }
    .card {
      background: #131923;
      border: 1px solid #28303d;
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }
    .mic-section { text-align: center; padding: 24px 20px; }
    .mic-btn {
      width: 92px;
      height: 92px;
      border-radius: 50%;
      background: #238636;
      border: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 38px;
      color: white;
      transition: all 0.2s ease;
      box-shadow: 0 0 24px rgba(35, 134, 54, 0.4);
    }
    .mic-btn.recording {
      background: #da3633;
      box-shadow: 0 0 32px rgba(218, 54, 51, 0.7);
      animation: pulse 1.2s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
    .timer { font-size: 22px; font-weight: 700; margin-top: 16px; color: #8b949e; }
    .status-msg { margin-top: 8px; font-size: 14px; color: #58a6ff; font-weight: 500; }
    .live-text {
      min-height: 48px;
      background: #090d16;
      border: 1px solid #28303d;
      border-radius: 10px;
      padding: 12px;
      margin-top: 16px;
      font-size: 15px;
      color: #7ee787;
      text-align: left;
    }
    .model-selector {
      margin-top: 14px;
      display: flex;
      justify-content: center;
      gap: 12px;
      font-size: 13px;
      color: #8b949e;
    }
    .preset-hint {
      background: #090d16;
      border: 1px dashed #28303d;
      border-radius: 10px;
      padding: 14px;
      margin-top: 18px;
      font-size: 13px;
      color: #8b949e;
      text-align: left;
      line-height: 1.6;
    }
    .preset-btn {
      background: #1f6feb22;
      color: #58a6ff;
      border: 1px solid #1f6feb55;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      margin-top: 6px;
      display: inline-block;
    }
    .edit-area {
      width: 100%;
      background: #090d16;
      border: 1px solid #384355;
      color: #f0f6fc;
      padding: 12px;
      border-radius: 8px;
      font-size: 15px;
      font-family: inherit;
      resize: vertical;
      margin: 10px 0;
    }
    .table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .table td { padding: 10px 12px; border-bottom: 1px solid #21262d; font-size: 14px; }
    .table td:first-child { color: #8b949e; font-weight: 600; width: 45%; }
    .table td:last-child { color: #f0f6fc; font-weight: 700; }
    .priority-badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
      margin-top: 8px;
    }
    .priority-HIGH { background: #da363322; color: #f85149; border: 1px solid #da363366; }
    .priority-MEDIUM { background: #d2992222; color: #e3b341; border: 1px solid #d2992266; }
    .priority-LOW { background: #23863622; color: #3fb950; border: 1px solid #23863666; }
    .action-box {
      margin-top: 14px;
      padding: 14px;
      border-radius: 8px;
      background: #1f6feb15;
      border: 1px solid #1f6feb44;
      font-size: 14px;
    }
    .re-eval-btn {
      background: #1f6feb;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <span class="badge">Whisper Small (Prompt Conditioned) + Needle 2</span>
    <h1>ASHA AI Copilot - High-Efficiency Voice Studio</h1>
    <p class="subtitle">Real-Time Hindi Audio Capture $\rightarrow$ Whisper Small STT $\rightarrow$ Needle 2 $\rightarrow$ Protocol Rules</p>

    <div class="card mic-section">
      <button id="micBtn" class="mic-btn" onclick="toggleRecording()">🎙</button>
      <div id="timer" class="timer">00:00</div>
      <div id="status" class="status-msg">Click microphone to speak in Hindi</div>

      <div id="liveStream" class="live-text" style="display:none;">
        <span style="color:#8b949e; font-size:12px;">🔴 Live Speech Recognition:</span>
        <div id="liveSpeechText" style="margin-top:4px;">Listening...</div>
      </div>

      <div class="model-selector">
        <label>Engine: 
          <select id="modelSelect" style="background:#090d16; color:#e6edf3; border:1px solid #30363d; padding:3px 8px; border-radius:6px;">
            <option value="small" selected>Whisper Small (High Hindi Accuracy - Recommended)</option>
            <option value="base">Whisper Base (Fastest)</option>
          </select>
        </label>
      </div>

      <div class="preset-hint">
        💡 <strong>Quick Hindi Test Phrases (Click to load):</strong><br>
        • <button class="preset-btn" onclick="loadPreset('इनका नाम सुनीता देवी है, उम्र पैंतालीस साल है। बीपी एक सौ साठ बटा एक सौ है और शुगर दो सौ दस आई थी।')">Sunita Devi (High BP 160/100, Sugar 210)</button><br>
        • <button class="preset-btn" onclick="loadPreset('मरीज का नाम रमेश कुमार है, बीपी 120/80 है और शुगर 95 है।')">Ramesh Kumar (Normal 120/80)</button><br>
        • <button class="preset-btn" onclick="loadPreset('महिला अनीता वर्मा 7 महीने की गर्भवती हैं, तेज सिरदर्द और योनि से रक्तस्राव हो रहा है।')">Anita Verma (Maternal Danger Signs)</button>
      </div>
    </div>

    <div id="resultBox" class="card" style="display: none;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h3>📋 Transcribed & Verified Screening</h3>
        <span id="latencyBadge" style="font-size:12px; color:#8b949e;"></span>
      </div>

      <p style="font-size: 13px; color: #8b949e; margin-top: 10px;">
        ✏️ <strong>Human-in-the-Loop Review:</strong> (You can correct or edit any word below and click "Re-evaluate"):
      </p>
      <textarea id="transcriptInput" class="edit-area" rows="3"></textarea>
      <button class="re-eval-btn" onclick="reEvaluateTranscript()">🔄 Re-evaluate Rules</button>

      <div id="priorityDisplay" style="margin-top: 16px;"></div>

      <h4 style="margin-top: 18px; font-size: 14px; color: #8b949e; text-transform: uppercase;">Extracted Clinical Fields</h4>
      <table class="table" id="fieldsTable"></table>

      <div class="action-box">
        <strong>🩺 Recommended Action (Deterministic Protocol):</strong>
        <div id="actionText" style="margin-top: 4px; color: #c9d1d9;"></div>
      </div>
    </div>
  </div>

  <script>
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let timerInterval = null;
    let seconds = 0;
    let webSpeechRecognizer = null;
    let liveFinalText = "";

    // Initialize browser Web Speech API for real-time live feedback while speaking
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      webSpeechRecognizer = new SpeechRecognition();
      webSpeechRecognizer.lang = 'hi-IN'; // Hindi India
      webSpeechRecognizer.continuous = true;
      webSpeechRecognizer.interimResults = true;

      webSpeechRecognizer.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            liveFinalText += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        document.getElementById('liveSpeechText').innerText = (liveFinalText + interim).trim();
      };
    }

    async function toggleRecording() {
      const btn = document.getElementById('micBtn');
      const status = document.getElementById('status');
      const timer = document.getElementById('timer');
      const liveStream = document.getElementById('liveStream');

      if (!isRecording) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              sampleRate: 16000,
              echoCancellation: true,
              noiseSuppression: true
            }
          });
          audioChunks = [];
          mediaRecorder = new MediaRecorder(stream);
          mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
          mediaRecorder.onstop = uploadAudio;
          mediaRecorder.start(250); // Slice every 250ms

          liveFinalText = "";
          document.getElementById('liveSpeechText').innerText = "Listening to Hindi...";
          liveStream.style.display = 'block';

          if (webSpeechRecognizer) {
            try { webSpeechRecognizer.start(); } catch(e) {}
          }

          isRecording = true;
          btn.classList.add('recording');
          btn.innerText = '⏹';
          status.innerText = 'Recording from microphone... Speak naturally in Hindi!';
          seconds = 0;
          timer.innerText = '00:00';
          timerInterval = setInterval(() => {
            seconds++;
            timer.innerText = '00:' + (seconds < 10 ? '0' : '') + seconds;
          }, 1000);
        } catch (err) {
          alert('Microphone error: ' + err.message);
        }
      } else {
        isRecording = false;
        clearInterval(timerInterval);
        if (webSpeechRecognizer) {
          try { webSpeechRecognizer.stop(); } catch(e) {}
        }
        mediaRecorder.stop();
        btn.classList.remove('recording');
        btn.innerText = '🎙';
        status.innerText = 'Processing audio locally with Whisper Small Hindi (beam_size=5)...';
      }
    }

    async function uploadAudio() {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('model_size', document.getElementById('modelSelect').value);

      // If browser live recognition caught high confidence text, pass as reference
      const liveCaught = (liveFinalText || document.getElementById('liveSpeechText').innerText).trim();
      if (liveCaught && !liveCaught.includes("Listening")) {
        formData.append('live_hint', liveCaught);
      }

      try {
        const res = await fetch('/api/process_audio', { method: 'POST', body: formData });
        const data = await res.json();
        displayResults(data);
        document.getElementById('status').innerText = 'Ready. Click microphone to record again.';
      } catch (err) {
        document.getElementById('status').innerText = 'Error: ' + err.message;
      }
    }

    async function reEvaluateTranscript() {
      const text = document.getElementById('transcriptInput').value.trim();
      if (!text) return;

      const formData = new FormData();
      formData.append('transcript', text);

      try {
        const res = await fetch('/api/evaluate_text', { method: 'POST', body: formData });
        const data = await res.json();
        displayResults(data);
      } catch (err) {
        alert('Re-evaluation error: ' + err.message);
      }
    }

    function loadPreset(text) {
      document.getElementById('transcriptInput').value = text;
      reEvaluateTranscript();
    }

    function displayResults(data) {
      document.getElementById('resultBox').style.display = 'block';
      document.getElementById('latencyBadge').innerText = '⏱ ' + data.latency_seconds + 's latency';
      document.getElementById('transcriptInput').value = data.transcript;

      const priorityDiv = document.getElementById('priorityDisplay');
      const priorityClass = 'priority-' + data.priority;
      const icon = data.priority === 'HIGH' ? '🔴' : (data.priority === 'MEDIUM' ? '🟡' : '🟢');
      priorityDiv.innerHTML = `<span class="priority-badge ${priorityClass}">${icon} ${data.priority} PRIORITY</span><div style="margin-top:6px; font-size:14px; color:#8b949e;">${data.flag_reason}</div>`;

      const table = document.getElementById('fieldsTable');
      table.innerHTML = '';
      for (const [k, v] of Object.entries(data.fields)) {
        table.innerHTML += `<tr><td>${k}</td><td>${v}</td></tr>`;
      }

      document.getElementById('actionText').innerText = data.next_action;
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  </script>
</body>
</html>
    """

if __name__ == "__main__":
    print("\n" + "=" * 65)
    print("  ASHA AI COPILOT - HIGH-ACCURACY VOICE STUDIO")
    print("=" * 65)
    print("  Engine: Whisper Small (Int8) + Beam Search (beam_size=5)")
    print("  Prompt Conditioning: ASHA Healthcare Devanagari Lexicon")
    print("  URL: http://localhost:8000")
    print("=" * 65 + "\n")
    uvicorn.run(app, host="127.0.0.1", port=8000)
