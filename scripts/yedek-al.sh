#!/bin/sh
# Swiip veritabanı yedeği.
#
# Üç katman gerekir ve üçü de zorunludur (F0.4):
#   1. Otomatik yedek        — bu betik, her gece
#   2. Dışarı kopyalama      — YEDEK_UZAK_HEDEF ile
#   3. Geri yükleme denemesi — scripts/yedek-geri-yukleme-testi.sh
#
# Geri yüklemesi denenmemiş yedek, yedek değildir.

set -eu
# Dump şifresiz ve sağlık verisi taşıyor: yalnız sahibi okusun.
umask 077

YEDEK_DIZINI="${YEDEK_DIZINI:-/yedekler}"
SAKLAMA_GUN="${YEDEK_SAKLAMA_GUN:-30}"
DAMGA="$(date -u +%Y%m%dT%H%M%SZ)"
DOSYA="${YEDEK_DIZINI}/swiip-${DAMGA}.dump"
# Dump önce GEÇİCİ adla yazılıyor ve yalnızca boyut + bütünlük kontrolünden geçerse
# `.dump` adını alıyor. Doğrudan `.dump`'a yazılıyordu: pg_dump yarıda düştüğünde
# ya da kontroller başarısız olduğunda bozuk dosya `swiip-*.dump` adıyla kalıyor,
# `yedek-indir.mjs` onu sağlam bir yedek sanıp bu makineye çekiyor ve saklama
# sayacı onu da sayıyordu. Başarısız dosya `.bozuk` uzantısıyla incelemeye kalır.
GECICI="${DOSYA}.yaziliyor"

mkdir -p "$YEDEK_DIZINI"

echo "[$(date -u +%FT%TZ)] yedek başlıyor: ${DOSYA}"

# Özel biçim: seçmeli geri yükleme ve paralel restore mümkün olsun.
if ! pg_dump --format=custom --compress=9 --no-owner --no-privileges --file="$GECICI"; then
  mv -f "$GECICI" "${DOSYA}.bozuk" 2> /dev/null || true
  echo "HATA: pg_dump başarısız. ${DOSYA}.bozuk" >&2
  exit 1
fi

BOYUT="$(wc -c < "$GECICI")"
if [ "$BOYUT" -lt 4096 ]; then
  mv -f "$GECICI" "${DOSYA}.bozuk"
  echo "HATA: yedek şüpheli derecede küçük (${BOYUT} bayt). Silinmiyor, incele: ${DOSYA}.bozuk" >&2
  exit 1
fi

# Bütünlük kontrolü: dosya gerçekten okunabiliyor mu?
if ! pg_restore --list "$GECICI" > /dev/null 2>&1; then
  mv -f "$GECICI" "${DOSYA}.bozuk"
  echo "HATA: yedek okunamıyor, bozuk. ${DOSYA}.bozuk" >&2
  exit 1
fi

mv -f "$GECICI" "$DOSYA"

echo "[$(date -u +%FT%TZ)] yedek tamam: ${DOSYA} (${BOYUT} bayt)"

# --- 2. katman: dışarı kopyalama ---
if [ -n "${YEDEK_UZAK_HEDEF:-}" ]; then
  if command -v rclone > /dev/null 2>&1; then
    rclone copy "$DOSYA" "$YEDEK_UZAK_HEDEF" --quiet
    echo "[$(date -u +%FT%TZ)] dışarı kopyalandı: ${YEDEK_UZAK_HEDEF}"
  else
    echo "UYARI: YEDEK_UZAK_HEDEF tanımlı ama rclone kurulu değil. Yedek yalnızca sunucuda." >&2
  fi
else
  echo "UYARI: YEDEK_UZAK_HEDEF boş. Sunucu kaybedilirse yedek de kaybedilir." >&2
fi

# --- Eski yedekleri temizle ---
find "$YEDEK_DIZINI" -name 'swiip-*.dump' -type f -mtime "+${SAKLAMA_GUN}" -delete
KALAN="$(find "$YEDEK_DIZINI" -name 'swiip-*.dump' -type f | wc -l)"
echo "[$(date -u +%FT%TZ)] ${KALAN} yedek saklanıyor (${SAKLAMA_GUN} gün)"
