# Emscripten C -> WASM build

CC = emcc
CFLAGS = -O2 -s WASM=1 -s ALLOW_MEMORY_GROWTH=1
CFLAGS += -s EXPORTED_RUNTIME_METHODS='["ccall","cwrap","UTF8ToString","writeArrayToMemory","wasmMemory"]'

# Export all functions (processor + vectar game)
EXPORTS = -s EXPORTED_FUNCTIONS='[ \
	"_processor_new", \
	"_processor_free", \
	"_processor_process_frame", \
	"_processor_set_brightness", \
	"_processor_get_brightness", \
	"_processor_set_contrast", \
	"_processor_get_contrast", \
	"_processor_set_use_detailed_ramp", \
	"_processor_toggle_ramp", \
	"_processor_set_invert", \
	"_processor_toggle_invert", \
	"_processor_reset", \
	"_processor_get_status", \
	"_game_create", \
	"_game_free", \
	"_game_resize", \
	"_game_update", \
	"_game_render", \
	"_game_get_output", \
	"_game_get_buffer", \
	"_game_set_speed", \
	"_game_get_speed", \
	"_game_set_fov", \
	"_game_get_fov", \
	"_game_get_camera_z", \
	"_game_get_twist", \
	"_game_set_segments", \
	"_game_get_segments", \
	"_game_set_spacing", \
	"_game_get_spacing", \
	"_game_set_glow_falloff", \
	"_game_get_glow_falloff", \
	"_game_shoot", \
	"_game_get_score", \
	"_game_reset", \
	"_game_poll_event_type", \
	"_game_poll_event_value", \
	"_game_poll_event_x", \
	"_game_poll_event_y", \
	"_game_pop_event", \
	"_game_event_count", \
	"_game_set_player_pos", \
	"_game_get_player_x", \
	"_game_get_player_y", \
	"_game_get_wall_distance", \
	"_game_get_rings_passed", \
	"_game_at_junction", \
	"_game_can_go_left", \
	"_game_can_go_right", \
	"_game_get_track_x", \
	"_game_get_track_z", \
	"_game_get_track_yaw", \
	"_game_set_track_mode", \
	"_game_get_track_mode", \
	"_game_set_turn", \
	"_track_create_figure8", \
	"_track_free", \
	"_track_update", \
	"_track_at_junction", \
	"_track_get_wall_distance", \
	"_track_render_minimap", \
	"_game_get_phase", \
	"_game_get_guards_remaining", \
	"_game_is_entrance_unlocked", \
	"_game_get_hit_flash", \
	"_game_get_space_x", \
	"_game_get_space_y", \
	"_game_get_space_z", \
	"_vectar_buffer_new", \
	"_vectar_buffer_free", \
	"_vectar_buffer_clear", \
	"_vectar_composite", \
	"_malloc", \
	"_free" \
]'

# Output directory (can be overridden from parent Makefile)
OUT_DIR ?= ../www/pkg-c

# Source files
SRCS = ascii.c processor.c vectar_math.c vectar_raster.c vectar_geom.c vectar_track.c vectar_game.c
HDRS = ascii.h processor.h vectar_math.h vectar_raster.h vectar_geom.h vectar_track.h vectar_game.h
OUT = $(OUT_DIR)/asciivision.js

# WASI standalone output
WASI_OUT = $(OUT_DIR)/asciivision-wasi.wasm

.PHONY: all release clean wasi

all: $(OUT)

$(OUT): $(SRCS) $(HDRS)
	@mkdir -p $(OUT_DIR)
	$(CC) $(CFLAGS) $(EXPORTS) $(SRCS) -o $(OUT)
	@echo "Built: $(OUT)"
	@ls -lh $(OUT_DIR)/asciivision.wasm

release: CFLAGS += -O3 -flto
release: $(OUT)

# =====================
# WASI Build (standalone CLI, no JS glue)
# Run with: wasmtime asciivision-wasi.wasm
# =====================
WASI_SRCS = $(SRCS) main.c

wasi: $(WASI_OUT)

$(WASI_OUT): $(WASI_SRCS) $(HDRS)
	@mkdir -p $(OUT_DIR)
	$(CC) -O2 -DWASI_BUILD -s STANDALONE_WASM=1 -s WASM=1 $(WASI_SRCS) -o $(WASI_OUT)
	@echo "Built WASI: $(WASI_OUT)"
	@ls -lh $(WASI_OUT)
	@echo ""
	@echo "Usage: wasmtime $(WASI_OUT) <src_w> <src_h> <cols> <rows> [options]"
	@echo "Example: ffmpeg -i img.jpg -f rawvideo -pix_fmt rgba - | wasmtime $(WASI_OUT) 640 480 80 40"

clean:
	rm -f $(OUT_DIR)/asciivision.js $(OUT_DIR)/asciivision.wasm $(OUT_DIR)/asciivision-wasi.wasm
