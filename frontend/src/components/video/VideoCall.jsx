import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FiVideo, FiVideoOff, FiMic, FiMicOff, FiPhoneOff, FiMove } from 'react-icons/fi';

const pcConfig = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

const VideoCall = ({ socket, roomId, onEnd }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> MediaStream
  const [peers, setPeers] = useState({}); // socketId -> RTCPeerConnection
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [inCall, setInCall] = useState(false);

  // draggable position
  const [position, setPosition] = useState({ x: 16, y: window.innerHeight - 240 });
  const dragStateRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const containerRef = useRef(null);

  const localVideoRef = useRef(null);

  const attachStreamToVideo = (videoEl, stream, muted = false) => {
    if (!videoEl) return;
    try {
      if (videoEl.srcObject !== stream) {
        videoEl.srcObject = stream;
      }
      videoEl.muted = muted;
      const playPromise = videoEl.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise.catch(() => {});
      }
    } catch (_) {}
  };

  const getMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    attachStreamToVideo(localVideoRef.current, stream, true);
    return stream;
  }, []);

  const addLocalTracksToPc = (pc, stream) => {
    const senders = pc.getSenders();
    const existingTracks = new Set(senders.map((s) => s.track && s.track.kind));
    stream.getTracks().forEach((track) => {
      if (!existingTracks.has(track.kind)) {
        pc.addTrack(track, stream);
      }
    });
  };

  const ensurePeer = useCallback((peerSocketId) => {
    if (peers[peerSocketId]) return peers[peerSocketId];
    const pc = new RTCPeerConnection(pcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice', { roomId, toSocketId: peerSocketId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStreams((prev) => ({ ...prev, [peerSocketId]: stream }));
    };

    if (localStream) {
      addLocalTracksToPc(pc, localStream);
    }

    setPeers((prev) => ({ ...prev, [peerSocketId]: pc }));
    return pc;
  }, [localStream, peers, roomId, socket]);

  // When local stream changes (e.g., user started call), add tracks to all PCs
  useEffect(() => {
    if (!localStream) return;
    Object.values(peers).forEach((pc) => addLocalTracksToPc(pc, localStream));
  }, [localStream, peers]);

  // Start the call: get media and join signaling
  const startCall = useCallback(async () => {
    if (inCall) return;
    await getMedia();
    if (socket && roomId) socket.emit('webrtc:join', { roomId });
    setInCall(true);
  }, [getMedia, inCall, roomId, socket]);

  const endCall = useCallback(() => {
    if (!inCall) return;
    try {
      if (socket && roomId) socket.emit('webrtc:leave', { roomId });
    } finally {
      // stop tracks
      localStream?.getTracks().forEach((t) => {
        try { t.stop(); } catch (_) {}
      });
      // detach local video
      if (localVideoRef.current) {
        try { localVideoRef.current.srcObject = null; } catch (_) {}
      }
      setLocalStream(null);
      // close peers
      Object.values(peers).forEach((pc) => {
        try { pc.close(); } catch (_) {}
      });
      setPeers({});
      setRemoteStreams({});
      setInCall(false);
      setCameraOn(true);
      setMicOn(true);
      // notify parent to close panel if provided
      if (typeof onEnd === 'function') onEnd();
    }
  }, [inCall, localStream, peers, roomId, socket, onEnd]);

  // Signaling wiring
  useEffect(() => {
    if (!socket || !roomId) return;

    const handlePeers = async ({ peers: currentPeers }) => {
      // Create offers to existing peers
      for (const peerId of currentPeers) {
        const pc = ensurePeer(peerId);
        if (localStream) addLocalTracksToPc(pc, localStream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc:offer', { roomId, toSocketId: peerId, description: offer });
      }
    };

    const handleOffer = async ({ fromSocketId, description }) => {
      const pc = ensurePeer(fromSocketId);
      if (localStream) addLocalTracksToPc(pc, localStream);
      await pc.setRemoteDescription(new RTCSessionDescription(description));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc:answer', { roomId, toSocketId: fromSocketId, description: answer });
    };

    const handleAnswer = async ({ fromSocketId, description }) => {
      const pc = ensurePeer(fromSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(description));
    };

    const handleIce = async ({ fromSocketId, candidate }) => {
      const pc = ensurePeer(fromSocketId);
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error('Error adding ICE candidate', e);
      }
    };

    const handlePeerLeft = ({ socketId }) => {
      const pc = peers[socketId];
      if (pc) pc.close();
      setPeers((prev) => {
        const { [socketId]: _, ...rest } = prev;
        return rest;
      });
      setRemoteStreams((prev) => {
        const { [socketId]: __, ...rest } = prev;
        return rest;
      });
    };

    socket.on('webrtc:peers', handlePeers);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice', handleIce);
    socket.on('webrtc:peer-left', handlePeerLeft);

    return () => {
      socket.off('webrtc:peers', handlePeers);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice', handleIce);
      socket.off('webrtc:peer-left', handlePeerLeft);
    };
  }, [socket, roomId, ensurePeer, peers, localStream]);

  // Apply camera/mic toggles
  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
  }, [cameraOn, localStream]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn, localStream]);

  // Keep local video element attached
  useEffect(() => {
    if (localStream) attachStreamToVideo(localVideoRef.current, localStream, true);
  }, [localStream]);

  const onClickVideo = async () => {
    if (!inCall) {
      await startCall();
    } else {
      setCameraOn((v) => !v);
    }
  };

  const onClickMic = async () => {
    if (!inCall) {
      await startCall();
      setMicOn(true);
    } else {
      setMicOn((v) => !v);
    }
  };

  // Drag handlers
  const onDragStart = (e) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    dragStateRef.current = {
      dragging: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    window.addEventListener('mousemove', onDragging);
    window.addEventListener('mouseup', onDragEnd, { once: true });
  };

  const onDragging = (e) => {
    if (!dragStateRef.current.dragging) return;
    const newX = Math.max(8, Math.min(window.innerWidth - 380 - 8, e.clientX - dragStateRef.current.offsetX));
    const newY = Math.max(8, Math.min(window.innerHeight - 220 - 8, e.clientY - dragStateRef.current.offsetY));
    setPosition({ x: newX, y: newY });
  };

  const onDragEnd = () => {
    dragStateRef.current.dragging = false;
    window.removeEventListener('mousemove', onDragging);
  };

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onDragging);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed bg-white rounded-lg shadow-xl p-3 w-[380px]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex items-center justify-between mb-2 cursor-move select-none" onMouseDown={onDragStart}>
        <div className="flex items-center gap-2">
          <FiMove />
          <h3 className="font-semibold">Video Call</h3>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className={`p-2 rounded ${inCall && cameraOn ? 'bg-green-600 text-white' : inCall ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
            onClick={onClickVideo}
            title={!inCall ? 'Start call' : cameraOn ? 'Turn camera off' : 'Turn camera on'}
          >
            {!inCall ? <FiVideo /> : cameraOn ? <FiVideo /> : <FiVideoOff />}
          </button>
          <button
            className={`p-2 rounded ${inCall && micOn ? 'bg-green-600 text-white' : inCall ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
            onClick={onClickMic}
            title={!inCall ? 'Start call (mic on)' : micOn ? 'Mute mic' : 'Unmute mic'}
          >
            {micOn ? <FiMic /> : <FiMicOff />}
          </button>
          {inCall && (
            <button
              className="p-2 rounded bg-red-600 text-white"
              onClick={endCall}
              title="End call"
            >
              <FiPhoneOff />
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-32 bg-black rounded" />
        {Object.entries(remoteStreams).map(([sid, stream]) => (
          <VideoTile key={sid} stream={stream} />
        ))}
      </div>
    </div>
  );
};

const VideoTile = ({ stream }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      try {
        if (ref.current.srcObject !== stream) {
          ref.current.srcObject = stream;
        }
        const p = ref.current.play();
        if (p && typeof p.then === 'function') p.catch(() => {});
      } catch (_) {}
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-32 bg-black rounded" />;
};

export default VideoCall;
