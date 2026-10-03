#!/usr/bin/env bash
#
# Sunucunun işletim sistemi katmanını sertleştirir. Her dağıtımda `sunucu-dagit.sh`
# tarafından çalıştırılır ve İDEMPOTENTTİR: ikinci koşu hiçbir şeyi değiştirmez.
#
# Neden depoda: elle yapılan sertleştirme, sunucu yeniden kurulduğunda ya da biri
# "geçici olarak" bir ayarı açtığında sessizce kaybolur. Burada yazılı olan her
# ayar her dağıtımda yeniden uygulanır; `sertlestirme.test.ts` maddeleri kilitliyor.
#
# 2026-10-03 denetiminde ölçülen başlangıç durumu: dışarıdan yalnız 22/80/443 açık,
# parola ile SSH kapalı, fail2ban çalışıyor. Bu betik o iyi durumu KİLİTLİYOR ve
# eksikleri kapatıyor: SSH'ta deneme sayısı ve yönlendirmeler, çekirdek ağ
# ayarları, otomatik güvenlik güncellemesinden sonra yeniden başlatma, yedek
# dosyalarının izinleri ve uygulamanın veritabanı rolü için parola.
#
#   bash scripts/sunucu-sertlestir.sh     (sunucuda, root olarak)
#
set -euo pipefail

UZAK_DIZIN="${UZAK_DIZIN:-/opt/swiip}"
degisti=0
yaz() { # yaz <hedef> : standart girdiyi hedefe yazar, yalnız içerik farklıysa
  local hedef="$1" gecici
  gecici="$(mktemp)"
  cat >"$gecici"
  if [ -f "$hedef" ] && cmp -s "$gecici" "$hedef"; then
    rm -f "$gecici"
    return 1
  fi
  install -m 0644 "$gecici" "$hedef"
  rm -f "$gecici"
  echo "  güncellendi: $hedef"
  degisti=1
  return 0
}

# --- SSH -----------------------------------------------------------------------
#
# Ubuntu'da `sshd_config.d/*.conf` ana dosyanın BAŞINDA okunuyor ve sshd'de bir
# anahtarın İLK değeri geçerli. `00-` öneki bu yüzden: bulut imajının kendi
# dosyası (60-cloudimg-settings.conf) ya da bir paket güncellemesi bunu ezemesin.
#
# Doğrulanmadan yeniden yüklenmez: bozuk bir sshd yapılandırması, tek erişim
# yolumuzu kapatır. `sshd -t` düşerse dosya geri alınır.
SSH_DOSYA=/etc/ssh/sshd_config.d/00-swiip.conf
if yaz "$SSH_DOSYA" <<'SSH'
# scripts/sunucu-sertlestir.sh tarafından yönetiliyor — elle düzenleme bir sonraki dağıtımda ezilir.
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
PubkeyAuthentication yes
AuthenticationMethods publickey
MaxAuthTries 3
MaxSessions 4
LoginGraceTime 20
X11Forwarding no
AllowAgentForwarding no
PermitTunnel no
PermitUserEnvironment no
ClientAliveInterval 300
ClientAliveCountMax 2
SSH
then
  if sshd -t; then
    systemctl reload ssh
  else
    echo "HATA: sshd yapılandırması geçersiz, geri alınıyor." >&2
    rm -f "$SSH_DOSYA"
    exit 1
  fi
fi

# --- fail2ban ------------------------------------------------------------------
#
# 2026-10-03: 30 günde 30.739 başarısız SSH denemesi. Parola kapalı olduğu için
# hiçbiri giremez, ama gürültü günlüğü boğuyor ve gerçek bir denemeyi saklıyor.
# Tekrar eden adres katlanarak daha uzun yasaklanıyor (en çok bir hafta).
command -v fail2ban-client >/dev/null || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq fail2ban
if yaz /etc/fail2ban/jail.d/swiip.local <<'F2B'
# scripts/sunucu-sertlestir.sh tarafından yönetiliyor.
[DEFAULT]
banaction = nftables
banaction_allports = nftables[type=allports]
backend = systemd
bantime = 1h
bantime.increment = true
bantime.maxtime = 1w
findtime = 10m
maxretry = 4

[sshd]
enabled = true
mode = aggressive
F2B
then
  systemctl restart fail2ban
fi
systemctl is-active --quiet fail2ban || systemctl enable --now fail2ban

