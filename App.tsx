
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { Topic, AppSettings, ConversationSession, VocabularyEntry, User } from './types';
import TopicSelection from './components/TopicSelection';
import Conversation from './components/Conversation';
import { INITIAL_TOPICS, VOICES, CEFR_LEVELS, CEFR_PROMPTS } from './constants';
import { BackIcon, TrashIcon, PlusIcon, PlayIcon, LoadingSpinnerIcon, DocumentTextIcon, SettingsIcon, ShareIcon, LogoutIcon, HomeIcon, UserIcon } from './components/icons/Icons';
import { decode, decodeAudioData } from './services/audioUtils';
import type { TranscriptEntry } from './types';

// --- Auth Component ---
interface AuthProps {
    onLogin: (user: User) => void;
    onRegister: (user: User) => boolean;
    lang: 'de' | 'fr';
}

const Auth: React.FC<AuthProps> = ({ onLogin, onRegister, lang }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email || !password) {
            setError(lang === 'de' ? 'Bitte füllen Sie alle Felder aus.' : 'Veuillez remplir tous les champs.');
            return;
        }

        if (isLogin) {
            onLogin({ email, password });
        } else {
            const success = onRegister({ email, password });
            if (success) {
                onLogin({ email, password });
            } else {
                setError(lang === 'de' ? 'Ein Benutzer mit dieser E-Mail existiert bereits.' : 'Un utilisateur avec cet e-mail existe déjà.');
            }
        }
    };

    return (
        <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-center mb-6">{isLogin ? (lang === 'de' ? 'Anmelden' : 'Connexion') : (lang === 'de' ? 'Registrieren' : 'S\'inscrire')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="email"
                    placeholder="E-Mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 bg-gray-100 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                />
                <input
                    type="password"
                    placeholder={lang === 'de' ? 'Passwort' : 'Mot de passe'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 bg-gray-100 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded transition-colors">
                    {isLogin ? (lang === 'de' ? 'Anmelden' : 'Se connecter') : (lang === 'de' ? 'Konto erstellen' : 'Créer un compte')}
                </button>
            </form>
            <div className="text-center mt-6">
                <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-sm text-teal-600 hover:underline">
                    {isLogin 
                        ? (lang === 'de' ? 'Kein Konto? Jetzt registrieren' : 'Pas de compte ? S\'inscrire') 
                        : (lang === 'de' ? 'Haben Sie bereits ein Konto? Anmelden' : 'Déjà un compte ? Se connecter')}
                </button>
            </div>
        </div>
    );
};


// --- About Component ---
const About: React.FC<{onBack: () => void, lang: 'de' | 'fr'}> = ({ onBack, lang }) => (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 animate-fade-in">
        <div className="flex items-center mb-6">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200 transition-colors mr-4">
                <BackIcon />
            </button>
            <h2 className="text-2xl font-bold">{lang === 'de' ? 'Über ConversationBuddy' : 'À propos de ConversationBuddy'}</h2>
        </div>
        <div className="space-y-4 text-gray-600">
            <p>{lang === 'de' ? 'Diese App wurde entwickelt, um das Sprechen von Fremdsprachen zu üben.' : 'Cette application a été développée pour s\'entraîner à parler des langues étrangères.'}</p>
            <p>{lang === 'de' ? 'Erstellt, um die Fähigkeiten der Gemini-API zu demonstrieren.' : 'Créée pour démontrer les capacités de l\'API Gemini.'}</p>
        </div>
    </div>
);

