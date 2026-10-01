#!/usr/bin/env python3
"""Pre-generates the audio of every word and sentence of the courses.

  pip install sherpa-onnx numpy lameenc
  PIPER_VOICES=/path/to/voices python3 scripts/audio/generate.py [lang ...]

Voices: Piper neural voices (https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models),
one folder per voice under $PIPER_VOICES (vits-piper-<voice>/). For each
language that has a voice, writes:
  course/audio/<lang>/<id>.mp3     one file per distinct text (mono, 24 kb/s)
  course/audio/<lang>/index.json   {text: id}
The id is a hash of voice + text: re-running only synthesises what is new or
changed. scripts/course/build.js then links each word/sentence to its file;
the app plays it, and falls back to the device's voice when there is none
(Japanese, Korean, Hebrew, Greek, Ukrainian and the languages without a
free neural voice).
"""
import hashlib, json, os, re, sys
import numpy as np, sherpa_onnx, lameenc

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VOICES_DIR = os.environ.get("PIPER_VOICES", os.path.join(ROOT, "scripts", "audio", "voices"))
# language code of the app → (Piper voice, speaker id, speed)
VOICES = {
    "ar": ("ar_JO-kareem-medium", 0, 0.95), "cs": ("cs_CZ-jirka-medium", 0, 0.95), "cy": ("cy_GB-gwryw_gogleddol-medium", 0, 0.95),
    "da": ("da_DK-talesyntese-medium", 0, 0.95), "de": ("de_DE-thorsten-medium", 0, 0.95),
    "en": ("en_US-lessac-high", 0, 0.95), "es": ("es_ES-davefx-medium", 0, 0.95), "fi": ("fi_FI-harri-medium", 0, 0.95),
    "fr": ("fr_FR-siwis-medium", 0, 0.9), "hi": ("hi_IN-pratham-medium", 0, 0.95), "hu": ("hu_HU-anna-medium", 0, 0.95),
    "id": ("id_ID-news_tts-medium", 0, 0.95), "it": ("it_IT-paola-medium", 0, 0.95), "nb": ("no_NO-talesyntese-medium", 0, 0.95),
    "nl": ("nl_BE-nathalie-medium", 0, 0.95), "pl": ("pl_PL-gosia-medium", 0, 0.95), "pt": ("pt_BR-faber-medium", 0, 0.95),
    "ro": ("ro_RO-mihai-medium", 0, 0.95), "ru": ("ru_RU-irina-medium", 0, 0.95), "sv": ("sv_SE-nst-medium", 0, 0.95),
    "sw": ("sw_CD-lanfrica-medium", 0, 0.95), "tr": ("tr_TR-dfki-medium", 0, 0.95),
    "vi": ("vi_VN-vais1000-medium", 0, 0.95), "zh": ("zh_CN-huayan-medium", 0, 0.95),
}
# Left out after listening tests (automatic transcription with Whisper):
# el_GR-rapunzelina-low babbles, and uk_UA-ukrainian_tts (character-based
# input) comes out almost silent through sherpa-onnx. Greek and Ukrainian use
# the device's voice until a better free voice exists.
SR_OUT = 22050

def engine(voice):
    d = os.path.join(VOICES_DIR, "vits-piper-" + voice)
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(
        model=f"{d}/{voice}.onnx", tokens=f"{d}/tokens.txt", data_dir=f"{d}/espeak-ng-data"), num_threads=4))
    return sherpa_onnx.OfflineTts(cfg)

def spoken(text):
    """What is read aloud: notes in brackets are dropped ("gehen (zu Fuß)" →
    "gehen"), gender endings too ("Obrigado/a" → "Obrigado"), and
    alternatives get a short pause ("ser / estar" → "ser, estar")."""
    t = re.sub(r"\(.*?\)|\[.*?\]", "", text)
    t = re.sub(r"(\w)/\w{1,2}\b", r"\1", t)
    t = re.sub(r"\s*/\s*", ", ", t)
    return re.sub(r"\s+", " ", t).strip(" ,;")

def to_mp3(samples, sr):
    x = np.asarray(samples, dtype=np.float32)
    idx = np.nonzero(np.abs(x) > 0.004)[0]
    if len(idx): x = x[max(0, idx[0] - int(0.02 * sr)): idx[-1] + int(0.08 * sr)]
    if sr != SR_OUT:
        x = np.interp(np.arange(0, len(x), sr / SR_OUT), np.arange(len(x)), x).astype(np.float32)
    peak = float(np.abs(x).max()) or 1.0
    x = np.concatenate([np.zeros(int(0.03 * SR_OUT), np.float32), x / peak * 0.9])
    enc = lameenc.Encoder()
    enc.set_bit_rate(24); enc.set_in_sample_rate(SR_OUT); enc.set_channels(1); enc.set_quality(2)
    return enc.encode((x * 32767).astype(np.int16).tobytes()) + enc.flush()

def texts_of(code):
    data = json.load(open(os.path.join(ROOT, "course", "data", code + ".json"), encoding="utf8"))
    seen, out = set(), []
    for item in data.get("words", []) + data.get("phrases", []):
        t = item.get("t")
        if t and t not in seen: seen.add(t); out.append(t)
    return out

def main(langs):
    for code in langs:
        voice, sid, speed = VOICES[code]
        if not os.path.isdir(os.path.join(VOICES_DIR, "vits-piper-" + voice)):
            print(f"{code}: voice {voice} missing, skipped"); continue
        outdir = os.path.join(ROOT, "course", "audio", code)
        os.makedirs(outdir, exist_ok=True)
        idx_path = os.path.join(outdir, "index.json")
        tts, index, made = None, {}, 0
        for text in texts_of(code):
            say = spoken(text)
            if not say: continue
            fid = hashlib.sha1(f"{voice}|{sid}|{speed}|{say}".encode()).hexdigest()[:12]
            path = os.path.join(outdir, fid + ".mp3")
            if not os.path.exists(path):
                tts = tts or engine(voice)
                g = tts.generate(say, sid=sid, speed=speed)
                if not len(g.samples): continue
                open(path, "wb").write(to_mp3(g.samples, g.sample_rate)); made += 1
            index[text] = fid
        # files no longer referenced (text removed or changed) are deleted
        keep = set(index.values())
        for f in os.listdir(outdir):
            if f.endswith(".mp3") and f[:-4] not in keep: os.remove(os.path.join(outdir, f))
        json.dump(index, open(idx_path, "w", encoding="utf8"), ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        size = sum(os.path.getsize(os.path.join(outdir, f)) for f in os.listdir(outdir)) / 1e6
        print(f"{code}: {len(index)} texts, {made} new, {size:.1f} MB")

if __name__ == "__main__":
    main(sys.argv[1:] or list(VOICES))
