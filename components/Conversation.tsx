import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, Blob } from '@google/genai';
import type { Topic, TranscriptEntry } from '../types';
import { encode, decode, decodeAudioData } from '../services/audioUtils';
import { StopIcon, BackIcon, LoadingSpinnerIcon, RepeatIcon, MicrophoneIcon } from './icons/Icons';
import { CEFR_PROMPTS } from '../constants';

interface ConversationProps {
  topic: Topic;
  onEndSession: () => void;
  onSaveSession: (transcript: TranscriptEntry[]) => Promise<void>;
  voiceName: string;
  duration: number; // in minutes
  cefrLevel: keyof typeof CEFR_PROMPTS;
}

type Status = 'idle' | 'connecting' | 'connected' | 'error';

const Conversation: React.FC<ConversationProps> = ({ topic, onEndSession, onSaveSession, voiceName, duration, cefrLevel }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [transcriptHistory, setTranscriptHistory] = useState<TranscriptEntry[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState({ user: '', model: '' });
  const [timeLeft, setTimeLeft] = useState<number | null>(duration > 0 ? duration * 60 : null);
  const [lastModelAudio, setLastModelAudio] = useState<string | null>(null);
  
  const transcriptHistoryRef = useRef<TranscriptEntry[]>([]);
  useEffect(() => {
    transcriptHistoryRef.current = transcriptHistory;
  }, [transcriptHistory]);

  const onEndSessionRef = useRef(onEndSession);
  const onSaveSessionRef = useRef(onSaveSession);
  useEffect(() => {
    onEndSessionRef.current = onEndSession;
    onSaveSessionRef.current = onSaveSession;
  }, [onEndSession, onSaveSession]);

  const hasSavedRef = useRef(false);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const transcriptContainerRef = useRef<HTMLDivElement | null>(null);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const nextStartTimeRef = useRef(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const stopAllAudio = useCallback(() => {
    if (outputAudioContextRef.current) {
        for (const source of audioSourcesRef.current.values()) {
            source.stop();
        }
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = null;

    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close()).catch(console.error);
      sessionPromiseRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if(scriptProcessorRef.current){
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current.onaudioprocess = null;
        scriptProcessorRef.current = null;
    }
    if(mediaStreamSourceRef.current){
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      inputAudioContextRef.current.close().catch(console.error);
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      outputAudioContextRef.current.close().catch(console.error);
      outputAudioContextRef.current = null;
    }
    stopAllAudio();
  }, [stopAllAudio]);


  const handleEndAndSave = useCallback(() => {
    if (hasSavedRef.current) return;
    hasSavedRef.current = true;
    
    // Construct the final transcript including any partial, uncommitted text
    const finalTranscript = [...transcriptHistoryRef.current];
    const userText = currentInputTranscriptionRef.current.trim();
    const modelText = currentOutputTranscriptionRef.current.trim();
    if (userText) {
        finalTranscript.push({ author: 'user', text: userText });
    }
    if (modelText) {
        finalTranscript.push({ author: 'model', text: modelText });
    }
    
    // Call save without awaiting it. It will run in the background.
    onSaveSessionRef.current(finalTranscript);
    
    // Immediately navigate back.
    onEndSessionRef.current();
  }, []);


  const connectToLiveSession = useCallback(async () => {
    setStatus('connecting');
    setTranscriptHistory([]);
    hasSavedRef.current = false;
    
    // @ts-ignore
    inputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    try {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
        console.error("Mikrofonzugriff verweigert:", error);
        setStatus('error');
        return;
    }
    
    const combinedSystemInstruction = `${topic.systemInstruction} ${CEFR_PROMPTS[cefrLevel]}`;

    sessionPromiseRef.current = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      config: {
        systemInstruction: combinedSystemInstruction,
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
        },
      },
      callbacks: {
        onopen: () => {
          setStatus('connected');

          if (duration > 0) {
            timerIntervalRef.current = window.setInterval(() => {
              setTimeLeft(prev => {
                if (prev !== null && prev > 1) {
                    return prev - 1;
                }
                if (prev === 1) {
                   handleEndAndSave();
                }
                return 0;
              });
            }, 1000);
          }
          
          if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
          
          mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
          scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
          
          scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
            const pcmBlob: Blob = {
              data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
              mimeType: 'audio/pcm;rate=16000',
            };
            if(sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
            }
          };
          mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
          scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.outputTranscription) {
            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
             setCurrentTranscription(prev => ({...prev, model: currentOutputTranscriptionRef.current}));
          }
          if (message.serverContent?.inputTranscription) {
            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
            setCurrentTranscription(prev => ({...prev, user: currentInputTranscriptionRef.current}));
          }
          if (message.serverContent?.turnComplete) {
            const userInput = currentInputTranscriptionRef.current;
            const modelOutput = currentOutputTranscriptionRef.current;
            
            if (userInput || modelOutput) {
                const newEntries: TranscriptEntry[] = [];
                if (userInput) newEntries.push({ author: 'user', text: userInput });
                if (modelOutput) newEntries.push({ author: 'model', text: modelOutput });

                setTranscriptHistory(prev => [...prev, ...newEntries]);
            }
            
            currentInputTranscriptionRef.current = '';
            currentOutputTranscriptionRef.current = '';
            setCurrentTranscription({ user: '', model: '' });
          }
          if (message.serverContent?.interrupted) {
            stopAllAudio();
          }

          const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (audioData && outputAudioContextRef.current) {
            setLastModelAudio(audioData);
            const audioCtx = outputAudioContextRef.current;
            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioCtx.currentTime);
            const audioBuffer = await decodeAudioData(decode(audioData), audioCtx, 24000, 1);
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            source.addEventListener('ended', () => {
                audioSourcesRef.current.delete(source);
            });
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            audioSourcesRef.current.add(source);
          }
        },
        onerror: (e: ErrorEvent) => {
          console.error('Session-Fehler:', e);
          setStatus('error');
        },
        onclose: () => {
          cleanup();
        },
      }
    });
  }, [topic.systemInstruction, voiceName, duration, cefrLevel, handleEndAndSave, cleanup, stopAllAudio]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
  
   useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [transcriptHistory, currentTranscription]);

  const handleStartConversation = () => {
    // Erstellen und Entsperren des AudioContext bei Benutzergeste. Dies ist entscheidend für mobile Browser.
    if (!outputAudioContextRef.current) {
        try {
            // @ts-ignore
            outputAudioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        } catch (e) {
            console.error("Fehler beim Erstellen des AudioContext:", e);
            setStatus('error');
            return;
        }
    }
    
    const startSession = () => {
        // Spielen Sie einen stillen Ton ab, um den Audio-Kontext in allen Browsern vollständig freizuschalten.
        // Dies ist ein gängiger Workaround für Einschränkungen bei mobilen Browsern.
        const audioCtx = outputAudioContextRef.current!;
        const buffer = audioCtx.createBuffer(1, 1, 22050);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
        
        // Nachdem das Audio freigeschaltet ist, verbinden Sie sich mit der Sitzung.
        connectToLiveSession();
    };

    // Der AudioContext befindet sich möglicherweise in einem schwebenden Zustand und muss durch eine Benutzergeste fortgesetzt werden.
    if (outputAudioContextRef.current.state === 'suspended') {
      outputAudioContextRef.current.resume()
        .then(startSession)
        .catch(err => {
            console.error("Fehler beim Fortsetzen des AudioContext:", err);
            setStatus('error');
        });
    } else {
        startSession();
    }
  };

  const handleRepeat = async () => {
    if (!lastModelAudio || !outputAudioContextRef.current) return;
    const audioCtx = outputAudioContextRef.current;
    const audioBuffer = await decodeAudioData(decode(lastModelAudio), audioCtx, 24000, 1);
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.start();
  };
  
  const handleRetry = () => {
    cleanup();
    setStatus('idle');
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  const renderContent = () => {
    switch (status) {
        case 'idle':
            return (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-6xl mb-4">{topic.emoji}</div>
                    <p className="text-gray-600 mb-8">Bereit, das Gespräch zu beginnen?</p>
                    <button
                        onClick={handleStartConversation}
                        className="w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 bg-teal-500 hover:bg-teal-600 focus:ring-teal-400"
                        aria-label="Gespräch beginnen"
                    >
                        <MicrophoneIcon />
                    </button>
                </div>
            );
        case 'connecting':
            return (
                <div className="flex flex-col items-center justify-center h-full">
                    <LoadingSpinnerIcon className="w-12 h-12 text-teal-500" />
                    <p className="text-gray-500 mt-4">Verbindung wird hergestellt...</p>
                </div>
            );
        case 'error':
            return (
                 <div className="flex flex-col items-center justify-center h-full text-center">
                    <h3 className="text-xl font-semibold text-red-500 mb-2">Verbindungsfehler</h3>
                    <p className="text-gray-600 mb-6">
                        Es konnte keine Verbindung hergestellt werden. <br/>
                        Bitte stellen Sie sicher, dass Sie den Mikrofonzugriff erlaubt haben.
                    </p>
                    <div className="flex space-x-4">
                       <button onClick={onEndSession} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">
                           Zurück
                       </button>
                       <button onClick={handleRetry} className="px-4 py-2 rounded-lg bg-teal-500 text-white hover:bg-teal-600">
                           Erneut versuchen
                       </button>
                    </div>
                </div>
            );
        case 'connected':
             return (
                 <>
                    <div ref={transcriptContainerRef} id="transcript" className="flex-grow overflow-y-auto mb-4 p-2 space-y-4">
                        {transcriptHistory.map((entry, index) => (
                        <div key={index} className={`flex ${entry.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${entry.author === 'user' ? 'bg-teal-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                            <p>{entry.text}</p>
                            </div>
                        </div>
                        ))}
                        {currentTranscription.user && (
                            <div className="flex justify-end">
                                <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-teal-500 text-white rounded-br-none opacity-60">
                                    <p>{currentTranscription.user}</p>
                                </div>
                            </div>
                        )}
                        {currentTranscription.model && (
                            <div className="flex justify-start">
                                <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none opacity-60">
                                    <p>{currentTranscription.model}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-shrink-0 flex items-center justify-center pt-4 border-t border-gray-200">
                        <div className="w-24 flex justify-center">
                            <button
                                onClick={handleRepeat}
                                disabled={!lastModelAudio}
                                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 bg-gray-200 hover:bg-gray-300 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RepeatIcon />
                            </button>
                        </div>
                        <button
                        onClick={handleEndAndSave}
                        className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 bg-red-500 hover:bg-red-600 focus:ring-red-400"
                        >
                        <StopIcon />
                        </button>
                        <div className="w-24"></div>
                    </div>
                </>
             );
        default:
            return null;
    }
  }


  return (
    <div className="w-full h-full max-w-2xl flex flex-col bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <button onClick={handleEndAndSave} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
          <BackIcon />
        </button>
        <div className="text-center">
          <h2 className="text-xl font-bold">{topic.title}</h2>
          <p className="text-sm text-gray-500">{topic.language}</p>
        </div>
        <div className="w-20 text-right">
            {timeLeft !== null && status === 'connected' && (
                <span className="text-sm font-mono bg-gray-200 px-2 py-1 rounded">{formatTime(timeLeft)}</span>
            )}
        </div>
      </div>
      
      {renderContent()}

    </div>
  );
};

export default Conversation;