// asciivision.m - Real-time ASCII camera viewer for macOS
// Compile: clang -framework AVFoundation -framework CoreMedia -framework CoreVideo \
//          -framework Foundation -framework AppKit asciivision.m -o asciivision

#import <AVFoundation/AVFoundation.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreVideo/CoreVideo.h>
#import <Foundation/Foundation.h>
#import <AppKit/AppKit.h>
#include <stdio.h>
#include <stdlib.h>
#include <signal.h>
#include <termios.h>
#include <unistd.h>
#include <sys/ioctl.h>

// ASCII character ramps from dark to light
static const char* ASCII_RAMP_DETAILED = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
static const char* ASCII_RAMP_SIMPLE = " .:-=+*#%@";

static volatile sig_atomic_t running = 1;
static int use_detailed_ramp = 1;
static int invert_colors = 0;
static int target_width = 0;   // 0 means auto (terminal size)
static int target_height = 0;

// Terminal handling
static struct termios orig_termios;

void disable_raw_mode(void) {
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &orig_termios);
    // Show cursor
    printf("\033[?25h");
    fflush(stdout);
}

void enable_raw_mode(void) {
    tcgetattr(STDIN_FILENO, &orig_termios);
    atexit(disable_raw_mode);

    struct termios raw = orig_termios;
    raw.c_lflag &= ~(ECHO | ICANON);
    raw.c_cc[VMIN] = 0;
    raw.c_cc[VTIME] = 0;
    tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw);

    // Hide cursor
    printf("\033[?25l");
    fflush(stdout);
}

void get_terminal_size(int *width, int *height) {
    struct winsize w;
    if (ioctl(STDOUT_FILENO, TIOCGWINSZ, &w) == 0) {
        *width = w.ws_col;
        *height = w.ws_row - 2; // Leave room for status line
    } else {
        *width = 80;
        *height = 24;
    }
}

void signal_handler(int sig) {
    running = 0;
}

char pixel_to_ascii(uint8_t gray) {
    const char* ramp = use_detailed_ramp ? ASCII_RAMP_DETAILED : ASCII_RAMP_SIMPLE;
    size_t ramp_len = strlen(ramp);

    if (invert_colors) {
        gray = 255 - gray;
    }

    size_t index = (size_t)gray * (ramp_len - 1) / 255;
    return ramp[index];
}

@interface ASCIICapture : NSObject <AVCaptureVideoDataOutputSampleBufferDelegate>
@property (nonatomic, strong) AVCaptureSession *session;
@property (nonatomic, strong) dispatch_queue_t captureQueue;
@property (nonatomic) int outputWidth;
@property (nonatomic) int outputHeight;
@end

@implementation ASCIICapture

- (instancetype)init {
    self = [super init];
    if (self) {
        _captureQueue = dispatch_queue_create("com.asciivision.capture", DISPATCH_QUEUE_SERIAL);
        [self setupCapture];
    }
    return self;
}

- (void)setupCapture {
    self.session = [[AVCaptureSession alloc] init];

    // Use high resolution for better ASCII detail
    if ([self.session canSetSessionPreset:AVCaptureSessionPreset1280x720]) {
        self.session.sessionPreset = AVCaptureSessionPreset1280x720;
    } else if ([self.session canSetSessionPreset:AVCaptureSessionPresetHigh]) {
        self.session.sessionPreset = AVCaptureSessionPresetHigh;
    }

    // Get default video device
    AVCaptureDevice *device = [AVCaptureDevice defaultDeviceWithMediaType:AVMediaTypeVideo];
    if (!device) {
        fprintf(stderr, "Error: No camera found\n");
        exit(1);
    }

    NSError *error = nil;
    AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:device error:&error];
    if (error) {
        fprintf(stderr, "Error: Cannot access camera: %s\n",
                [[error localizedDescription] UTF8String]);
        exit(1);
    }

    if ([self.session canAddInput:input]) {
        [self.session addInput:input];
    }

    AVCaptureVideoDataOutput *output = [[AVCaptureVideoDataOutput alloc] init];
    output.videoSettings = @{
        (NSString *)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_32BGRA)
    };
    output.alwaysDiscardsLateVideoFrames = YES;
    [output setSampleBufferDelegate:self queue:self.captureQueue];

    if ([self.session canAddOutput:output]) {
        [self.session addOutput:output];
    }
}

- (void)start {
    [self.session startRunning];
}

- (void)stop {
    [self.session stopRunning];
}

