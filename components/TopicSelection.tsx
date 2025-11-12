import React from 'react';
import type { Topic } from '../types';

interface TopicSelectionProps {
  topics: Topic[];
  onSelectTopic: (topic: Topic) => void;
}

const TopicSelection: React.FC<TopicSelectionProps> = ({ topics, onSelectTopic }) => {
  return (
    <div className="w-full max-w-2xl text-center">
      <div className="mb-2">
        <h2 className="text-3xl font-bold">Wähle ein Thema</h2>
      </div>
      <p className="text-lg text-gray-500 mb-8">Worüber möchtest du heute auf Französisch sprechen?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onSelectTopic(topic)}
            className="bg-white p-4 rounded-lg shadow-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-75 transition-transform transform hover:scale-105"
          >
            <div className="text-5xl mb-3">{topic.emoji}</div>
            <h3 className="text-xl font-semibold">{topic.title}</h3>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopicSelection;