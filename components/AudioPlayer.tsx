
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

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
  bgMusicBase64?: string;
  enabled: boolean;
}

export interface AudioPlayerRef {
  playSFX: (base64: string) => void;
}

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(({ bgMusicBase64, enabled }, ref) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const bgSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const getCtx = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  useImperativeHandle(ref, () => ({
    playSFX: async (base64: string) => {
      if (!enabled) return;
      const ctx = getCtx();
      if (ctx.state === 'suspended') await ctx.resume();
      
      const audioBuffer = await decodeAudioData(decode(base64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start();
    }
  }));

  useEffect(() => {
    if (!enabled && bgSourceRef.current) {
      bgSourceRef.current.stop();
      bgSourceRef.current = null;
      return;
    }

    if (enabled && bgMusicBase64) {
      const play = async () => {
        const ctx = getCtx();
        if (ctx.state === 'suspended') await ctx.resume();

        const audioBuffer = await decodeAudioData(decode(bgMusicBase64), ctx, 24000, 1);
        
        if (bgSourceRef.current) {
          try { bgSourceRef.current.stop(); } catch(e) {}
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        source.connect(ctx.destination);
        source.start();
        bgSourceRef.current = source;
      };

      play();
    }

    return () => {
      if (bgSourceRef.current) {
        try { bgSourceRef.current.stop(); } catch(e) {}
        bgSourceRef.current = null;
      }
    };
  }, [bgMusicBase64, enabled]);

  return null;
});
