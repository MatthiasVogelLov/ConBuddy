
import type { Topic, Voice } from './types';

export const INITIAL_TOPICS: Topic[] = [
  {
    id: 'loisirs-fr-1',
    title: 'Parler de ses loisirs',
    language: 'Français',
    emoji: '🎨',
    systemInstruction: 'Rôle: Tuteur de français amical. Sujet: Les loisirs. Tâche: Commencer la conversation. Action immédiate: Saluer l\'utilisateur et poser une question ouverte sur ses loisirs. Ne pas attendre l\'utilisateur. Parler maintenant.',
  },
  {
    id: 'restaurant-fr-1',
    title: 'Commander au restaurant',
    language: 'Français',
    emoji: '🍕',
    systemInstruction: 'Rôle: Serveur dans un restaurant français. Sujet: Prendre une commande. Tâche: Commencer la conversation. Action immédiate: Accueillir le client et lui demander ce qu\'il désire. Ne pas attendre le client. Parler maintenant.',
  },
  {
    id: 'hotel-fr-1',
    title: 'Réserver une chambre d\'hôtel',
    language: 'Français',
    emoji: '🏨',
    systemInstruction: 'Rôle: Réceptionniste d\'hôtel en France. Sujet: Réserver une chambre. Tâche: Commencer la conversation. Action immédiate: Saluer le client et lui proposer de l\'aide pour sa réservation. Ne pas attendre le client. Parler maintenant.',
  },
  {
    id: 'meteo-fr-1',
    title: 'Parler de la météo',
    language: 'Français',
    emoji: '☀️',
    systemInstruction: 'Rôle: Personne locale en France. Sujet: La météo. Tâche: Commencer la conversation. Action immédiate: Saluer l\'utilisateur et faire une remarque sur le temps qu\'il fait aujourd\'hui. Ne pas attendre l\'utilisateur. Parler maintenant.',
  },
  {
    id: 'direction-fr-1',
    title: 'Demander son chemin',
    language: 'Français',
    emoji: '🗺️',
    systemInstruction: 'Rôle: Passant dans une rue de Paris. Sujet: Donner des indications. Tâche: Commencer la conversation. Action immédiate: Remarquer que l\'utilisateur a l\'air perdu et lui demander s\'il a besoin d\'aide. Ne pas attendre l\'utilisateur. Parler maintenant.',
  },
  {
    id: 'supermarche-fr-1',
    title: 'Faire les courses',
    language: 'Français',
    emoji: '🛒',
    systemInstruction: 'Rôle: Vendeur dans une épicerie française. Sujet: Aider un client à faire ses courses. Tâche: Commencer la conversation. Action immédiate: Saluer le client et lui demander ce qu\'il cherche. Ne pas attendre l\'utilisateur. Parler maintenant.',
  },
];

export const VOICES: Voice[] = [
    { id: 'Kore', name: 'Voix Masculine 1' },
    { id: 'Puck', name: 'Voix Masculine 2' },
    { id: 'Zephyr', name: 'Voix Féminine 1' },
    { id: 'Charon', name: 'Voix Féminine 2' },
  ];

export const CEFR_LEVELS: Array<'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'> = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const CEFR_PROMPTS: Record<typeof CEFR_LEVELS[number], string> = {
    A1: 'Adapte ton langage au niveau A1 (débutant). Utilise des mots très simples, des phrases courtes et parle lentement.',
    A2: 'Adapte ton langage au niveau A2 (élémentaire). Utilise un vocabulaire courant et des structures de phrases simples.',
    B1: 'Adapte ton langage au niveau B1 (intermédiaire). Tu peux utiliser une gamme plus large de vocabulaire et des phrases plus complexes, mais évite le jargon trop spécifique.',
    B2: 'Adapte ton langage au niveau B2 (intermédiaire avancé). Mène une conversation fluide et naturelle, en utilisant des expressions idiomatiques courantes.',
    C1: 'Adapte ton langage au niveau C1 (avancé). Utilise un langage riche, nuancé et précis. N\'hésite pas à utiliser des structures complexes.',
    C2: 'Adapte ton langage au niveau C2 (maîtrise). Parle comme un locuteur natif, en utilisant une gamme complète d\'expressions et de subtilités linguistiques.',
};