import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const { user, logout } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: `¡Hola ${user?.username || ''}! Soy un asistente de IA impulsado por Gemini. ¿En qué te puedo ayudar hoy con respecto a EduRAG o cualquier otro tema?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize Gemini
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'model', content: 'Error: No se encontró la API Key de Gemini en las variables de entorno (VITE_GEMINI_API_KEY).' }]);
      setIsLoading(false);
      return;
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const firstUserIndex = messages.findIndex(msg => msg.role === 'user');
      const validHistory = firstUserIndex >= 0 ? messages.slice(firstUserIndex) : [];

      const chatHistory = validHistory.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const chat = model.startChat({
        history: chatHistory,
      });

      const result = await chat.sendMessage(userMessage);
      const responseText = result.response.text();

      setMessages(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (error) {
      console.error('Error with Gemini API:', error);
      const errorMessage = error?.message || String(error);
      setMessages(prev => [...prev, { role: 'model', content: `Error: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-canvas">
      {/* Header */}
      <header className="bg-surface border-b border-edge shrink-0">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="font-serif text-xl font-bold text-brand tracking-tight hover:text-brand-light transition-colors">
              EduRAG
            </Link>
            <span className="text-edge-strong">|</span>
            <Link
              to="/dashboard"
              className="text-sm text-ink-muted hover:text-brand transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Documentos
            </Link>
            <span className="text-sm font-medium text-brand flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              Chat con IA
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-brand-wash border border-edge flex items-center justify-center">
                <span className="text-xs font-semibold text-brand">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-ink font-medium">{user?.username}</span>
                <span className="text-ink-muted ml-1.5 text-xs">
                  {user?.role || 'usuario'}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-sm text-ink-muted hover:text-danger transition-colors cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Chat body */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto overflow-hidden">
        {/* Chat card header */}
        <div className="px-6 pt-6 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
            </svg>
            <h2 className="text-base font-semibold text-ink">Asistente IA (Gemini)</h2>
          </div>
          <p className="text-xs text-ink-muted mt-1 ml-7">El historial se borrará al recargar la página</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && (
                <div className="w-7 h-7 rounded-full bg-brand-wash border border-edge flex items-center justify-center shrink-0 mt-1 mr-2.5">
                  <svg className="w-3.5 h-3.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[75%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-brand text-white'
                  : 'bg-surface border border-edge text-ink'
              }`}>
                <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-brand-wash border border-edge flex items-center justify-center shrink-0 mt-1 ml-2.5">
                  <span className="text-xs font-semibold text-brand">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full bg-brand-wash border border-edge flex items-center justify-center shrink-0 mt-1 mr-2.5">
                <svg className="w-3.5 h-3.5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <div className="bg-surface border border-edge rounded-lg px-4 py-3 flex space-x-1.5">
                <div className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-ink-muted rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-edge shrink-0">
          <form onSubmit={handleSend} className="flex gap-3 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje aquí..."
              disabled={isLoading}
              className="flex-1 bg-canvas border border-edge rounded-md px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:opacity-50 transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-brand text-white px-4 py-2.5 rounded-md text-sm font-medium hover:bg-brand-light disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-2"
            >
              Enviar
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
