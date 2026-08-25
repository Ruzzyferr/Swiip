#!/usr/bin/env bash
#
# Sunucuya dağıtır.
#
# Neden var: dağıtım hiçbir yerde yazılı değildi. İlk kurulum elle bir tarball
# atılarak yapılmış, sunucudaki `/opt/swiip` bir git deposu bile değil. Bu yüzden
# "acaba sunucudaki kod hangi commit?" sorusunun cevabı yoktu. Artık her dağıtım
# commit'i sunucuya yazıyor (`/opt/swiip/SURUM`) ve karşılaştırılabiliyor.
#
# Kaynak `git archive` ile üretiliyor: çalışma kopyasındaki kirli dosyalar,
# `node_modules` ve `.env` kazara gitmesin. Sunucudaki `infra/.env` ÜRETİM SIRLARINI
# tutuyor ve bu betik ona hiç dokunmuyor.
#
#   scripts/sunucu-dagit.sh [kullanici@sunucu]
#
set -euo pipefail

HEDEF="${1:-root@157.230.118.230}"
UZAK_DIZIN=/opt/swiip
KOK="$(cd "$(dirname "$0")/.." && pwd)"
cd "$KOK"

# Kirli çalışma kopyasıyla dağıtmak, sunucuda hangi kodun döndüğünü bilinmez yapar.
if [ -n "$(git status --porcelain)" ]; then
  echo "HATA: çalışma kopyası temiz değil. Önce commit'le." >&2
  git status --short >&2
  exit 1
fi

SURUM="$(git rev-parse HEAD)"
KISA="$(git rev-parse --short HEAD)"
PAKET="$(mktemp -d)/swiip.tar.gz"

# Sunucuda bulunan üst düzey girdilerin aynısı. `apps/` gönderilmiyor: mobil uygulama
# sunucuda derlenmiyor. `yedekler/` sunucunun kendi ürettiği klasör, dokunulmuyor.
git archive --format=tar.gz -o "$PAKET" HEAD \
  infra magaza packages scripts \
  package.json package-lock.json tsconfig.base.json tsconfig.json vitest.config.ts

echo "  paket: $(du -h "$PAKET" | cut -f1) · sürüm $KISA"

scp -q "$PAKET" "$HEDEF:/tmp/swiip.tar.gz"

ssh "$HEDEF" bash -s <<UZAK
set -euo pipefail
cd "$UZAK_DIZIN"

# .env'i koru: tarball'da yok ama açma sırasında bir kaza olmasın diye yedekliyoruz.
cp infra/.env /tmp/.env.koruma

tar -xzf /tmp/swiip.tar.gz -C "$UZAK_DIZIN"
cp /tmp/.env.koruma infra/.env
rm -f /tmp/swiip.tar.gz /tmp/.env.koruma

# TUM servisler derleniyor, yalnizca api degil.
#
# Burada 'build api' yaziyordu. gocmen ve tohumcu ayni Dockerfile'i kullaniyor ama
# ayri servisler, yani ayri imajlari var: api her dagitimda yeniden derlenirken
# otekiler ilk derlendikleri halde kaliyordu. gocmen goc dosyalarini IMAJDAN okuduugu
# icin sonuc suydu: o imaj derlendikten sonra eklenen hicbir goc veritabanina
# uygulanmadi.
#
# Sessiz oldugu icin fark edilmiyordu: gocmen basariyla cikiyor (uygulayacak yeni
# dosya gormuyor), api ayaga kalkiyor, saglik ucu 200 donuyor. Kusur ancak yeni tablo
# ilk kez sorgulandiginda 500 olarak goruunuyor. Uretimde tam bu oldu: kanca_olaylari
# tablosu yoktu ve abonelik kancasi 42P01 ile patliyordu.
docker compose -f infra/docker-compose.yml build
docker compose -f infra/docker-compose.yml up -d

# SURUM en sonda yazılıyor. Önce yazılıyordu ve derleme yarıda kaldığında dosya yeni
# commit'i gösterirken konteynerde hâlâ eski kod dönüyordu — "hangi kod dönüyor?"
# sorusunun tek cevabı olan dosya yalan söylüyordu. Derleme düşerse eski değer kalır.
echo "$SURUM" > "$UZAK_DIZIN/SURUM"
UZAK

echo "  sağlık bekleniyor..."
for _ in $(seq 1 30); do
  KOD="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://swiip.app/saglik || true)"
  if [ "$KOD" = "200" ]; then
    echo "  sunucu ayakta · sürüm $KISA"
    exit 0
  fi
  sleep 4
done

echo "HATA: sağlık ucu 200 dönmedi." >&2
exit 1
