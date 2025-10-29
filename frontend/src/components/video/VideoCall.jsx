import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

const pcConfig = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

const VideoCall = ({ socket, roomId }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // socketId -> MediaStream
  const [peers, setPeers] = useState({}); // socketId -> RTCPeerConnection
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const localVideoRef = useRef(null);

  const getMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    return stream;
  }, []);

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

    // Add existing local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }

    setPeers((prev) => ({ ...prev, [peerSocketId]: pc }));
    return pc;
  }, [localStream, peers, roomId, socket]);

  // Start call: join signaling and create offers to existing peers
  useEffect(() => {
    if (!socket || !roomId) return;

    let isMounted = true;

    (async () => {
      const stream = localStream || (await getMedia());
      if (!isMounted) return;
      // Join signaling
      socket.emit('webrtc:join', { roomId });
    })();

    const handlePeers = async ({ peers: currentPeers }) => {
      for (const peerId of currentPeers) {
        const pc = ensurePeer(peerId);
        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc:offer', { roomId, toSocketId: peerId, description: offer });
      }
    };

    const handleOffer = async ({ fromSocketId, description }) => {
      const pc = ensurePeer(fromSocketId);
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
        console.error('Error adding received ICE candidate', e);
      }
    };

    const handlePeerLeft = ({ socketId }) => {
      const pc = peers[socketId];
      if (pc) {
        pc.close();
      }
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
      isMounted = false;
      socket.off('webrtc:peers', handlePeers);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice', handleIce);
      socket.off('webrtc:peer-left', handlePeerLeft);
    };
  }, [socket, roomId, ensurePeer, getMedia, localStream, peers]);

  // Apply camera/mic toggles
  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = cameraOn));
  }, [cameraOn, localStream]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn, localStream]);

  const leaveCall = useCallback(() => {
    if (socket && roomId) socket.emit('webrtc:leave', { roomId });
    // stop tracks
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    // close peers
    Object.values(peers).forEach((pc) => pc.close());
    setPeers({});
    setRemoteStreams({});
  }, [localStream, peers, roomId, socket]);

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-xl p-3 w-[360px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Video Call</h3>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1 rounded ${cameraOn ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setCameraOn((v) => !v)}
            title={cameraOn ? 'Turn camera off' : 'Turn camera on'}
          >
            Cam
          </button>
          <button
            className={`px-3 py-1 rounded ${micOn ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
            onClick={() => setMicOn((v) => !v)}
            title={micOn ? 'Mute mic' : 'Unmute mic'}
          >
            Mic
          </button>
          <button
            className="px-3 py-1 rounded bg-red-600 text-white"
            onClick={leaveCall}
            title="Leave call"
          >
            Leave
          </button>
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
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-32 bg-black rounded" />;
};

export default VideoCall;
