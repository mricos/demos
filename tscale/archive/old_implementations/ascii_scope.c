// ascii_scope.c — 4-channel ASCII oscilloscope reading a Unix FIFO (or stdin)
// Input lines:  t ch1 ch2 ch3 ch4   (>=2 columns; whitespace-separated)
//
// Build (macOS/Linux):
//   cc -std=c11 -O2 -Wall -Wextra -pedantic -o ascii_scope ascii_scope.c
//
// Run:
//   mkfifo /tmp/scope.fifo
//   ./ascii_scope /tmp/scope.fifo
//   # generator (example):
//   awk 'BEGIN{t=0}
//        {t+=0.0005; printf("%.9f\t%+.6f\t%+.6f\t%+.6f\t%d\n",
//                           t, sin(t*20), 0.5*cos(t*33),
//                           0.3*sin(t*7)+0.2*cos(t*11), (sin(t*5)>0)); fflush();}'
//        </dev/zero > /tmp/scope.fifo
//
// Keys:
//   q/ESC  quit      space   run/stop         </>      time span ±
//   m      auto-span toggle  o        envelope/points  t        trigger on/off
//   g      next trig ch      +/-      trig level ±     r/f/e    rising/falling/either
//   1..4   toggle channel    A/S/D/F  gain↑ ch1..4     a/s/d/f  gain↓ ch1..4
//   z/x/c/v offset↑ ch1..4   Z/X/C/V  offset↓ ch1..4
//
// Notes:
// - Pure ANSI TTY; no ncurses. POSIX select(2) + nonblocking FIFO.
// - Envelope renderer (per-column min/max) avoids single-column pileups.
// - Auto time-span uses median Δt of recent samples to distribute across columns.

#define _POSIX_C_SOURCE 200809L
#include <errno.h>
#include <fcntl.h>
#include <math.h>
#include <signal.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>
#include <sys/ioctl.h>
#include <limits.h>
#include <sys/select.h>
#include <termios.h>
#include <time.h>
#include <unistd.h>

#ifndef ARRAY_LEN
#define ARRAY_LEN(a) ((int)(sizeof(a)/sizeof((a)[0])))
#endif

// ---------- configuration ----------
enum { MAX_CH = 4 };
static const double REFRESH_HZ   = 30.0;
static const double HIST_SEC_MIN = 2.0;
static const double DEFAULT_SPAN = 0.250; // seconds across screen
static const double STACK_FRAC   = 0.45;  // vertical scale per lane
static const double TRIG_POS_FR  = 0.25;  // trigger position fraction

// ---------- terminal ----------
static struct termios term_orig;
static bool term_raw_set = false;

static void die(const char *fmt, ...) __attribute__((noreturn,format(printf,1,2)));
static void die(const char *fmt, ...) {
  va_list ap; va_start(ap, fmt);
  vfprintf(stderr, fmt, ap);
  va_end(ap);
  if (term_raw_set) {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &term_orig);
    fprintf(stderr, "\x1b[?25h"); // show cursor
  }
  fputc('\n', stderr);
  exit(EXIT_FAILURE);
}

static void term_raw(void) {
  if (tcgetattr(STDIN_FILENO, &term_orig) == -1) die("tcgetattr: %s", strerror(errno));
  struct termios raw = term_orig;
  raw.c_lflag &= ~(ECHO | ICANON | IEXTEN | ISIG);
  raw.c_iflag &= ~(IXON | ICRNL | BRKINT | INPCK | ISTRIP);
  raw.c_cflag |=  (CS8);
  raw.c_oflag &= ~(OPOST);
  raw.c_cc[VMIN]  = 0;
  raw.c_cc[VTIME] = 0;
  if (tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw) == -1) die("tcsetattr: %s", strerror(errno));
  term_raw_set = true;
  // hide cursor
  printf("\x1b[?25l");
  fflush(stdout);
}

static void term_restore(void) {
  if (term_raw_set) {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &term_orig);
    term_raw_set = false;
  }
  // show cursor
  printf("\x1b[?25h");
  fflush(stdout);
}

static void sigint_handler(int sig) {
  (void)sig;
  term_restore();
  // move cursor below
  printf("\x1b[H\x1b[J");
  _exit(0);
}

