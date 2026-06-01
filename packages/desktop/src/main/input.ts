// Agent: 💻 Agent D (Desktop Input Injector)
// File: packages/desktop/src/main/input.ts

import { InputEvent } from '@browsync/shared';

let uiohook: any = null;
let isMockMode = false;

// Simulated Host Screen Dimensions for coordinates denormalization mapping
const HOST_SCREEN_WIDTH = 1920;
const HOST_SCREEN_HEIGHT = 1080;

export function initializeInputInjection() {
  try {
    // Attempt dynamic load of native global input injection addon uiohook-napi
    uiohook = require('uiohook-napi');
    
    // In uiohook, starting listens for inputs. For injection we don't necessarily 
    // need to listen, but we can verify methods are bound.
    if (uiohook && typeof uiohook.mouseMove === 'function') {
      console.log('🎮 [Injector] Native uiohook-napi loaded successfully! Real injection enabled.');
    } else {
      throw new Error('uiohook injection methods missing');
    }
  } catch (err: any) {
    isMockMode = true;
    console.warn(
      `⚠️ [Injector] Native uiohook-napi compilation failed or not found. Fallback to console mock logs.\n` +
      `Details: ${err.message}`
    );
  }
}

export function injectInputEvent(event: InputEvent) {
  try {
    if (event.type === 'mouse') {
      const { event: mouseAction, x, y, button, deltaX, deltaY } = event;

      // Denormalize coordinate pointers (viewer 0.0->1.0 mapping to host screen pixels)
      const actualX = x !== undefined ? Math.round(x * HOST_SCREEN_WIDTH) : 0;
      const actualY = y !== undefined ? Math.round(y * HOST_SCREEN_HEIGHT) : 0;

      if (isMockMode) {
        console.log(
          `[Mock Injector] 🖱️ Mouse: action=${mouseAction} | (x, y)=(${actualX}, ${actualY}) | btn=${button || 'none'} | scroll=(${deltaX || 0}, ${deltaY || 0})`
        );
        return;
      }

      // Real Injection utilizing uiohook-napi
      switch (mouseAction) {
        case 'move':
          uiohook.mouseMove(actualX, actualY);
          break;
        case 'mousedown':
        case 'click':
          uiohook.mouseMove(actualX, actualY);
          // Standard clicks mapping (1=left, 2=middle, 3=right)
          const buttonId = button === 'right' ? 3 : button === 'middle' ? 2 : 1;
          uiohook.mouseClick(buttonId);
          break;
        case 'scroll':
          uiohook.mouseScroll(deltaX || 0, deltaY || 0);
          break;
        default:
          break;
      }
    } else if (event.type === 'keyboard') {
      const { event: keyAction, key, keyCode } = event;

      if (isMockMode) {
        console.log(`[Mock Injector] ⌨️ Keyboard: action=${keyAction} | key=${key} | code=${keyCode}`);
        return;
      }

      // Real Keyboard press injection mapping
      if (keyAction === 'keydown') {
        uiohook.keyToggle(keyCode, true);
      } else if (keyAction === 'keyup') {
        uiohook.keyToggle(keyCode, false);
      }
    }
  } catch (err: any) {
    console.error('❌ Injected input execution error:', err.message);
  }
}
