/**
 * Wraps the noise-suppression AudioWorklet for easy use from the main thread.
 * Attaches a noise-suppression AudioWorkletNode to a MediaStream.
 * Returns the cleaned MediaStream that should be used for recording.
 */
export async function attachNoiseSuppression(
  stream: MediaStream
): Promise<{ node: AudioWorkletNode; ctx: AudioContext; cleanedStream: MediaStream; ready: Promise<void> }> {
  const ctx = new AudioContext({ sampleRate: 48000 });
  ctx.resume().catch(() => {});

  // Load the processor script
  await ctx.audioWorklet.addModule("/voice-processor/noise-suppression-processor.js");

  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "noise-suppression", {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [1],
  });

  const ready = new Promise<void>((resolve) => {
    node.port.onmessage = (e) => {
      if (e.data?.type === "ready") resolve();
    };
    // Timeout fallback — don't block forever
    setTimeout(resolve, 2000);
  });

  source.connect(node);
  const dest = ctx.createMediaStreamDestination();
  node.connect(dest);

  const cleanedStream = dest.stream;
  // Copy original stream metadata
  const audioTrack = cleanedStream.getAudioTracks()[0];
  if (audioTrack) {
    audioTrack.enabled = true;
  }

  return { node, ctx, cleanedStream, ready };
}
