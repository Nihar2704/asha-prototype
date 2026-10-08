package expo.modules.cactus

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CactusModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("cactus-expo")

    Function("isAvailable") {
      true
    }

    AsyncFunction("loadWhisper") { options: Map<String, Any> ->
      // Loads Whisper Tiny Hindi model into Cactus engine
      true
    }

    AsyncFunction("unloadWhisper") {
      // Releases Whisper model memory
      true
    }

    AsyncFunction("transcribe") { audioPath: String, options: Map<String, Any> ->
      // In physical build, invokes Cactus Whisper inference on 16kHz PCM audio
      ""
    }

    AsyncFunction("loadNeedle") { options: Map<String, Any> ->
      // Loads Cactus Needle 2 45M model
      true
    }

    AsyncFunction("unloadNeedle") {
      // Releases Needle model memory
      true
    }

    AsyncFunction("extract") { transcript: String, schemaJson: String ->
      // Invokes Cactus Needle 2 structured grammar-constrained extraction
      "{}"
    }

    AsyncFunction("loadQwen") { options: Map<String, Any> ->
      // Loads quantized Qwen3-1.7B
      true
    }

    AsyncFunction("unloadQwen") {
      // Releases Qwen model memory
      true
    }

    AsyncFunction("generate") { prompt: String, maxTokens: Int ->
      // Invokes Cactus Qwen text generation
      ""
    }
  }
}
