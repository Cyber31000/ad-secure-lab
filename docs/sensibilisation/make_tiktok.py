#!/usr/bin/env python3
"""
TikTok Brouteurs v3 — cinéma, sync audio parfait, animations réalistes
Audio généré EN PREMIER → durée mesurée → vidéo calée sur l'audio
"""
import os, sys, subprocess, math, random, textwrap
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio_ffmpeg

FFMPEG  = imageio_ffmpeg.get_ffmpeg_exe()
SCRATCH = "/tmp/claude-0/-home-user-ad-secure-lab/6775e2d7-d021-5a5b-869f-7cb70bf20c47/scratchpad"
OUT_DIR = os.path.join(SCRATCH, "tiktok_v3")
os.makedirs(OUT_DIR, exist_ok=True)

W, H = 720, 1280
FPS  = 30

# ─── Voix off ───────────────────────────────────────────────────────────────
SCENES = [
    {
        "id": "hook",
        "voix": "Et si le grand amour que tu attends sur internet... était en réalité un arnaqueur professionnel ?",
    },
    {
        "id": "profile",
        "voix": "Les brouteurs créent de faux profils parfaits. Beau, riche, gentil. Ils passent des semaines à te séduire et à gagner ta confiance.",
    },
    {
        "id": "chat",
        "voix": "Puis vient le piège. Une urgence inventée. Un accident. Des frais de douane. Et la demande d'argent. Une fois envoyé... ils disparaissent.",
    },
    {
        "id": "signs",
        "voix": "Les signaux d'alarme. Profil trop parfait. Amour déclaré en quelques jours. Il refuse toujours les appels vidéo. Et il te demande de l'argent.",
    },
    {
        "id": "cta",
        "voix": "Ne jamais envoyer d'argent à quelqu'un que tu n'as pas rencontré en vrai. Signale sur cybermalveillance point gouv point fr. Partage cette vidéo pour protéger tes proches !",
    },
]

# ─── Utilitaires ────────────────────────────────────────────────────────────
def font(size, bold=True):
    for p in [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]:
        if os.path.exists(p):
            try: return ImageFont.truetype(p, size)
            except: pass
    return ImageFont.load_default()

def ease_out(t): return 1 - (1 - min(t, 1)) ** 3
def ease_in_out(t): t = min(t,1); return t*t*(3-2*t)
def clamp(v,lo,hi): return max(lo, min(hi, v))

VIGNETTE = None
def get_vignette():
    global VIGNETTE
    if VIGNETTE is None:
        cx, cy = W/2, H/2
        r = math.sqrt(cx**2 + cy**2)
        arr = np.zeros((H, W), np.uint8)
        ys, xs = np.ogrid[:H, :W]
        d = np.sqrt((xs-cx)**2 + (ys-cy)**2) / r
        arr[:] = np.clip(d * 160, 0, 130).astype(np.uint8)
        VIGNETTE = Image.fromarray(arr, 'L')
    return VIGNETTE

def add_vignette(img):
    v = get_vignette()
    dark = Image.new("RGB", (W, H), (0, 0, 0))
    img.paste(dark, mask=v)
    return img

def add_grain(img, strength=8):
    arr = np.array(img).astype(np.int16)
    noise = np.random.randint(-strength, strength+1, arr.shape, dtype=np.int16)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)

def gradient_bg(color_top, color_bot):
    arr = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        t = y / H
        arr[y, :] = [int(color_top[i]*(1-t) + color_bot[i]*t) for i in range(3)]
    return Image.fromarray(arr)

def rounded_rect(draw, x0, y0, x1, y1, r, fill, outline=None, ow=0):
    draw.rectangle([x0+r, y0, x1-r, y1], fill=fill)
    draw.rectangle([x0, y0+r, x1, y1-r], fill=fill)
    for cx, cy in [(x0+r, y0+r),(x1-r, y0+r),(x0+r, y1-r),(x1-r, y1-r)]:
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=fill)
    if outline and ow:
        draw.arc([x0, y0, x0+2*r, y0+2*r], 180, 270, fill=outline, width=ow)
        draw.arc([x1-2*r, y0, x1, y0+2*r], 270, 0, fill=outline, width=ow)
        draw.arc([x0, y1-2*r, x0+2*r, y1], 90, 180, fill=outline, width=ow)
        draw.arc([x1-2*r, y1-2*r, x1, y1], 0, 90, fill=outline, width=ow)
        draw.line([x0+r, y0, x1-r, y0], fill=outline, width=ow)
        draw.line([x0+r, y1, x1-r, y1], fill=outline, width=ow)
        draw.line([x0, y0+r, x0, y1-r], fill=outline, width=ow)
        draw.line([x1, y0+r, x1, y1-r], fill=outline, width=ow)