// --- Profile Component ---
interface ProfileProps {
    currentUser: User | null;
    onGoToAuth: () => void;
    onLogout: () => void;
    lang: 'de' | 'fr';
}
const Profile: React.FC<ProfileProps> = ({ currentUser, onGoToAuth, onLogout, lang }) => (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 animate-fade-in">
        <h2 className="text-2xl font-bold mb-6 text-center">{lang === 'de' ? 'Profil' : 'Profil'}</h2>
        {currentUser ? (
            <div className="space-y-6 text-center">
                 <p className="text-gray-600">{lang === 'de' ? 'Angemeldet als:' : 'Connecté en tant que:'}</p>
                 <p className="font-semibold text-lg">{currentUser.email}</p>
                 <div className="border-t pt-6">
                     <p className="text-gray-500 mb-4">{lang === 'de' ? 'Zukünftige Features wie Awards & Streaks werden hier erscheinen.' : 'Les futures fonctionnalités comme les récompenses et les séries apparaîtront ici.'}</p>
                     <button onClick={onLogout} className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 p-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                        <LogoutIcon /> {lang === 'de' ? 'Abmelden' : 'Se déconnecter'}
                    </button>
                 </div>
            </div>
        ) : (
            <div className="text-center p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <h3 className="font-semibold text-teal-800">{lang === 'de' ? 'Konto anlegen für mehr Funktionen' : 'Créez un compte pour plus de fonctionnalités'}</h3>
                <p className="text-sm text-teal-700 my-2">{lang === 'de' ? 'Speichern Sie Ihren Fortschritt und greifen Sie von jedem Gerät aus darauf zu.' : 'Sauvegardez vos progrès et accédez-y depuis n\'importe quel appareil.'}</p>
                <button onClick={onGoToAuth} className="mt-2 bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded transition-colors text-sm">
                    {lang === 'de' ? 'Anmelden / Registrieren' : 'Se connecter / S\'inscrire'}
                </button>
            </div>
        )}
    </div>
);


// --- Settings Component ---
interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onGoToAbout: () => void;
  preloadedAudios: Record<string, AudioBuffer | null>;
  onUpdatePreloadedAudios: (audios: Record<string, AudioBuffer | null>) => void;
  lang: 'de' | 'fr';
}

