# ccshare - multiplayer Claude Code

Share your live Claude Code session with friends using a short code, AirDrop-style.
The host runs Claude in a PTY and mirrors the terminal; everyone who joins sees the
same screen and (unless you say otherwise) can type into the same session. Works in
both directions - you host and they join, or they host and you join.

## Install

```sh
git clone <this repo> && cd ccshare
npm install
npm link          # puts `ccshare` on your PATH
```

Every friend does the same. If `ccshare` isn't found after `npm link` (homebrew's
node links into the Cellar, which isn't on PATH), symlink it directly:
`ln -sf "$PWD/bin/ccshare.js" /opt/homebrew/bin/ccshare`.

node-pty ships prebuilt binaries, but npm strips the exec bit off its
`spawn-helper` - the postinstall script in this package restores it. If claude
ever fails to start with `posix_spawnp failed`, run `npm rebuild` here.

## Same Wi-Fi (the AirDrop case)

```sh
# you, in your project directory
ccshare host
#   code:  7KQ 2FM

# your friend, anywhere on the same network
ccshare join 7KQ2FM
```

Discovery is a UDP broadcast carrying a hash of the code, so `join` finds the host
automatically - no IPs. `Ctrl-]` detaches a joiner without touching the session.

## Different networks

Two options:

- **Tailscale (or any reachable IP):** the host banner prints a direct line like
  `ccshare join 7KQ2FM --host 192.168.1.4:42518` - swap in the tailnet IP and it
  connects straight through, no extra server.
- **Relay:** one of you runs `ccshare relay` on any box with a public address
  (a $0 Fly/Railway/Render instance works - it respects `PORT`). Then everyone puts
  `export CCSHARE_RELAY=wss://your-relay` in their shell profile. With that set,
  `ccshare host` registers with the relay automatically and `ccshare join CODE`
  falls back to it when LAN discovery finds nothing. The relay is a dumb pipe; it
  never sees your code in plaintext discovery, just relays frames for paired rooms.

## Useful flags

- `ccshare host --read-only` - friends can watch but not type.
- `ccshare host -- --resume` - everything after `--` goes to claude itself.
- `ccshare host --cmd bash` - share any terminal program, not just claude.
- `ccshare join CODE --name dev-priya` - how you appear on the host's side.
- `ccshare host --max 2` - cap joiners (default 5).

## How it behaves

- The PTY runs at the smallest connected terminal, tmux-style, so everyone sees the
  same frame. When someone joins, resize + a repaint jiggle gives them a fresh screen;
  they also get the recent scrollback (last 256KB) replayed.
- New joiners ring a bell on the host and the terminal title shows `ccshare CODE · N connected`.
- The session dies when claude exits on the host; joiners are told and dropped.

## Security, plainly

The code is the only auth, and anyone who has it can type into a real terminal on the
host's machine - that means running arbitrary commands. Only share codes with people
you'd hand your laptop to. Codes die with the session, direct/LAN traffic is plain
`ws://` on your local network, and the relay sees terminal bytes, so put the relay
behind TLS (`wss://`) if you deploy one.
