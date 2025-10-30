// cc -Wall -Wextra -std=c11 -lncursesw -o biview biview.c
#define _XOPEN_SOURCE 700
#include <locale.h>
#include <ncurses.h>
#include <panel.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>

typedef enum { F_LEFT, F_RIGHT } Focus;

typedef struct {
  int L;   // left list index
  int Rx;  // right cursor x (for future use)
  int Ry;  // right cursor y (line)
} Combo;

#define LNUM 2
#define RNUM 2
static const char *LTABS[LNUM] = {"Files","Search"};
static const char *RTABS[RNUM] = {"Code","Diff"};

static int activeL = 0, activeR = 0;
static Focus focusSide = F_LEFT;
static int depth = 0;
static bool showSummary = false;

static const char *FILES[] = {
  "cmd/tetrad/main.go","internal/core/tasks.go","internal/core/exec.go",
  "pkg/api/router.go","pkg/api/auth.go","README.md"
};
static const int NFILES = (int)(sizeof(FILES)/sizeof(FILES[0]));

static const char *SEARCH[] = {
  "internal/core/exec.go:42: TODO: handle SIGCHLD",
  "pkg/api/router.go:17: registerRoute(\"/deploy\")",
  "cmd/tetrad/main.go:88: // FIXME: context cancel"
};
static const int NSEARCH = (int)(sizeof(SEARCH)/sizeof(SEARCH[0]));

// mock code/diff content (short)
static const char *CODE_main[] = {
  "package main","","import (","  \"context\"","  \"log\"","  \"net/http\"",
  ")","","func main() {","  ctx := context.Background()",
  "  if err := run(ctx); err != nil {","    log.Fatal(err)","  }","}",
};
static const int NCODE_main = (int)(sizeof(CODE_main)/sizeof(CODE_main[0]));

static const char *DIFF_main[] = {
  "diff --git a/cmd/tetrad/main.go b/cmd/tetrad/main.go","@@",
  "- ctx := context.Background()",
  "+ ctx, cancel := context.WithCancel(context.Background())","+ defer cancel()",
};
static const int NDIFF_main = (int)(sizeof(DIFF_main)/sizeof(DIFF_main[0]));

// simple “marks” per-file: store up to 256 lines flags (‘u’ or ‘o’)
typedef struct { int used; int line[256]; int kind[256]; } Marks;
static Marks marks_main = {0};

static Combo combo[LNUM][RNUM]; // per-(left,right) cursors

static inline int clamp(int x, int lo, int hi){ if(x<lo) return lo; if(x>hi) return hi; return x; }
static inline int cycle(int i, int d, int n){ return (i + d + n) % n; }

static const char* current_file(void) {
  Combo cs = combo[activeL][activeR];
  if (activeL == 0) { // Files
    if (NFILES == 0) return "";
    int idx = clamp(cs.L, 0, NFILES-1);
    return FILES[idx];
  } else { // Search → filename before ':'
    if (NSEARCH == 0) return "";
    int idx = clamp(cs.L, 0, NSEARCH-1);
    static char buf[256];
    const char *hit = SEARCH[idx];
    const char *p = strchr(hit, ':');
    size_t n = p ? (size_t)(p - hit) : strlen(hit);
    if (n > sizeof(buf)-1) n = sizeof(buf)-1;
    memcpy(buf, hit, n); buf[n] = 0;
    return buf;
  }
}

static void toggle_mark(Marks *m, int line, int kind) {
  for (int i=0;i<m->used;i++){
    if (m->line[i]==line) {
      if (m->kind[i]==kind) { // toggle off
        memmove(&m->line[i], &m->line[i+1], (m->used-i-1)*sizeof(int));
        memmove(&m->kind[i], &m->kind[i+1], (m->used-i-1)*sizeof(int));
        m->used--; return;
      } else { m->kind[i]=kind; return; }
    }
  }
  if (m->used < 256) { m->line[m->used]=line; m->kind[m->used]=kind; m->used++; }
}

static int next_mark(Marks *m, int from) {
  int best = -1;
  for (int i=0;i<m->used;i++){
    if (m->line[i] > from && (best<0 || m->line[i] < best)) best = m->line[i];
  }
  if (best>=0) return best;
  // wrap
  if (m->used>0) {
    int min = m->line[0];
    for (int i=1;i<m->used;i++) if (m->line[i]<min) min=m->line[i];
    return min;
  }
  return from;
}

