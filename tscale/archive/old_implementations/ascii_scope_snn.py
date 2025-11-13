#!/usr/bin/env python3
# ascii_scope_snn.py — Multi-page DAW-style 4-channel ASCII scope with CLI for SNN kernel parameter control
# Input:  t ch1 ch2 ch3 ch4   (>=2 cols; whitespace-sep)
# Keys: h/? help popup | q quit | space play/stop | LEFT/RIGHT scrub | HOME/END jump | </> zoom
#       1..5 toggle pages (1=scope 2=CLI) | F1-F4 toggle channels | o envelope/points | K reprocess
#       [zZ] tau_a ±semitone | [xX] tau_r ±semitone | [cC] threshold ±0.5σ | [vV] refractory ±5ms
#       [aA] ch1 gain | [sS] ch2 gain | [dD] ch3 gain | [fF] ch4 gain
#       [wW] ch2 offset | [eE] ch3 offset | [rR] ch4 offset
#       CLI: : enters command mode | ESC exits

import sys, os, time, curses, select, signal, statistics, subprocess, tempfile, threading
from collections import deque
import math

# ---------- config ----------
PATH             = sys.argv[1] if len(sys.argv) > 1 else "/tmp/scope.fifo"
AUDIO_INPUT      = sys.argv[2] if len(sys.argv) > 2 else None  # Original audio file for reprocessing
MAX_CH           = 4
REFRESH_HZ       = 30
DEFAULT_SPAN     = 1.0           # Default 1 second view window
SIGNAL_HEIGHT    = 8             # Rows per channel (constrained)
DIGITAL_LAST     = False

# SNN kernel defaults (matching tscale.c framework)
DEFAULT_TAU_A    = 0.001         # 1ms attack
DEFAULT_TAU_R    = 0.005         # 5ms recovery
DEFAULT_FS       = 48000         # Sample rate
DEFAULT_THR      = 3.0           # Threshold in sigma units
DEFAULT_REF      = 0.015         # Refractory period (seconds)

# Musical scaling: 1 semitone = 2^(1/12) frequency ratio
# For tau: smaller tau = higher frequency, so tau * 2^(-1/12) for +semitone
SEMITONE_RATIO   = 2.0 ** (1.0/12.0)

# Reprocessing state
reprocess_lock   = threading.Lock()
reprocessing     = False
reprocess_status = ""

# ---------- state ----------
class Chan:
    def __init__(self, color_idx, name):
        self.visible = True
        self.gain = 1.0
        self.offset = 0.0
        self.color = color_idx
        self.name = name

chans = [
    Chan(1, "ch1"),  # red
    Chan(2, "ch2"),  # green
    Chan(3, "ch3"),  # yellow
    Chan(4, "ch4"),  # blue
]

# Data buffer - stores all loaded data
data_buffer = []                     # List of (t, [v...]) tuples
data_loaded = False                  # True once initial load completes
data_duration = 0.0                  # Total duration of loaded data

# DAW-style playback state
playing = False                      # True = playing, False = stopped
playhead_pos = 0.0                   # Current playhead position (seconds)
time_span_s = DEFAULT_SPAN           # View window size (seconds)
use_envelope = True
show_help = False                    # Toggle help overlay
last_update_time = None              # For playback timing

# Multi-page system
pages_visible = [True, False, False, False, False]  # Pages 1-5 (scope, CLI, future...)
cli_mode = False                     # True when typing in CLI
cli_input = ""                       # Current CLI input buffer
cli_history = deque(maxlen=100)      # Command history
cli_output = deque(maxlen=100)       # CLI output lines
cli_cursor_pos = 0                   # Cursor position in CLI input

# SNN kernel parameters (live editable)
tau_a = DEFAULT_TAU_A
tau_r = DEFAULT_TAU_R
fs = DEFAULT_FS
threshold_lambda = DEFAULT_THR
refractory_sec = DEFAULT_REF

fd = None
is_stdin = PATH in ("-", "/dev/stdin")