static void get_winsz(int *rows, int *cols) {
  struct winsize ws;
  if (ioctl(STDOUT_FILENO, TIOCGWINSZ, &ws) == 0 && ws.ws_row >= 8 && ws.ws_col >= 40) {
    *rows = ws.ws_row - 2; // leave footer line
    *cols = ws.ws_col;
  } else {
    *rows = 24 - 2;
    *cols = 80;
  }
  if (*rows < 10) *rows = 10;
  if (*cols < 40) *cols = 80;
}

// ---------- ring buffer ----------
typedef struct {
  double t;
  double v[MAX_CH];
  int n; // number of values present in v[]
} Sample;

#define BUF_CAP 300000
static Sample *buf = NULL;
static int bhead = 0;   // number of valid samples

static void buf_push(double t, double *vals, int nvals) {
  if (bhead < BUF_CAP) {
    buf[bhead].t = t;
    buf[bhead].n = nvals > MAX_CH ? MAX_CH : nvals;
    for (int i=0; i<buf[bhead].n; ++i) buf[bhead].v[i] = vals[i];
    bhead++;
  } else {
    // slide window left by one (O(N)); acceptable for console tool at modest N
    memmove(buf, buf+1, (BUF_CAP-1)*sizeof(Sample));
    buf[BUF_CAP-1].t = t;
    buf[BUF_CAP-1].n = nvals > MAX_CH ? MAX_CH : nvals;
    for (int i=0; i<buf[BUF_CAP-1].n; ++i) buf[BUF_CAP-1].v[i] = vals[i];
  }
}

static void buf_trim_left(double cut_t) {
  int i=0;
  while (i<bhead && buf[i].t < cut_t) i++;
  if (i>0) {
    memmove(buf, buf+i, (bhead - i)*sizeof(Sample));
    bhead -= i;
  }
}

// ---------- input (FIFO/stdin) ----------
static int data_fd = -1;
static bool is_stdin = false;
static double last_t_seen = NAN;

static void open_input(const char *path) {
  if (!path || strcmp(path, "-")==0 || strcmp(path, "/dev/stdin")==0) {
    data_fd = STDIN_FILENO;
    is_stdin = true;
  } else {
    data_fd = open(path, O_RDONLY | O_NONBLOCK);
    if (data_fd < 0) die("open(%s): %s", path, strerror(errno));
  }
  // make nonblocking
  int fl = fcntl(data_fd, F_GETFL);
  fcntl(data_fd, F_SETFL, fl | O_NONBLOCK);
}

static int read_into_buffer(void) {
  char tmp[65536];
  ssize_t n = read(data_fd, tmp, sizeof(tmp)-1);
  if (n <= 0) {
    if (!is_stdin && (n==0 || errno==EAGAIN)) {
      // for FIFOs, writer close -> re-open
      if (n==0) {
        close(data_fd);
        usleep(10000);
        // caller must re-open with known path; we skip here (simple)
      }
    }
    return 0;
  }
  tmp[n] = '\0';
  char *saveptr = NULL;
  char *line = strtok_r(tmp, "\n", &saveptr);
  int added = 0;
  while (line) {
    // parse: t v1 v2 v3 v4
    char *p = line;
    char *endp = NULL;
    double t = strtod(p, &endp);
    if (endp != p) {
      double vals[MAX_CH]={0};
      int nvals=0;
      p = endp;
      for (int i=0; i<MAX_CH; ++i) {
        while (*p==' '||*p=='\t') p++;
        if (*p=='\0') break;
        vals[nvals] = strtod(p, &endp);
        if (endp==p) break;
        nvals++;
        p = endp;
      }
      if (nvals >= 1) {
        if (!isnan(last_t_seen) && t < last_t_seen) t = last_t_seen + 1e-12;
        last_t_seen = t;
        buf_push(t, vals, nvals);
        added++;
      }
    }
    line = strtok_r(NULL, "\n", &saveptr);
  }
  // trim
  if (added>0 && !isnan(last_t_seen)) {
    double cutoff = last_t_seen - fmax(HIST_SEC_MIN, 5.0*DEFAULT_SPAN);
    buf_trim_left(cutoff);
  }
  return added;
}

