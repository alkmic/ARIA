import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, ChevronRight, Sparkles } from 'lucide-react';
import { generateCoachResponse } from '../services/coachAI';
import { useAppStore } from '../stores/useAppStore';
import type { Practitioner } from '../types';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  practitioners?: (Practitioner & { daysSinceVisit?: number })[];
  insights?: string[];
}

const SUGGESTION_CHIPS = [
  "Qui voir en priorité cette semaine ?",
  "Mes KOLs non vus depuis 2 mois",
  "Comment atteindre mon objectif ?",
  "Praticiens à risque de churn",
  "Opportunités nouveaux prescripteurs"
];

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const { practitioners, currentUser } = useAppStore();
  const navigate = useNavigate();

  const handleSend = async (question: string) => {
    if (!question.trim()) return;

    // Ajouter message utilisateur
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simuler délai de réflexion
    await new Promise(resolve => setTimeout(resolve, 800));

    // Générer réponse
    const response = generateCoachResponse(
      question,
      practitioners,
      currentUser.objectives
    );

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.message,
      practitioners: response.practitioners,
      insights: response.insights
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="pb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center">
            <Bot className="w-7 h-7 text-white" />
          </div>
          Coach IA
        </h1>
        <p className="text-slate-600">Votre assistant stratégique personnel</p>
      </div>

      {/* Main Container */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden">
        {/* Suggestions (si pas de messages) */}
        {messages.length === 0 && (
          <div className="p-6 border-b border-slate-200">
            <p className="text-sm text-slate-500 mb-3">💡 Exemples de questions :</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTION_CHIPS.map((chip, i) => (
                <button
                  key={i}
                  onClick={() => setInput(chip)}
                  className="px-4 py-2 bg-al-blue-50 text-al-blue-600 rounded-full text-sm font-medium
                           hover:bg-al-blue-100 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div className={`max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-al-blue-500 to-al-sky text-white rounded-2xl rounded-tr-md px-4 py-3'
                    : 'space-y-4'
                }`}>
                  <p className={message.role === 'assistant' ? 'text-slate-700 leading-relaxed' : ''}>
                    {message.content}
                  </p>

                  {/* Cartes praticiens dans la réponse */}
                  {message.practitioners && message.practitioners.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {message.practitioners.map((p, i) => (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="glass-card p-4 flex items-center gap-4 cursor-pointer hover:scale-[1.01] hover:shadow-lg transition-all"
                          onClick={() => navigate(`/practitioner/${p.id}`)}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                            i === 0 ? 'bg-red-500' : i < 3 ? 'bg-orange-500' : 'bg-amber-500'
                          }`}>
                            {i + 1}
                          </div>
                          <Avatar
                            src={p.avatarUrl}
                            alt={p.lastName}
                            size="md"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold text-slate-800 truncate">
                                {p.title} {p.firstName} {p.lastName}
                              </p>
                              {p.isKOL && (
                                <Badge variant="warning" size="sm">KOL</Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500">
                              {p.specialty} • Vingtile {p.vingtile} • {(p.volumeL / 1000).toFixed(0)}K L/an
                            </p>
                          </div>
                          {p.daysSinceVisit !== undefined && p.daysSinceVisit < 999 && (
                            <span className="text-sm text-red-500 font-medium whitespace-nowrap">
                              {p.daysSinceVisit}j sans visite
                            </span>
                          )}
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Insights */}
                  {message.insights && message.insights.length > 0 && (
                    <div className="mt-4 p-4 bg-al-blue-50 rounded-xl space-y-2">
                      {message.insights.map((insight, i) => (
                        <p key={i} className="text-sm text-al-navy leading-relaxed">{insight}</p>
                      ))}
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-al-blue-500 to-al-sky flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="glass-card px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
              placeholder="Posez votre question..."
              className="input-field flex-1"
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!input.trim() || isTyping}
              className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
