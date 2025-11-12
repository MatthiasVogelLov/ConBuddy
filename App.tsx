import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { Topic, AppSettings, ConversationSession, VocabularyEntry } from './types';
import TopicSelection from './components/TopicSelection';
import Conversation from './components/Conversation';
import { INITIAL_TOPICS, VOICES, CEFR_LEVELS, CEFR_PROMPTS } from './constants';
import { BackIcon, TrashIcon, PlusIcon, PlayIcon, LoadingSpinnerIcon, DocumentTextIcon, SettingsIcon, ShareIcon } from './components/icons/Icons';
import { decode, decodeAudioData } from './services/audioUtils';
import type { TranscriptEntry } from './types';

// --- About Component ---
const About: React.FC<{onBack: () => void}> = ({ onBack }) => (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 animate-fade-in">
        <div className="flex items-center mb-6">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors mr-4">
                <BackIcon />
            </button>
            <h2 className="text-2xl font-bold">Über ConversationBuddy</h2>
        </div>
        <div className="space-y-4 text-gray-600">
            <p>Diese App wurde entwickelt, um das Sprechen von Fremdsprachen zu üben.</p>
            <p>Erstellt, um die Fähigkeiten der Gemini-API zu demonstrieren.</p>
        </div>
    </div>
);


