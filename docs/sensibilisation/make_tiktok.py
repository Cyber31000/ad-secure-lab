#!/usr/bin/env python3
"""
TikTok video sur les dangers des brouteurs
Voix off français (gTTS) + sous-titres blancs brûlés + visuels animés
"""

import os
import sys
import textwrap
import subprocess
import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SCRATCH = "/tmp/claude-0/-home-user-ad-secure-lab/6775e2d7-d021-5a5b-869f-7cb70bf20c47/scratchpad"
OUT_DIR = os.path.join(SCRATCH, "tiktok_parts")
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 720, 1280   # Portrait TikTok
FPS  = 30

# ── Script : scènes (texte écran, texte voix off) ────────────────────────────
SCENES = [
    {
        "bg": (15, 10, 30),          # Bleu très sombre
        "accent": (200, 50, 50),
        "icon": "⚠️",
        "title": "LES BROUTEURS",
        "subtitle": "Arnaqueurs en ligne",
        "body": "Des escrocs organisés qui volent\ndes millions chaque année.",
        "voix": (
            "Les brouteurs sont des arnaqueurs en ligne organisés "
            "qui ciblent leurs victimes sur les réseaux sociaux, "
            "les applis de rencontre et par e-mail."
        ),
        "duration": 5.5,
    },
    {
        "bg": (10, 20, 50),
        "accent": (255, 165, 0),
        "icon": "💬",
        "title": "COMMENT ÇA MARCHE ?",
        "subtitle": "La mise en confiance",
        "body": "Faux profil séduisant,\nmessages affectueux,\npromesses d'amour.",
        "voix": (
            "Ils créent de faux profils très attractifs et passent "
            "des semaines, voire des mois, à gagner votre confiance "
            "avec des messages tendres et des promesses d'amour ou d'argent."
        ),
        "duration": 6.0,
    },
    {
        "bg": (50, 10, 10),
        "accent": (255, 50, 50),
        "icon": "💸",
        "title": "LE PIÈGE",
        "subtitle": "Ils demandent de l'argent",
        "body": "Urgence médicale, billet d'avion,\ndouane, investissement…\nToutes des mensonges !",
        "voix": (
            "Puis vient le piège. Ils inventent une urgence : "
            "accident, frais de douane, billet d'avion. "
            "Chaque prétexte est faux. Une fois l'argent envoyé, "
            "ils disparaissent ou recommencent avec une nouvelle excuse."
        ),
        "duration": 6.5,
    },
    {
        "bg": (5, 30, 15),
        "accent": (50, 200, 100),
        "icon": "🔍",
        "title": "LES SIGNES D'ALERTE",
        "subtitle": "Reconnaître l'arnaque",
        "body": "• Profil trop parfait\n• Déclare son amour très vite\n• Ne peut jamais se montrer en vidéo\n• Demande de l'argent",
        "voix": (
            "Comment reconnaître un brouteur ? "
            "Son profil est trop parfait. Il déclare son amour en quelques jours. "
            "Il refuse toujours les appels vidéo en direct. "
            "Et finalement, il demande de l'argent."
        ),
        "duration": 6.5,
    },
    {
        "bg": (20, 15, 50),
        "accent": (100, 150, 255),
        "icon": "🛡️",
        "title": "PROTÉGEZ-VOUS",
        "subtitle": "Conseils essentiels",
        "body": "✓ Ne jamais envoyer d'argent\n✓ Vérifier l'identité en vidéo live\n✓ Signaler sur cybermalveillance.gouv.fr",
        "voix": (
            "Protégez-vous. Ne jamais envoyer d'argent à quelqu'un que vous n'avez "
            "pas rencontré en personne. Exigez un appel vidéo spontané. "
            "En cas de doute, signalez sur le site cybermalveillance point gouv point fr. "
            "Partagez cette vidéo pour protéger vos proches !"
        ),
        "duration": 7.0,
    },
]


