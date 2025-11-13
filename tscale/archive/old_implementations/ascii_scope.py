#!/usr/bin/env python3
# ascii_scope.py — 4-channel ASCII scope for FIFO/stdin
# Input:  t ch1 ch2 ch3 ch4   (>=2 cols; whitespace-sep)
# Keys: q quit | space run/stop | </> timebase | t trig | g trig ch | +/- trig lvl
#       r/f/e edge | o envelope/points | m auto-span | 1..4 toggle | A/S/D/F gain± | z/x/c/v off±

import sys, os, time, curses, select, signal, statistics
from collections import deque

# ---------- config ----------
PATH             = sys.argv[1] if len(sys.argv) > 1 else "/tmp/scope.fifo"
MAX_CH           = 4
REFRESH_HZ       = 30
HIST_SEC         = 2.0
DEFAULT_SPAN     = 0.250
STACK_FRAC       = 0.45
TRIG_POS_FRAC    = 0.25
DIGITAL_LAST     = False

# ---------- state ----------
class Chan:
    def __init__(self, color_idx):
        self.visible = True
        self.gain = 1.0
        self.offset = 0.0
        self.color = color_idx

chans = [Chan((i % 6) + 1) for i in range(MAX_CH)]
buf = deque(maxlen=300000)   # (t, [v...])
last_t = None

run = True
time_span_s = DEFAULT_SPAN
auto_span = True              # m toggles (adapts span to fill columns)
trig_enabled = False          # default off to avoid locked column
trig_ch = 1
trig_lvl = 0.0
trig_edge = +1
trig_hyst = 1e-9
use_envelope = True

fd = None
is_stdin = PATH in ("-", "/dev/stdin")

# ---------- io ----------
def open_input():
    global fd
    if is_stdin:
        fd = sys.stdin.fileno()
        os.set_blocking(fd, False)
        return
    if not os.path.exists(PATH):
        raise SystemExit(f"FIFO not found: {PATH}\nCreate with: mkfifo {PATH}")
    fd = os.open(PATH, os.O_RDONLY | os.O_NONBLOCK)

def parse_line(line):
    try:
        parts = line.strip().split()
        if len(parts) < 2: return None
        t = float(parts[0])
        vals = [float(p) for p in parts[1:1+MAX_CH]]
        return (t, vals)
    except Exception:
        return None

def read_into_buffer():
    global last_t
    if fd is None: return 0
    r, _, _ = select.select([fd], [], [], 0)
    n = 0
    if fd in r:
        try:
            data = os.read(fd, 65536).decode('utf-8', 'ignore') if not is_stdin else sys.stdin.read()
        except (BlockingIOError, InterruptedError):
            data = ""
        if not data:
            if not is_stdin:
                try: os.close(fd)
                except Exception: pass
                time.sleep(0.01); open_input()
            return 0
        for line in data.splitlines():
            rec = parse_line(line)
            if not rec: continue
            t, vs = rec
            if last_t is not None and t < last_t:
                t = last_t + 1e-12
            last_t = t
            buf.append((t, vs)); n += 1
    if n and last_t is not None:
        cutoff = last_t - max(HIST_SEC, 5*DEFAULT_SPAN)
        while buf and buf[0][0] < cutoff: buf.popleft()
    return n

# ---------- window ----------
def estimate_dt():
    """Robust dt estimate from last ~200 samples (guards against clumping)."""
    if len(buf) < 5: return None
    ts = [buf[i][0] for i in range(max(0, len(buf)-200), len(buf))]
    dts = [b-a for a,b in zip(ts, ts[1:]) if b>a]
    if not dts: return None
    return statistics.median(dts)