static void draw_tabs(WINDOW *win, int w, const char **names, int count, int active, const char *label, bool focused) {
  werase(win);
  wattron(win, A_BOLD);
  mvwprintw(win, 0, 0, "%s", focused ? label : label);
  wattroff(win, A_BOLD);
  wprintw(win, " |");
  int x = 3 + (int)strlen(label);
  for (int i=0;i<count;i++){
    const char *t = names[i];
    if (i==active) wattron(win, A_BOLD | A_UNDERLINE);
    mvwprintw(win, 0, x+1, "%s", t);
    if (i==active) wattroff(win, A_BOLD | A_UNDERLINE);
    x += (int)strlen(t) + 1;
    if (x >= w-1) break;
  }
  wrefresh(win);
}

static void draw_status(WINDOW *win, int w) {
  werase(win);
  Combo cs = combo[activeL][activeR];
  const char *file = current_file();
  const char *fstr = (focusSide==F_LEFT)?"LEFT":"RIGHT";
  mvwprintw(win,0,0,"focus=%s depth=%d summary=%s | L:%s[%d] | R:%s line=%d file=%s",
    fstr, depth, showSummary?"on":"off", LTABS[activeL], cs.L, RTABS[activeR], cs.Ry+1, file?file:"");
  if (w>0) mvwhline(win,1,0,ACS_HLINE,w);
  wrefresh(win);
}

static void draw_left(WINDOW *win, int h, int w) {
  werase(win);
  // header tabs
  WINDOW *ht = derwin(win,1,w,0,0);
  draw_tabs(ht,w,LTABS,LNUM,activeL,"LEFT", focusSide==F_LEFT);
  delwin(ht);

  // body
  int bodyH = h-1;
  int y=0;
  Combo cs = combo[activeL][activeR];
  if (activeL==0) { // Files
    for (int i=0;i<NFILES && y<bodyH;i++,y++){
      if (i==cs.L && focusSide==F_LEFT) wattron(win, A_BOLD);
      mvwprintw(win,1+y,0,"%c %s", (i==cs.L)?'>':' ', FILES[i]);
      if (i==cs.L && focusSide==F_LEFT) wattroff(win, A_BOLD);
    }
  } else { // Search
    for (int i=0;i<NSEARCH && y<bodyH;i++,y++){
      if (i==cs.L && focusSide==F_LEFT) wattron(win, A_BOLD);
      mvwprintw(win,1+y,0,"%c %s", (i==cs.L)?'>':' ', SEARCH[i]);
      if (i==cs.L && focusSide==F_LEFT) wattroff(win, A_BOLD);
    }
  }
  wrefresh(win);
}

static void draw_code_lines(WINDOW *win, int y0, int h, const char **L, int n, int cursor, Marks *mk) {
  int start = cursor - h/2; if (start<0) start=0; if (start>n-h) start = (n>h)?(n-h):0;
  for (int row=0; row<h && (start+row)<n; row++){
    int i = start + row;
    int marked = 0, kind = 0;
    for (int k=0;k<mk->used;k++) if (mk->line[k]==i){ marked=1; kind=mk->kind[k]; break; }
    if (i==cursor) wattron(win, A_BOLD);
    if (marked) waddch(win, kind);
    else waddch(win, ' ');
    wprintw(win, " %3d│ %s", i+1, L[i]);
    if (i==cursor) wattroff(win, A_BOLD);
    if (row<h-1) waddch(win, '\n');
  }
}

static void draw_right(WINDOW *win, int h, int w) {
  werase(win);
  // header tabs
  WINDOW *ht = derwin(win,1,w,0,0);
  draw_tabs(ht,w,RTABS,RNUM,activeR,"RIGHT", focusSide==F_RIGHT);
  delwin(ht);

  int bodyH = h-1;
  Combo cs = combo[activeL][activeR];

  if (showSummary) {
    mvwprintw(win,1,0,"Summary\n———\nLeft:%s Right:%s Depth:%d\nFile:%s",
      LTABS[activeL], RTABS[activeR], depth, current_file());
  } else {
    const char *file = current_file();
    const char **L = CODE_main; int n = NCODE_main;
    const char **D = DIFF_main; int nd = NDIFF_main;
    Marks *mk = &marks_main;
    // crude file switch: only main has content; others empty
    if (strcmp(file,"cmd/tetrad/main.go")!=0) { L = NULL; n = 0; D = NULL; nd = 0; }

    if (activeR==0) { // Code
      if (n==0) mvwprintw(win,1,0,"(empty)"); else { wmove(win,1,0); draw_code_lines(win,1,bodyH,L,n,cs.Ry,mk); }
    } else { // Diff
      if (nd==0) mvwprintw(win,1,0,"(no diff)"); else { wmove(win,1,0); draw_code_lines(win,1,bodyH,D,nd,cs.Ry,mk); }
    }
  }
  wrefresh(win);
}

