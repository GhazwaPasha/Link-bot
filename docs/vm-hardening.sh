#!/usr/bin/env bash
# One-time hardening for the ~500MB Oracle "Always Free" VM that runs the bot.
# Run ON the VM as opc (it uses sudo). Safe to re-run.
#
# Why: in Sep 2026 users got "application didn't respond" every ~1.5-2h. Cause was
# not a Discord rate limit — dnf-makecache (auto package-metadata refresh) grew to
# ~350MB, exhausted RAM + all 2.5GB swap and got OOM-killed, over and over. While
# it thrashed, the bot's event loop froze: interaction acks missed Discord's 3s
# deadline and gateway heartbeats lapsed (session drops + re-IDENTIFY).
set -euo pipefail

echo "== 1. Disable memory-heavy background jobs this box doesn't need"
# Package updates are done by hand from now on: sudo dnf upgrade (ideally with the bot stopped).
sudo systemctl disable --now dnf-makecache.timer
# PCP performance metrics (pmlogger itself triggered one of the OOMs).
for svc in pmlogger pmlogger_farm pmie pmie_farm pmcd; do
  sudo systemctl disable --now "$svc.service" 2>/dev/null || true
done

echo "== 2. Protect the bot's memory + rate-limit restarts"
sudo mkdir -p /etc/systemd/system/link-bot.service.d
sudo tee /etc/systemd/system/link-bot.service.d/hardening.conf >/dev/null <<'EOF'
[Unit]
# A crash loop must never re-IDENTIFY fast enough to trip Discord's abuse
# detection (that's what got this bot's IP banned once): at most 5 starts / 10 min.
StartLimitIntervalSec=600
StartLimitBurst=5

[Service]
# cgroup-v2 reclaim protection: the bot's pages stay in RAM instead of swap,
# so a click is never waiting on a page-in.
MemoryMin=160M
# If memory still runs out, the kernel kills anything else first.
OOMScoreAdjust=-900
# Keep V8's heap well inside physical RAM.
Environment=NODE_OPTIONS=--max-old-space-size=256
Restart=always
RestartSec=30
EOF

echo "== 3. Persistent, size-capped journal (logs survive reboots; earlier ones were lost)"
sudo mkdir -p /var/log/journal /etc/systemd/journald.conf.d
sudo tee /etc/systemd/journald.conf.d/size.conf >/dev/null <<'EOF'
[Journal]
Storage=persistent
SystemMaxUse=50M
EOF
sudo systemctl restart systemd-journald

echo "== 4. Apply + restart the bot"
sudo systemctl daemon-reload
sudo systemctl restart link-bot.service
sleep 30

echo "== Verify"
systemctl list-timers --all --no-pager | grep dnf-makecache || echo "dnf-makecache timer: gone"
systemctl show link-bot.service -p MemoryMin -p OOMScoreAdjust -p Restart -p NRestarts
free -m
curl -s localhost:3001/health; echo