// ---------- state / params ----------
static bool run_flag = true;
static double time_span = DEFAULT_SPAN;
static bool auto_span = true;

static bool trig_enabled = false;
static int  trig_ch = 1;      // 1-based
static double trig_lvl = 0.0;
static int  trig_edge = +1;   // +1 rising, -1 falling, 0 either
static double trig_hyst = 1e-9;

static bool use_envelope = true;
static bool ch_visible[MAX_CH] = { true, true, true, true };
static double ch_gain[MAX_CH]  = { 1.0, 1.0, 1.0, 1.0 };
static double ch_offs[MAX_CH]  = { 0.0, 0.0, 0.0, 0.0 };

// ---------- helpers ----------
static double monotime_s(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return (double)ts.tv_sec + 1e-9*ts.tv_nsec;
}

// qsort comparator for double
static int cmpd(const void *a, const void *b) {
  double da = *(const double *)a;
  double db = *(const double *)b;
  return (da > db) - (da < db);
}

static double median_dt_recent(void) {
  if (bhead < 6) return NAN;
  int a = bhead - 200; if (a < 1) a = 1;
  int m = bhead - a;
  if (m <= 2) return NAN;
  double *dts = malloc((size_t)m*sizeof(double));
  if (!dts) return NAN;
  int k=0;
  for (int i=a; i<bhead; ++i) {
    double dt = buf[i].t - buf[i-1].t;
    if (dt > 0) dts[k++] = dt;
  }
  if (k==0) { free(dts); return NAN; }
  qsort(dts, (size_t)k, sizeof(double), cmpd);
  double med = dts[k/2];
  free(dts);
  return med;
}

static void header_line(char *dst, size_t cap) {
  const char *run_s = run_flag ? "ON" : "OFF";
  const char *auto_s = auto_span ? "ON" : "OFF";
  const char *trig_s = trig_enabled ? "ON" : "OFF";
  const char *edge_s = (trig_edge>0? "+": (trig_edge<0? "-": "+/-"));
  snprintf(dst, cap,
    "[q] quit  [space] run=%s  [</>] span=%.3fs  [m] auto=%s  "
    "[t] trig=%s ch=%d lvl=%+.3g edge=%s  [o] env/pts",
    run_s, time_span, auto_s, trig_s, trig_ch, trig_lvl, edge_s);
}

static int map_row(double val, int rows, int ci /*0-based*/) {
  double sep = (double)rows / (MAX_CH + 1);
  double mid = (ci+1)*sep;
  double y   = floor(mid - val*(sep*STACK_FRAC) + 0.5);
  int iy = (int)y;
  if (iy < 1)       iy = 1;
  if (iy > rows-1)  iy = rows-1;
  return iy;
}

static void compute_window(double *left_t, double *right_t, int cols) {
  double nowt = monotime_s();
  if (bhead == 0) { *left_t = nowt - time_span; *right_t = nowt; return; }

  // trigger search (recent)
  if (trig_enabled && trig_ch >= 1 && trig_ch <= MAX_CH) {
    double lo = trig_lvl - trig_hyst, hi = trig_lvl + trig_hyst;
    double lower = buf[bhead-1].t - 5.0*time_span;
    for (int i=bhead-1; i>0; --i) {
      if (buf[i].t < lower) break;
      if (buf[i  ].n >= trig_ch && buf[i-1].n >= trig_ch) {
        double v2 = ch_gain[trig_ch-1]*buf[i  ].v[trig_ch-1] + ch_offs[trig_ch-1];
        double v1 = ch_gain[trig_ch-1]*buf[i-1].v[trig_ch-1] + ch_offs[trig_ch-1];
        bool cross =
          (trig_edge>0 && (v1<=lo && v2>=hi)) ||
          (trig_edge<0 && (v1>=hi && v2<=lo)) ||
          (trig_edge==0 && ((v1<=lo && v2>=hi) || (v1>=hi && v2<=lo)));
        if (cross) {
          *left_t  = buf[i].t - TRIG_POS_FR*time_span;
          *right_t = *left_t + time_span;
          return;
        }
      }
    }
  }

  // auto-span: target ~0.8*columns buckets
  if (auto_span && bhead > 4) {
    double dt = median_dt_recent();
    if (!isnan(dt) && dt > 0) {
      int target_cols = (int)fmax(10.0, floor(0.8 * fmax(2.0, (double)cols)));
      double span = fmax(5.0*dt, target_cols * dt);
      if (span < 0.005) span = 0.005;
      if (span > 60.0)  span = 60.0;
      time_span = span;
    }
  }
  *right_t = buf[bhead-1].t;
  *left_t  = *right_t - time_span;
}