def compute_window(now_t, w_cols):
    global time_span_s
    if not buf: return (now_t - time_span_s, now_t)

    # optional trigger
    if trig_enabled and (1 <= trig_ch <= MAX_CH):
        ch = trig_ch - 1
        lo = trig_lvl - trig_hyst; hi = trig_lvl + trig_hyst
        lower = buf[-1][0] - 5.0*time_span_s
        for i in range(len(buf)-1, 0, -1):
            t2, v2s = buf[i]; t1, v1s = buf[i-1]
            if t2 < lower: break
            if ch >= len(v1s) or ch >= len(v2s): continue
            v1 = chans[ch].gain*v1s[ch] + chans[ch].offset
            v2 = chans[ch].gain*v2s[ch] + chans[ch].offset
            if (trig_edge > 0 and (v1 <= lo and v2 >= hi)) or \
               (trig_edge < 0 and (v1 >= hi and v2 <= lo)) or \
               (trig_edge == 0 and ((v1 <= lo and v2 >= hi) or (v1 >= hi and v2 <= lo))):
                left = t2 - TRIG_POS_FRAC*time_span_s
                return (left, left + time_span_s)

    # auto-span: fill at least ~70% of columns with data buckets
    if auto_span and len(buf) > 2:
        dt = estimate_dt()
        if dt:
            # target ~0.8 * visible columns, with safety clamp
            target_cols = max(10, int(0.8 * max(2, w_cols)))
            span = max(5*dt, target_cols * dt)
            time_span_s = max(0.005, min(60.0, span))

    right = buf[-1][0]
    return (right - time_span_s, right)

# ---------- mapping ----------
def map_to_row(val, rows, ci):
    sep = rows / (MAX_CH + 1)
    mid = int((ci+1)*sep)
    scale = sep * STACK_FRAC
    y = int(mid - val*scale)
    if y < 0: y = 0
    if y >= rows: y = rows-1
    return y

# ---------- renderers ----------
def render_envelopes(stdscr, left_t, right_t, h, w):
    cols = max(2, w-2)
    rows = h-1
    span = max(1e-12, right_t - left_t)
    for ci, ch in enumerate(chans):
        if not ch.visible: continue
        attr = curses.color_pair(ch.color)
        ymin = [None]*cols; ymax = [None]*cols
        # bin to nearest column center to avoid left-edge pileup
        for t, vs in buf:
            if t < left_t or t > right_t: continue
            if ci >= len(vs): continue
            xf = (cols-1) * (t - left_t) / span
            x = int(round(xf))                      # round() fixes single-column artifacts
            if x < 0 or x >= cols: continue
            yv = ch.gain*vs[ci] + ch.offset
            if DIGITAL_LAST and ci == (MAX_CH-1):
                yv = 0.8 if yv >= 0.5 else -0.8
            y = map_to_row(yv, rows, ci)
            if ymin[x] is None or y < ymin[x]: ymin[x] = y
            if ymax[x] is None or y > ymax[x]: ymax[x] = y
        # draw
        for x in range(cols):
            y0 = ymin[x]
            if y0 is None: continue
            y1 = ymax[x] if ymax[x] is not None else y0
            X = 1 + x
            if y0 == y1:
                stdscr.addch(y0, X, '*', attr)
            else:
                step = 1 if y1 >= y0 else -1
                for ry in range(y0, y1+step, step):
                    stdscr.addch(ry, X, '|', attr)

def render_points(stdscr, left_t, right_t, h, w):
    rows = h-1
    span = max(1e-12, right_t - left_t)
    for ci, ch in enumerate(chans):
        if not ch.visible: continue
        attr = curses.color_pair(ch.color)
        last_x = None; last_y = None
        for t, vs in buf:
            if t < left_t or t > right_t: continue
            if ci >= len(vs): continue
            xf = 1 + (w-2) * (t - left_t) / span
            x = int(round(xf))                    # use round()
            if x < 1 or x >= w-1: continue
            yv = ch.gain*vs[ci] + ch.offset
            if DIGITAL_LAST and ci == (MAX_CH-1):
                yv = 0.8 if yv >= 0.5 else -0.8
            y = map_to_row(yv, rows, ci)
            stdscr.addch(y, x, '*', attr)
            if last_x is not None and x > last_x:
                dx = x - last_x; dy = y - last_y
                for i in range(1, dx):
                    xi = last_x + i
                    yi = last_y + (dy*i)//dx
                    if 1 <= xi < w-1 and 0 <= yi < rows:
                        stdscr.addch(yi, xi, '.', attr)
            last_x, last_y = x, y

