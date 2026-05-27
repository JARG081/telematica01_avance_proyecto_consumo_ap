import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useAuth } from '../context/AuthContext';
import { eduragApi } from '../services/api';

export default function Chat() {
  const { user, logout } = useAuth();
  
  // Custom API key states
  const [customApiKey, setCustomApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [showSettings, setShowSettings] = useState(false);

  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: `¡Hola ${user?.username || ''}! Soy un asistente de IA impulsado por Gemini. ¿En qué te puedo ayudar hoy? Puedes subir archivos (PDF, TXT, imágenes) desde tu dispositivo o seleccionar alguno de la biblioteca para chatear con él.`
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null); // { name, size, type, base64 }
  
  // Library modal states
  const [libraryFiles, setLibraryFiles] = useState([]);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState('');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch library files
  const fetchLibraryFiles = async () => {
    try {
      setLoadingLibrary(true);
      setLibraryError('');
      const res = await eduragApi.get('/files');
      setLibraryFiles(res.data);
    } catch (err) {
      console.error('Error fetching library files:', err);
      setLibraryError('No se pudo cargar la lista de documentos de la biblioteca.');
    } finally {
      setLoadingLibrary(false);
    }
  };

  // Helper to resolve MIME type from extension
  const getMimeType = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const mimeTypes = {
      pdf: 'application/pdf',
      txt: 'text/plain',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      json: 'application/json',
      html: 'text/html',
      css: 'text/css'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  // Helper to format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper for file type icons
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (ext === 'pdf') {
      return (
        <svg className="w-6 h-6 text-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      );
    }
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
      return (
        <svg className="w-6 h-6 text-amber shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6 text-brand shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    );
  };

  // Handle local file load
  const handleLocalFileLoad = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("El archivo excede el límite de 15 MB recomendado para su procesamiento.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64Data = dataUrl.split(',')[1];
      setAttachedFile({
        name: file.name,
        size: file.size,
        type: file.type || getMimeType(file.name),
        base64: base64Data
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle library file download and load
  const handleSelectLibraryFile = async (fileObj) => {
    setShowLibraryModal(false);
    setIsLoading(true);
    try {
      const res = await eduragApi.get(`/files/${fileObj.fileName}`, {
        responseType: 'blob'
      });
      const fileBlob = res.data;

      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const base64Data = dataUrl.split(',')[1];
        setAttachedFile({
          name: fileObj.fileName,
          size: fileObj.size,
          type: fileBlob.type || getMimeType(fileObj.fileName),
          base64: base64Data
        });
      };
      reader.readAsDataURL(fileBlob);
    } catch (err) {
      console.error('Error downloading library file:', err);
      alert('Error al descargar el archivo desde la biblioteca del servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  // Open library modal and load file list
  const openLibraryDialog = () => {
    setShowLibraryModal(true);
    fetchLibraryFiles();
  };

  // Save API Key manually
  const handleSaveApiKey = (e) => {
    e.preventDefault();
    localStorage.setItem('gemini_api_key', customApiKey.trim());
    setShowSettings(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!input.trim() && !attachedFile) || isLoading) return;

    const userMessage = input.trim();
    const fileToAttach = attachedFile;

    // Clear inputs immediately for responsiveness
    setInput('');
    setAttachedFile(null);

    const userMsgObj = {
      role: 'user',
      content: userMessage || `Analiza el archivo adjunto: ${fileToAttach.name}`,
      file: fileToAttach ? {
        name: fileToAttach.name,
        size: fileToAttach.size,
        type: fileToAttach.type,
        base64: fileToAttach.base64
      } : null
    };

    setMessages(prev => [...prev, userMsgObj]);
    setIsLoading(true);

    const activeApiKey = import.meta.env.VITE_GEMINI_API_KEY || customApiKey;
    if (!activeApiKey) {
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Error: No se encontró una clave API de Gemini. Por favor haz clic en "Configurar API Key" en el menú superior derecho para ingresarla.'
      }]);
      setIsLoading(false);
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(activeApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Reconstruct chat history including inline file parts
      const firstUserIndex = messages.findIndex(msg => msg.role === 'user');
      const validHistory = firstUserIndex >= 0 ? messages.slice(firstUserIndex) : [];
      
      const chatHistory = [];
      validHistory.forEach(msg => {
        const parts = [];
        if (msg.file && msg.file.base64) {
          parts.push({
            inlineData: {
              data: msg.file.base64,
              mimeType: msg.file.type
            }
          });
        }
        parts.push({ text: msg.content });
        
        chatHistory.push({
          role: msg.role === 'model' ? 'model' : 'user',
          parts: parts
        });
      });

      const chat = model.startChat({
        history: chatHistory,
      });

      // Prepare active parts for current message
      const activeParts = [];
      if (fileToAttach) {
        activeParts.push({
          inlineData: {
            data: fileToAttach.base64,
            mimeType: fileToAttach.type
          }
        });
      }
      activeParts.push({ text: userMessage || 'Resume y analiza el contenido de este archivo.' });

      const result = await chat.sendMessage(activeParts);
      const responseText = result.response.text();

      setMessages(prev => [...prev, { role: 'model', content: responseText }]);
    } catch (error) {
      console.error('Error with Gemini API:', error);
      const errorMessage = error?.message || String(error);
      setMessages(prev => [...prev, { role: 'model', content: `Error de Gemini: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-canvas font-sans text-ink">
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
              Biblioteca
            </Link>
            <span className="text-sm font-semibold text-brand flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              Chat con IA
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`text-xs px-3 py-1.5 rounded border transition-colors cursor-pointer flex items-center gap-1.5 ${
                customApiKey || import.meta.env.VITE_GEMINI_API_KEY
                  ? 'border-success/30 bg-success-wash text-success hover:bg-success/10'
                  : 'border-amber/30 bg-amber-wash text-amber hover:bg-amber/10'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
              </svg>
              {customApiKey || import.meta.env.VITE_GEMINI_API_KEY ? 'API Key Configurada' : 'Configurar API Key'}
            </button>

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

      {/* Settings Drawer / Popover */}
      {showSettings && (
        <div className="bg-surface border-b border-edge shrink-0 shadow-sm animate-fadeIn">
          <div className="max-w-5xl mx-auto px-6 py-4">
            <form onSubmit={handleSaveApiKey} className="flex gap-4 items-end">
              <div className="flex-1 max-w-lg">
                <label className="block text-xs font-medium text-ink-secondary mb-1.5">
                  Gemini API Key Manual (Se guarda en tu navegador)
                </label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="Introduce tu AIzaSy..."
                  className="w-full bg-canvas border border-edge rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-brand"
                />
              </div>
              <button
                type="submit"
                className="bg-brand text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-light transition-colors cursor-pointer"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomApiKey('');
                  localStorage.removeItem('gemini_api_key');
                  setShowSettings(false);
                }}
                className="text-sm text-ink-muted hover:text-danger py-2 px-1 transition-colors cursor-pointer"
              >
                Eliminar Clave
              </button>
            </form>
            {import.meta.env.VITE_GEMINI_API_KEY && (
              <p className="text-[11px] text-success mt-2">
                * Clave API de Gemini detectada automáticamente desde las variables del sistema (VITE_GEMINI_API_KEY).
              </p>
            )}
          </div>
        </div>
      )}

      {/* Chat body */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto overflow-hidden">
        {/* Chat card header */}
        <div className="px-6 pt-5 pb-2 shrink-0 flex items-center justify-between border-b border-edge/40">
          <div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
              </svg>
              <h2 className="text-base font-semibold text-ink">Asistente IA RAG</h2>
              <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-mono font-bold">
                gemini-2.5-flash
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">Puedes cargar PDFs, archivos de texto plano o imágenes para chatear directamente.</p>
          </div>
          <button
            onClick={() => setMessages([
              {
                role: 'model',
                content: `Historial reiniciado. ¿En qué te puedo colaborar ahora, ${user?.username || ''}?`
              }
            ])}
            className="text-xs text-ink-muted hover:text-danger transition-colors cursor-pointer flex items-center gap-1 py-1 px-2 border border-edge rounded hover:bg-danger-wash"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Reiniciar Chat
          </button>
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
              <div className={`max-w-[75%] rounded-lg px-4 py-3 shadow-xs ${
                msg.role === 'user'
                  ? 'bg-brand text-white'
                  : 'bg-surface border border-edge text-ink'
              }`}>
                {/* File Attachment indicator in chat message */}
                {msg.file && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-md mb-2 border text-xs leading-none ${
                    msg.role === 'user'
                      ? 'bg-brand-light/40 border-brand-light text-white'
                      : 'bg-canvas border-edge text-ink-secondary'
                  }`}>
                    {getFileIcon(msg.file.name)}
                    <div className="truncate flex-1">
                      <p className="font-medium truncate">{msg.file.name}</p>
                      <p className="text-[10px] opacity-80 mt-0.5">{formatFileSize(msg.file.size)}</p>
                    </div>
                  </div>
                )}
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
                <svg className="w-3.5 h-3.5 text-brand animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <div className="bg-surface border border-edge rounded-lg px-4 py-3 flex space-x-1.5 items-center">
                <span className="text-xs text-ink-muted mr-1">Procesando</span>
                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment Preview Box */}
        {attachedFile && (
          <div className="px-6 py-2 border-t border-edge/60 bg-brand-wash/60 flex items-center justify-between animate-fadeIn shrink-0">
            <div className="flex items-center gap-3">
              {getFileIcon(attachedFile.name)}
              <div className="text-left">
                <p className="text-xs font-semibold text-brand truncate max-w-md">{attachedFile.name}</p>
                <p className="text-[10px] text-ink-muted">Contexto adjunto • {formatFileSize(attachedFile.size)}</p>
              </div>
            </div>
            <button
              onClick={() => setAttachedFile(null)}
              className="p-1 hover:bg-brand/10 rounded-full text-brand transition-colors cursor-pointer"
              title="Quitar archivo"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Chat Inputs & Form */}
        <div className="px-6 py-4 border-t border-edge shrink-0">
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            {/* hidden file inputs */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleLocalFileLoad}
              accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />
            
            {/* Local Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="p-2.5 border border-edge rounded-md text-ink-secondary hover:text-brand hover:border-brand/40 bg-surface transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0"
              title="Cargar archivo local"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m0 0-.01m.01-.01.008-.009A2.25 2.25 0 0 1 5.38 15.09l9.907-9.907" />
              </svg>
            </button>

            {/* Server Library Select Button */}
            <button
              type="button"
              onClick={openLibraryDialog}
              disabled={isLoading}
              className="p-2.5 border border-edge rounded-md text-ink-secondary hover:text-brand hover:border-brand/40 bg-surface transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center shrink-0"
              title="Seleccionar de la biblioteca"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.008 1.24l.885 1.77a2.25 2.25 0 0 0 2.007 1.24h1.98a2.25 2.25 0 0 0 2.007-1.24l.885-1.77a2.25 2.25 0 0 1 2.007-1.24h3.86m-18 0h18M2.25 13.5V6.25A2.25 2.25 0 0 1 4.5 4h15A2.25 2.25 0 0 1 21.75 6.25V13.5m-18 0v4.5A2.25 2.25 0 0 0 4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-4.5m-18 0A2.25 2.25 0 0 1 4.5 11.25V6.25m17.25 7.25a2.25 2.25 0 0 0-2.25-2.25h-3.86a2.25 2.25 0 0 0-2.008 1.24l-.885 1.77a2.25 2.25 0 0 1-2.007 1.24h-1.98a2.25 2.25 0 0 1-2.007-1.24l-.885-1.77a2.25 2.25 0 0 0-2.007-1.24H4.5" />
              </svg>
            </button>

            {/* Input Message Text Box */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={attachedFile ? "Haz una pregunta sobre el archivo..." : "Pregúntale algo a Gemini..."}
              disabled={isLoading}
              className="flex-1 bg-canvas border border-edge rounded-md px-4 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:opacity-50 transition-colors"
            />
            
            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !attachedFile)}
              className="bg-brand text-white px-5 py-2.5 rounded-md text-sm font-medium hover:bg-brand-light disabled:opacity-40 transition-colors cursor-pointer flex items-center gap-2 shrink-0 shadow-xs"
            >
              <span>Enviar</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </form>
        </div>
      </main>

      {/* Library Selection Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface border border-edge rounded-lg w-full max-w-xl max-h-[80vh] flex flex-col shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-edge flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.008 1.24l.885 1.77a2.25 2.25 0 0 0 2.007 1.24h1.98a2.25 2.25 0 0 0 2.007-1.24l.885-1.77a2.25 2.25 0 0 1 2.007-1.24h3.86m-18 0h18M2.25 13.5V6.25A2.25 2.25 0 0 1 4.5 4h15A2.25 2.25 0 0 1 21.75 6.25V13.5m-18 0v4.5A2.25 2.25 0 0 0 4.5 20.25h15A2.25 2.25 0 0 0 21.75 18v-4.5m-18 0A2.25 2.25 0 0 1 4.5 11.25V6.25m17.25 7.25a2.25 2.25 0 0 0-2.25-2.25h-3.86a2.25 2.25 0 0 0-2.008 1.24l-.885 1.77a2.25 2.25 0 0 1-2.007 1.24h-1.98a2.25 2.25 0 0 1-2.007-1.24l-.885-1.77a2.25 2.25 0 0 0-2.007-1.24H4.5" />
                </svg>
                <h3 className="font-serif text-base font-bold text-ink">Biblioteca de Documentos</h3>
              </div>
              <button
                onClick={() => setShowLibraryModal(false)}
                className="text-ink-muted hover:text-ink transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingLibrary ? (
                <div className="py-12 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-edge border-t-brand rounded-full animate-spin"></div>
                  <p className="text-sm text-ink-muted mt-2">Cargando biblioteca...</p>
                </div>
              ) : libraryError ? (
                <div className="py-6 text-center text-sm text-danger bg-danger-wash rounded-md border border-danger/10">
                  {libraryError}
                </div>
              ) : libraryFiles.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-ink-muted font-medium">La biblioteca está vacía.</p>
                  <p className="text-xs text-ink-muted mt-1">Sube archivos primero en la Base de Conocimiento (Dashboard).</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-ink-muted mb-2">Selecciona un archivo para cargarlo como contexto al chat actual:</p>
                  {libraryFiles.map((file) => (
                    <div
                      key={file.fileName}
                      className="flex items-center justify-between p-3 border border-edge rounded-lg hover:bg-canvas hover:border-brand/30 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        {getFileIcon(file.fileName)}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate" title={file.fileName}>
                            {file.fileName}
                          </p>
                          <p className="text-xs text-ink-muted">
                            {formatFileSize(file.size)} • {new Date(file.createdAtUtc).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectLibraryFile(file)}
                        className="bg-brand text-white px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-brand-light transition-colors cursor-pointer shrink-0"
                      >
                        Seleccionar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-edge/60 bg-canvas shrink-0 flex justify-end">
              <button
                onClick={() => setShowLibraryModal(false)}
                className="text-sm text-ink-muted hover:text-ink font-medium transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