// ---------- drawing ----------
static void cls(void){ printf("\x1b[2J"); }
static void cup(int r, int c){ printf("\x1b[%d;%dH", r, c); }
static void rev_on(void){ printf("\x1b[7m"); }
static void rev_off(void){ printf("\x1b[27m"); }

static void draw_envelope(int rows, int cols, double left_t, double right_t) {
  int plot_cols = cols - 2; // leave y-axis at col 1 and '>' at last
  if (plot_cols < 2) return;
  double span = right_t - left_t; if (span <= 1e-12) span = 1e-12;

  // per-channel pass: bin to columns
  for (int ci=0; ci<MAX_CH; ++ci) {
    if (!ch_visible[ci]) continue;
    int *ymin = calloc((size_t)cols, sizeof(int));
    int *ymax = calloc((size_t)cols, sizeof(int));
    if (!ymin || !ymax) { free(ymin); free(ymax); return; }
    for (int i=0; i<cols; ++i) { ymin[i]=INT_MAX; ymax[i]=INT_MIN; }

    for (int i=0; i<bhead; ++i) {
      double t = buf[i].t;
      if (t < left_t || t > right_t) continue;
      if (buf[i].n <= ci) continue;
      double xf = (plot_cols-1) * (t - left_t) / span;
      int x = 2 + (int)llround(xf);
      if (x < 2 || x > cols-1) continue;
      double yv = ch_gain[ci]*buf[i].v[ci] + ch_offs[ci];
      int y = map_row(yv, rows, ci);
      if (y < ymin[x]) ymin[x] = y;
      if (y > ymax[x]) ymax[x] = y;
    }
    for (int x=2; x<=cols-1; ++x) {
      if (ymin[x] == INT_MAX) continue;
      for (int y=ymin[x]; y<=ymax[x]; ++y) { cup(y,x); putchar('|'); }
      if (ymin[x] == ymax[x]) { cup(ymin[x], x); putchar('*'); }
    }
    free(ymin); free(ymax);
  }
}

static void draw_points(int rows, int cols, double left_t, double right_t) {
  int plot_cols = cols - 2;
  if (plot_cols < 2) return;
  double span = right_t - left_t; if (span <= 1e-12) span = 1e-12;

  for (int ci=0; ci<MAX_CH; ++ci) {
    if (!ch_visible[ci]) continue;
    int lastx=-1, lasty=-1;
    for (int i=0; i<bhead; ++i) {
      double t = buf[i].t;
      if (t < left_t || t > right_t) continue;
      if (buf[i].n <= ci) continue;
      double xf = 1 + (plot_cols) * (t - left_t) / span;
      int x = (int)llround(xf);
      if (x < 2 || x > cols-1) continue;
      double yv = ch_gain[ci]*buf[i].v[ci] + ch_offs[ci];
      int y = map_row(yv, rows, ci);
      cup(y,x); putchar('*');
      if (lastx>=0 && x>lastx) {
        int dx = x - lastx, dy = y - lasty;
        for (int k=1; k<dx; ++k) {
          int xi = lastx + k;
          int yi = lasty + (dy*k)/dx;
          if (xi>=2 && xi<=cols-1 && yi>=1 && yi<=rows-1) { cup(yi,xi); putchar('.'); }
        }
      }
      lastx = x; lasty = y;
    }
  }
}

