// WebRTC IP leak prevention
export function getWebRTCPatch(): string {
  return `
    (function() {
      // Completely block WebRTC to prevent IP leaks

      // Override RTCPeerConnection
      const originalRTCPeerConnection = window.RTCPeerConnection;

      class FakeRTCPeerConnection {
        constructor(configuration) {
          this.localDescription = null;
          this.remoteDescription = null;
          this.connectionState = 'new';
          this.iceConnectionState = 'new';
          this.iceGatheringState = 'new';
          this.signalingState = 'stable';
          this.onicecandidate = null;
          this.oniceconnectionstatechange = null;
          this.onicegatheringstatechange = null;
          this.onnegotiationneeded = null;
          this.ondatachannel = null;
          this.ontrack = null;
        }

        createOffer() {
          return Promise.resolve({
            type: 'offer',
            sdp: ''
          });
        }

        createAnswer() {
          return Promise.resolve({
            type: 'answer',
            sdp: ''
          });
        }

        setLocalDescription(description) {
          this.localDescription = description;
          return Promise.resolve();
        }

        setRemoteDescription(description) {
          this.remoteDescription = description;
          return Promise.resolve();
        }

        addIceCandidate(candidate) {
          return Promise.resolve();
        }

        createDataChannel(label, options) {
          return {
            label,
            ordered: true,
            reliable: true,
            readyState: 'connecting',
            send: () => {},
            close: () => {},
            onopen: null,
            onclose: null,
            onerror: null,
            onmessage: null
          };
        }

        addTrack(track, stream) {
          return {
            track,
            transport: null,
            sender: null
          };
        }

        removeTrack() {}

        getStats() {
          return Promise.resolve(new Map());
        }

        close() {
          this.connectionState = 'closed';
          this.iceConnectionState = 'closed';
          this.signalingState = 'closed';
        }

        addEventListener(type, listener) {}
        removeEventListener(type, listener) {}
      }

      // Replace RTCPeerConnection
      window.RTCPeerConnection = FakeRTCPeerConnection;
      window.webkitRTCPeerConnection = FakeRTCPeerConnection;
      window.mozRTCPeerConnection = FakeRTCPeerConnection;

      // Block RTCDataChannel
      if (window.RTCDataChannel) {
        window.RTCDataChannel = class FakeRTCDataChannel {
          constructor() {
            this.readyState = 'connecting';
          }
          send() {}
          close() {}
        };
      }

      // Override navigator.mediaDevices.getUserMedia
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = function(constraints) {
          // Allow camera/mic access but block if it could expose IPs
          return originalGetUserMedia(constraints);
        };
      }

      // Override navigator.mediaDevices.enumerateDevices to limit info
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices.bind(navigator.mediaDevices);
        navigator.mediaDevices.enumerateDevices = async function() {
          const devices = await originalEnumerateDevices();
          // Return devices but with generic IDs
          return devices.map((device, index) => ({
            deviceId: 'device_' + index,
            groupId: 'group_' + Math.floor(index / 2),
            kind: device.kind,
            label: ''  // Don't expose labels
          }));
        };
      }

      // Block RTCIceCandidate to prevent IP leakage
      window.RTCIceCandidate = class FakeRTCIceCandidate {
        constructor(candidate) {
          this.candidate = '';
          this.sdpMid = candidate?.sdpMid || null;
          this.sdpMLineIndex = candidate?.sdpMLineIndex || null;
        }
      };
    })();
  `;
}
