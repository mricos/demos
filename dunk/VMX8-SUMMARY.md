# Vangoa VMX8 MIDI Controller - Technical Summary

## Device Identification

| Field | Value |
|-------|-------|
| Product | Vangoa VMX8 Wireless MIDI Controller Mixer |
| Also sold as | SINCO VMX8 |
| USB Ports | `SINCO VMX8-Private` (DAW), `SINCO VMX8-Master` (MIDI) |
| Bluetooth | `VMX8 Bluetooth` (BLE MIDI) |
| Amazon ASIN | B0D2DDG988 |
| Manufacturer | Vangoa (China) |

## Hardware

- 8 motorized/touch-sensitive faders with LED indicators
- 8 endless rotary encoders with LED rings
- 43 backlit buttons total
- Button rows per channel: Mute, Solo, Rec, Select (4 x 8 = 32)
- Transport: Play, Stop, Record, Rewind, Fast Forward, Cycle, etc.
- USB-C and Bluetooth connectivity

---

## Operating Modes

The VMX8 has two MIDI modes, selected by holding Shift:

| Mode | Activation | Fader Output | Button Output | LED Control |
|------|------------|--------------|---------------|-------------|
| **CC Mode** | `Shift` + `Right` | CC (7-bit) | CC press/release | None |
| **DAW Mode** | `Shift` + `Left` | Pitch Bend | Note On/Off (MCU) | Limited |

---

## CC Mode (Shift + Right)

Standard MIDI CC messages. Good for generic MIDI mapping, synths, effects.

### Faders (CC Output)

| Fader | CC# | Hex | Notes |
|-------|-----|-----|-------|
| Fader 1 | 47 | 0x2F | |
| Fader 2 | 43 | 0x2B | |
| Fader 3 | 39 | 0x27 | |
| Fader 4 | 35 | 0x23 | |
| Fader 5 | 31 | 0x1F | |
| Fader 6 | 27 | 0x1B | |
| Fader 7 | 23 | 0x17 | |
| Fader 8 | 19 | 0x13 | |

### Buttons (CC Output)

| Button | CC# | Hex | Press | Release |
|--------|-----|-----|-------|---------|
| Mute Ch1 | 21 | 0x15 | 0x7F | 0x00 |
| Solo Ch1 | 29 | 0x1D | 0x7F | 0x00 |

*Pattern: CC numbers follow 0x14-0x1F, 0x24-0x2F ranges for different control rows.*

---

## DAW Mode (Shift + Left)

MCU-compatible protocol. Required for LED feedback.

### Faders (Pitch Bend Output)

| Fader | MIDI Channel | Status Byte | Resolution |
|-------|--------------|-------------|------------|
| Fader 1 | 1 | 0xE0 | 7-bit (MSB only) |
| Fader 2 | 2 | 0xE1 | 7-bit (MSB only) |
| Fader 3 | 3 | 0xE2 | 7-bit (MSB only) |
| Fader 4 | 4 | 0xE3 | 7-bit (MSB only) |
| Fader 5 | 5 | 0xE4 | 7-bit (MSB only) |
| Fader 6 | 6 | 0xE5 | 7-bit (MSB only) |
| Fader 7 | 7 | 0xE6 | 7-bit (MSB only) |
| Fader 8 | 8 | 0xE7 | 7-bit (MSB only) |

**Resolution Note:** Despite using 14-bit Pitch Bend format, the VMX8 only sends 7-bit resolution. The LSB is always 0x00, only MSB varies (0x00-0x7F). Effective range: 128 values in steps of 128.

Example fader sweep:
```
e0 00 0e  →  value 1792  (MSB=14)
e0 00 0f  →  value 1920  (MSB=15)
...
e0 00 7f  →  value 16256 (MSB=127)
```

### Buttons (Note Output)

Buttons send Note On (0x90) on channel 1. Velocity 127 = press, velocity 0 = release.

---

## LED Control (DAW Mode Only)

**Critical:** LEDs only respond after MCU session initialization.

### Working LEDs

