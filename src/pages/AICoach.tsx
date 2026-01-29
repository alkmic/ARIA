import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Bot, User } from 'lucide-react';
import { Card } from '../components/ui/Card';

export const AICoach: React.FC = () => {
  const [message, setMessage] = useState('');

  const mockConversation = [
    {
      role: 'assistant',
      content: "Bonjour ! Je suis ARIA, votre coach IA. Comment puis-je vous aider aujourd'hui ?",
    },
    {
      role: 'user',
      content: "Comment puis-je améliorer ma relation avec le Dr. Martin ?",
    },
    {
      role: 'assistant',
      content: "Excellente question ! Le Dr. Martin apprécie particulièrement les échanges techniques. Voici mes recommandations :\n\n1. Partagez les dernières études cliniques sur l'oxygénothérapie\n2. Proposez une formation sur les nouveaux dispositifs\n3. Organisez une rencontre avec un expert pneumologue\n\nSes prescriptions ont augmenté de 23% ce trimestre, c'est le moment idéal pour renforcer votre partenariat !",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text mb-2 flex items-center space-x-3">
          <MessageCircle className="w-8 h-8 text-al-blue-500" />
          <span>Coach IA</span>
        </h1>
        <p className="text-slate-600">
          Posez vos questions et recevez des conseils personnalisés en temps réel
        </p>
      </div>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-3 gap-6">
        {/* Chat */}
        <div className="col-span-2">
          <Card className="h-[600px] flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {mockConversation.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex items-start space-x-3 ${
                    msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg ${
                    msg.role === 'user' ? 'bg-al-blue-500' : 'bg-slate-200'
                  }`}>
                    {msg.role === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-slate-700" />
                    )}
                  </div>
                  <div className={`flex-1 p-4 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-al-blue-500 to-al-sky text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}>
                    <p className="text-sm whitespace-pre-line">{msg.content}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 p-4">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Posez votre question..."
                  className="input-field flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      // Handle send
                    }
                  }}
                />
                <button className="btn-primary">
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Suggestions */}
        <div className="space-y-4">
          <Card>
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Questions suggérées
            </h2>
            <div className="space-y-2">
              {[
                "Comment préparer ma visite de demain ?",
                "Quels KOLs devrais-je contacter ?",
                "Comment gérer une objection prix ?",
                "Stratégie pour augmenter mes prescriptions",
                "Conseils pour fidéliser un nouveau prescripteur",
              ].map((question, index) => (
                <button
                  key={index}
                  className="w-full text-left p-3 bg-slate-50 hover:bg-al-blue-50 hover:text-al-blue-500 rounded-lg text-sm transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-al-blue-50 to-white">
            <div className="flex items-center space-x-2 mb-3">
              <span className="text-2xl">💡</span>
              <h3 className="font-bold text-slate-800">Conseil du jour</h3>
            </div>
            <p className="text-sm text-slate-600">
              Les praticiens sont 3x plus réceptifs aux visites planifiées à l'avance avec un ordre du jour clair.
            </p>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};
