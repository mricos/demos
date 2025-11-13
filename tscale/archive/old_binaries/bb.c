// bb.c — Two-oscillator binaural tone with independent panning, semitone/cent steps, and “fake MIDI CC” keys (miniaudio)
// Build (macOS/Linux):
//   clang -std=c11 -O3 -o bb bb.c -lm
//   // optionally: add -Wno-deprecated-declarations on macOS 12+
//
// Key layout (requested):
//   Sliders 1–8 (down/up): z s | x d | c f | v g | b h | n j | m k | , l
//     1: base Hz  −/+    (z/s)     : ±1 Hz ; with Shift (Z/S): ×/÷ 2^(1/12)  (semitone)
//     2: base Hz  −/+    (x/d)     : ±1 Hz ; with Shift (X/D): ×/÷ 2^(1/12)
//     3: offset Hz −/+   (c/f)     : ±1 Hz ; with Shift (C/F): ×/÷ 2^(1/12)
//     4: offset Hz −/+   (v/g)     : ±1 Hz ; with Shift (V/G): ×/÷ 2^(1/12)
//     5: pan1      L/R   (b/h)     : ±0.05; Shift (B/H): ±0.20
//     6: pan2      L/R   (n/j)     : ±0.05; Shift (N/J): ±0.20
//     7: LFO rate  −/+   (m/k)     : ±0.05 Hz; Shift (M/K): ±0.5 Hz, floor 0
//     8: LFO depth (off) −/+ (,/l) : ±0.10 Hz dev; Shift </L: ±0.5 Hz dev, floor 0
//   Knobs 1–8 (right/left): e E | r R | t T | y Y | u U | i I | o O | p P
//     1: base ×2^(±1/60)       (e/E)     // micro pitch (≈20 cents)
//     2: offset ×2^(±1/60)     (r/R)
//     3: pan1  micro ±0.02     (t/T)
//     4: pan2  micro ±0.02     (y/Y)
//     5: LFO depth base Hz dev (u/U) ±0.02, floor 0
//     6: LFO rate  Hz          (i/I) ±0.01, floor 0
//     7: volume                (o/O) ±0.01, clamp [0,1]
//     8: master pan both       (p/P) ±0.02 to p1 and p2, clamp [−1,1]
//   Quit: ';'
//
// Model:
//   f1 = base_hz + d1*sin(φ_lfo), f2 = (base_hz + offset_hz) + d2*sin(φ_lfo).
//   Independent equal-power panning per osc: p1→(gL1,gR1), p2→(gL2,gR2). Output: L=vol*(gL1*s1+gL2*s2), R=vol*(gR1*s1+gR2*s2).

#define _POSIX_C_SOURCE 200809L
#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <stdatomic.h>
#include <string.h>
#include <unistd.h>
#include <termios.h>
#include <fcntl.h>
#include <signal.h>

#define MINIAUDIO_IMPLEMENTATION
#include "miniaudio.h"

typedef struct {
    _Atomic double base_hz;
    _Atomic double offset_hz;
    _Atomic double volume;        // [0,1]
    _Atomic double pan1;          // [-1,1]
    _Atomic double pan2;          // [-1,1]
    _Atomic double lfo_rate;      // Hz
    _Atomic double lfo_depth_base;// Hz deviation on f1
    _Atomic double lfo_depth_off; // Hz deviation on f2
    double fs;
    double ph1, ph2;
    double lfo_ph;
} synth_t;

static struct termios g_orig_termios;
static ma_device g_dev;
static volatile sig_atomic_t g_run = 1;

static void tty_raw(void){
    tcgetattr(STDIN_FILENO, &g_orig_termios);
    struct termios raw = g_orig_termios;
    raw.c_lflag &= ~(ICANON | ECHO);
    raw.c_cc[VMIN]=0; raw.c_cc[VTIME]=0;
    tcsetattr(STDIN_FILENO, TCSANOW, &raw);
    fcntl(STDIN_FILENO, F_SETFL, O_NONBLOCK);
}
static void tty_restore(void){ tcsetattr(STDIN_FILENO, TCSANOW, &g_orig_termios); }
static void on_signal(int sig){ (void)sig; g_run = 0; }