# ---------- io ----------
def parse_line(line):
    try:
        parts = line.strip().split()
        if len(parts) < 2: return None
        t = float(parts[0])
        vals = [float(p) for p in parts[1:1+MAX_CH]]
        return (t, vals)
    except Exception:
        return None

def load_all_data():
    """Load all data from input stream into buffer."""
    global data_buffer, data_loaded, data_duration, fd

    data_buffer = []
    last_t = None

    if is_stdin:
        fd = sys.stdin.fileno()
        # Read all stdin data
        for line in sys.stdin:
            rec = parse_line(line)
            if not rec: continue
            t, vs = rec
            if last_t is not None and t < last_t:
                t = last_t + 1e-12
            last_t = t
            data_buffer.append((t, vs))
    else:
        if not os.path.exists(PATH):
            raise SystemExit(f"File not found: {PATH}")
        with open(PATH, 'r') as f:
            for line in f:
                rec = parse_line(line)
                if not rec: continue
                t, vs = rec
                if last_t is not None and t < last_t:
                    t = last_t + 1e-12
                last_t = t
                data_buffer.append((t, vs))

    if data_buffer:
        data_duration = data_buffer[-1][0] - data_buffer[0][0]

    data_loaded = True

# ---------- window ----------
def compute_window():
    """Compute time window based on playhead position."""
    if not data_buffer:
        return (0.0, time_span_s)

    # Center window on playhead position
    left = playhead_pos
    right = playhead_pos + time_span_s

    return (left, right)

# ---------- mapping ----------
def map_to_row(val, ci, display_h):
    """Map value to row, constrained to SIGNAL_HEIGHT per channel."""
    # Layout: header(1) + [ch0 ... ch3] + controls(4) + footer(1)
    gap = 1
    y_start = 1 + ci * (SIGNAL_HEIGHT + gap)
    mid = y_start + SIGNAL_HEIGHT // 2
    scale = SIGNAL_HEIGHT * 0.4
    y = int(mid - val * scale)
    y = max(y_start, min(y_start + SIGNAL_HEIGHT - 1, y))
    return y

# ---------- renderers ----------
def render_envelopes(scr, left_t, right_t, w, display_h):
    """Render envelope view."""
    cols = max(2, w-2)
    span = max(1e-12, right_t - left_t)

    for ci, ch in enumerate(chans):
        if not ch.visible: continue
        attr = curses.color_pair(ch.color)
        ymin = [None]*cols; ymax = [None]*cols

        for t, vs in data_buffer:
            if t < left_t or t > right_t: continue
            if ci >= len(vs): continue
            xf = (cols-1) * (t - left_t) / span
            x = int(round(xf))
            if x < 0 or x >= cols: continue
            yv = ch.gain*vs[ci] + ch.offset
            if DIGITAL_LAST and ci == (MAX_CH-1):
                yv = 0.8 if yv >= 0.5 else -0.8
            y = map_to_row(yv, ci, display_h)
            if ymin[x] is None or y < ymin[x]: ymin[x] = y
            if ymax[x] is None or y > ymax[x]: ymax[x] = y

        # Draw envelopes
        for x in range(cols):
            y0 = ymin[x]
            if y0 is None: continue
            y1 = ymax[x] if ymax[x] is not None else y0
            X = 1 + x
            if y0 == y1:
                try: scr.addch(y0, X, '*', attr)
                except: pass
            else:
                step = 1 if y1 >= y0 else -1
                for ry in range(y0, y1+step, step):
                    try: scr.addch(ry, X, '|', attr)
                    except: pass