- (void)captureOutput:(AVCaptureOutput *)output
didOutputSampleBuffer:(CMSampleBufferRef)sampleBuffer
       fromConnection:(AVCaptureConnection *)connection {

    CVImageBufferRef imageBuffer = CMSampleBufferGetImageBuffer(sampleBuffer);
    if (!imageBuffer) return;

    CVPixelBufferLockBaseAddress(imageBuffer, kCVPixelBufferLock_ReadOnly);

    size_t width = CVPixelBufferGetWidth(imageBuffer);
    size_t height = CVPixelBufferGetHeight(imageBuffer);
    size_t bytesPerRow = CVPixelBufferGetBytesPerRow(imageBuffer);
    uint8_t *baseAddress = (uint8_t *)CVPixelBufferGetBaseAddress(imageBuffer);

    // Determine output dimensions
    int termWidth, termHeight;
    if (target_width > 0 && target_height > 0) {
        termWidth = target_width;
        termHeight = target_height;
    } else {
        get_terminal_size(&termWidth, &termHeight);
    }

    self.outputWidth = termWidth;
    self.outputHeight = termHeight;

    // Calculate scaling factors
    // Note: ASCII chars are ~2x taller than wide, so we compensate
    float scaleX = (float)width / termWidth;
    float scaleY = (float)height / termHeight * 0.5f; // Aspect ratio correction

    // Build ASCII frame
    char *buffer = malloc(termWidth * termHeight + termHeight + 1);
    if (!buffer) {
        CVPixelBufferUnlockBaseAddress(imageBuffer, kCVPixelBufferLock_ReadOnly);
        return;
    }

    int bufPos = 0;

    for (int y = 0; y < termHeight; y++) {
        for (int x = 0; x < termWidth; x++) {
            // Sample from source image (mirror horizontally for natural feel)
            int srcX = (int)((termWidth - 1 - x) * scaleX);
            int srcY = (int)(y * scaleY);

            if (srcX >= (int)width) srcX = (int)width - 1;
            if (srcY >= (int)height) srcY = (int)height - 1;

            uint8_t *pixel = baseAddress + srcY * bytesPerRow + srcX * 4;

            // BGRA format - convert to grayscale using luminance formula
            uint8_t b = pixel[0];
            uint8_t g = pixel[1];
            uint8_t r = pixel[2];
            uint8_t gray = (uint8_t)(0.299f * r + 0.587f * g + 0.114f * b);

            buffer[bufPos++] = pixel_to_ascii(gray);
        }
        buffer[bufPos++] = '\n';
    }
    buffer[bufPos] = '\0';

    CVPixelBufferUnlockBaseAddress(imageBuffer, kCVPixelBufferLock_ReadOnly);

    // Move cursor to top-left and print frame
    printf("\033[H%s", buffer);
    printf("\033[K[%dx%d] src:%zux%zu | r:ramp i:invert +/-:size q:quit",
           termWidth, termHeight, width, height);
    fflush(stdout);

    free(buffer);
}

@end

void print_usage(const char *progname) {
    fprintf(stderr, "Usage: %s [options]\n", progname);
    fprintf(stderr, "Options:\n");
    fprintf(stderr, "  -w WIDTH   Set output width (default: terminal width)\n");
    fprintf(stderr, "  -h HEIGHT  Set output height (default: terminal height)\n");
    fprintf(stderr, "  -s         Use simple ASCII ramp (fewer characters)\n");
    fprintf(stderr, "  -i         Invert colors\n");
    fprintf(stderr, "  --help     Show this help\n");
    fprintf(stderr, "\nControls during capture:\n");
    fprintf(stderr, "  r          Toggle detailed/simple ASCII ramp\n");
    fprintf(stderr, "  i          Toggle color inversion\n");
    fprintf(stderr, "  +/=        Increase size (if using fixed size)\n");
    fprintf(stderr, "  -          Decrease size\n");
    fprintf(stderr, "  0          Reset to auto (terminal) size\n");
    fprintf(stderr, "  q/ESC      Quit\n");
}

int main(int argc, char *argv[]) {
    @autoreleasepool {
        // Parse arguments
        for (int i = 1; i < argc; i++) {
            if (strcmp(argv[i], "-w") == 0 && i + 1 < argc) {
                target_width = atoi(argv[++i]);
            } else if (strcmp(argv[i], "-h") == 0 && i + 1 < argc) {
                target_height = atoi(argv[++i]);
            } else if (strcmp(argv[i], "-s") == 0) {
                use_detailed_ramp = 0;
            } else if (strcmp(argv[i], "-i") == 0) {
                invert_colors = 1;
            } else if (strcmp(argv[i], "--help") == 0) {
                print_usage(argv[0]);
                return 0;
            }
        }

        signal(SIGINT, signal_handler);
        signal(SIGTERM, signal_handler);

        enable_raw_mode();

        // Clear screen
        printf("\033[2J\033[H");
        fflush(stdout);

        ASCIICapture *capture = [[ASCIICapture alloc] init];
        [capture start];

        // Main loop - handle keyboard input
        while (running) {
            char c;
            if (read(STDIN_FILENO, &c, 1) == 1) {
                switch (c) {
                    case 'q':
                    case 'Q':
                    case 27: // ESC
                        running = 0;
                        break;
                    case 'r':
                    case 'R':
                        use_detailed_ramp = !use_detailed_ramp;
                        break;
                    case 'i':
                    case 'I':
                        invert_colors = !invert_colors;
                        break;
                    case '+':
                    case '=':
                        if (target_width == 0) {
                            get_terminal_size(&target_width, &target_height);
                        }
                        target_width = (int)(target_width * 1.2);
                        target_height = (int)(target_height * 1.2);
                        break;
                    case '-':
                    case '_':
                        if (target_width == 0) {
                            get_terminal_size(&target_width, &target_height);
                        }
                        target_width = (int)(target_width * 0.8);
                        target_height = (int)(target_height * 0.8);
                        if (target_width < 20) target_width = 20;
                        if (target_height < 10) target_height = 10;
                        break;
                    case '0':
                        target_width = 0;
                        target_height = 0;
                        break;
                }
            }
            usleep(10000); // 10ms
        }

        [capture stop];

        // Clear and restore terminal
        printf("\033[2J\033[H");
        fflush(stdout);
    }

    return 0;
}