static void draw_frame(int rows, int cols, double left_t, double right_t) {
  // header
  char hdr[256]; header_line(hdr, sizeof(hdr));
  cup(1,1); rev_on(); printf("%-*.*s", cols, cols, hdr); rev_off();

  // axes
  for (int y=2; y<=rows; ++y) { cup(y,1); putchar('|'); }
  cup(rows+1,1); putchar('+'); for (int i=0;i<cols-2;++i) putchar('-'); putchar('>');

  // plot
  if (use_envelope) draw_envelope(rows, cols, left_t, right_t);
  else              draw_points  (rows, cols, left_t, right_t);

  // footer: channel meta
  cup(rows,3);
  for (int i=0;i<MAX_CH;++i) {
    printf("ch%d:%s g=%.3g off=%+.3g  ", i+1, ch_visible[i]?"on":"off", ch_gain[i], ch_offs[i]);
  }
}

// ---------- key handling ----------
static int read_key_nonblock(void) {
  unsigned char c;
  ssize_t n = read(STDIN_FILENO, &c, 1);
  if (n == 1) return (int)c;
  return -1;
}

static void handle_key(int c) {
  if (c == ' ') run_flag = !run_flag;
  else if (c == 'q' || c == 27 /*ESC*/) { term_restore(); printf("\n"); exit(0); }
  else if (c == '>' || c == '.') time_span = fmin(60.0, time_span*1.25);
  else if (c == '<' || c == ',') time_span = fmax(0.005, time_span/1.25);
  else if (c == 'm') auto_span = !auto_span;
  else if (c == 'o') use_envelope = !use_envelope;
  else if (c == 't') trig_enabled = !trig_enabled;
  else if (c == 'g') trig_ch = 1 + (trig_ch % MAX_CH);
  else if (c == '+' || c == '=') trig_lvl += 0.05;
  else if (c == '-') trig_lvl -= 0.05;
  else if (c == 'r') trig_edge = +1;
  else if (c == 'f') trig_edge = -1;
  else if (c == 'e') trig_edge = 0;
  else if (c >= '1' && c <= '4') ch_visible[c-'1'] = !ch_visible[c-'1'];
  else if (c == 'A') ch_gain[0] *= 1.1; else if (c == 'a') ch_gain[0] /= 1.1;
  else if (c == 'S') ch_gain[1] *= 1.1; else if (c == 's') ch_gain[1] /= 1.1;
  else if (c == 'D') ch_gain[2] *= 1.1; else if (c == 'd') ch_gain[2] /= 1.1;
  else if (c == 'F') ch_gain[3] *= 1.1; else if (c == 'f') ch_gain[3] /= 1.1;
  else if (c == 'z') ch_offs[0] += 0.05; else if (c == 'Z') ch_offs[0] -= 0.05;
  else if (c == 'x') ch_offs[1] += 0.05; else if (c == 'X') ch_offs[1] -= 0.05;
  else if (c == 'c') ch_offs[2] += 0.05; else if (c == 'C') ch_offs[2] -= 0.05;
  else if (c == 'v') ch_offs[3] += 0.05; else if (c == 'V') ch_offs[3] -= 0.05;
}

// ---------- main ----------
int main(int argc, char **argv) {
  const char *path = (argc > 1) ? argv[1] : "/tmp/scope.fifo";

  signal(SIGINT, sigint_handler);
  atexit(term_restore);

  buf = calloc(BUF_CAP, sizeof(Sample));
  if (!buf) die("alloc");

  open_input(path);
  term_raw();

  // clear and home
  printf("\x1b[2J\x1b[H");

  const double frame_dt = 1.0 / REFRESH_HZ;

  for (;;) {
    int rows, cols; get_winsz(&rows, &cols);

    // pump data
    if (run_flag) {
      (void)read_into_buffer();
    }

    // compute window
    double left_t, right_t;
    compute_window(&left_t, &right_t, cols-2);
    if (right_t <= left_t) right_t = left_t + 1e-3;

    // draw
    printf("\x1b[H\x1b[J"); // clear
    draw_frame(rows, cols, left_t, right_t);
    fflush(stdout);

    // keys
    int c = read_key_nonblock();
    if (c != -1) handle_key(c);

    // sleep
    struct timespec ts;
    ts.tv_sec = (time_t)0;
    ts.tv_nsec = (long)(frame_dt * 1e9);
    nanosleep(&ts, NULL);
  }
  return 0;
}