def draw_wrapped(draw, text, x, y, w, fnt, fill, align="center", spacing=8):
    """Word-wrap text et dessine centré sur x."""
    lines = textwrap.wrap(text, width=int(w / (fnt.size * 0.55)))
    total_h = 0
    rendered = []
    for line in lines:
        bb = draw.textbbox((0,0), line, font=fnt)
        lw = bb[2]-bb[0]
        lh = bb[3]-bb[1]
        rendered.append((line, lw, lh))
        total_h += lh + spacing
    cur_y = y
    for line, lw, lh in rendered:
        if align == "center":
            draw.text((x - lw//2, cur_y), line, font=fnt, fill=fill)
        else:
            draw.text((x, cur_y), line, font=fnt, fill=fill)
        cur_y += lh + spacing
    return total_h

# ─── Génération audio ────────────────────────────────────────────────────────
def make_audio(scene, idx):
    raw = os.path.join(OUT_DIR, f"raw_{idx}.wav")
    mp3 = os.path.join(OUT_DIR, f"voice_{idx}.mp3")
    subprocess.run(["pico2wave", "-l", "fr-FR", "-w", raw, scene["voix"]],
                   stderr=subprocess.DEVNULL, check=True)
    filters = (
        "aresample=44100,"
        "equalizer=f=3000:width_type=o:width=1.5:g=2,"
        "equalizer=f=8000:width_type=o:width=1.5:g=-2,"
        "acompressor=threshold=-20dB:ratio=2.5:attack=8:release=100:makeup=1.5dB,"
        "loudnorm=I=-16:TP=-1.5:LRA=8"
    )
    subprocess.run([FFMPEG, "-y", "-i", raw, "-af", filters,
                    "-acodec", "libmp3lame", "-b:a", "192k", mp3],
                   stderr=subprocess.DEVNULL, check=True)
    return mp3

def audio_duration(path):
    import re
    r = subprocess.run(
        [FFMPEG, "-i", path, "-f", "null", "-"],
        capture_output=True, text=True
    )
    m = re.search(r"Duration: (\d+):(\d+):(\d+\.\d+)", r.stderr)
    if m:
        return int(m.group(1))*3600 + int(m.group(2))*60 + float(m.group(3))
    return 7.0

# ─── SCÈNE 1 : Hook ─────────────────────────────────────────────────────────
def render_hook(f, nf):
    t = f / nf
    img = gradient_bg((5, 0, 15), (25, 0, 40))
    draw = ImageDraw.Draw(img)

    # Particules rouge qui montent
    rng = random.Random(42)
    for i in range(30):
        px = rng.randint(0, W)
        base_y = H - rng.randint(0, H)
        py = int((base_y - t * 600 * rng.uniform(0.3,1.0)) % H)
        r = rng.randint(2, 6)
        alpha_p = int(rng.uniform(60,180) * (1 - abs(t-0.5)*0.5))
        draw.ellipse([px-r, py-r, px+r, py+r],
                     fill=(255, rng.randint(0,60), rng.randint(0,30)))

    # Ligne rouge en haut
    line_w = int(W * min(t*3, 1.0))
    draw.rectangle([0, 0, line_w, 6], fill=(220, 20, 40))

    # Texte principal animé
    f1 = font(52, True)
    f2 = font(70, True)
    f_sub = font(32)

    # Première ligne apparaît
    t1 = ease_out(clamp(t*4, 0, 1))
    line1 = "Et si ton 'amour'\nen ligne..."
    y1 = 340
    for i, line in enumerate(line1.split("\n")):
        alpha1 = int(255 * t1)
        a = int(alpha1)
        draw.text((W//2, y1 + i*65), line, font=f1,
                  fill=(a, a, a), anchor="mm")

    # Deuxième partie apparaît plus tard
    t2 = ease_out(clamp((t - 0.35) * 3.5, 0, 1))
    if t2 > 0:
        shake = int(math.sin(t * 40) * 4 * (1-t2)) if t2 < 0.8 else 0
        draw.text((W//2 + shake, 560), "était un", font=f1,
                  fill=(int(220*t2), int(220*t2), int(220*t2)), anchor="mm")

    t3 = ease_out(clamp((t - 0.55) * 5, 0, 1))
    if t3 > 0:
        r_col = int(255*t3)
        shake2 = int(math.sin(t * 50) * 6 * (1-t3))
        draw.text((W//2 + shake2, 660), "BROUTEUR ?", font=f2,
                  fill=(r_col, int(20*t3), int(20*t3)), anchor="mm")

    # Sous-texte
    t4 = ease_out(clamp((t - 0.75) * 6, 0, 1))
    if t4 > 0:
        draw.text((W//2, 800), "Voici comment les reconnaître", font=f_sub,
                  fill=(int(180*t4), int(180*t4), int(200*t4)), anchor="mm")

    img = add_vignette(img)
    img = add_grain(img, 6)
    return img

# ─── SCÈNE 2 : Faux profil ───────────────────────────────────────────────────
def render_profile(f, nf):
    t = f / nf
    img = gradient_bg((8, 12, 35), (15, 25, 60))
    draw = ImageDraw.Draw(img)

    # Titre haut
    f_title = font(38)
    t0 = ease_out(clamp(t * 5, 0, 1))
    draw.text((W//2, 80), "LE PROFIL PARFAIT", font=f_title,
              fill=(int(255*t0), int(165*t0), 0), anchor="mm")

    # Carte profil qui slide depuis le bas
    card_y_target = 200
    card_y_start  = H + 100
    t_card = ease_out(clamp(t * 3, 0, 1))
    card_y = int(card_y_start + (card_y_target - card_y_start) * t_card)
    card_x0, card_x1 = 60, W - 60
    card_h = 620

    rounded_rect(draw, card_x0, card_y, card_x1, card_y + card_h, 24,
                 fill=(20, 28, 55), outline=(60, 80, 140), ow=2)

    # Photo de profil (cercle simulé avec dégradé)
    cx, cy_photo = W // 2, card_y + 130
    r_photo = 90
    for ri in range(r_photo, 0, -1):
        grad_t = ri / r_photo
        col = (
            int(60 + 80 * (1-grad_t)),
            int(80 + 100 * (1-grad_t)),
            int(120 + 80 * (1-grad_t)),
        )
        draw.ellipse([cx-ri, cy_photo-ri, cx+ri, cy_photo+ri], fill=col)

    # Icône personne
    f_icon = font(80)
    draw.text((cx, cy_photo), "?", font=f_icon, fill=(100, 120, 180), anchor="mm")

    # Nom
    f_name = font(44, True)
    f_info = font(30)
    f_bio  = font(26)
    name_y = card_y + 250
    draw.text((cx, name_y), "Kevin_Morel, 34 ans", font=f_name,
              fill=(255, 255, 255), anchor="mm")
    draw.text((cx, name_y + 50), "Ingenieur  •  Paris", font=f_info,
              fill=(160, 180, 220), anchor="mm")

    # Étoiles
    stars_y = name_y + 95
    draw.text((cx, stars_y), "★ ★ ★ ★ ★", font=f_info,
              fill=(255, 200, 0), anchor="mm")

    # Bio
    bio = '"Passionné de voyages, honnete et sincere. Je cherche quelqu\'un de vrai pour construire quelque chose de beau..."'
    bio_y = stars_y + 50
    draw_wrapped(draw, bio, cx, bio_y, card_x1-card_x0-40, f_bio,
                 (180, 200, 240))

    # Badge "Profil verifié" (ironique)
    badge_y = card_y + card_h - 60
    rounded_rect(draw, cx - 120, badge_y, cx + 120, badge_y + 38, 19,
                 fill=(0, 120, 60))
    draw.text((cx, badge_y + 19), "Profil verifie ✓", font=f_info,
              fill=(200, 255, 200), anchor="mm")

    # Tampon FAUX PROFIL qui apparaît
    t_stamp = ease_out(clamp((t - 0.55) * 4, 0, 1))
    if t_stamp > 0:
        stamp_angle = int((1 - t_stamp) * (-25))
        s_cx, s_cy = W//2, card_y + card_h//2
        stamp_img = Image.new("RGBA", (W, H), (0,0,0,0))
        sd = ImageDraw.Draw(stamp_img)
        f_stamp = font(72, True)
        # Rectangle rouge
        alpha_s = int(220 * t_stamp)
        sd.rectangle([s_cx - 180, s_cy - 45, s_cx + 180, s_cy + 45],
                     fill=(200, 0, 0, alpha_s), outline=(255,50,50, alpha_s))
        sd.text((s_cx, s_cy), "FAUX PROFIL", font=f_stamp,
                fill=(255, 255, 255, alpha_s), anchor="mm")
        img = img.convert("RGBA")
        img.paste(stamp_img, mask=stamp_img)
        img = img.convert("RGB")

    img = add_vignette(img)
    img = add_grain(img, 5)
    return img

# ─── SCÈNE 3 : Chat simulation ───────────────────────────────────────────────
MESSAGES = [
    ("recv", "Bonjour ma cherie... je pense a toi tout le temps <3", (45, 45, 45)),
    ("recv", "Tu es la plus belle chose qui me soit arrivee", (45, 45, 45)),
    ("recv", "J'ai eu un accident... je suis a l'hopital", (60, 20, 20)),
    ("recv", "J'ai besoin de 800 euros en urgence s'il te plait", (80, 15, 15)),
    ("sent", "Je t'envoie ca maintenant...", (0, 90, 60)),
    ("alarm", "ERREUR — C'ETAIT UN BROUTEUR", None),
]

def render_chat(f, nf):
    t = f / nf
    # Fond style messagerie sombre
    img = Image.new("RGB", (W, H), (18, 18, 22))
    draw = ImageDraw.Draw(img)

    # Header WhatsApp-style
    draw.rectangle([0, 0, W, 100], fill=(30, 30, 36))
    draw.rectangle([0, 100, W, 104], fill=(40, 200, 100))
    f_hdr = font(32, True)
    f_sub_hdr = font(22)
    draw.ellipse([20, 20, 80, 80], fill=(60, 80, 120))
    draw.text((90, 25), "Kevin_Morel", font=f_hdr, fill=(255,255,255))
    draw.text((90, 65), "En ligne", font=f_sub_hdr, fill=(80, 220, 100))
    # Point vert
    draw.ellipse([68, 68, 82, 82], fill=(40, 220, 80))

    # Affichage progressif des messages
    # Chaque message apparaît à t = i/(len-1) * 0.75
    n = len(MESSAGES)
    f_msg   = font(28)
    f_alarm = font(42, True)
    bubble_pad = 16
    bubble_r   = 18
    msg_y = 130
    line_h = 68

    for i, (mtype, text, bg) in enumerate(MESSAGES):
        appear_t = i / (n - 1) * 0.80
        alpha_t  = ease_out(clamp((t - appear_t) * 8, 0, 1))
        if alpha_t <= 0:
            continue

        if mtype == "alarm":
            alarm_t = ease_out(clamp((t - 0.88) * 6, 0, 1))
            if alarm_t <= 0:
                continue
            # Flash rouge plein écran
            flash = Image.new("RGBA", (W, H), (0,0,0,0))
            fd = ImageDraw.Draw(flash)
            flash_alpha = int(200 * alarm_t * (0.5 + 0.5*math.sin(t*15)))
            fd.rectangle([0, 0, W, H], fill=(180, 0, 0, int(flash_alpha*0.3)))
            img = img.convert("RGBA")
            img.paste(flash, mask=flash)
            img = img.convert("RGB")
            draw = ImageDraw.Draw(img)
            # Grand texte
            draw.text((W//2, msg_y + 20), "ERREUR !", font=f_alarm,
                      fill=(255, 60, 60), anchor="mm")
            draw.text((W//2, msg_y + 80), "C'ETAIT UN BROUTEUR", font=f_msg,
                      fill=(255, 200, 200), anchor="mm")
            draw.text((W//2, msg_y + 130), "Vous avez perdu votre argent", font=f_msg,
                      fill=(220, 80, 80), anchor="mm")
            # X rouge
            f_x = font(120, True)
            draw.text((W//2, msg_y + 280), "✗", font=f_x,
                      fill=(255, 0, 0), anchor="mm")
            continue

        # Bulle de message
        lines = textwrap.wrap(text, width=28)
        bub_w = min(W - 100, 480)
        bub_h = len(lines) * 36 + bubble_pad * 2

        if mtype == "recv":
            bx = 20
        else:
            bx = W - bub_w - 20

        # Apparition par glissement
        slide_x = int((1 - alpha_t) * (60 if mtype=="recv" else -60))
        bx += slide_x
        alpha_v = int(255 * alpha_t)

        # Fond bulle
        bub_color = bg if bg else (45, 45, 45)
        rounded_rect(draw, bx, msg_y, bx + bub_w, msg_y + bub_h, bubble_r,
                     fill=bub_color)

        # Texte bulle
        ly = msg_y + bubble_pad
        for line in lines:
            draw.text((bx + bubble_pad, ly), line, font=f_msg,
                      fill=(255, 255, 255))
            ly += 36

        msg_y += bub_h + 12

    img = add_vignette(img)
    img = add_grain(img, 4)
    return img

# ─── SCÈNE 4 : Signes d'alarme ───────────────────────────────────────────────
SIGNS = [
    ("Profil trop parfait",          (255, 80, 80)),
    ("Amour declare en quelques jours", (255, 120, 40)),
    ("Refuse les appels video",      (255, 180, 20)),
    ("Demande de l'argent",          (220, 20, 20)),
]

def render_signs(f, nf):
    t = f / nf
    img = gradient_bg((15, 5, 5), (35, 10, 10))
    draw = ImageDraw.Draw(img)

    f_title = font(46, True)
    f_sign  = font(34, True)
    f_num   = font(50, True)

    # Titre
    t0 = ease_out(clamp(t * 5, 0, 1))
    draw.text((W//2, 90), "SIGNES D'ALARME", font=f_title,
              fill=(255, int(80*t0), int(80*t0)), anchor="mm")
    draw.rectangle([80, 118, W-80, 124], fill=(200, 30, 30))

    # Chaque signe
    for i, (label, col) in enumerate(SIGNS):
        appear = i / len(SIGNS) * 0.75
        ti = ease_out(clamp((t - appear) * 5, 0, 1))
        if ti <= 0:
            continue

        row_y = 200 + i * 220
        slide = int((1 - ti) * 80)

        # Panneau
        px0, px1 = 40, W - 40
        rounded_rect(draw, px0, row_y - slide, px1, row_y + 160 - slide, 16,
                     fill=(int(col[0]*0.15), int(col[1]*0.1), int(col[2]*0.1)),
                     outline=col, ow=3)

        # Numéro
        draw.text((px0 + 44, row_y + 70 - slide), str(i+1), font=f_num,
                  fill=col, anchor="mm")

        # Ligne verticale séparatrice
        draw.rectangle([px0 + 70, row_y + 20 - slide, px0 + 73, row_y + 140 - slide],
                       fill=col)

        # Label (wrap si besoin)
        lines = textwrap.wrap(label, width=22)
        ly = row_y + (80 - len(lines)*20) - slide
        for line in lines:
            draw.text((px0 + 100, ly), line, font=f_sign, fill=(255,255,255))
            ly += 44

        # Triangle alerte si c'est le dernier
        if i == 3 and ti > 0.7:
            pulse = 0.5 + 0.5 * math.sin(t * 12)
            draw.text((px1 - 55, row_y + 70 - slide), "!", font=f_num,
                      fill=(int(255*pulse), int(60*pulse), 0), anchor="mm")

    img = add_vignette(img)
    img = add_grain(img, 5)
    return img

# ─── SCÈNE 5 : CTA ───────────────────────────────────────────────────────────
CTA_LINES = [
    "Ne jamais envoyer",
    "d'argent en ligne",
    "",
    "Signalez :",
    "cybermalveillance.gouv.fr",
    "",
    "PARTAGEZ pour proteger",
    "vos proches !",
]

def render_cta(f, nf):
    t = f / nf
    img = gradient_bg((5, 10, 35), (10, 20, 60))
    draw = ImageDraw.Draw(img)

    # Éclat pulsant central (bouclier)
    pulse = 0.85 + 0.15 * math.sin(t * 6)
    cx, cy_shield = W//2, 300
    for ri in range(120, 0, -4):
        tt = ri / 120
        alpha_r = int((1-tt)**2 * 80 * pulse * ease_out(clamp(t*3,0,1)))
        r_col = int(30 + 80*(1-tt))
        g_col = int(80 + 120*(1-tt))
        b_col = int(200 + 55*(1-tt))
        draw.ellipse([cx-ri, cy_shield-ri, cx+ri, cy_shield+ri],
                     fill=(r_col, g_col, b_col))

    # Icône bouclier (texte)
    f_shield = font(110, True)
    t_sh = ease_out(clamp(t * 3, 0, 1))
    draw.text((cx, cy_shield), "O", font=f_shield,
              fill=(int(80*t_sh), int(160*t_sh), int(255*t_sh)), anchor="mm")
    draw.text((cx, cy_shield), "X", font=font(60,True),
              fill=(255, 255, 255), anchor="mm")

    # Lignes de texte animées
    f_big  = font(44, True)
    f_med  = font(34, True)
    f_site = font(28)

    text_y = 500
    text_items = [
        (44, True,  (255, 255, 255), "Ne jamais envoyer"),
        (44, True,  (255, 255, 255), "d'argent a quelqu'un"),
        (34, False, (200, 200, 220), "que vous n'avez pas rencontre."),
        (0,  False, None,            ""),
        (34, True,  (80, 200, 255),  "Signalez sur :"),
        (26, False, (120, 180, 255), "cybermalveillance.gouv.fr"),
        (0,  False, None,            ""),
        (38, True,  (80, 255, 150),  "PARTAGEZ cette video !"),
        (30, False, (120, 220, 160), "Pour proteger vos proches"),
    ]
    line_idx = 0
    for size, bold, col, text in text_items:
        if not text or col is None:
            text_y += 20
            continue
        appear = line_idx / 9 * 0.70
        ti = ease_out(clamp((t - appear) * 6, 0, 1))
        if ti > 0:
            slide = int((1 - ti) * 30)
            fnt = font(size, bold)
            r,g,b = col
            draw.text((W//2, text_y - slide), text, font=fnt,
                      fill=(int(r*ti), int(g*ti), int(b*ti)), anchor="mm")
        text_y += size + 14
        line_idx += 1

    img = add_vignette(img)
    img = add_grain(img, 5)
    return img

# ─── Rendu d'une scène en vidéo ─────────────────────────────────────────────
RENDERERS = {
    "hook":    render_hook,
    "profile": render_profile,
    "chat":    render_chat,
    "signs":   render_signs,
    "cta":     render_cta,
}

def render_scene_video(scene_id, duration, idx):
    renderer = RENDERERS[scene_id]
    n_frames = int(duration * FPS)
    out_path = os.path.join(OUT_DIR, f"vid_{idx:02d}.mp4")
    cmd = [
        FFMPEG, "-y",
        "-f", "rawvideo", "-vcodec", "rawvideo",
        "-s", f"{W}x{H}", "-pix_fmt", "rgb24",
        "-r", str(FPS), "-i", "-",
        "-an",
        "-vcodec", "libx264", "-pix_fmt", "yuv420p",
        "-preset", "fast", "-crf", "20",
        out_path,
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    for fi in range(n_frames):
        frame = renderer(fi, n_frames)
        proc.stdin.write(np.array(frame).tobytes())
    proc.stdin.close()
    proc.wait()
    return out_path

def merge_av(video_path, audio_path, duration, idx):
    out = os.path.join(OUT_DIR, f"scene_{idx:02d}.mp4")
    cmd = [
        FFMPEG, "-y",
        "-i", video_path,
        "-i", audio_path,
        "-map", "0:v:0", "-map", "1:a:0",
        "-t", str(duration + 0.3),
        "-vcodec", "copy", "-acodec", "aac", "-b:a", "128k",
        out,
    ]
    subprocess.run(cmd, stderr=subprocess.DEVNULL, check=True)
    return out

# ─── Sous-titres ASS ────────────────────────────────────────────────────────
def build_ass(scenes_info, output_path):
    header = """\
[Script Info]
Title: Brouteurs
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,DejaVu Sans,30,&H00FFFFFF,&H000000FF,&H00000000,&HC8000000,-1,0,0,0,100,100,0,0,1,2.5,1,2,40,40,80,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    def ts(s):
        h = int(s // 3600)
        m = int((s % 3600) // 60)
        sec = s % 60
        return f"{h}:{m:02d}:{sec:05.2f}"

    events = []
    t_off = 0.0
    for voix, dur in scenes_info:
        words = voix.split()
        chunk = 7
        chunks = [" ".join(words[i:i+chunk]) for i in range(0, len(words), chunk)]
        clen = dur / max(1, len(chunks))
        for j, c in enumerate(chunks):
            s = t_off + j * clen
            e = s + clen
            events.append(f"Dialogue: 0,{ts(s)},{ts(e)},Default,,0,0,0,,{c}")
        t_off += dur + 0.3

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(header)
        f.write("\n".join(events))
    return output_path

# ─── Transition entre scènes ────────────────────────────────────────────────
def apply_transitions_and_subs(scene_paths, ass_path, output):
    list_file = os.path.join(OUT_DIR, "list.txt")
    with open(list_file, "w") as f:
        for p in scene_paths:
            f.write(f"file '{p}'\n")

    concat = os.path.join(OUT_DIR, "concat.mp4")
    subprocess.run([FFMPEG, "-y", "-f", "concat", "-safe", "0",
                    "-i", list_file, "-c", "copy", concat],
                   stderr=subprocess.DEVNULL, check=True)

    # Graver les sous-titres
    subprocess.run([
        FFMPEG, "-y", "-i", concat,
        "-vf", f"ass={ass_path}",
        "-vcodec", "libx264", "-pix_fmt", "yuv420p",
        "-preset", "fast", "-crf", "20",
        "-acodec", "copy",
        output,
    ], stderr=subprocess.DEVNULL, check=True)

# ─── Main ────────────────────────────────────────────────────────────────────
def main():
    random.seed(42)
    output = os.path.join(SCRATCH, "brouteurs_v3.mp4")
    print("=== BROUTEURS TikTok v3 — Production Qualité ===\n")

    scene_paths  = []
    scenes_info  = []  # (voix, duration)

    for idx, scene in enumerate(SCENES):
        sid = scene["id"]
        print(f"[{idx+1}/5] Scène : {sid.upper()}")

        # 1. Audio d'abord
        print(f"   Génération audio Pico TTS...")
        audio_path = make_audio(scene, idx)
        dur = audio_duration(audio_path)
        print(f"   Durée audio : {dur:.2f}s")

        scenes_info.append((scene["voix"], dur))

        # 2. Vidéo calée sur la durée de l'audio
        print(f"   Rendu vidéo animée ({int(dur * FPS)} frames)...")
        vid_path = render_scene_video(sid, dur, idx)

        # 3. Fusion AV
        merged = merge_av(vid_path, audio_path, dur, idx)
        scene_paths.append(merged)
        print(f"   OK -> {merged}\n")

    # Sous-titres
    print("[Final] Sous-titres + assemblage...")
    ass_path = os.path.join(OUT_DIR, "subs.ass")
    build_ass(scenes_info, ass_path)
    apply_transitions_and_subs(scene_paths, ass_path, output)

    size = os.path.getsize(output) / 1024 / 1024
    print(f"\n Taille : {size:.1f} Mo")
    print(f" -> {output}")

if __name__ == "__main__":
    main()
