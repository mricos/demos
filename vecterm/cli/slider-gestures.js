/**
 * Slider Gesture Handler
 *
 * Handles touch and mouse gestures for sliders:
 * - Swipe left: Archive slider (remove from view)
 * - Swipe right: Add to Quick Settings
 * - Long click: Capture MIDI CC
 */

import { getLifecycleManager } from './slider-lifecycle.js';

const SWIPE_THRESHOLD = 80; // pixels
const LONG_PRESS_DURATION = 800; // milliseconds

/**
 * GestureHandler - Manages gestures on slider elements
 */
export class GestureHandler {
  constructor(quickSettingsCallback, midiCaptureCallback) {
    this.quickSettingsCallback = quickSettingsCallback;
    this.midiCaptureCallback = midiCaptureCallback;

    // Touch/mouse tracking
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.activeElement = null;
    this.longPressTimer = null;
    this.isDragging = false;
  }

  /**
   * Attach gesture handlers to a slider element
   */
  attachToSlider(sliderElement) {
    // Desktop: mouse events
    sliderElement.addEventListener('mousedown', this.handleStart.bind(this));
    document.addEventListener('mousemove', this.handleMove.bind(this));
    document.addEventListener('mouseup', this.handleEnd.bind(this));

    // Mobile: touch events
    sliderElement.addEventListener('touchstart', this.handleStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.handleMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.handleEnd.bind(this));

    // Prevent default context menu on long press
    sliderElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  /**
   * Handle gesture start (mousedown / touchstart)
   */
  handleStart(e) {
    // Ignore if target is the slider input itself
    if (e.target.tagName === 'INPUT') {
      return;
    }

    // Get slider container
    const sliderContainer = e.target.closest('.cli-slider-container');
    if (!sliderContainer) return;

    // Don't handle gestures on archived sliders
    if (sliderContainer.dataset.state === 'archived') return;

    const touch = e.touches ? e.touches[0] : e;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    this.activeElement = sliderContainer;
    this.isDragging = false;

    // Start long press timer
    this.longPressTimer = setTimeout(() => {
      if (!this.isDragging) {
        this.handleLongPress(sliderContainer);
      }
    }, LONG_PRESS_DURATION);

    // Add active state
    sliderContainer.classList.add('gesture-active');
  }

  /**
   * Handle gesture move (mousemove / touchmove)
   */
  handleMove(e) {
    if (!this.activeElement) return;

    const touch = e.touches ? e.touches[0] : e;
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // Check if user is dragging (not a tap)
    if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
      this.isDragging = true;
      clearTimeout(this.longPressTimer);

      // Apply visual feedback for swipe
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe - apply transform
        this.activeElement.style.transform = `translateX(${deltaX}px)`;
        this.activeElement.style.transition = 'none';

        // Visual feedback for swipe direction
        if (deltaX > SWIPE_THRESHOLD / 2) {
          // Swipe right (Quick Settings)
          this.activeElement.style.backgroundColor = 'rgba(79, 195, 247, 0.1)';
        } else if (deltaX < -SWIPE_THRESHOLD / 2) {
          // Swipe left (Archive)
          this.activeElement.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
        } else {
          this.activeElement.style.backgroundColor = '';
        }
      }
    }
  }

  /**
   * Handle gesture end (mouseup / touchend)
   */
  handleEnd(e) {
    if (!this.activeElement) return;

    clearTimeout(this.longPressTimer);

    const sliderElement = this.activeElement;
    const sliderId = sliderElement.id;

    // Check for swipe
    if (this.isDragging) {
      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const deltaX = touch.clientX - this.touchStartX;

      if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
        if (deltaX > 0) {
          // Swipe right - add to Quick Settings
          this.handleSwipeRight(sliderId);
        } else {
          // Swipe left - archive
          this.handleSwipeLeft(sliderId);
        }
      } else {
        // Didn't swipe far enough, reset
        this.resetSliderPosition(sliderElement);
      }
    }

    // Clean up
    sliderElement.classList.remove('gesture-active');
    sliderElement.style.backgroundColor = '';
    this.activeElement = null;
    this.isDragging = false;
  }

  /**
   * Reset slider position after cancelled swipe
   */
  resetSliderPosition(sliderElement) {
    sliderElement.style.transition = 'transform 0.3s ease';
    sliderElement.style.transform = 'translateX(0)';

    setTimeout(() => {
      sliderElement.style.transition = '';
      sliderElement.style.transform = '';
    }, 300);
  }

  /**
   * Handle long press gesture
   */
  handleLongPress(sliderElement) {
    const sliderId = sliderElement.id;
    const lifecycleManager = getLifecycleManager();
    const slider = lifecycleManager.getSlider(sliderId);

    if (!slider) return;

    // Trigger haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Visual feedback
    sliderElement.classList.add('long-press-active');
    setTimeout(() => {
      sliderElement.classList.remove('long-press-active');
    }, 300);

    // Trigger MIDI capture
    if (this.midiCaptureCallback) {
      this.midiCaptureCallback(sliderId, slider);
    }

    console.log(`[Gesture] Long press on slider: ${slider.command}`);
  }

  /**
   * Handle swipe left (archive slider)
   */
  handleSwipeLeft(sliderId) {
    const lifecycleManager = getLifecycleManager();
    const sliderElement = document.getElementById(sliderId);

    // Animate out
    sliderElement.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    sliderElement.style.transform = 'translateX(-100%)';
    sliderElement.style.opacity = '0';

    setTimeout(() => {
      lifecycleManager.archiveSlider(sliderId);
      sliderElement.style.transform = '';
      sliderElement.style.transition = '';
    }, 300);

    console.log(`[Gesture] Swipe left - archived slider: ${sliderId}`);
  }

  /**
   * Handle swipe right (add to Quick Settings)
   */
  handleSwipeRight(sliderId) {
    const lifecycleManager = getLifecycleManager();
    const slider = lifecycleManager.getSlider(sliderId);
    const sliderElement = document.getElementById(sliderId);

    if (!slider) return;

    // Animate and mark
    sliderElement.style.transition = 'transform 0.3s ease';
    sliderElement.style.transform = 'translateX(20px)';

    setTimeout(() => {
      sliderElement.style.transform = '';
      sliderElement.style.transition = '';
    }, 300);

    // Mark as Quick Setting
    lifecycleManager.markAsQuickSetting(sliderId);

    // Trigger callback
    if (this.quickSettingsCallback) {
      this.quickSettingsCallback(sliderId, slider);
    }

    console.log(`[Gesture] Swipe right - added to Quick Settings: ${slider.command}`);
  }
}

// Global singleton
let gestureHandler = null;

/**
 * Initialize gesture handler
 */
export function initGestureHandler(quickSettingsCallback, midiCaptureCallback) {
  if (!gestureHandler) {
    gestureHandler = new GestureHandler(quickSettingsCallback, midiCaptureCallback);
  }
  return gestureHandler;
}

/**
 * Get gesture handler instance
 */
export function getGestureHandler() {
  return gestureHandler;
}