# --- Güvenlik duvarı -------------------------------------------------------------
#
# ufw yalnız ana makinenin kendi portlarını korur. Docker'ın yayınladığı portlar
# ufw'yu ATLAR (kendi DOCKER zincirini kullanır) — o yüzden konteyner tarafının
# kilidi `docker-compose.yml`'da: yalnız caddy port yayınlıyor ve
# `sertlestirme.test.ts` başka bir servisin `ports:` almasını yasaklıyor.
# `ufw limit` bilerek KULLANILMIYOR: 30 saniyede 6 bağlantıda dağıtım betiğinin
# kendisini kilitliyor; deneme sınırı fail2ban'ın işi.
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
for kural in '22/tcp' '80/tcp' '443/tcp' '443/udp'; do
  ufw allow "$kural" >/dev/null
done
ufw --force enable >/dev/null

# --- Çekirdek ağ ayarları ------------------------------------------------------
#
# Ubuntu varsayılanlarının çoğu zaten doğru; burada eksik olanlar ve kilitlenmesi
# gerekenler var. `ip_forward`a DOKUNULMUYOR: Docker'ın köprü ağı ona bağlı.
# rp_filter 2 (gevşek): DigitalOcean'da iki arayüz var (eth0 + VPC eth1); katı mod
# asimetrik yolda meşru paketi düşürebilir.
if yaz /etc/sysctl.d/90-swiip.conf <<'SYSCTL'
# scripts/sunucu-sertlestir.sh tarafından yönetiliyor.
net.ipv4.conf.all.rp_filter = 2
net.ipv4.conf.default.rp_filter = 2
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv6.conf.all.accept_source_route = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_rfc1337 = 1
kernel.kptr_restrict = 2
kernel.dmesg_restrict = 1
kernel.unprivileged_bpf_disabled = 1
kernel.yama.ptrace_scope = 1
kernel.sysrq = 0
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
fs.protected_fifos = 2
fs.protected_regular = 2
fs.suid_dumpable = 0
SYSCTL
then
  sysctl -q --system
fi

# --- Otomatik güvenlik güncellemesi --------------------------------------------
#
# unattended-upgrades açıktı ve paketleri kuruyordu, ama çekirdek ve libc
# güncellemeleri YENİDEN BAŞLATMA olmadan etkili olmuyor. 2026-10-03'te sunucu
# 42 gündür açıktı, 6.8.0-124 çekirdeğiyle dönüyordu ve üç yeni çekirdek
# bekliyordu: güncelleme "kurulmuş" ama hiç devrede değil — sessiz kusur.
#
# Yeniden başlatma 04:30 UTC (Türkiye 07:30): gece yedeği 03:15'te alınmış oluyor.
# Konteynerlerin hepsi `restart: unless-stopped`; servis kendiliğinden geri geliyor.
dpkg -s unattended-upgrades >/dev/null 2>&1 || DEBIAN_FRONTEND=noninteractive apt-get install -y -qq unattended-upgrades
yaz /etc/apt/apt.conf.d/20auto-upgrades <<'APT20' || true
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
APT20
yaz /etc/apt/apt.conf.d/52swiip-unattended <<'APT52' || true
// scripts/sunucu-sertlestir.sh tarafından yönetiliyor.
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-WithUsers "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
APT52

# --- Yedek dosyaları -----------------------------------------------------------
#
# Dump şifresiz ve içinde sağlık verisi var; 0644 idi. Yalnız root okusun.
# Betik (`yedek-al.sh`) artık 077 umask ile yazıyor; bu satır eskileri düzeltiyor.
if [ -d "$UZAK_DIZIN/yedekler" ]; then
  chmod 700 "$UZAK_DIZIN/yedekler"
  find "$UZAK_DIZIN/yedekler" -type f ! -perm 600 -exec chmod 600 {} +
fi
chmod 600 "$UZAK_DIZIN/infra/.env"

# --- Uygulamanın veritabanı rolü için parola ---------------------------------
#
# API eskiden Postgres'e SÜPER KULLANICI olarak bağlanıyordu. Bir SQL enjeksiyonu
# ya da ele geçirilmiş bir bağımlılık o bağlantıyla `COPY ... TO PROGRAM` çalıştırıp
# konteynerde komut yürütebilirdi. Artık API yalnız veri okuyup yazabilen ayrı bir
# rolle bağlanıyor (rol `gocmen` tarafından kuruluyor, bkz. db/uygulamaRolu.ts).
# Parola yoksa burada üretiliyor; hiçbir çıktıya yazılmıyor.
if ! grep -q '^UYGULAMA_DB_PAROLASI=.' "$UZAK_DIZIN/infra/.env"; then
  printf '\nUYGULAMA_DB_PAROLASI=%s\n' "$(openssl rand -hex 24)" >>"$UZAK_DIZIN/infra/.env"
  echo "  UYGULAMA_DB_PAROLASI üretildi"
  degisti=1
fi

[ "$degisti" = 1 ] && echo "  sertleştirme: değişiklik uygulandı" || echo "  sertleştirme: değişiklik yok"
