# Vangoa/SINCO VMX8 MIDI Controller - LED Feedback Protocol Research

## Device Identification
- **Product**: Vangoa VMX8 Wireless MIDI Controller Mixer
- **Also sold as**: SINCO VMX8
- **USB Device Names**:
  - `SINCO VMX8-Private` (control surface port)
  - `SINCO VMX8-Master` (general MIDI port)
  - `VMX8 Bluetooth` (BLE MIDI)
- **Amazon ASIN**: B0D2DDG988
- **Manufacturer**: Vangoa (Chinese brand)

## Hardware Description
- 8 motorized/touch-sensitive faders with LED indicators
- 8 endless rotary encoders with LED rings
- 43 backlit buttons total
- Button rows per channel: Mute, Solo, Rec, Select (4 buttons x 8 channels = 32)
- Transport buttons: Play, Stop, Record, Rewind, Fast Forward, etc.
- USB-C and Bluetooth connectivity
- Supports Mackie Control Universal (MCU) protocol per manufacturer docs

## DAW Compatibility (per manufacturer)
- Reaper: Preferences > Control/OSC/web > Add "Mackie Control Universal" > Select VMX8
- FL Studio: MIDI Settings > Enable VMX8 > Controller Type: Mackie Control Universal
- Cubase: Studio Setup > Add Mackie Control > Select VMX8
- Ableton Live: Preferences > Link/MIDI > Control Surface: Mackie Control
- CakeWalk: Preferences > Control Surfaces > Add Mackie Control

## Protocol Testing Results

### What the VMX8 SENDS (Input from controller)
The controller sends standard MIDI CC messages when physical controls are used:

| Control | MIDI Message | Notes |
|---------|--------------|-------|
| Mute Ch1 | `B0 15 7F/00` | CC 21, press/release |
| Solo Ch1 | `B0 1D 7F/00` | CC 29, press/release |
| Fader positions | `B0 2F xx` | CC 47, value = position |
| Other faders | `B0 2B xx` | CC 43, etc. |

CC numbers follow pattern: 0x14-0x1F, 0x24-0x2F, etc. for different control rows.

### What CONTROLS the LEDs (Output to controller)

#### Working LED Controls:
| LED | MIDI Message | Protocol |
|-----|--------------|----------|
| Mute Ch1 | `90 10 7F` (on) / `90 10 00` (off) | MCU Note 16 |
| Play button | `90 5E 7F` (on) / `90 5E 00` (off) | MCU Note 94 |

Note: `90 10 00` (Note-On velocity 0) turns LED off. Standard Note-Off (`80 10 00`) is ignored.

#### NOT Working (Tested):
- Notes 0x00-0x0F (Rec arm LEDs) - NO RESPONSE
- Notes 0x08-0x0F (Solo LEDs) - NO RESPONSE
- Notes 0x11-0x17 (Mute Ch2-8 LEDs) - NO RESPONSE
- Notes 0x18-0x1F (Select LEDs) - NO RESPONSE
- All CC messages for LED control - NO RESPONSE
- All SysEx messages - NO RESPONSE (including Identity Request F0 7E 7F 06 01 F7)
- MCU handshake SysEx - NO RESPONSE
- HUI protocol - NO RESPONSE
- Aftertouch (channel and poly) - NO RESPONSE
- Pitch bend - NO RESPONSE
- Program change - NO RESPONSE

#### Anomaly Found:
Note 0x73 (115) ALSO controls the same Mute Ch1 LED as Note 0x10 (16).
Difference is 99 - no obvious pattern. May indicate internal aliasing or firmware bug.

### Boot Behavior
- On power-up, all LEDs sweep/flash sequentially (firmware animation)
- This animation is internal only - no MIDI is sent during the sweep
- After boot, controller sends fader position CCs: `B0 2F xx`, `B0 2B xx`

### Reaper MCU Integration Test
With VMX8 configured as Mackie Control Universal in Reaper:
- Muting ANY track only toggles the Mute Ch1 LED (Note 0x10)
- Solo/Rec/Select buttons show no LED feedback
- Play/Pause DOES control the Play button LED
- Stop may control Stop LED (needs verification)

## Technical Hypotheses

### Theory 1: Cost-Reduced MCU Implementation
The VMX8 may implement only a subset of MCU protocol to reduce firmware complexity/cost:
- Transport LEDs: Implemented
- Channel strip LEDs: Only track 1 implemented
- All other LEDs: Hardwired to button state only (no MIDI control)

### Theory 2: Hidden Mode/SysEx
There may be an undocumented SysEx command to:
- Enable full LED control
- Switch between "basic" and "full" MCU mode
- Unlock channel strip LEDs

### Theory 3: Firmware Bug
The Mute 2-8, Solo, Rec, Select LEDs may be broken in firmware.
The Note 0x73 → Mute1 aliasing suggests firmware issues.

## Search Terms for Further Research

### Product-specific:
- "Vangoa VMX8 LED feedback"
- "Vangoa VMX8 Mackie Control"
- "Vangoa VMX8 firmware update"
- "SINCO VMX8 SysEx"
- "Vangoa VMX8 LED not working"
- "Vangoa VMX8 protocol"

### Generic controller terms:
- "budget MCU controller limited LED feedback"
- "Mackie Control Universal LED implementation"
- "MCU protocol LED notes channel strip"
- "MIDI controller LED only first channel"
- "cheap DAW controller LED feedback broken"

### Protocol documentation:
- "Mackie Control Universal protocol specification"
- "MCU LED note numbers"
- "MCU SysEx commands"
- "Logic Control protocol" (predecessor to MCU)

### Chinese controller brands:
- "Vangoa MIDI controller protocol"
- "worlde easycontrol LED" (similar budget brand)
- "icon platform LED feedback" (similar product)
- "Chinese MCU clone LED"

## Questions for Manufacturer

1. Is there a firmware update that enables full LED feedback for all 8 channels?
2. Is there a SysEx command to enable "full MCU mode"?
3. Why does Note 0x73 alias to Note 0x10?
4. Is the LED matrix wired to support individual control, or are LEDs 2-8 hardwired to button state?
5. Is there developer documentation for the VMX8 MIDI implementation?

## Files and Tools

- Test tool: `/Users/mricos/src/mricos/demos/dunk/test.html`
- Config export: `~/Downloads/vmx8.smc` (binary, contains CC mappings)
- Manufacturer downloads: https://www.vangoa.com/pages/downloads

## Conclusion

The Vangoa VMX8 appears to have severely limited LED feedback capability via MIDI:
- Only 2 LEDs confirmed controllable: Mute Ch1 (0x10) and Play (0x5E)
- All other channel strip LEDs appear non-functional or hardwired
- No SysEx response suggests no hidden protocol
- May be intentional cost reduction or firmware limitation

Recommended next steps:
1. Contact Vangoa support for protocol documentation
2. Check for firmware updates
3. Search for teardown/reverse engineering of similar controllers
4. Consider alternative controller if full LED feedback is required