const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange, onGoToAbout, preloadedAudios, onUpdatePreloadedAudios, lang }) => {
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

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

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
                throw new Error(lang === 'de' ? "Keine Audiodaten empfangen" : "Aucune donnée audio reçue");
            }
        } catch (error) {
            console.error(`Fehler beim Laden der Stimme ${voiceId}:`, error);
            alert(lang === 'de' ? "Audio-Vorschau konnte nicht geladen werden." : "L'aperçu audio n'a pas pu être chargé.");
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

  const handleShare = async () => {
    const shareData = {
        title: 'ConversationBuddy',
        text: lang === 'de' ? 'Probiere diese App aus, um deine Sprachkenntnisse zu verbessern!' : 'Essaie cette application pour améliorer tes compétences linguistiques !',
        url: window.location.href,
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
           await navigator.clipboard.writeText(window.location.href);
           alert(lang === 'de' ? 'Link in die Zwischenablage kopiert!' : 'Lien copié dans le presse-papiers !');
        }
    } catch (err) {
        console.error('Fehler beim Teilen:', err);
         try {
            await navigator.clipboard.writeText(window.location.href);
            alert(lang === 'de' ? 'Link in die Zwischenablage kopiert!' : 'Lien copié dans le presse-papiers !');
        } catch (clipErr) {
            console.error('Fehler beim Kopieren in die Zwischenablage:', clipErr);
            alert(lang === 'de' ? 'Teilen und Kopieren fehlgeschlagen.' : 'Échec du partage et de la copie.');
        }
    }
  };


  return (
    <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 animate-fade-in">
      <h2 className="text-2xl font-bold mb-6 text-center">{lang === 'de' ? 'Einstellungen' : 'Réglages'}</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            {lang === 'de' ? 'Stimme auswählen' : 'Choix de la voix'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VOICES.map(voice => (
              <div key={voice.id} className={`flex items-center justify-between p-3 rounded-lg border ${settings.voiceId === voice.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
                <span>{lang === 'de' ? voice.name.replace('Voix', 'Stimme').replace('Masculine', 'Männlich').replace('Féminine', 'Weiblich') : voice.name}</span>
                <div className="flex items-center gap-2">
                  <button
                      onClick={() => handlePreviewVoice(voice.id)}
                      disabled={!!previewingVoiceId}
                      className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50"
                  >
                      {previewingVoiceId === voice.id ? <LoadingSpinnerIcon className="w-5 h-5" /> : <PlayIcon />}
                  </button>
                  <input
                    type="radio"
                    name="voice"
                    checked={settings.voiceId === voice.id}
                    onChange={() => onSettingsChange({ ...settings, voiceId: voice.id })}
                    className="form-radio h-5 w-5 text-teal-600 focus:ring-teal-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
            <h3 className="text-lg font-semibold mb-2">
                {lang === 'de' ? 'Sprachniveau (GER)' : 'Niveau de langue (CECR)'}
            </h3>
            <select
                value={settings.cefrLevel}
                onChange={(e) => onSettingsChange({ ...settings, cefrLevel: e.target.value as AppSettings['cefrLevel'] })}
                className="w-full p-3 bg-gray-100 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
                {CEFR_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                ))}
            </select>
        </div>
        
        <div>
            <h3 className="text-lg font-semibold mb-2">
                {lang === 'de' ? 'Gesprächsdauer' : 'Durée de la conversation'}
            </h3>
            <select
                value={settings.duration}
                onChange={(e) => onSettingsChange({ ...settings, duration: Number(e.target.value) })}
                className="w-full p-3 bg-gray-100 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
                <option value={2}>2 {lang === 'de' ? 'Minuten' : 'minutes'}</option>
                <option value={3}>3 {lang === 'de' ? 'Minuten' : 'minutes'}</option>
            </select>
        </div>

         <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
            <ShareIcon /> {lang === 'de' ? 'Freunden erzählen' : 'Partager à un ami'}
        </button>

         <button onClick={onGoToAbout} className="w-full p-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
            {lang === 'de' ? 'Über die App' : 'À propos de l\'application'}
        </button>
      </div>
    </div>
  );
};


// --- History Component ---
interface HistoryProps {
    sessions: ConversationSession[];
    onSelectSession: (session: ConversationSession) => void;
    onDeleteSession: (sessionId: string) => void;
    lang: 'de' | 'fr';
    onPlayVocabulary: (word: string) => void;
    currentUser: User | null;
    onGoToAuth: () => void;
}

const History: React.FC<HistoryProps> = ({ sessions, onSelectSession, onDeleteSession, lang, onPlayVocabulary, currentUser, onGoToAuth }) => {
    return (
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 animate-fade-in">
            <h2 className="text-2xl font-bold mb-6 text-center">{lang === 'de' ? 'Verlauf' : 'Historique'}</h2>

            {!currentUser && (
                 <div className="text-center p-4 mb-6 bg-teal-50 border border-teal-200 rounded-lg">
                    <h3 className="font-semibold text-teal-800">{lang === 'de' ? 'Konto anlegen, um Verlauf zu speichern' : 'Créez un compte pour sauvegarder l\'historique'}</h3>
                    <p className="text-sm text-teal-700 my-2">{lang === 'de' ? 'Speichern Sie Ihren Fortschritt und greifen Sie von jedem Gerät aus darauf zu.' : 'Sauvegardez vos progrès et accédez-y depuis n\'importe quel appareil.'}</p>
                    <button onClick={onGoToAuth} className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded transition-colors text-sm">
                        {lang === 'de' ? 'Anmelden / Registrieren' : 'Se connecter / S\'inscrire'}
                    </button>
                </div>
            )}
            
            {sessions.length === 0 ? (
                <p className="text-gray-500 text-center">{lang === 'de' ? 'Noch keine Gespräche geführt.' : 'Aucune conversation pour le moment.'}</p>
            ) : (
                <ul className="space-y-4">
                    {sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(session => (
                        <li key={session.id} className="border border-gray-200 rounded-lg p-4">
                             <div className="flex justify-between items-start">
                                <div className="cursor-pointer flex-grow" onClick={() => onSelectSession(session)}>
                                    <p className="text-lg font-semibold">{session.topic.emoji} {session.topic.title}</p>
                                    <p className="text-sm text-gray-500">{new Date(session.date).toLocaleString()}</p>
                                </div>
                                <button onClick={() => onDeleteSession(session.id)} className="p-2 text-gray-400 hover:text-red-500">
                                    <TrashIcon />
                                </button>
                            </div>

                             {session.status === 'analyzing' && (
                                <div className="mt-4 flex items-center justify-center gap-2 text-gray-500">
                                    <LoadingSpinnerIcon />
                                    <span>{lang === 'de' ? 'Analyse wird erstellt...' : 'Analyse en cours...'}</span>
                                </div>
                            )}

                            {session.status === 'complete' && session.feedback && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <h4 className="font-semibold mb-2">{lang === 'de' ? 'Feedback & Korrekturen' : 'Feedback & Corrections'}</h4>
                                    <div className="space-y-2">
                                        {session.feedback.split('\n').filter(line => line.trim().startsWith('-')).map((line, index) => (
                                             <div key={index} className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-gray-700">{line.substring(1).trim()}</p>
                                             </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                             {session.status === 'complete' && session.vocabulary && session.vocabulary.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <h4 className="font-semibold mb-2">{lang === 'de' ? 'Vokabular' : 'Vocabulaire'}</h4>
                                    <ul className="space-y-2">
                                        {session.vocabulary.map((vocab, index) => (
                                            <li key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                                <div>
                                                    <span className="font-medium">{vocab.word}</span>
                                                    <span className="text-gray-500"> - {vocab.translation}</span>
                                                </div>
                                                 <button onClick={() => onPlayVocabulary(vocab.word)} className="p-2 rounded-full hover:bg-gray-200">
                                                    <PlayIcon />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// --- BottomNav Component ---
interface BottomNavProps {
    currentView: string;
    onNavigate: (view: 'topics' | 'history' | 'profile' | 'settings') => void;
    lang: 'de' | 'fr';
}
const BottomNav: React.FC<BottomNavProps> = ({ currentView, onNavigate, lang }) => (
    <div className="fixed bottom-0 left-0 right-0 w-full max-w-2xl mx-auto bg-white shadow-lg border-t border-gray-200 flex justify-around p-2">
        <button 
            onClick={() => onNavigate('topics')} 
            className={`flex flex-col items-center justify-center w-full p-2 rounded-lg transition-colors ${currentView === 'topics' ? 'text-teal-600' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            <HomeIcon />
            <span className="text-xs mt-1">{lang === 'de' ? 'Themen' : 'Sujets'}</span>
        </button>
         <button 
            onClick={() => onNavigate('history')} 
            className={`flex flex-col items-center justify-center w-full p-2 rounded-lg transition-colors ${currentView === 'history' ? 'text-teal-600' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            <DocumentTextIcon />
            <span className="text-xs mt-1">{lang === 'de' ? 'Verlauf' : 'Historique'}</span>
        </button>
        <button 
            onClick={() => onNavigate('profile')} 
            className={`flex flex-col items-center justify-center w-full p-2 rounded-lg transition-colors ${['profile', 'auth'].includes(currentView) ? 'text-teal-600' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            <UserIcon />
            <span className="text-xs mt-1">{lang === 'de' ? 'Profil' : 'Profil'}</span>
        </button>
        <button 
            onClick={() => onNavigate('settings')} 
            className={`flex flex-col items-center justify-center w-full p-2 rounded-lg transition-colors ${['settings', 'about'].includes(currentView) ? 'text-teal-600' : 'text-gray-500 hover:bg-gray-100'}`}
        >
            <SettingsIcon />
            <span className="text-xs mt-1">{lang === 'de' ? 'Einstellungen' : 'Réglages'}</span>
        </button>
    </div>
);

// --- Main App Component ---
type View = 'topics' | 'conversation' | 'history' | 'profile' | 'settings' | 'about' | 'auth';

const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState<View>('topics');
    const [topics, setTopics] = useState<Topic[]>(INITIAL_TOPICS);
    const [sessions, setSessions] = useState<ConversationSession[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
    const [selectedSession, setSelectedSession] = useState<ConversationSession | null>(null);
    const [settings, setSettings] = useState<AppSettings>({
        voiceId: 'Zephyr',
        duration: 2,
        cefrLevel: 'A2',
    });
    const [preloadedAudios, setPreloadedAudios] = useState<Record<string, AudioBuffer | null>>({});
    
    const lang = settings.cefrLevel === 'A1' ? 'de' : 'fr';

    // Check for logged in user on initial load
    useEffect(() => {
        const loggedInUserEmail = localStorage.getItem('loggedInUser');
        if (loggedInUserEmail) {
            const users = JSON.parse(localStorage.getItem('users') || '[]');
            const foundUser = users.find((u: User) => u.email === loggedInUserEmail);
            if (foundUser) {
                setCurrentUser(foundUser);
            }
        }
        setIsLoading(false);
    }, []);

    const getStorageKey = useCallback((key: string) => {
        return currentUser ? `${currentUser.email}_${key}` : `guest_${key}`;
    }, [currentUser]);

    // Load data on user change
    useEffect(() => {
        if (isLoading) return; // Wait until initial user check is complete
        const storedTopics = localStorage.getItem(getStorageKey('topics'));
        if (storedTopics) {
            setTopics(JSON.parse(storedTopics));
        } else {
            setTopics(INITIAL_TOPICS);
        }

        const storedSessions = localStorage.getItem(getStorageKey('sessions'));
        if (storedSessions) {
            setSessions(JSON.parse(storedSessions));
        } else {
            setSessions([]);
        }

        const storedSettings = localStorage.getItem(getStorageKey('settings'));
        if (storedSettings) {
            setSettings(JSON.parse(storedSettings));
        } else {
            setSettings({ voiceId: 'Zephyr', duration: 2, cefrLevel: 'A2' });
        }
    }, [currentUser, getStorageKey, isLoading]);

    // Save data on change
    useEffect(() => {
        if (isLoading) return;
        localStorage.setItem(getStorageKey('topics'), JSON.stringify(topics));
    }, [topics, getStorageKey, isLoading]);

    useEffect(() => {
        if (isLoading) return;
        localStorage.setItem(getStorageKey('sessions'), JSON.stringify(sessions));
    }, [sessions, getStorageKey, isLoading]);

    useEffect(() => {
        if (isLoading) return;
        localStorage.setItem(getStorageKey('settings'), JSON.stringify(settings));
    }, [settings, getStorageKey, isLoading]);

     useEffect(() => {
        document.documentElement.lang = lang;
     }, [lang]);

    const handleSelectTopic = (topic: Topic) => {
        setSelectedTopic(topic);
        setCurrentView('conversation');
    };

    const handleEndSession = () => {
        setCurrentView('topics');
        setSelectedTopic(null);
    };

    const handleSaveSession = useCallback(async (transcript: TranscriptEntry[]) => {
        if (!selectedTopic) return;
        
        const newSession: ConversationSession = {
            id: new Date().toISOString(),
            topic: selectedTopic,
            date: new Date().toISOString(),
            transcript: transcript,
            status: 'analyzing'
        };

        setSessions(prev => [newSession, ...prev]);

        // Background analysis
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const feedbackPrompt = lang === 'de' 
                ? `Du bist ein Französischlehrer. Analysiere dieses Gespräch (Niveau ${settings.cefrLevel}) und gib Feedback. Konzentriere dich auf 2-3 wichtige Korrekturen oder Verbesserungsvorschläge. Gib auch eine Liste von 5 nützlichen Vokabeln aus dem Gespräch (Wort - Übersetzung). Formatiere das Feedback als Markdown-Liste und die Vokabeln als "Wort:Übersetzung". Gespräch:\n${transcript.map(t => `${t.author === 'user' ? 'Lernender' : 'Tutor'}: ${t.text}`).join('\n')}`
                : `Tu es un professeur de français. Analyse cette conversation (niveau ${settings.cefrLevel}) et donne ton feedback. Concentre-toi sur 2-3 corrections ou suggestions d'amélioration importantes. Donne aussi une liste de 5 mots de vocabulaire utiles de la conversation (mot - traduction). Formate le feedback comme une liste Markdown et le vocabulaire comme "Mot:Traduction". Conversation:\n${transcript.map(t => `${t.author === 'user' ? 'Apprenant' : 'Tuteur'}: ${t.text}`).join('\n')}`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: feedbackPrompt,
            });
            const text = response.text;
            
            const feedbackRegex = /^- .*/gm;
            const vocabRegex = /^(.+?):(.+)$/gm;

            const feedbackMatches = text.match(feedbackRegex);
            const vocabulary: VocabularyEntry[] = [];
            let match;
            while ((match = vocabRegex.exec(text)) !== null) {
                vocabulary.push({ word: match[1].trim(), translation: match[2].trim() });
            }

            setSessions(prev => prev.map(s => s.id === newSession.id ? { ...s, feedback: feedbackMatches?.join('\n') || (lang === 'de' ? 'Kein spezifisches Feedback.' : 'Pas de feedback spécifique.'), vocabulary, status: 'complete' } : s));
        } catch (error) {
            console.error('Fehler bei der Analyse:', error);
             setSessions(prev => prev.map(s => s.id === newSession.id ? { ...s, feedback: 'Analyse fehlgeschlagen.', vocabulary: [], status: 'complete' } : s));
        }
    }, [selectedTopic, settings.cefrLevel, lang]);


    const handleDeleteSession = (sessionId: string) => {
        if (confirm(lang === 'de' ? 'Möchten Sie dieses Gespräch wirklich löschen?' : 'Voulez-vous vraiment supprimer cette conversation ?')) {
            setSessions(sessions.filter(s => s.id !== sessionId));
        }
    };
    
    const handlePlayVocabulary = async (word: string) => {
        try {
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
                 // @ts-ignore
                const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioCtx, 24000, 1);
                const source = audioCtx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtx.destination);
                source.start();
            }
        } catch (error) {
            console.error("Fehler bei der Audiowiedergabe:", error);
        }
    };

    const handleRegister = (user: User): boolean => {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        if (users.some((u: User) => u.email === user.email)) {
            return false;
        }
        users.push(user);
        localStorage.setItem('users', JSON.stringify(users));
        return true;
    };

    const handleLogin = (user: User) => {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const foundUser = users.find((u: User) => u.email === user.email && u.password === user.password);
        if (foundUser) {
            const guestTopics = localStorage.getItem('guest_topics');
            const guestSessions = localStorage.getItem('guest_sessions');
            const guestSettings = localStorage.getItem('guest_settings');
            
            const userKey = (email: string) => `${email}_`;

            if (guestTopics && !localStorage.getItem(userKey(user.email) + 'topics')) {
                localStorage.setItem(userKey(user.email) + 'topics', guestTopics);
            }
             if (guestSessions && !localStorage.getItem(userKey(user.email) + 'sessions')) {
                localStorage.setItem(userKey(user.email) + 'sessions', guestSessions);
            }
             if (guestSettings && !localStorage.getItem(userKey(user.email) + 'settings')) {
                localStorage.setItem(userKey(user.email) + 'settings', guestSettings);
            }

            localStorage.setItem('loggedInUser', foundUser.email);
            setCurrentUser(foundUser);
            setCurrentView('profile');
        } else {
             alert(lang === 'de' ? 'Ungültige Anmeldedaten.' : 'Identifiants invalides.');
        }
    };
    
    const handleLogout = () => {
        localStorage.removeItem('loggedInUser');
        setCurrentUser(null);
        setCurrentView('topics');
    };

    const renderView = () => {
        switch (currentView) {
            case 'conversation':
                return selectedTopic && <Conversation 
                    topic={selectedTopic} 
                    onEndSession={handleEndSession}
                    onSaveSession={handleSaveSession}
                    voiceName={settings.voiceId}
                    duration={settings.duration}
                    cefrLevel={settings.cefrLevel}
                    lang={lang}
                />;
            case 'history':
                return <History 
                    sessions={sessions} 
                    onSelectSession={session => {setSelectedSession(session); /* View to see details not implemented */}}
                    onDeleteSession={handleDeleteSession}
                    lang={lang}
                    onPlayVocabulary={handlePlayVocabulary}
                    currentUser={currentUser}
                    onGoToAuth={() => setCurrentView('auth')}
                />;
             case 'profile':
                return <Profile
                    currentUser={currentUser}
                    onGoToAuth={() => setCurrentView('auth')}
                    onLogout={handleLogout}
                    lang={lang}
                    />;
            case 'settings':
                return <Settings
                    settings={settings}
                    onSettingsChange={setSettings}
                    onGoToAbout={() => setCurrentView('about')}
                    preloadedAudios={preloadedAudios}
                    onUpdatePreloadedAudios={setPreloadedAudios}
                    lang={lang}
                />;
            case 'auth':
                return (
                    <div className="w-full max-w-2xl flex flex-col items-center">
                        <div className="w-full flex justify-start mb-4">
                             <button onClick={() => setCurrentView('profile')} className="p-2 rounded-full hover:bg-gray-200 transition-colors">
                                <BackIcon />
                            </button>
                        </div>
                        <Auth onLogin={handleLogin} onRegister={handleRegister} lang={lang} />
                    </div>
                );
            case 'about':
                return <About onBack={() => setCurrentView('settings')} lang={lang}/>;
            case 'topics':
            default:
                return <TopicSelection 
                    topics={topics} 
                    onSelectTopic={handleSelectTopic} 
                    lang={lang}
                />;
        }
    };
    
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinnerIcon className="w-12 h-12" />
            </div>
        );
    }
    
    const showNav = ['topics', 'history', 'profile', 'settings', 'auth', 'about'].includes(currentView);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 pt-8 sm:p-6" style={{ paddingBottom: showNav ? '80px' : 'auto' }}>
            {renderView()}
            {showNav && <BottomNav currentView={currentView} onNavigate={(view) => setCurrentView(view)} lang={lang} />}
        </div>
    );
};

export default App;