def render_points(scr, left_t, right_t, w, display_h):
    """Render points view."""
    span = max(1e-12, right_t - left_t)

    for ci, ch in enumerate(chans):
        if not ch.visible: continue
        attr = curses.color_pair(ch.color)
        last_x = None; last_y = None
        for t, vs in data_buffer:
            if t < left_t or t > right_t: continue
            if ci >= len(vs): continue
            xf = 1 + (w-2) * (t - left_t) / span
            x = int(round(xf))
            if x < 1 or x >= w-1: continue
            yv = ch.gain*vs[ci] + ch.offset
            if DIGITAL_LAST and ci == (MAX_CH-1):
                yv = 0.8 if yv >= 0.5 else -0.8
            y = map_to_row(yv, ci, display_h)
            try: scr.addch(y, x, '*', attr)
            except: pass
            if last_x is not None and x > last_x:
                dx = x - last_x; dy = y - last_y
                for i in range(1, dx):
                    xi = last_x + i
                    yi = last_y + (dy*i)//dx
                    try: scr.addch(yi, xi, '.', attr)
                    except: pass
            last_x, last_y = x, y

# ---------- UI helpers ----------
def format_tau(tau_sec):
    """Format tau in ms or μs."""
    if tau_sec >= 0.001:
        return f"{tau_sec*1000:.2f}ms"
    else:
        return f"{tau_sec*1e6:.1f}μs"

def compute_fc(ta, tr):
    """Pseudo center frequency from tau_a and tau_r."""
    return 1.0 / (2.0 * math.pi * math.sqrt(ta * tr))

def header_line(w):
    """Generate header with DAW-style transport controls."""
    play_s = "▶PLAY" if playing else "■STOP"
    pos_str = f"{playhead_pos:.3f}s"
    dur_str = f"/{data_duration:.3f}s" if data_duration > 0 else ""
    pct = (playhead_pos / data_duration * 100) if data_duration > 0 else 0
    line = f"[h/?]help [q]quit [:] CLI [{play_s}] {pos_str}{dur_str} ({pct:.0f}%) [←→]scrub [</>]zoom={time_span_s:.3f}s [1-5]pages"
    return line[:w-1]

def control_panel_lines():
    """MIDI-style 8 sliders + pots (4 shown, 4 for future)."""
    fc = compute_fc(tau_a, tau_r)
    status_line = ""
    with reprocess_lock:
        if reprocessing:
            status_line = "  ⟳ Processing..."
        elif reprocess_status:
            status_line = f"  {reprocess_status}"
    lines = [
        f"┌─[τa]─────┬─[τr]─────┬─[Thr]────┬─[Ref]────┐",
        f"│ {format_tau(tau_a):>8} │ {format_tau(tau_r):>8} │ {threshold_lambda:>6.2f}σ │ {format_tau(refractory_sec):>8} │  fc≈{fc:.1f}Hz{status_line}",
        f"│   zZ     │   xX     │   cC     │   vV     │  [K] reprocess",
        f"└──────────┴──────────┴──────────┴──────────┘",
    ]
    return lines

def channel_status_line():
    parts = []
    for i, ch in enumerate(chans, 1):
        vis = "ON" if ch.visible else "off"
        parts.append(f"ch{i}:{vis} g={ch.gain:.2f} off={ch.offset:+.2f}")
    return "  ".join(parts)

