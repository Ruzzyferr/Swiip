# -*- coding: utf-8 -*-
"""App Store ekran goruntulerini Play goruntulerinden uretir.

NEDEN: Apple 2026-08-27'de Guideline 2.3.10 ile reddetti --

  "The app or metadata includes information about third-party platforms that may
   not be relevant for App Store users. Revise the app's screenshots to remove
   non-iOS status bar images."

App Store'a yuklenen alti goruntu `magaza/play/ekranlar/` klasorunden geliyordu,
yani Android emulatorunde cekilmislerdi. Ust seritte Android saat bicimi, Brave
kalkan simgesi ve Android pil simgesi vardi. Apple bunu ucuncu taraf platform
referansi sayiyor.

COZUM: durum cubugu seridini uygulamanin KENDI zemin rengiyle dolduruyoruz.
Sahte bir iOS durum cubugu CIZMIYORUZ -- o, olmayan bir cihazi varmis gibi
gostermek olurdu. Serit siliniyor; geriye yalnizca uygulamanin kendisi kaliyor.
Bircok uygulama magaza gorselinde durum cubugu gostermiyor; Apple bunu kabul
ediyor, sart kostugu sey ucuncu taraf izinin gorunmemesi.

Boyut korunuyor (1320x2868): kirpmak App Store'un bekledigi olcuyu bozardi.

Zemin rengi her dosya icin AYRI olculuyor. Sabit bir renk yazmak, koyu temali
ya da farkli zeminli bir ekran eklendiginde sessizce yanlis bir serit birakirdi.

    python scripts/appstore-ekranlari-uret.py

Cikti: magaza/appstore/ekranlar/*.png
Play goruntulerine DOKUNULMUYOR -- orada Android durum cubugu dogru olan.
"""
import os
import sys
from collections import Counter

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow gerekli:  python -m pip install Pillow')

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Iki set uretiliyor: telefon ve tablet.
#
# Kaynaklar AYRI klasorlerde ve ikisi de Android emulatorunde cekildi, cunku
# macOS yok. Play'e giden kopyada Android durum cubugu DOGRU olan; App Store'a
# giden kopyada seridi uygulamanin kendi zemin rengiyle dolduruyoruz.
#
# Serit yuksekligi cihaza gore degisiyor, o yuzden set basina yaziliyor ve her
# birinde "icerige tasmasin" siniri ayri. Olculdu:
#   telefon (1320x2868): simgeler y<=55, icerik y=121'de basliyor
#   tablet  (2048x2732): simgeler y<=45, icerik y=95'te basliyor
SETLER = (
    {
        'ad': 'telefon',
        'kaynak': os.path.join(KOK, 'magaza', 'play', 'ekranlar'),
        'hedef': os.path.join(KOK, 'magaza', 'appstore', 'ekranlar'),
        'serit': 78,
        'icerik': 100,
    },
    {
        'ad': 'tablet',
        'kaynak': os.path.join(KOK, 'magaza', 'tablet', 'ekranlar'),
        'hedef': os.path.join(KOK, 'magaza', 'appstore', 'ekranlar-ipad'),
        'serit': 72,
        'icerik': 90,
    },
)


def zemin_rengi(im, serit):
    """Seridin hemen ALTINDAKI satirlarin baskin rengi.

    Seridin kendi icinden olcmek yanlis olurdu: orada saat ve simgeler var.
    """
    px = im.load()
    w = im.size[0]
    sayac = Counter()
    for y in range(serit, serit + 12):
        for x in range(0, w, 2):
            sayac[px[x, y]] += 1
    return sayac.most_common(1)[0][0]


def temizle(kaynak_yol, hedef_yol, serit, icerik):
    im = Image.open(kaynak_yol).convert('RGB')
    w, h = im.size
    renk = zemin_rengi(im, serit)

    # Guvenlik: serit icerige tasmasin.
    assert serit < icerik, 'serit icerige tasiyor'

    im.paste(renk, (0, 0, w, serit))
    im.save(hedef_yol, 'PNG', optimize=True)
    return w, h, renk


def main():
    for set_ in SETLER:
        kaynak, hedef = set_['kaynak'], set_['hedef']
        if not os.path.isdir(kaynak):
            sys.exit('kaynak klasor yok: %s' % kaynak)
        os.makedirs(hedef, exist_ok=True)

        dosyalar = sorted(f for f in os.listdir(kaynak) if f.lower().endswith('.png'))
        if not dosyalar:
            sys.exit('kaynakta PNG yok: %s' % kaynak)

        print('== %s ==' % set_['ad'])
        for ad in dosyalar:
            w, h, renk = temizle(
                os.path.join(kaynak, ad), os.path.join(hedef, ad), set_['serit'], set_['icerik']
            )
            print(
                '%-20s %dx%d  serit=%dpx  zemin=#%02X%02X%02X'
                % (ad, w, h, set_['serit'], *renk)
            )
        print('%d goruntu -> %s' % (len(dosyalar), hedef))
        print('')



if __name__ == '__main__':
    main()