def make_font(size, bold=False):
    """Charge une police système, avec fallback."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
    draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
    draw.ellipse([x0, y0, x0 + 2*radius, y0 + 2*radius], fill=fill)
    draw.ellipse([x1 - 2*radius, y0, x1, y0 + 2*radius], fill=fill)
    draw.ellipse([x0, y1 - 2*radius, x0 + 2*radius, y1], fill=fill)
    draw.ellipse([x1 - 2*radius, y1 - 2*radius, x1, y1], fill=fill)


def render_frame(scene, progress=0.0):
    """Génère un frame PIL pour une scène donnée (progress 0→1)."""
    img = Image.new("RGB", (W, H), scene["bg"])
    draw = ImageDraw.Draw(img)

    # Gradient de fond (bandes horizontales légères)
    for y in range(H):
        t = y / H
        r = int(scene["bg"][0] * (1 - t * 0.3))
        g = int(scene["bg"][1] * (1 - t * 0.3))
        b = int(scene["bg"][2] + (255 - scene["bg"][2]) * t * 0.08)
        draw.line([(0, y), (W, y)], fill=(r, g, b))

    accent = scene["accent"]

    # Barre d'accentuation top
    bar_h = 8
    draw.rectangle([0, 0, W, bar_h], fill=accent)

    # Icône (grand emoji rendu comme texte)
    icon_font = make_font(100)
    icon_y = 120 - int(progress * 10)
    try:
        draw.text((W // 2, icon_y), scene["icon"], font=icon_font, anchor="mm", fill="white")
    except Exception:
        pass

    # Titre principal
    title_font = make_font(68, bold=True)
    title_y = 270 + int((1 - progress) * 30)
    alpha = min(1.0, progress * 3)
    title_color = tuple(int(c * alpha + scene["bg"][i] * (1 - alpha))
                        for i, c in enumerate(accent))
    draw.text((W // 2, title_y), scene["title"], font=title_font,
              anchor="mm", fill=title_color)

    # Sous-titre
    sub_font = make_font(34)
    sub_y = title_y + 75
    draw.text((W // 2, sub_y), scene["subtitle"], font=sub_font,
              anchor="mm", fill=(200, 200, 220))

    # Ligne de séparation animée
    line_w = int(W * 0.7 * min(1.0, progress * 2))
    lx = (W - line_w) // 2
    draw.rectangle([lx, sub_y + 25, lx + line_w, sub_y + 28], fill=accent)

    # Corps du texte
    body_font = make_font(32)
    body_lines = scene["body"].split("\n")
    body_y = sub_y + 70
    line_spacing = 48
    for i, line in enumerate(body_lines):
        y_pos = body_y + i * line_spacing + int((1 - min(1.0, progress * 2)) * 20)
        opacity = min(255, int(255 * min(1.0, progress * 2 - i * 0.2)))
        c = max(0, opacity)
        draw.text((W // 2, y_pos), line, font=body_font,
                  anchor="mm", fill=(c, c, c))

    # Barre de progression en bas
    bar_y = H - 20
    draw.rectangle([0, bar_y, W, H], fill=(30, 30, 30))
    draw.rectangle([0, bar_y, int(W * progress), H], fill=accent)

    # Watermark
    wm_font = make_font(22)
    draw.text((W // 2, H - 50), "⚠ Sensibilisation • Partager pour protéger",
              font=wm_font, anchor="mm", fill=(150, 150, 170))

    return img


def create_scene_video(scene, index):
    """Crée la vidéo (sans audio) d'une scène."""
    n_frames = int(scene["duration"] * FPS)
    out_path = os.path.join(OUT_DIR, f"scene_{index:02d}.mp4")

    # Écrire les frames dans un pipe ffmpeg
    cmd = [
        FFMPEG, "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{W}x{H}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-",
        "-an",
        "-vcodec", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "23",
        out_path,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)

    for f in range(n_frames):
        progress = f / max(1, n_frames - 1)
        frame = render_frame(scene, progress)
        proc.stdin.write(np.array(frame).tobytes())

    proc.stdin.close()
    proc.wait()
    print(f"  ✓ Scène {index+1} vidéo : {out_path}")
    return out_path


def create_tts(scene, index):
    """Génère la voix off avec SVOX Pico TTS (voix féminine fr-FR claire et naturelle)."""
    raw_wav  = os.path.join(OUT_DIR, f"voice_raw_{index:02d}.wav")
    mp3_path = os.path.join(OUT_DIR, f"voice_{index:02d}.mp3")

    # pico2wave : moteur SVOX Pico, voix féminine française intégrée dans Android/iOS
    # Qualité bien supérieure à espeak/MBROLA — prosodie naturelle, consonnes claires
    cmd = ["pico2wave", "-l", "fr-FR", "-w", raw_wav, scene["voix"]]
    subprocess.run(cmd, stderr=subprocess.DEVNULL, check=True)

    # Post-traitement : légère présence à 3 kHz (clarté vocale féminine),
    # dé-esser doux à 8 kHz, compresseur broadcast, normalisation EBU R128
    audio_filters = (
        "aresample=44100,"
        "equalizer=f=3000:width_type=o:width=1.5:g=2,"
        "equalizer=f=8000:width_type=o:width=1.5:g=-2,"
        "equalizer=f=150:width_type=o:width=2:g=-1,"
        "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=100:makeup=1.5dB,"
        "loudnorm=I=-16:TP=-1.5:LRA=8"
    )
    cmd2 = [
        FFMPEG, "-y", "-i", raw_wav,
        "-af", audio_filters,
        "-acodec", "libmp3lame", "-b:a", "192k",
        mp3_path,
    ]
    subprocess.run(cmd2, stderr=subprocess.DEVNULL, check=True)
    print(f"  ✓ Scène {index+1} voix Pico fr-FR : {mp3_path}")
    return mp3_path


