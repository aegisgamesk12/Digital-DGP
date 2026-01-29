
import React, { useEffect, useRef } from 'react';

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

interface AudioPlayerProps {
  base64Audio?: string;
  enabled: boolean;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ base64Audio, enabled }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    if (!enabled && sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
      return;
    }

    if (enabled && base64Audio) {
      const play = async () => {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        
        if (sourceRef.current) {
          sourceRef.current.stop();
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true; // Loop the Phonk "track"
        source.connect(ctx.destination);
        source.start();
        sourceRef.current = source;
      };

      play();
    }

    return () => {
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
    };
  }, [base64Audio, enabled]);

  return null;
};
