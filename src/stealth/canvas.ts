// Canvas fingerprint spoofing
export function getCanvasPatch(seed: string, noise: number): string {
  return `
    (function() {
      const seed = '${seed}';
      const noise = ${noise};

      // Simple seeded random number generator
      function seededRandom(s) {
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
          const char = s.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return function() {
          hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
          hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
          return ((hash ^= hash >>> 16) >>> 0) / 4294967296;
        };
      }

      const rng = seededRandom(seed);

      // Override toDataURL
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
          try {
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            const data = imageData.data;

            // Add consistent noise based on seed
            for (let i = 0; i < data.length; i += 4) {
              // Modify RGB channels slightly
              const noiseValue = (rng() - 0.5) * noise * 255;
              data[i] = Math.max(0, Math.min(255, data[i] + noiseValue));
              data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noiseValue));
              data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noiseValue));
            }

            ctx.putImageData(imageData, 0, 0);
          } catch (e) {
            // Ignore if canvas is tainted
          }
        }
        return originalToDataURL.call(this, type, quality);
      };

      // Override toBlob
      const originalToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
        const ctx = this.getContext('2d');
        if (ctx && this.width > 0 && this.height > 0) {
          try {
            const imageData = ctx.getImageData(0, 0, this.width, this.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
              const noiseValue = (rng() - 0.5) * noise * 255;
              data[i] = Math.max(0, Math.min(255, data[i] + noiseValue));
              data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noiseValue));
              data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noiseValue));
            }

            ctx.putImageData(imageData, 0, 0);
          } catch (e) {
            // Ignore if canvas is tainted
          }
        }
        return originalToBlob.call(this, callback, type, quality);
      };

      // Override getImageData to return consistent noise
      const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function(sx, sy, sw, sh) {
        const imageData = originalGetImageData.call(this, sx, sy, sw, sh);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
          const noiseValue = (rng() - 0.5) * noise * 255;
          data[i] = Math.max(0, Math.min(255, data[i] + noiseValue));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noiseValue));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noiseValue));
        }

        return imageData;
      };
    })();
  `;
}