static inline double clamp(double x, double lo, double hi){ return x<lo?lo:(x>hi?hi:x); }

static inline void pan_gains(double pan, float* gl, float* gr){
    double theta = (pan + 1.0) * (M_PI/4.0); // −1..+1 → 0..π/2
    *gl = (float)cos(theta);
    *gr = (float)sin(theta);
}

static void print_banner(void){
    fprintf(stderr, "\033[2J\033[H"); // clear + home
    fprintf(stderr, "Fake MIDI CC keys:\n");
    fprintf(stderr, "  Sliders: z/s x/d c/f v/g  b/h n/j  m/k  ,/l   (Shift = semitone or coarse)\n");
    fprintf(stderr, "  Knobs:   e/E r/R t/T y/Y  u/U i/I  o/O  p/P   (micro; base/offset pitch ×2^(±1/60))\n");
    fprintf(stderr, "  Quit: ';'\n\n");
}

static void print_state(const synth_t* s){
    double f1   = atomic_load_explicit(&((synth_t*)s)->base_hz, memory_order_relaxed);
    double off  = atomic_load_explicit(&((synth_t*)s)->offset_hz, memory_order_relaxed);
    double vol  = atomic_load_explicit(&((synth_t*)s)->volume, memory_order_relaxed);
    double p1   = atomic_load_explicit(&((synth_t*)s)->pan1, memory_order_relaxed);
    double p2   = atomic_load_explicit(&((synth_t*)s)->pan2, memory_order_relaxed);
    double lr   = atomic_load_explicit(&((synth_t*)s)->lfo_rate, memory_order_relaxed);
    double d1   = atomic_load_explicit(&((synth_t*)s)->lfo_depth_base, memory_order_relaxed);
    double d2   = atomic_load_explicit(&((synth_t*)s)->lfo_depth_off,  memory_order_relaxed);

    fprintf(stderr, "\033[H"); // home
    fprintf(stderr, "p1=%.2f  p2=%.2f    vol=%.2f\n", p1, p2, vol);
    fprintf(stderr, "f1=%.3f Hz   f2=%.3f Hz   off=%.3f Hz\n", f1, f1+off, off);
    fprintf(stderr, "LFO=%.3f Hz   d1=%.3f Hz   d2=%.3f Hz\n", lr, d1, d2);
    fprintf(stderr, "\n");
    fflush(stderr);
}

static void audio_cb(ma_device* dev, void* out, const void* in, ma_uint32 frames){
    (void)in;
    synth_t* s = (synth_t*)dev->pUserData;
    float* o = (float*)out;

    const double fs   = s->fs;
    const double vol  = clamp(atomic_load_explicit(&s->volume, memory_order_relaxed), 0.0, 1.0);
    const double base = atomic_load_explicit(&s->base_hz,   memory_order_relaxed);
    const double off  = atomic_load_explicit(&s->offset_hz, memory_order_relaxed);
    const double p1   = clamp(atomic_load_explicit(&s->pan1, memory_order_relaxed), -1.0, 1.0);
    const double p2   = clamp(atomic_load_explicit(&s->pan2, memory_order_relaxed), -1.0, 1.0);
    const double lr   = fmax(atomic_load_explicit(&s->lfo_rate, memory_order_relaxed), 0.0);
    const double d1   = fmax(atomic_load_explicit(&s->lfo_depth_base, memory_order_relaxed), 0.0);
    const double d2   = fmax(atomic_load_explicit(&s->lfo_depth_off,  memory_order_relaxed), 0.0);

    float gl1, gr1, gl2, gr2;
    pan_gains(p1, &gl1, &gr1);
    pan_gains(p2, &gl2, &gr2);

    double ph1 = s->ph1, ph2 = s->ph2, lph = s->lfo_ph;
    const double dph_lfo = 2.0*M_PI*lr/fs;

    for (ma_uint32 n=0; n<frames; n++){
        double lfo = sin(lph);
        double f1 = base + d1*lfo;
        double f2 = (base + off) + d2*lfo;

        double dph1 = 2.0*M_PI*f1/fs;
        double dph2 = 2.0*M_PI*f2/fs;

        float s1 = (float)sin(ph1);
        float s2 = (float)sin(ph2);

        o[2*n+0] = (float)(vol * (gl1*s1 + gl2*s2));
        o[2*n+1] = (float)(vol * (gr1*s1 + gr2*s2));

        ph1 += dph1; if (ph1 >= 2.0*M_PI) ph1 -= 2.0*M_PI;
        ph2 += dph2; if (ph2 >= 2.0*M_PI) ph2 -= 2.0*M_PI;
        lph += dph_lfo; if (lph >= 2.0*M_PI) lph -= 2.0*M_PI;
    }
    s->ph1 = ph1; s->ph2 = ph2; s->lfo_ph = lph;
}

