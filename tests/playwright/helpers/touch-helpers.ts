import { Page, Locator } from '@playwright/test';

/**
 * Touch gesture simulation helpers for mobile Playwright tests.
 * Playwright doesn't natively support multi-touch, so pinch zoom
 * is simulated via synthetic TouchEvent dispatch.
 */
export class TouchHelpers {
  /**
   * Single tap at page coordinates.
   */
  static async tapAt(page: Page, x: number, y: number) {
    await page.touchscreen.tap(x, y);
  }

  /**
   * Simulate pinch zoom on a canvas element.
   * Direction: 'in' = zoom in (fingers spread), 'out' = zoom out (fingers pinch).
   * Uses synthetic TouchEvent objects dispatched via page.evaluate().
   */
  static async pinchZoom(
    page: Page,
    canvas: Locator,
    direction: 'in' | 'out',
    scale: number = 1.5,
    steps: number = 10
  ) {
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not visible');

    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    // Finger offsets: start close together, end further apart (or vice versa)
    const startSpread = direction === 'in' ? 30 : 30 * scale;
    const endSpread = direction === 'in' ? 30 * scale : 30;

    await page.evaluate(
      ({ centerX, centerY, startSpread, endSpread, steps, canvasSelector }) => {
        const canvas = document.querySelector(canvasSelector) as HTMLCanvasElement;
        if (!canvas) return;

        function dispatchTouch(type: string, x1: number, y1: number, x2: number, y2: number) {
          const touch1 = new Touch({
            identifier: 0,
            target: canvas,
            clientX: x1,
            clientY: y1,
            pageX: x1,
            pageY: y1,
          });
          const touch2 = new Touch({
            identifier: 1,
            target: canvas,
            clientX: x2,
            clientY: y2,
            pageX: x2,
            pageY: y2,
          });
          const event = new TouchEvent(type, {
            touches: type === 'touchend' ? [] : [touch1, touch2],
            changedTouches: [touch1, touch2],
            targetTouches: type === 'touchend' ? [] : [touch1, touch2],
            bubbles: true,
            cancelable: true,
          });
          canvas.dispatchEvent(event);
        }

        // touchstart with initial finger positions
        dispatchTouch(
          'touchstart',
          centerX - startSpread,
          centerY,
          centerX + startSpread,
          centerY
        );

        // touchmove steps to gradually spread/pinch
        for (let i = 1; i <= steps; i++) {
          const progress = i / steps;
          const spread = startSpread + (endSpread - startSpread) * progress;
          setTimeout(() => {
            dispatchTouch(
              'touchmove',
              centerX - spread,
              centerY,
              centerX + spread,
              centerY
            );
            if (i === steps) {
              setTimeout(() => {
                dispatchTouch(
                  'touchend',
                  centerX - endSpread,
                  centerY,
                  centerX + endSpread,
                  centerY
                );
              }, 16);
            }
          }, i * 16);
        }
      },
      {
        centerX,
        centerY,
        startSpread,
        endSpread,
        steps,
        canvasSelector: `#${await canvas.getAttribute('id')}`,
      }
    );

    // Wait for all touchmove events to fire
    await page.waitForTimeout(steps * 16 + 100);
  }

  /**
   * Simulate a touch drag from one point to another.
   */
  static async touchDrag(
    page: Page,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    steps: number = 10
  ) {
    await page.touchscreen.tap(startX, startY); // touchstart
    for (let i = 1; i <= steps; i++) {
      const x = startX + ((endX - startX) * i) / steps;
      const y = startY + ((endY - startY) * i) / steps;
      await page.touchscreen.tap(x, y);
      await page.waitForTimeout(16);
    }
  }

  /**
   * Simulate hold-then-drag for bumper movement.
   * Holds at start position for holdMs before starting drag.
   */
  static async holdAndDrag(
    page: Page,
    canvasLocator: Locator,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    holdMs: number = 350
  ) {
    const canvasId = await canvasLocator.getAttribute('id');
    await page.evaluate(
      ({ canvasId, startX, startY, endX, endY, holdMs, steps }) => {
        const canvas = document.getElementById(canvasId!) as HTMLCanvasElement;
        if (!canvas) return;

        function makeTouch(id: number, x: number, y: number) {
          return new Touch({
            identifier: id,
            target: canvas,
            clientX: x,
            clientY: y,
            pageX: x,
            pageY: y,
          });
        }

        function dispatch(type: string, x: number, y: number) {
          const touch = makeTouch(0, x, y);
          canvas.dispatchEvent(
            new TouchEvent(type, {
              touches: type === 'touchend' ? [] : [touch],
              changedTouches: [touch],
              targetTouches: type === 'touchend' ? [] : [touch],
              bubbles: true,
              cancelable: true,
            })
          );
        }

        // touchstart
        dispatch('touchstart', startX, startY);

        // Hold for holdMs, then drag
        setTimeout(() => {
          for (let i = 1; i <= steps; i++) {
            const x = startX + ((endX - startX) * i) / steps;
            const y = startY + ((endY - startY) * i) / steps;
            setTimeout(() => {
              dispatch('touchmove', x, y);
              if (i === steps) {
                setTimeout(() => dispatch('touchend', endX, endY), 16);
              }
            }, i * 16);
          }
        }, holdMs);
      },
      { canvasId, startX, startY, endX, endY, holdMs, steps: 10 }
    );

    await page.waitForTimeout(holdMs + 10 * 16 + 100);
  }

  /**
   * Get the page coordinates for the center of a canvas panel at (col, row).
   */
  static async getPanelCenter(
    page: Page,
    canvas: Locator,
    col: number,
    row: number
  ): Promise<{ x: number; y: number }> {
    const box = await canvas.boundingBox();
    if (!box) throw new Error('Canvas not visible');

    const coords = await page.evaluate(
      ({ col, row }) => {
        const ps = typeof panelSize !== 'undefined' ? panelSize : 40;
        const topPadding = typeof bumpers !== 'undefined' && bumpers.length > 0 ? ps * 0.8 : 0;
        return {
          relX: col * ps + ps / 2,
          relY: topPadding + row * ps + ps / 2,
        };
      },
      { col, row }
    );

    const scaleX = box.width / (await canvas.evaluate((el) => (el as HTMLCanvasElement).width));
    const scaleY = box.height / (await canvas.evaluate((el) => (el as HTMLCanvasElement).height));

    return {
      x: box.x + coords.relX * scaleX,
      y: box.y + coords.relY * scaleY,
    };
  }
}
