// AudioContext fingerprint spoofing
export function getAudioPatch(seed: string, noise: number): string {
  return `
    (function() {
      const seed = '${seed}';
      const noise = ${noise};

      // Seeded random for consistent perturbation
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
      const noiseValue = rng() * noise;

      // Override AudioBuffer.getChannelData
      const originalGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function(channel) {
        const data = originalGetChannelData.call(this, channel);

        // Add slight noise to the audio data
        for (let i = 0; i < data.length; i++) {
          data[i] += (rng() - 0.5) * noiseValue;
        }

        return data;
      };

      // Override AnalyserNode.getFloatFrequencyData
      const originalGetFloatFrequencyData = AnalyserNode.prototype.getFloatFrequencyData;
      AnalyserNode.prototype.getFloatFrequencyData = function(array) {
        originalGetFloatFrequencyData.call(this, array);

        for (let i = 0; i < array.length; i++) {
          array[i] += (rng() - 0.5) * noiseValue * 100;
        }
      };

      // Override AnalyserNode.getByteFrequencyData
      const originalGetByteFrequencyData = AnalyserNode.prototype.getByteFrequencyData;
      AnalyserNode.prototype.getByteFrequencyData = function(array) {
        originalGetByteFrequencyData.call(this, array);

        for (let i = 0; i < array.length; i++) {
          const adjusted = array[i] + (rng() - 0.5) * noiseValue * 10;
          array[i] = Math.max(0, Math.min(255, Math.round(adjusted)));
        }
      };

      // Override OscillatorNode to add slight frequency variation
      const originalOscillatorStart = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function(when) {
        if (this.frequency && this.frequency.value) {
          this.frequency.value += (rng() - 0.5) * 0.001;
        }
        return originalOscillatorStart.call(this, when);
      };

      // Override AudioContext.createOscillator for consistent fingerprint
      const originalCreateOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function() {
        const oscillator = originalCreateOscillator.call(this);
        const originalConnect = oscillator.connect.bind(oscillator);

        oscillator.connect = function(destination, outputIndex, inputIndex) {
          if (destination instanceof AudioNode) {
            return originalConnect(destination, outputIndex, inputIndex);
          }
          return originalConnect(destination, outputIndex);
        };

        return oscillator;
      };
    })();
  `;
}