def merge_audio_video(video_path, audio_path, scene, index):
    """Fusionne vidéo + audio en ajustant la durée."""
    out_path = os.path.join(OUT_DIR, f"merged_{index:02d}.mp4")
    dur = scene["duration"]
    cmd = [
        FFMPEG, "-y",
        "-i", video_path,
        "-i", audio_path,
        "-map", "0:v:0",
        "-map", "1:a:0",
        "-t", str(dur),
        "-vcodec", "copy",
        "-acodec", "aac",
        "-b:a", "128k",
        out_path,
    ]
    subprocess.run(cmd, stderr=subprocess.DEVNULL, check=True)
    print(f"  ✓ Scène {index+1} merge : {out_path}")
    return out_path


def build_subtitle_ass(scenes):
    """Génère un fichier ASS de sous-titres pour la vidéo finale."""
    ass_path = os.path.join(OUT_DIR, "subtitles.ass")
    header = """\
[Script Info]
Title: Brouteurs
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
Collisions: Normal
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,34,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,30,30,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    def fmt_time(secs):
        h = int(secs // 3600)
        m = int((secs % 3600) // 60)
        s = secs % 60
        return f"{h:d}:{m:02d}:{s:05.2f}"

    events = []
    t = 0.0
    for scene in scenes:
        dur = scene["duration"]
        # Couper la voix en sous-titres de ~8 mots max
        words = scene["voix"].split()
        chunk_size = 8
        chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]
        chunk_dur = dur / max(1, len(chunks))
        for j, chunk in enumerate(chunks):
            start = t + j * chunk_dur
            end   = start + chunk_dur
            events.append(
                f"Dialogue: 0,{fmt_time(start)},{fmt_time(end)},Default,,0,0,0,,{chunk}"
            )
        t += dur

    with open(ass_path, "w", encoding="utf-8") as f:
        f.write(header)
        f.write("\n".join(events))
    print(f"  ✓ Sous-titres ASS : {ass_path}")
    return ass_path


def concat_videos(merged_paths, ass_path, output_path):
    """Concatène toutes les scènes et grave les sous-titres."""
    list_file = os.path.join(OUT_DIR, "concat_list.txt")
    with open(list_file, "w") as f:
        for p in merged_paths:
            f.write(f"file '{p}'\n")

    # Étape 1 : concaténation
    concat_path = os.path.join(OUT_DIR, "concat_raw.mp4")
    cmd = [
        FFMPEG, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", list_file,
        "-c", "copy",
        concat_path,
    ]
    subprocess.run(cmd, stderr=subprocess.DEVNULL, check=True)

    # Étape 2 : graver les sous-titres ASS
    cmd2 = [
        FFMPEG, "-y",
        "-i", concat_path,
        "-vf", f"ass={ass_path}",
        "-vcodec", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "fast",
        "-crf", "22",
        "-acodec", "copy",
        output_path,
    ]
    subprocess.run(cmd2, stderr=subprocess.DEVNULL, check=True)
    print(f"\n🎬 Vidéo finale : {output_path}")


def main():
    output = os.path.join(SCRATCH, "brouteurs_tiktok.mp4")
    print("=== Création de la vidéo TikTok : Dangers des Brouteurs ===\n")

    video_paths  = []
    audio_paths  = []
    merged_paths = []

    for i, scene in enumerate(SCENES):
        print(f"[Scène {i+1}/{len(SCENES)}] {scene['title']}")
        v = create_scene_video(scene, i)
        a = create_tts(scene, i)
        m = merge_audio_video(v, a, scene, i)
        video_paths.append(v)
        audio_paths.append(a)
        merged_paths.append(m)
        print()

    print("[Finalisation] Sous-titres + concaténation…")
    ass = build_subtitle_ass(SCENES)
    concat_videos(merged_paths, ass, output)

    size = os.path.getsize(output) / 1024 / 1024
    print(f"\n✅ Terminé ! Taille : {size:.1f} Mo")
    print(f"   → {output}")


if __name__ == "__main__":
    main()