int main(void) {
  setlocale(LC_ALL,"");
  initscr(); noecho(); cbreak(); keypad(stdscr, TRUE); nodelay(stdscr, FALSE);
  start_color(); use_default_colors();
  curs_set(0);
  // base layout: status (2 rows), then split horizontally
  int H, W; getmaxyx(stdscr, H, W);

  WINDOW *wStatus = newwin(2, W, 0, 0);
  WINDOW *wLeft   = newwin(H-2, W/3, 2, 0);
  WINDOW *wRight  = newwin(H-2, W - (W/3) - 1, 2, W/3 + 1);

  // simple separator
  mvwvline(stdscr, 2, W/3, ACS_VLINE, H-2);
  refresh();

  // main loop
  int ch;
  for(;;){
    // Resize handling
    int h, w; getmaxyx(stdscr, h, w);
    if (h!=H || w!=W) {
      H=h; W=w;
      wresize(wStatus,2,W); mvwin(wStatus,0,0);
      wresize(wLeft,H-2,W/3); mvwin(wLeft,2,0);
      wresize(wRight,H-2,W - (W/3) - 1); mvwin(wRight,2,W/3 + 1);
      werase(stdscr); mvwvline(stdscr, 2, W/3, ACS_VLINE, H-2); refresh();
    }

    draw_status(wStatus, W);
    draw_left(wLeft, H-2, W/3);
    draw_right(wRight, H-2, W - (W/3) - 1);

    ch = getch();
    if (ch == ERR) continue;

    switch (ch) {
      case 3: // Ctrl-C
        endwin(); return 0;

      // focus and tabs
      case '\t': // Tab: cycle tabs within focused pane
        if (focusSide==F_LEFT) activeL = cycle(activeL,+1,LNUM);
        else activeR = cycle(activeR,+1,RNUM);
        break;
      case KEY_BTAB: // Shift-Tab: switch focus
        focusSide = (focusSide==F_LEFT)?F_RIGHT:F_LEFT;
        break;
      case '1': // same as Tab
        if (focusSide==F_LEFT) activeL = cycle(activeL,+1,LNUM);
        else activeR = cycle(activeR,+1,RNUM);
        break;
      case '2': // same as Shift-Tab
        focusSide = (focusSide==F_LEFT)?F_RIGHT:F_LEFT;
        break;

      // depth / summary
      case 'e': depth++; break;
      case 'q': if (depth==0) { endwin(); return 0; } depth--; break;
      case 'h': showSummary = !showSummary; break;

      // LEFT controls: a,w,s,d
      case 'a': activeL = cycle(activeL,-1,LNUM); break;
      case 'd': activeL = cycle(activeL,+1,LNUM); break;
      case 'w': {
        Combo *cs = &combo[activeL][activeR];
        int n = (activeL==0)?NFILES:NSEARCH;
        cs->L = clamp(cs->L-1, 0, (n>0?n-1:0));
      } break;
      case 's': {
        Combo *cs = &combo[activeL][activeR];
        int n = (activeL==0)?NFILES:NSEARCH;
        cs->L = clamp(cs->L+1, 0, (n>0?n-1:0));
      } break;

      // RIGHT controls: i(up), k(down), j(left), l(right)
      case 'i': {
        Combo *cs = &combo[activeL][activeR];
        cs->Ry = (cs->Ry>0)?cs->Ry-1:0;
      } break;
      case 'k': {
        Combo *cs = &combo[activeL][activeR];
        cs->Ry = cs->Ry + 1; // clamped visually by draw
      } break;
      case 'j': { Combo *cs=&combo[activeL][activeR]; cs->Rx = (cs->Rx>0)?cs->Rx-1:0; } break;
      case 'l': { Combo *cs=&combo[activeL][activeR]; cs->Rx = cs->Rx+1; } break;

      // right hotkeys: u/o toggle marks, p next, m clear
      case 'u': {
        Combo *cs = &combo[activeL][activeR];
        toggle_mark(&marks_main, cs->Ry, 'u');
      } break;
      case 'o': {
        Combo *cs = &combo[activeL][activeR];
        toggle_mark(&marks_main, cs->Ry, 'o');
      } break;
      case 'p': {
        Combo *cs = &combo[activeL][activeR];
        cs->Ry = next_mark(&marks_main, cs->Ry);
      } break;
      case 'm': marks_main.used = 0; break;

      default: break;
    }
  }
}