| LED | Note# | Hex | On | Off |
|-----|-------|-----|----|----|
| Mute Ch1 | 16 | 0x10 | `90 10 7F` | `90 10 00` |
| Play | 94 | 0x5E | `90 5E 7F` | `90 5E 00` |

**Note:** Use Note-On with velocity 0 to turn off. Standard Note-Off (0x80) is ignored.

### Non-Working LEDs (Tested)

| LED Range | Notes | Result |
|-----------|-------|--------|
| Rec 1-8 | 0x00-0x07 | No response |
| Solo 1-8 | 0x08-0x0F | No response |
| Mute 2-8 | 0x11-0x17 | No response |
| Select 1-8 | 0x18-0x1F | No response |
| Transport (except Play) | Various | No response |

### Anomaly

Note 0x73 (115) also controls Mute Ch1 LED (same as 0x10). Difference of 99 - no obvious pattern. Likely firmware bug.

---

## MIDI Implementation Chart

### Transmit (Controller → Host)

| Function | Status | Data 1 | Data 2 | Mode |
|----------|--------|--------|--------|------|
| Fader 1 | B0 | 2F | 00-7F | CC |
| Fader 1 | E0 | 00 | 00-7F | DAW |
| Fader 2 | B0 | 2B | 00-7F | CC |
| Fader 2 | E1 | 00 | 00-7F | DAW |
| Mute Ch1 | B0 | 15 | 7F/00 | CC |
| Mute Ch1 | 90 | 10 | 7F/00 | DAW |
| Solo Ch1 | B0 | 1D | 7F/00 | CC |
| Solo Ch1 | 90 | 08 | 7F/00 | DAW |

### Receive (Host → Controller)

| Function | Status | Data 1 | Data 2 | Notes |
|----------|--------|--------|--------|-------|
| Mute Ch1 LED | 90 | 10 | 7F/00 | On/Off |
| Play LED | 90 | 5E | 7F/00 | On/Off |
| All other LEDs | - | - | - | No response |
| SysEx | F0 ... F7 | - | - | No response |
| Identity Request | F0 7E 7F 06 01 F7 | - | - | No response |

---

## MCU Session Initialization

To enable LED control, send this sequence:

```
F0 00 00 66 14 00 F7           # MCU Device Query
F0 00 00 66 14 01 56 4D 58 38 00 00 00 F7  # Host Connect ("VMX8")
F0 00 00 66 14 0F 7F F7        # Go Offline
F0 00 00 66 14 0F 00 F7        # Go Online
```

After initialization, LEDs respond to Note messages.

---

## DAW Setup

| DAW | Setup Path |
|-----|------------|
| Reaper | Preferences → Control/OSC/web → Add "Mackie Control Universal" → Select VMX8 |
| FL Studio | MIDI Settings → Enable VMX8 → Controller Type: Mackie Control Universal |
| Cubase | Studio Setup → Add Mackie Control → Select VMX8 |
| Ableton Live | Preferences → Link/MIDI → Control Surface: Mackie Control |
| CakeWalk | Preferences → Control Surfaces → Add Mackie Control |

---

## Boot Behavior

1. All LEDs sweep/flash sequentially (internal firmware animation)
2. No MIDI sent during boot animation
3. After boot, sends fader position CCs: `B0 2F xx`, `B0 2B xx`, etc.

---

## Limitations Summary

1. **LED Feedback**: Only 2 of 43 LEDs are controllable via MIDI
2. **Fader Resolution**: 7-bit actual despite 14-bit Pitch Bend format
3. **SysEx**: No response to any SysEx including Identity Request
4. **Protocol**: Partial MCU implementation only

---

## Files

| File | Description |
|------|-------------|
| `test.html` | WebMIDI probe tool for testing |
| `VMX8-LED-RESEARCH.md` | Detailed LED research notes |
| `VMX8-SUMMARY.md` | This file |

---

## Contact / Support

- Manufacturer: https://www.vangoa.com
- Downloads: https://www.vangoa.com/pages/downloads
- Config export format: `.smc` (binary, contains CC mappings)