def draw_help_popup(stdscr, h, w):
    """Draw centered help popup with key bindings."""
    help_lines = [
        "╔══════════════════════════════════════════════════════════════════╗",
        "║      SNN SCOPE - MULTI-PAGE DAW KEYBOARD REFERENCE               ║",
        "╠══════════════════════════════════════════════════════════════════╣",
        "║ PAGES (composable - multiple can be visible)                     ║",
        "║   1           Toggle Page 1 (Oscilloscope view)                  ║",
        "║   2           Toggle Page 2 (CLI interface)                      ║",
        "║   3 4 5       Toggle Pages 3-5 (reserved for future)             ║",
        "║                                                                  ║",
        "║ TRANSPORT CONTROLS (DAW-style)                                   ║",
        "║   h or ?      Toggle this help                                   ║",
        "║   q           Quit scope                                         ║",
        "║   SPACE       Play/Stop playback                                 ║",
        "║   LEFT        Scrub backward (1% of duration)                    ║",
        "║   RIGHT       Scrub forward (1% of duration)                     ║",
        "║   SHIFT+LEFT  Scrub backward (10% of duration)                   ║",
        "║   SHIFT+RIGHT Scrub forward (10% of duration)                    ║",
        "║   HOME        Jump to start                                      ║",
        "║   END         Jump to end                                        ║",
        "║                                                                  ║",
        "║ CLI INTERFACE (Page 2)                                           ║",
        "║   :           Enter CLI command mode                             ║",
        "║   ESC         Exit CLI command mode                              ║",
        "║   Commands: tau_a/tau_r/thr/ref <val> | play/stop/seek/zoom      ║",
        "║             status | reprocess | clear | help                    ║",
        "║                                                                  ║",
        "║ ZOOM & DISPLAY                                                   ║",
        "║   < or ,      Zoom in (decrease time span)                       ║",
        "║   > or .      Zoom out (increase time span)                      ║",
        "║   o           Toggle envelope/points rendering                   ║",
        "║   F1 F2 F3 F4 Toggle channel visibility                          ║",
        "║                                                                  ║",
        "║ KERNEL PARAMETERS (musical semitone scaling)                     ║",
        "║   z / Z       tau_a  -/+ semitone  (attack time constant)        ║",
        "║   x / X       tau_r  -/+ semitone  (recovery time constant)      ║",
        "║   c / C       Threshold -/+ 0.5σ   (spike threshold)             ║",
        "║   v / V       Refractory -/+ 5ms   (refractory period)           ║",
        "║   K           Reprocess audio with current kernel params         ║",
        "║                                                                  ║",
        "║ CHANNEL GAIN (ASDF keys)                                         ║",
        "║   a / A       Ch1 gain ÷/× 1.1                                   ║",
        "║   s / S       Ch2 gain ÷/× 1.1                                   ║",
        "║   d / D       Ch3 gain ÷/× 1.1                                   ║",
        "║   f / F       Ch4 gain ÷/× 1.1                                   ║",
        "║                                                                  ║",
        "║ CHANNEL OFFSET (WER keys + shift)                                ║",
        "║   Q           Ch1 offset +0.05                                   ║",
        "║   w / W       Ch2 offset -/+ 0.05                                ║",
        "║   e / E       Ch3 offset -/+ 0.05                                ║",
        "║   r / R       Ch4 offset -/+ 0.05                                ║",
        "║                                                                  ║",
        "║          Press h or ? to close this help                         ║",
        "╚══════════════════════════════════════════════════════════════════╝",
    ]

    # Calculate centered position
    help_h = len(help_lines)
    help_w = max(len(line) for line in help_lines)
    start_y = max(0, (h - help_h) // 2)
    start_x = max(0, (w - help_w) // 2)

    # Draw semi-transparent background (using reverse video)
    for i, line in enumerate(help_lines):
        y = start_y + i
        if y >= h: break
        # Draw the help text with bold/bright attribute
        try:
            if i in (0, 2, len(help_lines)-1):  # Header/divider/footer
                stdscr.addnstr(y, start_x, line, min(len(line), w - start_x), curses.A_BOLD | curses.color_pair(3))
            elif i == 1:  # Title
                stdscr.addnstr(y, start_x, line, min(len(line), w - start_x), curses.A_BOLD | curses.A_REVERSE)
            else:
                stdscr.addnstr(y, start_x, line, min(len(line), w - start_x), curses.A_NORMAL)
        except:
            pass

# ---------- CLI system ----------
def process_cli_command(cmd):
    """Process CLI command and return output."""
    global tau_a, tau_r, threshold_lambda, refractory_sec, playing, playhead_pos, time_span_s

    cmd = cmd.strip()
    if not cmd:
        return ""

    parts = cmd.split()
    verb = parts[0].lower()

    try:
        # Parameter setting commands
        if verb == "tau_a" and len(parts) == 2:
            tau_a = float(parts[1])
            return f"✓ tau_a = {format_tau(tau_a)}"
        elif verb == "tau_r" and len(parts) == 2:
            tau_r = float(parts[1])
            return f"✓ tau_r = {format_tau(tau_r)}"
        elif verb == "thr" and len(parts) == 2:
            threshold_lambda = float(parts[1])
            return f"✓ threshold = {threshold_lambda:.2f}σ"
        elif verb == "ref" and len(parts) == 2:
            refractory_sec = float(parts[1])
            return f"✓ refractory = {format_tau(refractory_sec)}"

        # Transport commands
        elif verb == "play":
            playing = True
            return "✓ Playing"
        elif verb == "stop":
            playing = False
            return "✓ Stopped"
        elif verb == "seek" and len(parts) == 2:
            playhead_pos = float(parts[1])
            return f"✓ Seek to {playhead_pos:.3f}s"
        elif verb == "zoom" and len(parts) == 2:
            time_span_s = float(parts[1])
            return f"✓ Zoom = {time_span_s:.3f}s"

        # Info commands
        elif verb == "status":
            return f"pos={playhead_pos:.3f}s τa={format_tau(tau_a)} τr={format_tau(tau_r)} thr={threshold_lambda:.1f}σ"
        elif verb == "help":
            return "Commands: tau_a/tau_r/thr/ref <val> | play/stop | seek/zoom <val> | status | reprocess | clear"

        # Reprocess command
        elif verb == "reprocess":
            trigger_reprocess()
            return "✓ Reprocessing..."

        # Clear CLI output
        elif verb == "clear":
            cli_output.clear()
            return ""

        else:
            return f"? Unknown command: {verb} (type 'help' for commands)"

    except Exception as e:
        return f"✗ Error: {str(e)}"

def draw_cli_page(stdscr, h, w, y_start):
    """Draw CLI interface page (5 rows from bottom)."""
    cli_height = 5

    # Draw CLI box
    try:
        stdscr.addnstr(y_start, 0, "┌─ CLI " + "─" * (w - 8) + "┐", w-1, curses.color_pair(6))
    except: pass

    # Draw output history (top 3 rows)
    output_lines = list(cli_output)[-3:]
    for i, line in enumerate(output_lines):
        y = y_start + 1 + i
        try:
            stdscr.addnstr(y, 1, line[:w-2], w-2)
        except: pass

    # Draw input line (bottom row)
    input_y = y_start + 4
    try:
        stdscr.addnstr(input_y, 0, "└" + "─" * (w - 2) + "┘", w-1, curses.color_pair(6))
    except: pass

    # Draw prompt and input
    prompt = "> "
    if cli_mode:
        # In CLI mode - show cursor
        try:
            stdscr.addnstr(input_y, 1, prompt, w-2, curses.A_BOLD | curses.color_pair(2))
            stdscr.addnstr(input_y, len(prompt) + 1, cli_input[:w-4], w-4)
            # Draw cursor
            cursor_x = len(prompt) + 1 + cli_cursor_pos
            if cursor_x < w - 1:
                stdscr.addch(input_y, cursor_x, ord('_'), curses.A_REVERSE | curses.A_BLINK)
        except: pass
    else:
        # Not in CLI mode - dim prompt
        try:
            stdscr.addnstr(input_y, 1, prompt + "(Press ':' to enter command mode)", w-2, curses.A_DIM)
        except: pass

# ---------- kernel reprocessing ----------
def reprocess_audio_with_kernel():
    """Background thread to reprocess audio with current kernel parameters."""
    global reprocessing, reprocess_status, data_buffer, data_duration

    if not AUDIO_INPUT or not os.path.exists(AUDIO_INPUT):
        with reprocess_lock:
            reprocess_status = "✗ No audio input"
        return

    with reprocess_lock:
        reprocessing = True
        reprocess_status = ""

    try:
        # Create temp output file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp:
            tmp_path = tmp.name

        # Build tscale command with current parameters
        cmd = [
            './tscale',
            '-i', AUDIO_INPUT,
            '-ta', str(tau_a),
            '-tr', str(tau_r),
            '-th', str(threshold_lambda),
            '-ref', str(refractory_sec),
            '-norm', 'l2',
            '-sym',  # Zero-phase
            '-mode', 'iir',
            '-o', tmp_path
        ]

        # Run tscale
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        if result.returncode != 0:
            with reprocess_lock:
                reprocess_status = f"✗ tscale error: {result.stderr[:30]}"
                reprocessing = False
            os.unlink(tmp_path)
            return

        # Load new data
        new_buf = []
        last_t = None

        with open(tmp_path, 'r') as f:
            for line in f:
                rec = parse_line(line)
                if not rec: continue
                t, vs = rec
                if last_t is not None and t < last_t:
                    t = last_t + 1e-12
                last_t = t
                new_buf.append((t, vs))

        # Atomically replace data buffer
        with reprocess_lock:
            data_buffer = new_buf
            if data_buffer:
                data_duration = data_buffer[-1][0] - data_buffer[0][0]
            reprocess_status = "✓ Reprocessed"
            reprocessing = False

        os.unlink(tmp_path)

    except subprocess.TimeoutExpired:
        with reprocess_lock:
            reprocess_status = "✗ Timeout"
            reprocessing = False
    except Exception as e:
        with reprocess_lock:
            reprocess_status = f"✗ Error: {str(e)[:20]}"
            reprocessing = False

def trigger_reprocess():
    """Start reprocessing in background thread."""
    global reprocessing
    with reprocess_lock:
        if reprocessing:
            return  # Already processing
    thread = threading.Thread(target=reprocess_audio_with_kernel, daemon=True)
    thread.start()

# ---------- main draw loop ----------
def draw_scope(stdscr):
    global playing, playhead_pos, time_span_s, use_envelope, show_help
    global tau_a, tau_r, threshold_lambda, refractory_sec
    global last_update_time, pages_visible, cli_mode, cli_input, cli_cursor_pos, cli_output

    stdscr.nodelay(True)
    stdscr.timeout(int(1000/REFRESH_HZ))
    if curses.has_colors():
        curses.start_color()
        for i in range(1, 8): curses.init_pair(i, i, 0)

    # Enable double buffering
    curses.use_default_colors()

    # Load all data first
    load_all_data()

    if not data_buffer:
        raise SystemExit("No data loaded")

    # Add welcome message to CLI
    cli_output.append("SNN Scope CLI - Type 'help' for commands")

    last_update_time = time.time()

    while True:
        # Update playhead if playing
        if playing and data_buffer:
            now = time.time()
            dt = now - last_update_time
            last_update_time = now
            playhead_pos += dt
            # Wrap or stop at end
            if playhead_pos >= data_duration:
                playhead_pos = data_duration
                playing = False

        h, w = stdscr.getmaxyx()

        # Clear screen without causing flicker
        stdscr.erase()

        # Calculate layout
        header_h = 1
        cli_h = 5 if pages_visible[1] else 0  # CLI page height
        footer_h = 1
        available_h = h - header_h - cli_h - footer_h

        # Header - draw to stdscr
        page_indicators = ""
        for i in range(5):
            page_indicators += f"[{i+1}:{'ON' if pages_visible[i] else 'off'}] "
        try:
            stdscr.addnstr(0, 0, header_line(w) + " " + page_indicators, w-1, curses.A_REVERSE)
        except: pass

        # PAGE 1: Oscilloscope view
        if pages_visible[0]:
            signal_h = (SIGNAL_HEIGHT + 1) * MAX_CH
            control_h = 4
            # Respect available height when CLI is visible
            max_scope_h = available_h - control_h
            signal_h = min(signal_h, max_scope_h)
            display_h = header_h + signal_h + control_h

            # Draw channel separators and axes to stdscr
            for ci in range(MAX_CH):
                y_start = header_h + ci * (SIGNAL_HEIGHT + 1)
                try: stdscr.addnstr(y_start, 0, f"{chans[ci].name}", 4)
                except: pass
                for x in range(5, w):
                    try: stdscr.addch(y_start, x, '-', curses.A_DIM)
                    except: pass

            # Window
            left_t, right_t = compute_window()
            if right_t <= left_t: right_t = left_t + 1e-3

            # Render signals to stdscr
            if use_envelope:
                render_envelopes(stdscr, left_t, right_t, w, display_h)
            else:
                render_points(stdscr, left_t, right_t, w, display_h)

            # Control panel (MIDI style) to stdscr
            ctrl_y = header_h + signal_h
            for i, line in enumerate(control_panel_lines()):
                try: stdscr.addnstr(ctrl_y + i, 1, line, w-2)
                except: pass

        # PAGE 2: CLI interface (5 rows from bottom)
        if pages_visible[1]:
            cli_y = h - cli_h - footer_h
            draw_cli_page(stdscr, h, w, cli_y)

        # Footer (channel status) to stdscr
        footer_y = h - 1
        try: stdscr.addnstr(footer_y, 0, channel_status_line(), w-1)
        except: pass

        # Draw help popup if active (draws over everything)
        if show_help:
            draw_help_popup(stdscr, h, w)

        # Manage cursor visibility based on CLI mode
        try:
            if cli_mode:
                curses.curs_set(1)  # Show cursor in CLI mode
            else:
                curses.curs_set(0)  # Hide cursor otherwise
        except:
            pass

        # Refresh screen (double buffer flip happens here with clear())
        stdscr.refresh()

        # Keys - get from stdscr
        c = stdscr.getch()
        if c == -1:
            time.sleep(0.01)
            continue

        # Help toggle (highest priority - works even when help is showing)
        if c in (ord('h'), ord('H'), ord('?')):
            show_help = not show_help
            continue

        # If help is showing, ignore all other keys except help toggle
        if show_help:
            continue

        # CLI mode handling
        if cli_mode:
            if c == 27:  # ESC - exit CLI mode
                cli_mode = False
                cli_input = ""
                cli_cursor_pos = 0
            elif c == 10 or c == curses.KEY_ENTER:  # Enter - execute command
                if cli_input.strip():
                    cli_history.append(cli_input)
                    output = process_cli_command(cli_input)
                    if output:
                        cli_output.append(f"> {cli_input}")
                        cli_output.append(output)
                cli_input = ""
                cli_cursor_pos = 0
            elif c == curses.KEY_BACKSPACE or c == 127 or c == 8:  # Backspace
                if cli_cursor_pos > 0:
                    cli_input = cli_input[:cli_cursor_pos-1] + cli_input[cli_cursor_pos:]
                    cli_cursor_pos -= 1
            elif c == curses.KEY_LEFT:
                cli_cursor_pos = max(0, cli_cursor_pos - 1)
            elif c == curses.KEY_RIGHT:
                cli_cursor_pos = min(len(cli_input), cli_cursor_pos + 1)
            elif c == curses.KEY_HOME:
                cli_cursor_pos = 0
            elif c == curses.KEY_END:
                cli_cursor_pos = len(cli_input)
            elif 32 <= c <= 126:  # Printable characters
                cli_input = cli_input[:cli_cursor_pos] + chr(c) + cli_input[cli_cursor_pos:]
                cli_cursor_pos += 1
            continue

        # Enter CLI mode
        if c == ord(':'):
            cli_mode = True
            cli_input = ""
            cli_cursor_pos = 0
            continue

        # Page toggles (1-5)
        if c in (ord('1'), ord('2'), ord('3'), ord('4'), ord('5')):
            idx = c - ord('1')
            pages_visible[idx] = not pages_visible[idx]
            continue

        # Transport controls (DAW-style)
        if c in (ord('q'), 27):
            return
        elif c == ord(' '):
            playing = not playing
            if playing:
                last_update_time = time.time()
        # Scrubbing controls
        elif c == curses.KEY_LEFT:
            # Scrub backward 1% of duration
            scrub_amount = data_duration * 0.01
            playhead_pos = max(0.0, playhead_pos - scrub_amount)
        elif c == curses.KEY_RIGHT:
            # Scrub forward 1% of duration
            scrub_amount = data_duration * 0.01
            playhead_pos = min(data_duration, playhead_pos + scrub_amount)
        elif c == curses.KEY_SLEFT:
            # Scrub backward 10% of duration
            scrub_amount = data_duration * 0.10
            playhead_pos = max(0.0, playhead_pos - scrub_amount)
        elif c == curses.KEY_SRIGHT:
            # Scrub forward 10% of duration
            scrub_amount = data_duration * 0.10
            playhead_pos = min(data_duration, playhead_pos + scrub_amount)
        elif c == curses.KEY_HOME:
            # Jump to start
            playhead_pos = 0.0
            playing = False
        elif c == curses.KEY_END:
            # Jump to end
            playhead_pos = max(0.0, data_duration - time_span_s)
            playing = False
        # Zoom controls
        elif c in (ord('>'), ord('.')):
            time_span_s = min(data_duration, time_span_s * 1.25)
        elif c in (ord('<'), ord(',')):
            time_span_s = max(0.01, time_span_s / 1.25)
        elif c == ord('o'):
            use_envelope = not use_envelope
        # Channel toggles (F1-F4)
        elif c == curses.KEY_F1:
            chans[0].visible = not chans[0].visible
        elif c == curses.KEY_F2:
            chans[1].visible = not chans[1].visible
        elif c == curses.KEY_F3:
            chans[2].visible = not chans[2].visible
        elif c == curses.KEY_F4:
            chans[3].visible = not chans[3].visible
        # Kernel reprocessing
        elif c == ord('K'):
            trigger_reprocess()
        # SNN kernel parameters (musical semitone scaling for tau)
        elif c == ord('Z'):
            tau_a *= SEMITONE_RATIO
            tau_a = min(tau_a, 0.1)
        elif c == ord('z'):
            tau_a /= SEMITONE_RATIO
            tau_a = max(tau_a, 1e-6)
        elif c == ord('X'):
            tau_r *= SEMITONE_RATIO
            tau_r = min(tau_r, 1.0)
        elif c == ord('x'):
            tau_r /= SEMITONE_RATIO
            tau_r = max(tau_r, tau_a * 1.01)
        elif c == ord('C'):
            threshold_lambda += 0.5
            threshold_lambda = min(threshold_lambda, 20.0)
        elif c == ord('c'):
            threshold_lambda -= 0.5
            threshold_lambda = max(threshold_lambda, 0.5)
        elif c == ord('V'):
            refractory_sec += 0.005
            refractory_sec = min(refractory_sec, 1.0)
        elif c == ord('v'):
            refractory_sec -= 0.005
            refractory_sec = max(refractory_sec, 0.001)
        # Channel gains (ASDF for ch1-4)
        elif c in (ord('a'), ord('A')):
            chans[0].gain *= (1.1 if c == ord('A') else 1 / 1.1)
        elif c in (ord('s'), ord('S')):
            chans[1].gain *= (1.1 if c == ord('S') else 1 / 1.1)
        elif c in (ord('d'), ord('D')):
            chans[2].gain *= (1.1 if c == ord('D') else 1 / 1.1)
        elif c in (ord('f'), ord('F')):
            chans[3].gain *= (1.1 if c == ord('F') else 1 / 1.1)
        # Channel offsets (no conflict with 'q' for quit - use uppercase for positive offset)
        elif c == ord('Q'):
            chans[0].offset += 0.05
        elif c == ord('W'):
            chans[1].offset += 0.05
        elif c == ord('E'):
            chans[2].offset += 0.05
        elif c == ord('R'):
            chans[3].offset += 0.05
        elif c == ord('w'):
            chans[1].offset -= 0.05
        elif c == ord('e'):
            chans[2].offset -= 0.05
        elif c == ord('r'):
            chans[3].offset -= 0.05

# ---------- main ----------
def main():
    signal.signal(signal.SIGINT, lambda *_: sys.exit(0))
    curses.wrapper(draw_scope)

if __name__ == "__main__":
    main()