// --- Settings Component ---
interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onGoToAdmin: () => void;
  onGoToAbout: () => void;
  onBack: () => void;
  preloadedAudios: Record<string, AudioBuffer | null>;
  onUpdatePreloadedAudios: (audios: Record<string, AudioBuffer | null>) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange, onGoToAdmin, onGoToAbout, onBack, preloadedAudios, onUpdatePreloadedAudios }) => {
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // @ts-ignore
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
    return () => {
        audioContextRef.current?.close().catch(console.error);
    }
  }, []);
  
  const handlePreviewVoice = async (voiceId: string) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx || previewingVoiceId) return;

    setPreviewingVoiceId(voiceId);

    let audioBuffer = preloadedAudios[voiceId];

    if (!audioBuffer) {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: 'Bonjour, voici un aperçu de ma voix.' }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const newAudioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                onUpdatePreloadedAudios({ ...preloadedAudios, [voiceId]: newAudioBuffer });
                audioBuffer = newAudioBuffer;
            } else {
                throw new Error("Keine Audiodaten empfangen");
            }
        } catch (error) {
            console.error(`Fehler beim Laden der Stimme ${voiceId}:`, error);
            alert("Audio-Vorschau konnte nicht geladen werden.");
            setPreviewingVoiceId(null);
            return;
        }
    }
    
    if (!audioBuffer) {
        setPreviewingVoiceId(null);
        return;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    source.onended = () => {
        setPreviewingVoiceId(null);
    };
    source.start();
  };


  return (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 animate-fade-in">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors mr-4">
          <BackIcon />
        </button>
        <h2 className="text-2xl font-bold">Einstellungen</h2>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            Stimme auswählen
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VOICES.map(voice => (
              <div key={voice.id} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${settings.voiceId === voice.id ? 'bg-teal-500 text-white ring-2 ring-teal-500' : 'bg-gray-100 hover:bg-gray-200'}`}>
                <span onClick={() => onSettingsChange({ ...settings, voiceId: voice.id })} className="flex-grow cursor-pointer">{voice.name}</span>
                <button onClick={() => handlePreviewVoice(voice.id)} disabled={!!previewingVoiceId} className="p-2 rounded-full hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
                  {previewingVoiceId === voice.id ? <LoadingSpinnerIcon /> : <PlayIcon />}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Sprachniveau (GER)</h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {CEFR_LEVELS.map(level => (
              <button
                key={level}
                onClick={() => onSettingsChange({ ...settings, cefrLevel: level })}
                className={`px-4 py-2 rounded-lg transition-colors text-sm ${settings.cefrLevel === level ? 'bg-teal-500 text-white ring-2 ring-teal-500' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Gesprächsdauer</h3>
          <div className="flex space-x-4">
            {[0, 3, 5].map(duration => (
              <button
                key={duration}
                onClick={() => onSettingsChange({ ...settings, duration })}
                className={`px-4 py-2 rounded-lg transition-colors flex-grow ${settings.duration === duration ? 'bg-teal-500 text-white ring-2 ring-teal-500' : 'bg-gray-200 hover:bg-gray-300'}`}
              >
                {duration === 0 ? 'Unbegrenzt' : `${duration} Minuten`}
              </button>
            ))}
          </div>
        </div>
        
        <div>
           <h3 className="text-lg font-semibold mb-2">Über die App</h3>
           <button
             onClick={onGoToAbout}
             className="w-full bg-gray-200 hover:bg-gray-300 font-bold py-2 px-4 rounded transition-colors"
           >
             Über ConversationBuddy
           </button>
        </div>

        <div>
           <h3 className="text-lg font-semibold mb-2">Themenverwaltung</h3>
           <button
             onClick={onGoToAdmin}
             className="w-full bg-gray-200 hover:bg-gray-300 font-bold py-2 px-4 rounded transition-colors"
           >
             Themen bearbeiten
           </button>
        </div>
      </div>
    </div>
  );
};

// --- TopicAdmin Component ---
interface TopicAdminProps {
  topics: Topic[];
  onAddTopic: (topic: Omit<Topic, 'id' | 'language'>) => void;
  onDeleteTopic: (topicId: string) => void;
  onBack: () => void;
}

const TopicAdmin: React.FC<TopicAdminProps> = ({ topics, onAddTopic, onDeleteTopic, onBack }) => {
    const [newTopic, setNewTopic] = useState({ title: '', emoji: '', systemInstruction: '' });

    const handleAdd = () => {
        if (newTopic.title && newTopic.systemInstruction) {
            onAddTopic(newTopic);
            setNewTopic({ title: '', emoji: '', systemInstruction: '' });
        }
    };

    return (
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 animate-fade-in">
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors mr-4">
                    <BackIcon />
                </button>
                <h2 className="text-2xl font-bold">Themen verwalten</h2>
            </div>

            <div className="space-y-2 mb-6">
                <h3 className="text-lg font-semibold mb-2">Bestehende Themen</h3>
                {topics.length > 0 ? topics.map(topic => (
                    <div key={topic.id} className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
                        <div className="flex items-center">
                            <span className="text-2xl mr-3">{topic.emoji}</span>
                            <span>{topic.title}</span>
                        </div>
                        <button onClick={() => onDeleteTopic(topic.id)}>
                            <TrashIcon />
                        </button>
                    </div>
                )) : <p className="text-gray-500">Keine Themen vorhanden.</p>}
            </div>

            <div>
                 <h3 className="text-lg font-semibold mb-2">Neues Thema hinzufügen</h3>
                 <div className="space-y-4 bg-gray-100 p-4 rounded-lg">
                    <input
                        type="text"
                        placeholder="Titel (z.B. Nach dem Weg fragen)"
                        value={newTopic.title}
                        onChange={e => setNewTopic({...newTopic, title: e.target.value})}
                        className="w-full p-2 bg-white rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                     <input
                        type="text"
                        placeholder="Emoji (z.B. 🗺️)"
                        value={newTopic.emoji}
                        onChange={e => setNewTopic({...newTopic, emoji: e.target.value})}
                        className="w-full p-2 bg-white rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <textarea
                        placeholder="Systemanweisung (Beschreibe die Rolle der KI auf Französisch)"
                        value={newTopic.systemInstruction}
                        onChange={e => setNewTopic({...newTopic, systemInstruction: e.target.value})}
                        rows={4}
                        className="w-full p-2 bg-white rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <button
                        onClick={handleAdd}
                        className="w-full flex justify-center items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-400"
                        disabled={!newTopic.title || !newTopic.systemInstruction}
                    >
                        <PlusIcon /> Thema hinzufügen
                    </button>
                 </div>
            </div>
        </div>
    );
};

// --- ConversationHistory Component ---
interface ConversationHistoryProps {
    history: ConversationSession[];
    onSelectSession: (session: ConversationSession) => void;
    onBack: () => void;
    onClearHistory: () => void;
}

const ConversationHistory: React.FC<ConversationHistoryProps> = ({ history, onSelectSession, onBack, onClearHistory }) => (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                <BackIcon />
            </button>
            <h2 className="text-2xl font-bold">Gesprächsverlauf</h2>
            <div className="w-10">
                {history.length > 0 && (
                    <button onClick={onClearHistory} aria-label="Verlauf löschen" className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                        <TrashIcon />
                    </button>
                )}
            </div>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {history.length > 0 ? (
                [...history].reverse().map(session => (
                    <button key={session.id} onClick={() => onSelectSession(session)} className="w-full text-left flex items-center bg-gray-100 p-4 rounded-lg hover:bg-gray-200 transition-colors">
                        <span className="text-3xl mr-4">{session.topic.emoji}</span>
                        <div>
                            <p className="font-semibold">{session.topic.title}</p>
                            <p className="text-sm text-gray-500">{new Date(session.date).toLocaleString('de-DE')}</p>
                        </div>
                    </button>
                ))
            ) : (
                <p className="text-center text-gray-500 py-8">Keine gespeicherten Gespräche.</p>
            )}
        </div>
    </div>
);

// --- HistoryDetail Component ---
interface HistoryDetailProps {
    session: ConversationSession;
    onBack: () => void;
    onPlayVocabWord: (word: string) => void;
    playingVocabWord: string | null;
}
const HistoryDetail: React.FC<HistoryDetailProps> = ({ session, onBack, onPlayVocabWord, playingVocabWord }) => (
     <div className="w-full max-w-2xl h-full flex flex-col bg-white rounded-lg shadow-lg p-4">
        <div className="flex-shrink-0 flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
            <BackIcon />
            </button>
            <div className="text-center">
            <h2 className="text-xl font-bold">{session.topic.title}</h2>
            <p className="text-sm text-gray-500">{new Date(session.date).toLocaleString('de-DE')}</p>
            </div>
            <div className="w-10" />
        </div>
        <div className="flex-grow overflow-y-auto p-2 space-y-4">
            <div>
                <h3 className="text-lg font-semibold mb-2 text-teal-600">Gespräch</h3>
                {session.transcript.map((entry, index) => (
                <div key={index} className={`flex mb-2 ${entry.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${entry.author === 'user' ? 'bg-teal-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                    <p>{entry.text}</p>
                    </div>
                </div>
                ))}
            </div>
            
            {session.feedback && (
                <div>
                    <h3 className="text-lg font-semibold my-4 border-t pt-4 border-gray-200 text-teal-600">Feedback & Korrekturen</h3>
                    <div className="space-y-3">
                        {session.feedback.split('\n').filter(line => line.trim().length > 1).map((line, index) => (
                            <div key={index} className="bg-gray-100 p-3 rounded-lg border-l-4 border-teal-500">
                                <p className="text-gray-700">{line.replace(/^[\s*-]+/, '').trim()}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {session.vocabulary && session.vocabulary.length > 0 && (
                 <div>
                    <h3 className="text-lg font-semibold my-4 border-t pt-4 border-gray-200 text-teal-600">Vokabelliste</h3>
                    <ul className="space-y-2">
                        {session.vocabulary.map((item, index) => (
                            <li key={index} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                                <div>
                                    <span className="font-semibold">{item.word}</span>
                                    <span className="text-gray-500 ml-4">{item.translation}</span>
                                </div>
                                <button
                                    onClick={() => onPlayVocabWord(item.word)}
                                    disabled={!!playingVocabWord}
                                    className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label={`Wort "${item.word}" vorlesen`}
                                >
                                    {playingVocabWord === item.word ? <LoadingSpinnerIcon className="w-5 h-5" /> : <PlayIcon />}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </div>
);


// --- Main App Component ---
type View = 'topics' | 'conversation' | 'settings' | 'admin' | 'history' | 'historyDetail' | 'about';

const App: React.FC = () => {
  const [view, setView] = useState<View>('topics');
  const [topics, setTopics] = useState<Topic[]>(() => {
    const savedTopics = localStorage.getItem('topics');
    return savedTopics ? JSON.parse(savedTopics) : INITIAL_TOPICS;
  });
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationSession[]>(() => {
    const savedHistory = localStorage.getItem('conversationHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
   const [preloadedAudios, setPreloadedAudios] = useState<Record<string, AudioBuffer | null>>({});
   const [playingVocabWord, setPlayingVocabWord] = useState<string | null>(null);
   const [settings, setSettings] = useState<AppSettings>(() => {
    const savedSettings = localStorage.getItem('settings');
    const defaultSettings: AppSettings = {
        voiceId: 'Zephyr',
        duration: 3,
        cefrLevel: 'A2',
    };
    return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('topics', JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    localStorage.setItem('conversationHistory', JSON.stringify(conversationHistory));
  }, [conversationHistory]);

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setView('conversation');
  };
  
  const handleSaveSession = async (transcript: TranscriptEntry[]) => {
      if(!selectedTopic || transcript.length < 2) return;
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const formattedTranscript = transcript.map(e => `${e.author}: ${e.text}`).join('\n');

      let feedback = '';
      let vocabulary: VocabularyEntry[] = [];
      
      try {
        // Get Feedback
        const feedbackPrompt = `Hier ist die Abschrift eines französischen Gesprächs zwischen einem Benutzer (user) und einem KI-Tutor (model). Bitte gib konstruktives Feedback zur französischen Sprache des Benutzers in Stichpunkten. Konzentriere dich auf Grammatik, Wortwahl und Aussprachefehler, die aus dem Text ersichtlich sind. Antworte auf Deutsch.\n\nAbschrift:\n${formattedTranscript}`;
        const feedbackResponse = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: feedbackPrompt });
        feedback = feedbackResponse.text;

        // Get Vocabulary
        const vocabPrompt = `Hier ist die Abschrift eines französischen Gesprächs. Extrahiere 5-7 wichtige Vokabeln oder Redewendungen. Gib für jedes Wort das französische Wort und die deutsche Übersetzung an. Gib NUR das JSON-Objekt zurück.\n\nAbschrift:\n${formattedTranscript}`;
        const vocabResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: vocabPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            word: { type: Type.STRING },
                            translation: { type: Type.STRING },
                        },
                        required: ["word", "translation"]
                    },
                },
            },
        });
        const parsedVocab = JSON.parse(vocabResponse.text);
        if (Array.isArray(parsedVocab)) {
             vocabulary = parsedVocab;
        }

      } catch (error) {
        console.error("Fehler bei der Analyse des Gesprächs:", error);
      }

      const newSession: ConversationSession = {
          id: crypto.randomUUID(),
          topic: selectedTopic,
          date: new Date().toISOString(),
          transcript,
          feedback,
          vocabulary,
      };
      setConversationHistory(prev => [...prev, newSession]);
  };

  const handleEndSession = () => {
    setSelectedTopic(null);
    setView('topics');
  };

  const handleAddTopic = (topic: Omit<Topic, 'id' | 'language'>) => {
    const newTopic: Topic = {
      ...topic,
      id: crypto.randomUUID(),
      language: 'Français',
    };
    setTopics(prev => [...prev, newTopic]);
  };

  const handleDeleteTopic = (topicId: string) => {
    setTopics(prev => prev.filter(t => t.id !== topicId));
  };
  
  const handleClearHistory = () => {
    if(window.confirm("Möchten Sie den gesamten Gesprächsverlauf wirklich löschen?")) {
        setConversationHistory([]);
    }
  };
  
  const handlePlayVocabWord = async (word: string) => {
    if (playingVocabWord) return;
    setPlayingVocabWord(word);
    try {
        // @ts-ignore
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: word }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: settings.voiceId } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
            const source = audioCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtx.destination);
            source.onended = () => {
                setPlayingVocabWord(null);
                audioCtx.close().catch(console.error);
            };
            source.start();
        } else {
            throw new Error("Keine Audiodaten empfangen");
        }
    } catch (error) {
        console.error(`Fehler beim Abspielen des Wortes "${word}":`, error);
        alert("Audio konnte nicht abgespielt werden.");
        setPlayingVocabWord(null);
    }
  };
  
  const handleShare = () => {
    const shareData = {
      title: 'ConversationBuddy',
      text: 'Ich lerne Französisch mit dieser coolen KI-App. Probier sie auch mal aus!',
      url: window.location.href,
    };

    // The Web Share API is preferred, but mainly available on mobile.
    if (navigator.share) {
      navigator.share(shareData).catch((error) => {
        // AbortError is triggered when the user closes the share dialog, which is not an actual error.
        if (error.name !== 'AbortError') {
          console.error('Web Share API failed:', error);
          // As a fallback for other errors, try to copy to clipboard.
          navigator.clipboard.writeText(shareData.url)
            .then(() => alert('Teilen war nicht möglich. Der Link wurde stattdessen in die Zwischenablage kopiert.'))
            .catch(() => alert('Teilen war nicht möglich. Bitte kopieren Sie den Link manuell.'));
        }
      });
    } else {
      // Fallback for desktop browsers: copy to clipboard.
      navigator.clipboard.writeText(shareData.url)
        .then(() => alert('Link in die Zwischenablage kopiert!'))
        .catch(() => alert('Link konnte nicht kopiert werden. Bitte kopieren Sie den Link manuell.'));
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'conversation':
        return (
          <Conversation
            topic={selectedTopic!}
            onEndSession={handleEndSession}
            onSaveSession={handleSaveSession}
            voiceName={settings.voiceId}
            duration={settings.duration}
            cefrLevel={settings.cefrLevel}
          />
        );
      case 'settings':
        return (
          <Settings
            settings={settings}
            onSettingsChange={setSettings}
            onGoToAdmin={() => setView('admin')}
            onGoToAbout={() => setView('about')}
            onBack={() => setView('topics')}
            preloadedAudios={preloadedAudios}
            onUpdatePreloadedAudios={setPreloadedAudios}
          />
        );
      case 'admin':
        return (
          <TopicAdmin
            topics={topics}
            onAddTopic={handleAddTopic}
            onDeleteTopic={handleDeleteTopic}
            onBack={() => setView('settings')}
          />
        );
      case 'history':
        return <ConversationHistory history={conversationHistory} onSelectSession={(s) => {setSelectedSession(s); setView('historyDetail');}} onBack={() => setView('topics')} onClearHistory={handleClearHistory} />;
      case 'historyDetail':
        return <HistoryDetail session={selectedSession!} onBack={() => setView('history')} onPlayVocabWord={handlePlayVocabWord} playingVocabWord={playingVocabWord} />;
      case 'about':
        return <About onBack={() => setView('settings')} />;
      case 'topics':
      default:
        return (
          <TopicSelection
            topics={topics}
            onSelectTopic={handleSelectTopic}
          />
        );
    }
  };

  return (
    <div className="min-h-screen font-sans flex flex-col">
      <main className="flex-grow flex flex-col items-center justify-center p-4 w-full">
        {renderContent()}
      </main>
      {view === 'topics' && (
        <footer className="flex-shrink-0 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-gray-200 p-2 flex justify-around items-center">
            <button onClick={() => setView('history')} className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 w-24">
                <DocumentTextIcon />
                <span className="text-xs mt-1">Verlauf</span>
            </button>
             <button onClick={handleShare} className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 w-24">
                <ShareIcon />
                <span className="text-xs mt-1">Freunden erzählen</span>
            </button>
            <button onClick={() => setView('settings')} className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 w-24">
                <SettingsIcon />
                <span className="text-xs mt-1">Einstellungen</span>
            </button>
        </footer>
      )}
    </div>
  );
};

export default App;