# ---------- ui ----------
def header_line():
    run_s = "ON" if run else "OFF"
    edge_s = "+" if trig_edge>0 else "-" if trig_edge<0 else "+/-"
    return "  ".join([
        f"[q] quit  [space] run={run_s}",
        f"[</>] timebase {time_span_s:.3f}s  [m] auto={'ON' if auto_span else 'OFF'}",
        f"[t] trigger {'ON' if trig_enabled else 'OFF'} ch={trig_ch} lvl={trig_lvl:+.3g} edge={edge_s}",
        "[1..4] toggle  [A/S/D/F] gain±  [z/x/c/v] off±  [o] env/pts"
    ])

def draw_scope(stdscr):
    global run, time_span_s, auto_span, trig_enabled, trig_ch, trig_lvl, trig_edge, use_envelope
    curses.curs_set(0)
    stdscr.nodelay(True)
    stdscr.timeout(int(1000/REFRESH_HZ))
    if curses.has_colors():
        curses.start_color()
        for i in range(1, 8): curses.init_pair(i, i, 0)

    open_input()
    while True:
        read_into_buffer()
        h, w = stdscr.getmaxyx()
        stdscr.erase()

        # header
        stdscr.addnstr(0, 0, header_line(), w-1, curses.A_REVERSE)

        # axes
        for y in range(1, h): stdscr.addch(y, 0, '|')
        stdscr.addnstr(h-1, 0, '+' + '-'*(w-2) + '>', w-1)

        # window
        now_t = buf[-1][0] if buf else time.time()
        left_t, right_t = compute_window(now_t, w-2)
        if right_t <= left_t: right_t = left_t + 1e-3

        # render
        if use_envelope:
            render_envelopes(stdscr, left_t, right_t, h, w)
        else:
            render_points(stdscr, left_t, right_t, h, w)

        # footer
        meta = [f"ch{i}:{'on' if ch.visible else 'off'} g={ch.gain:.3g} off={ch.offset:+.3g}"
                for i, ch in enumerate(chans, 1)]
        stdscr.addnstr(h-2, 2, "  ".join(meta), w-4)

        stdscr.refresh()

        # keys
        c = stdscr.getch()
        if c == -1: continue
        if c in (ord('q'), 27): return
        elif c == ord(' '): run = not run
        elif c in (curses.KEY_RIGHT, ord('>'), ord('.')): time_span_s = min(60.0, time_span_s*1.25)
        elif c in (curses.KEY_LEFT,  ord('<'), ord(',')): time_span_s = max(0.005, time_span_s/1.25)
        elif c == ord('m'): auto_span = not auto_span
        elif c == ord('t'): trig_enabled = not trig_enabled
        elif c == ord('g'): trig_ch = 1 + (trig_ch % MAX_CH)
        elif c in (ord('+'), ord('=')): trig_lvl += 0.05
        elif c == ord('-'): trig_lvl -= 0.05
        elif c == ord('r'): trig_edge = +1
        elif c == ord('f'): trig_edge = -1
        elif c == ord('e'): trig_edge = 0
        elif c == ord('o'): use_envelope = not use_envelope
        elif c in (ord('1'), ord('2'), ord('3'), ord('4')):
            idx = c - ord('1'); chans[idx].visible = not chans[idx].visible
        elif c in (ord('a'), ord('A')): chans[0].gain *= (1.1 if c==ord('A') else 1/1.1)
        elif c in (ord('s'), ord('S')): chans[1].gain *= (1.1 if c==ord('S') else 1/1.1)
        elif c in (ord('d'), ord('D')): chans[2].gain *= (1.1 if c==ord('D') else 1/1.1)
        elif c in (ord('f'), ord('F')): chans[3].gain *= (1.1 if c==ord('F') else 1/1.1)
        elif c in (ord('z'), ord('Z')): chans[0].offset += (0.05 if c==ord('Z') else -0.05)
        elif c in (ord('x'), ord('X')): chans[1].offset += (0.05 if c==ord('X') else -0.05)
        elif c in (ord('c'), ord('C')): chans[2].offset += (0.05 if c==ord('C') else -0.05)
        elif c in (ord('v'), ord('V')): chans[3].offset += (0.05 if c==ord('V') else -0.05)
        if not run: time.sleep(0.02)

# ---------- main ----------
def main():
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    curses.wrapper(draw_scope)

if __name__ == "__main__":
    main()