int main(void){
    synth_t S;
    atomic_store_explicit(&S.base_hz,        220.0, memory_order_relaxed);
    atomic_store_explicit(&S.offset_hz,        5.0, memory_order_relaxed);
    atomic_store_explicit(&S.volume,           0.2, memory_order_relaxed);
    atomic_store_explicit(&S.pan1,             0.0, memory_order_relaxed);
    atomic_store_explicit(&S.pan2,             0.0, memory_order_relaxed);
    atomic_store_explicit(&S.lfo_rate,         0.2, memory_order_relaxed);
    atomic_store_explicit(&S.lfo_depth_base,   0.0, memory_order_relaxed);
    atomic_store_explicit(&S.lfo_depth_off,    0.0, memory_order_relaxed);
    S.ph1=0.0; S.ph2=0.0; S.lfo_ph=0.0;

    ma_device_config cfg = ma_device_config_init(ma_device_type_playback);
    cfg.playback.format   = ma_format_f32;
    cfg.playback.channels = 2;
    cfg.sampleRate        = 0;
    cfg.dataCallback      = audio_cb;
    cfg.pUserData         = &S;

    if (ma_device_init(NULL, &cfg, &g_dev) != MA_SUCCESS){ fprintf(stderr,"Failed to init audio device.\n"); return 1; }
    S.fs = (double)g_dev.sampleRate;
    if (ma_device_start(&g_dev) != MA_SUCCESS){ fprintf(stderr,"Failed to start audio device.\n"); ma_device_uninit(&g_dev); return 1; }

    tty_raw(); atexit(tty_restore);
    struct sigaction sa; memset(&sa,0,sizeof(sa)); sa.sa_handler=on_signal;
    sigaction(SIGINT,&sa,NULL); sigaction(SIGTERM,&sa,NULL);

    print_banner();
    print_state(&S);

    // Step constants
    const double HZ_STEP     = 1.0;
    const double SEMI_UP     = pow(2.0,  1.0/12.0);
    const double SEMI_DOWN   = 1.0/SEMI_UP;
    const double CENT60_UP   = pow(2.0,  1.0/60.0);  // ≈ 20 cents
    const double CENT60_DOWN = 1.0/CENT60_UP;

    const double PAN_STEP    = 0.05;
    const double PAN_COARSE  = 0.20;
    const double PAN_MICRO   = 0.02;

    const double LFOR_STEP   = 0.05;
    const double LFOR_COARSE = 0.50;
    const double LFOR_MICRO  = 0.01;

    const double LFD_STEP    = 0.10;
    const double LFD_COARSE  = 0.50;
    const double LFD_MICRO   = 0.02;

    const double VOL_MICRO   = 0.01;

    while (g_run){
        char ch; ssize_t r = read(STDIN_FILENO, &ch, 1);
        if (r==1){
            switch (ch){
                // Sliders base: ±1 Hz; Shift → semitone
                case 'z': { double f=atomic_load_explicit(&S.base_hz, memory_order_relaxed)-HZ_STEP; atomic_store_explicit(&S.base_hz, f<1.0?1.0:f, memory_order_relaxed);} break;
                case 's': { double f=atomic_load_explicit(&S.base_hz, memory_order_relaxed)+HZ_STEP; atomic_store_explicit(&S.base_hz, f, memory_order_relaxed);} break;
                case 'Z': { double f=atomic_load_explicit(&S.base_hz, memory_order_relaxed)/SEMI_UP; atomic_store_explicit(&S.base_hz, f<1.0?1.0:f, memory_order_relaxed);} break;
                case 'S': { double f=atomic_load_explicit(&S.base_hz, memory_order_relaxed)*SEMI_UP; atomic_store_explicit(&S.base_hz, f, memory_order_relaxed);} break;

                case 'x': { double f=atomic_load_explicit(&S.base_hz, memory_order_relaxed)-HZ_STEP; atomic_store_explicit(&S.base_hz, f<1.0?1.0:f, memory_order_relaxed);} break;
                case 'd': { double f=atomic_load_explicit(&S.base_hz, memory_order_relaxed)+HZ_STEP; atomic_store_explicit(&S.base_hz, f, memory_order_relaxed);} break;
                case 'X': { double f=atomic_load_explicit(&S.base_hz, memory_order_relaxed)/SEMI_UP; atomic_store_explicit(&S.base_hz, f<1.0?1.0:f, memory_order_relaxed);} break;
                case 'D': { double f=atomic_load_explicit(&S.base_hz, memory_order_relaxed)*SEMI_UP; atomic_store_explicit(&S.base_hz, f, memory_order_relaxed);} break;

                // Sliders offset: ±1 Hz; Shift → semitone on offset itself
                case 'c': { double o=atomic_load_explicit(&S.offset_hz, memory_order_relaxed)-HZ_STEP; atomic_store_explicit(&S.offset_hz, o, memory_order_relaxed);} break;
                case 'f': { double o=atomic_load_explicit(&S.offset_hz, memory_order_relaxed)+HZ_STEP; atomic_store_explicit(&S.offset_hz, o, memory_order_relaxed);} break;
                case 'C': { double o=atomic_load_explicit(&S.offset_hz, memory_order_relaxed)/SEMI_UP; atomic_store_explicit(&S.offset_hz, o, memory_order_relaxed);} break;
                case 'F': { double o=atomic_load_explicit(&S.offset_hz, memory_order_relaxed)*SEMI_UP; atomic_store_explicit(&S.offset_hz, o, memory_order_relaxed);} break;

                case 'v': { double o=atomic_load_explicit(&S.offset_hz, memory_order_relaxed)-HZ_STEP; atomic_store_explicit(&S.offset_hz, o, memory_order_relaxed);} break;
                case 'g': { double o=atomic_load_explicit(&S.offset_hz, memory_order_relaxed)+HZ_STEP; atomic_store_explicit(&S.offset_hz, o, memory_order_relaxed);} break;
                case 'V': { double o=atomic_load_explicit(&S.offset_hz, memory_order_relaxed)/SEMI_UP; atomic_store_explicit(&S.offset_hz, o, memory_order_relaxed);} break;
                case 'G': { double o=atomic_load_explicit(&S.offset_hz, memory_order_relaxed)*SEMI_UP; atomic_store_explicit(&S.offset_hz, o, memory_order_relaxed);} break;

                // Pans (independent)
                case 'b': { double p=atomic_load_explicit(&S.pan1, memory_order_relaxed)-PAN_STEP;   atomic_store_explicit(&S.pan1, clamp(p,-1.0,1.0), memory_order_relaxed);} break;
                case 'h': { double p=atomic_load_explicit(&S.pan1, memory_order_relaxed)+PAN_STEP;   atomic_store_explicit(&S.pan1, clamp(p,-1.0,1.0), memory_order_relaxed);} break;
                case 'B': { double p=atomic_load_explicit(&S.pan1, memory_order_relaxed)-PAN_COARSE; atomic_store_explicit(&S.pan1, clamp(p,-1.0,1.0), memory_order_relaxed);} break;
                case 'H': { double p=atomic_load_explicit(&S.pan1, memory_order_relaxed)+PAN_COARSE; atomic_store_explicit(&S.pan1, clamp(p,-1.0,1.0), memory_order_relaxed);} break;

                case 'n': { double p=atomic_load_explicit(&S.pan2, memory_order_relaxed)-PAN_STEP;   atomic_store_explicit(&S.pan2, clamp(p,-1.0,1.0), memory_order_relaxed);} break;
                case 'j': { double p=atomic_load_explicit(&S.pan2, memory_order_relaxed)+PAN_STEP;   atomic_store_explicit(&S.pan2, clamp(p,-1.0,1.0), memory_order_relaxed);} break;
                case 'N': { double p=atomic_load_explicit(&S.pan2, memory_order_relaxed)-PAN_COARSE; atomic_store_explicit(&S.pan2, clamp(p,-1.0,1.0), memory_order_relaxed);} break;
                case 'J': { double p=atomic_load_explicit(&S.pan2, memory_order_relaxed)+PAN_COARSE; atomic_store_explicit(&S.pan2, clamp(p,-1.0,1.0), memory_order_relaxed);} break;

                // LFO rate, LFO depth for f2
                case 'm': { double r_=atomic_load_explicit(&S.lfo_rate, memory_order_relaxed)-LFOR_STEP;   atomic_store_explicit(&S.lfo_rate, fmax(r_,0.0), memory_order_relaxed);} break;
                case 'k': { double r_=atomic_load_explicit(&S.lfo_rate, memory_order_relaxed)+LFOR_STEP;   atomic_store_explicit(&S.lfo_rate, r_, memory_order_relaxed);} break;
                case 'M': { double r_=atomic_load_explicit(&S.lfo_rate, memory_order_relaxed)-LFOR_COARSE; atomic_store_explicit(&S.lfo_rate, fmax(r_,0.0), memory_order_relaxed);} break;
                case 'K': { double r_=atomic_load_explicit(&S.lfo_rate, memory_order_relaxed)+LFOR_COARSE; atomic_store_explicit(&S.lfo_rate, r_, memory_order_relaxed);} break;

                case ',': { double d_=atomic_load_explicit(&S.lfo_depth_off, memory_order_relaxed)-LFD_STEP;   atomic_store_explicit(&S.lfo_depth_off, fmax(d_,0.0), memory_order_relaxed);} break;
                case 'l': { double d_=atomic_load_explicit(&S.lfo_depth_off, memory_order_relaxed)+LFD_STEP;   atomic_store_explicit(&S.lfo_depth_off, d_, memory_order_relaxed);} break;
                case '<': { double d_=atomic_load_explicit(&S.lfo_depth_off, memory_order_relaxed)-LFD_COARSE; atomic_store_explicit(&S.lfo_depth_off, fmax(d_,0.0), memory_order_relaxed);} break;
                case 'L': { double d_=atomic_load_explicit(&S.lfo_depth_off, memory_order_relaxed)+LFD_COARSE; atomic_store_explicit(&S.lfo_depth_off, d_, memory_order_relaxed);} break;

                // Knobs: micro pitch (1/60 octave), micro pans, LFO base depth/rate, volume, master pan
                case 'e': { double f=atomic_load_explicit(&S.base_hz, memory_order_relaxed)*CENT60_UP;   atomic_store_explicit(&S.base_hz, f, memory_order_relaxed);} break;
                case 'E': { double f=atomic_load_explicit(&S.base_hz, memory_order_relaxed)*CENT60_DOWN; atomic_store_explicit(&S.base_hz, f<1.0?1.0:f, memory_order_relaxed);} break;

                case 'r': { double o=atomic_load_explicit(&S.offset_hz, memory_order_relaxed)*CENT60_UP;   atomic_store_explicit(&S.offset_hz, o, memory_order_relaxed);} break;
                case 'R': { double o=atomic_load_explicit(&S.offset_hz, memory_order_relaxed)*CENT60_DOWN; atomic_store_explicit(&S.offset_hz, o, memory_order_relaxed);} break;

                case 't': { double p=atomic_load_explicit(&S.pan1, memory_order_relaxed)+PAN_MICRO; atomic_store_explicit(&S.pan1, clamp(p,-1.0,1.0), memory_order_relaxed);} break;
                case 'T': { double p=atomic_load_explicit(&S.pan1, memory_order_relaxed)-PAN_MICRO; atomic_store_explicit(&S.pan1, clamp(p,-1.0,1.0), memory_order_relaxed);} break;

                case 'y': { double p=atomic_load_explicit(&S.pan2, memory_order_relaxed)+PAN_MICRO; atomic_store_explicit(&S.pan2, clamp(p,-1.0,1.0), memory_order_relaxed);} break;
                case 'Y': { double p=atomic_load_explicit(&S.pan2, memory_order_relaxed)-PAN_MICRO; atomic_store_explicit(&S.pan2, clamp(p,-1.0,1.0), memory_order_relaxed);} break;

                case 'u': { double d_=atomic_load_explicit(&S.lfo_depth_base, memory_order_relaxed)+LFD_MICRO; atomic_store_explicit(&S.lfo_depth_base, d_, memory_order_relaxed);} break;
                case 'U': { double d_=atomic_load_explicit(&S.lfo_depth_base, memory_order_relaxed)-LFD_MICRO; atomic_store_explicit(&S.lfo_depth_base, fmax(d_,0.0), memory_order_relaxed);} break;

                case 'i': { double r_=atomic_load_explicit(&S.lfo_rate, memory_order_relaxed)+LFOR_MICRO; atomic_store_explicit(&S.lfo_rate, r_, memory_order_relaxed);} break;
                case 'I': { double r_=atomic_load_explicit(&S.lfo_rate, memory_order_relaxed)-LFOR_MICRO; atomic_store_explicit(&S.lfo_rate, fmax(r_,0.0), memory_order_relaxed);} break;

                case 'o': { double v=atomic_load_explicit(&S.volume, memory_order_relaxed)+VOL_MICRO; atomic_store_explicit(&S.volume, clamp(v,0.0,1.0), memory_order_relaxed);} break;
                case 'O': { double v=atomic_load_explicit(&S.volume, memory_order_relaxed)-VOL_MICRO; atomic_store_explicit(&S.volume, clamp(v,0.0,1.0), memory_order_relaxed);} break;

                case 'p': { double p1=atomic_load_explicit(&S.pan1,memory_order_relaxed)+PAN_MICRO;
                            double p2=atomic_load_explicit(&S.pan2,memory_order_relaxed)+PAN_MICRO;
                            atomic_store_explicit(&S.pan1, clamp(p1,-1.0,1.0), memory_order_relaxed);
                            atomic_store_explicit(&S.pan2, clamp(p2,-1.0,1.0), memory_order_relaxed);} break;
                case 'P': { double p1=atomic_load_explicit(&S.pan1,memory_order_relaxed)-PAN_MICRO;
                            double p2=atomic_load_explicit(&S.pan2,memory_order_relaxed)-PAN_MICRO;
                            atomic_store_explicit(&S.pan1, clamp(p1,-1.0,1.0), memory_order_relaxed);
                            atomic_store_explicit(&S.pan2, clamp(p2,-1.0,1.0), memory_order_relaxed);} break;

                case ';': g_run = 0; break;
                default: break;
            }
            print_state(&S);
        } else {
            usleep(1000);
        }
    }

    fprintf(stderr, "\nStopping…\n");
    ma_device_uninit(&g_dev);
    return 0;
}
