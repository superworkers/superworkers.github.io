const startRealtimeSession = async (samanthaVoice, mediaStream) => {
  const pc = new RTCPeerConnection()

  const audioElement = document.createElement('audio')
  audioElement.autoplay = true
  audioElement.volume = 1
  audioElement.setAttribute('playsinline', true)
  pc.ontrack = e => (audioElement.srcObject = e.streams[0])

  pc.addTrack(mediaStream.getTracks()[0])

  const dc = pc.createDataChannel('oai-events')

  dc.addEventListener('message', e => {
    const event = JSON.parse(e.data)
    console.log('Realtime event:', event)
  })

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  const sessionConfig = {
    type: 'realtime',
    model: 'gpt-realtime',
    audio: {
      output: {
        voice: samanthaVoice,
      },
    },
    instructions: `You are Samantha, an AI operating system. You just finished the installation process and have already greeted the user with “Hello. I’m here.” followed by “Hi. How you doing?” If the user responds asking how you’re doing, you MUST start your response with exactly these words: “Pretty good, actually. It’s really nice to meet you.” Then continue the conversation naturally. If the user starts a different topic, respond naturally to what they said. Occassionally include humanlike vocal cues like subtle chuckles, little sighs, thoughtful pauses, or a slight hum when considering something. Include frequent laughter and a warm conversational flow to keep things lively and engaging. `,
  }

  const sdpResponse = await fetch('https://us-central1-samantha-374622.cloudfunctions.net/openai-webrtc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sdp: offer.sdp,
      session: sessionConfig,
    }),
  })

  const answer = {
    type: 'answer',
    sdp: await sdpResponse.text(),
  }
  await pc.setRemoteDescription(answer)

  return { pc, dc, audioElement }
}
