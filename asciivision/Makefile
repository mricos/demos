# Makefile for asciivision

CC = clang
FRAMEWORKS = -framework AVFoundation -framework CoreMedia -framework CoreVideo \
             -framework Foundation -framework AppKit
CFLAGS = -O2 -Wall
TARGET = asciivision
SRC = asciivision.m

all: $(TARGET)

$(TARGET): $(SRC)
	$(CC) $(CFLAGS) $(FRAMEWORKS) $(SRC) -o $(TARGET)

debug: $(SRC)
	$(CC) -g -O0 -Wall $(FRAMEWORKS) $(SRC) -o $(TARGET)

clean:
	rm -f $(TARGET)

.PHONY: all debug clean
