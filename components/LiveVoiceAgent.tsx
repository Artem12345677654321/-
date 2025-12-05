import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, X } from 'lucide-react';
import { connectLiveSession, createBlob, decodeBase64, decodeAudioData } from '../services/geminiService';

export const LiveVoiceAgent: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'listening' | 'speaking'>('idle');
  const [volume, setVolume] = useState(0); // For visualizer
  
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const cleanupAudio = useCallback(() => {
    if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (inputContextRef.current) { inputContextRef.current.close(); inputContextRef.current = null; }
    if (outputContextRef.current) { outputContextRef.current.close(); outputContextRef.current = null; }
    if (sessionRef.current) { try { sessionRef.current.close(); } catch (e) { /* ignore */ } sessionRef.current = null; }
    setIsActive(false);
    setStatus('idle');
    setVolume(0);
  }, []);

  const startSession = async () => {
    if (isActive) {
      cleanupAudio();
      return;
    }
    try {
      setStatus('connecting');
      setIsActive(true);
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Simple visualizer logic
      const analyser = inputContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const source = inputContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      
      const updateVolume = () => {
        if (!isActive) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setVolume(avg);
        requestAnimationFrame(updateVolume);
      };
      // requestAnimationFrame(updateVolume); // Triggered inside effect mostly

      sessionPromiseRef.current = connectLiveSession({
        onOpen: () => {
          setStatus('listening');
          if (!inputContextRef.current || !streamRef.current) return;
          const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
          const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = createBlob(inputData);
            sessionPromiseRef.current?.then(session => {
                sessionRef.current = session;
                session.sendRealtimeInput({ media: pcmBlob });
            });
            // Visualizer pulse from input
            setVolume(Math.max(...inputData) * 100); 
          };
          source.connect(processor);
          processor.connect(inputContextRef.current.destination);
          processorRef.current = processor;
        },
        onMessage: async (message) => {
          const audioStr = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audioStr) {
            setStatus('speaking');
            if (!outputContextRef.current) return;
            const audioBytes = decodeBase64(audioStr);
            const audioBuffer = await decodeAudioData(audioBytes, outputContextRef.current, 24000);
            const source = outputContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputContextRef.current.destination);
            source.addEventListener('ended', () => {
               setStatus('listening');
            });
            source.start(0);
          }
          if (message.serverContent?.interrupted) {
             setStatus('listening');
          }
        },
        onClose: cleanupAudio,
        onError: cleanupAudio
      });
    } catch (error) {
      console.error(error);
      cleanupAudio();
    }
  };

  return (
    <div className={`fixed bottom-8 right-8 z-[9998] transition-all duration-700 ease-[cubic-bezier(0.19,1,0.22,1)] ${isActive ? 'w-64 h-24' : 'w-16 h-16'}`}>
      <div className="absolute inset-0 bg-[#0F0F0F]/90 backdrop-blur-xl border border-[#D4AF37]/30 rounded-full shadow-2xl flex items-center overflow-hidden">
        
        {/* Expanded Content */}
        <div className={`flex-1 pl-6 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 hidden'}`}>
            <div className="text-[#D4AF37] text-xs tracking-[0.2em] uppercase mb-1">Concierge</div>
            <div className="text-white text-sm font-light">
                {status === 'connecting' && 'Connecting...'}
                {status === 'listening' && 'Listening...'}
                {status === 'speaking' && 'Speaking...'}
            </div>
            {/* Visualizer Lines */}
            <div className="flex gap-1 mt-2 h-3 items-end">
                {[1,2,3,4].map(i => (
                    <div key={i} className="w-1 bg-[#D4AF37]" style={{ height: `${Math.max(20, Math.min(100, volume * (i % 2 === 0 ? 1.5 : 0.8)))}%`, transition: 'height 0.1s' }}></div>
                ))}
            </div>
        </div>

        {/* Trigger Button */}
        <button
          onClick={startSession}
          className={`absolute right-0 top-0 h-full aspect-square flex items-center justify-center rounded-full transition-transform duration-300 hover:scale-105 ${isActive ? 'bg-transparent' : 'bg-[#D4AF37]'}`}
        >
          {isActive ? (
             <X className="text-[#D4AF37] w-6 h-6" />
          ) : (
             <Mic className="text-[#050505] w-6 h-6" />
          )}
        </button>
      </div>
      
      {/* Pulse Effect when idle */}
      {!isActive && (
          <div className="absolute inset-0 border border-[#D4AF37] rounded-full animate-ping opacity-20 pointer-events-none"></div>
      )}
    </div>
  );
};