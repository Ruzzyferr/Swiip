#!/bin/sh
# Made2Fit veritabanı yedeği.
#
# Üç katman gerekir ve üçü de zorunludur (F0.4):
#   1. Otomatik yedek        — bu betik, her gece
#   2. Dışarı kopyalama      — YEDEK_UZAK_HEDEF ile
#   3. Geri yükleme denemesi — scripts/yedek-geri-yukleme-testi.sh
#
# Geri yüklemesi denenmemiş yedek, yedek değildir.

set -eu

YEDEK_DIZINI="${YEDEK_DIZINI:-/yedekler}"
SAKLAMA_GUN="${YEDEK_SAKLAMA_GUN:-30}"
DAMGA="$(date -u +%Y%m%dT%H%M%SZ)"
DOSYA="${YEDEK_DIZINI}/made2fit-${DAMGA}.dump"

mkdir -p "$YEDEK_DIZINI"

echo "[$(date -u +%FT%TZ)] yedek başlıyor: ${DOSYA}"

# Özel biçim: seçmeli geri yükleme ve paralel restore mümkün olsun.
pg_dump --format=custom --compress=9 --no-owner --no-privileges --file="$DOSYA"

BOYUT="$(wc -c < "$DOSYA")"
if [ "$BOYUT" -lt 4096 ]; then
  echo "HATA: yedek şüpheli derecede küçük (${BOYUT} bayt). Silinmiyor, incele." >&2
  exit 1
fi

# Bütünlük kontrolü: dosya gerçekten okunabiliyor mu?
if ! pg_restore --list "$DOSYA" > /dev/null 2>&1; then
  echo "HATA: yedek okunamıyor, bozuk. ${DOSYA}" >&2
  exit 1
fi

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
find "$YEDEK_DIZINI" -name 'made2fit-*.dump' -type f -mtime "+${SAKLAMA_GUN}" -delete
KALAN="$(find "$YEDEK_DIZINI" -name 'made2fit-*.dump' -type f | wc -l)"
echo "[$(date -u +%FT%TZ)] ${KALAN} yedek saklanıyor (${SAKLAMA_GUN} gün)"
