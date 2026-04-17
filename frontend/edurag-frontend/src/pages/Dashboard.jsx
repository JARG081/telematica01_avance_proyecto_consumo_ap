import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { eduragApi } from '../services/api';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const icons = {
    pdf: (
      <svg className="w-5 h-5 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    doc: (
      <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    txt: (
      <svg className="w-5 h-5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  };
  return icons[ext] || icons.txt;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const fileInputRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Upload state
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const res = await eduragApi.get('/files');
      setFiles(res.data);
    } catch {
      setError('Error al cargar archivos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploadMsg('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await eduragApi.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMsg(`Archivo subido: ${res.data.originalFileName}`);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadFiles();
    } catch {
      setError('Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) setFile(droppedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="bg-surface border-b border-edge">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-xl font-bold text-brand tracking-tight">
              EduRAG
            </h1>
            <span className="text-edge-strong">|</span>
            <span className="text-sm text-ink-muted">Base de Conocimiento</span>
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

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Error banner */}
        {error && (
          <div className="bg-danger-wash border border-danger/20 text-danger px-4 py-3 rounded-md text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError('')}
              className="text-danger/60 hover:text-danger ml-3 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Upload zone */}
        <section className="bg-surface border border-edge rounded-lg p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Subir Documento</h2>
          <form onSubmit={uploadFile}>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${dragOver
                  ? 'border-brand bg-brand-wash'
                  : file
                    ? 'border-brand/40 bg-brand-wash/50'
                    : 'border-edge hover:border-edge-strong hover:bg-canvas'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />

              {file ? (
                <div className="flex items-center justify-center gap-3">
                  {getFileIcon(file.name)}
                  <div className="text-left">
                    <p className="text-sm font-medium text-ink">{file.name}</p>
                    <p className="text-xs text-ink-muted">{formatFileSize(file.size)}</p>
                  </div>
                </div>
              ) : (
                <>
                  <svg className="w-8 h-8 mx-auto text-ink-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-sm text-ink-secondary">
                    Arrastra un archivo aqui o <span className="text-brand font-medium">seleccionalo</span>
                  </p>
                  <p className="text-xs text-ink-muted mt-1">PDF, DOCX, TXT</p>
                </>
              )}
            </div>

            {file && (
              <div className="flex items-center gap-3 mt-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-brand text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-brand-light disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {uploading ? 'Subiendo...' : 'Subir Archivo'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-sm text-ink-muted hover:text-ink transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </form>

          {uploadMsg && (
            <div className="bg-success-wash border border-success/20 text-success text-sm px-3 py-2 rounded-md mt-4">
              {uploadMsg}
            </div>
          )}
        </section>

        {/* Files list */}
        <section className="bg-surface border border-edge rounded-lg">
          <div className="px-6 py-4 border-b border-edge flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">Documentos</h2>
            <span className="text-xs text-ink-muted bg-canvas px-2 py-0.5 rounded-full border border-edge">
              {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
            </span>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="inline-block w-5 h-5 border-2 border-edge border-t-brand rounded-full animate-spin" />
              <p className="text-sm text-ink-muted mt-3">Cargando documentos...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <svg className="w-10 h-10 mx-auto text-ink-muted/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
              <p className="text-sm text-ink-muted">No hay documentos aun</p>
              <p className="text-xs text-ink-muted/70 mt-1">Sube tu primer archivo para comenzar</p>
            </div>
          ) : (
            <div className="divide-y divide-edge">
              {files.map((f) => (
                <div
                  key={f.fileName}
                  className="px-6 py-3.5 flex items-center gap-4 hover:bg-canvas/60 transition-colors"
                >
                  <div className="shrink-0">
                    {getFileIcon(f.fileName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {f.fileName}
                    </p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {formatFileSize(f.size)}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-ink-muted tabular-nums">
                    {new Date(f.createdAtUtc).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
