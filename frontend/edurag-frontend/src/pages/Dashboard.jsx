import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eduragApi } from '../services/api';

/* ─── Helpers ──────────────────────────────────────────────────── */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ name }) {
  const ext = name?.split('.').pop().toLowerCase();
  const color = ext === 'pdf' ? '#ef4444' : ext === 'doc' || ext === 'docx' ? '#3b82f6' : '#6b7280';
  return (
    <svg style={{ width: 18, height: 18, color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

/* ─── Modal ────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(0,0,0,0.55)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--color-surface)', border: '1px solid var(--color-edge)',
        borderRadius: 12, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--color-edge)',
        }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{title}</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-ink-muted)', fontSize: 20, lineHeight: 1, padding: 2,
          }}>×</button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── Styles helper ────────────────────────────────────────────── */
const btn = (variant = 'primary', extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
  border: 'none', borderRadius: 7, fontWeight: 600, fontSize: 13,
  padding: '8px 14px', transition: 'opacity .15s',
  background: variant === 'primary' ? 'var(--color-brand)' :
              variant === 'danger'  ? '#ef4444' :
              variant === 'ghost'   ? 'transparent' : 'var(--color-canvas)',
  color: variant === 'primary' || variant === 'danger' ? '#fff' :
         variant === 'ghost' ? 'var(--color-ink-muted)' : 'var(--color-ink)',
  border: variant === 'outline' ? '1px solid var(--color-edge)' : 'none',
  ...extra,
});

const input = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--color-canvas)', border: '1px solid var(--color-edge)',
  borderRadius: 7, padding: '9px 12px', fontSize: 13, color: 'var(--color-ink)',
  outline: 'none',
};

/* ═══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user, logout } = useAuth();
  const isProfesor = user?.role === 'profesor';
  const fileInputRef = useRef(null);

  /* ── state ── */
  const [tab, setTab]               = useState('cursos');       // 'cursos' | 'archivos'
  const [collections, setCollections] = useState([]);
  const [files, setFiles]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  /* upload */
  const [file, setFile]             = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [uploadMsg, setUploadMsg]   = useState('');
  const [dragOver, setDragOver]     = useState(false);

  /* modals */
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [showStudents, setShowStudents]         = useState(null); // collection object
  const [showUploadModal, setShowUploadModal]   = useState(null); // collection id

  /* create course form */
  const [courseName, setCourseName]  = useState('');
  const [courseDesc, setCourseDesc]  = useState('');
  const [saving, setSaving]         = useState(false);

  /* students */
  const [students, setStudents]     = useState([]);
  const [newEmail, setNewEmail]     = useState('');
  const [enrolling, setEnrolling]   = useState(false);

  /* ── load ── */
  const loadAll = async () => {
    try {
      setLoading(true);
      const [cRes, fRes] = await Promise.all([
        eduragApi.get('/collections'),
        eduragApi.get('/files'),
      ]);
      setCollections(cRes.data);
      setFiles(fRes.data);
    } catch {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  /* ── create course ── */
  const createCourse = async (e) => {
    e.preventDefault();
    if (!courseName.trim()) return;
    setSaving(true);
    try {
      await eduragApi.post('/collections', { name: courseName, description: courseDesc });
      setCourseName(''); setCourseDesc('');
      setShowCreateCourse(false);
      loadAll();
    } catch {
      setError('Error al crear curso');
    } finally {
      setSaving(false);
    }
  };

  /* ── delete course ── */
  const deleteCourse = async (id) => {
    if (!confirm('¿Eliminar este curso?')) return;
    try {
      await eduragApi.delete(`/collections/${id}`);
      loadAll();
    } catch {
      setError('Error al eliminar curso');
    }
  };

  /* ── students ── */
  const openStudents = async (col) => {
    setShowStudents(col);
    try {
      const res = await eduragApi.get(`/collections/${col.id}/students`);
      setStudents(res.data);
    } catch {
      setStudents([]);
    }
  };

  const enrollStudent = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !showStudents) return;
    setEnrolling(true);
    try {
      await eduragApi.post(`/collections/${showStudents.id}/students`, { studentEmail: newEmail });
      setNewEmail('');
      const res = await eduragApi.get(`/collections/${showStudents.id}/students`);
      setStudents(res.data);
    } catch {
      setError('Error al agregar estudiante');
    } finally {
      setEnrolling(false);
    }
  };

  const removeStudent = async (studentId) => {
    if (!confirm('¿Quitar estudiante?')) return;
    try {
      await eduragApi.delete(`/collections/${showStudents.id}/students/${studentId}`);
      const res = await eduragApi.get(`/collections/${showStudents.id}/students`);
      setStudents(res.data);
    } catch {
      setError('Error al quitar estudiante');
    }
  };

  /* ── upload file (to collection) ── */
  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file || !showUploadModal) return;
    setUploadMsg(''); setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('collectionId', showUploadModal);
      await eduragApi.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMsg('Archivo subido exitosamente');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadAll();
    } catch {
      setError('Error al subir archivo');
    } finally {
      setUploading(false);
    }
  };

  /* ── render ── */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-canvas)' }}>
      {/* ── Header ── */}
      <header style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-edge)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-brand)', fontFamily: 'Georgia, serif' }}>EduRAG</h1>
            <span style={{ color: 'var(--color-edge-strong)' }}>|</span>
            <span style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>Panel de Control</span>
            <Link to="/chat" style={{
              marginLeft: 8, display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: 'var(--color-ink-muted)', textDecoration: 'none',
            }}>
              <svg style={{ width: 15, height: 15 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              Chat IA
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--color-canvas)', border: '1px solid var(--color-edge)',
              borderRadius: 8, padding: '5px 10px',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-brand-wash)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-brand)' }}>
                  {user?.username?.[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)' }}>{user?.username}</div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>
                  {isProfesor ? '🎓 Profesor' : '👤 Estudiante'}
                </div>
              </div>
            </div>
            <button onClick={logout} style={{ ...btn('ghost'), fontSize: 13 }}>Salir</button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px' }}>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13,
          }}>
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18 }}>×</button>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--color-edge)', paddingBottom: 0 }}>
          {['cursos', 'archivos'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px',
                fontSize: 14, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--color-brand)' : 'var(--color-ink-muted)',
                borderBottom: tab === t ? '2px solid var(--color-brand)' : '2px solid transparent',
                marginBottom: -1, transition: 'color .15s',
                textTransform: 'capitalize',
              }}
            >{t === 'cursos' ? '📚 Cursos' : '📄 Archivos'}</button>
          ))}
        </div>

        {/* ══ TAB: CURSOS ══ */}
        {tab === 'cursos' && (
          <section>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                  {isProfesor ? 'Mis Cursos' : 'Cursos Disponibles'}
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--color-ink-muted)' }}>
                  {isProfesor
                    ? 'Gestiona tus cursos, sube materiales y administra estudiantes'
                    : 'Cursos en los que estás inscrito'}
                </p>
              </div>
              {isProfesor && (
                <button onClick={() => setShowCreateCourse(true)} style={btn('primary')}>
                  <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Nuevo Curso
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid var(--color-edge)', borderTopColor: 'var(--color-brand)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'var(--color-ink-muted)', fontSize: 13, marginTop: 10 }}>Cargando cursos...</p>
              </div>
            ) : collections.length === 0 ? (
              <div style={{
                background: 'var(--color-surface)', border: '1px solid var(--color-edge)',
                borderRadius: 12, padding: '48px 24px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
                <p style={{ color: 'var(--color-ink-muted)', fontSize: 14, margin: 0 }}>
                  {isProfesor ? 'Aún no has creado ningún curso.' : 'No estás inscrito en ningún curso.'}
                </p>
                {isProfesor && (
                  <button onClick={() => setShowCreateCourse(true)} style={{ ...btn('primary'), marginTop: 16 }}>
                    Crear primer curso
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {collections.map(col => (
                  <div key={col.id} style={{
                    background: 'var(--color-surface)', border: '1px solid var(--color-edge)',
                    borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
                    transition: 'box-shadow .15s',
                  }}>
                    {/* Card header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: 'var(--color-brand-wash)', borderRadius: 6,
                          padding: '3px 8px', marginBottom: 6,
                        }}>
                          <span style={{ fontSize: 11, color: 'var(--color-brand)', fontWeight: 600 }}>CURSO</span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{col.name}</h3>
                        {col.description && (
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-ink-muted)', lineHeight: 1.4 }}>
                            {col.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--color-ink-muted)' }}>
                      <span>📄 {col.documents?.length ?? 0} archivos</span>
                      <span>📅 {new Date(col.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, borderTop: '1px solid var(--color-edge)', paddingTop: 12 }}>
                      <Link
                        to={`/chat?collection=${col.id}`}
                        style={{ ...btn('primary', { textDecoration: 'none', fontSize: 12, padding: '6px 10px' }) }}
                      >
                        💬 Chat
                      </Link>
                      {isProfesor && (
                        <>
                          <button onClick={() => openStudents(col)} style={{ ...btn('outline', { fontSize: 12, padding: '6px 10px' }) }}>
                            👥 Estudiantes
                          </button>
                          <button onClick={() => setShowUploadModal(col.id)} style={{ ...btn('outline', { fontSize: 12, padding: '6px 10px' }) }}>
                            📤 Subir archivo
                          </button>
                          <button onClick={() => deleteCourse(col.id)} style={{ ...btn('danger', { fontSize: 12, padding: '6px 10px' }) }}>
                            🗑
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ══ TAB: ARCHIVOS ══ */}
        {tab === 'archivos' && (
          <section>
            {/* Upload zone */}
            <div style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-edge)',
              borderRadius: 12, padding: 20, marginBottom: 20,
            }}>
              <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Subir Documento</h2>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!file) return;
                setUploadMsg(''); setUploading(true);
                const formData = new FormData();
                formData.append('file', file);
                eduragApi.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                  .then(res => {
                    setUploadMsg(`Subido: ${res.data.originalFileName}`);
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    loadAll();
                  })
                  .catch(() => setError('Error al subir archivo'))
                  .finally(() => setUploading(false));
              }}>
                <div
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--color-brand)' : file ? 'var(--color-brand)' : 'var(--color-edge)'}`,
                    borderRadius: 10, padding: '28px 16px', textAlign: 'center', cursor: 'pointer',
                    background: dragOver || file ? 'var(--color-brand-wash)' : 'var(--color-canvas)',
                    transition: 'all .2s',
                  }}
                >
                  <input ref={fileInputRef} type="file" onChange={(e) => setFile(e.target.files[0])} style={{ display: 'none' }} />
                  {file ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <FileIcon name={file.name} />
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{file.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-ink-muted)' }}>{formatFileSize(file.size)}</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 28, marginBottom: 6 }}>📂</div>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--color-ink-muted)' }}>
                        Arrastra un archivo o <span style={{ color: 'var(--color-brand)', fontWeight: 600 }}>selecciona</span>
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--color-ink-muted)' }}>PDF, DOCX, TXT</p>
                    </>
                  )}
                </div>
                {file && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button type="submit" disabled={uploading} style={btn('primary')}>
                      {uploading ? 'Subiendo...' : 'Subir Archivo'}
                    </button>
                    <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={btn('ghost')}>
                      Cancelar
                    </button>
                  </div>
                )}
              </form>
              {uploadMsg && (
                <div style={{ marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 7, padding: '8px 12px', fontSize: 13 }}>
                  {uploadMsg}
                </div>
              )}
            </div>

            {/* File list */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-edge)', borderRadius: 12 }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Todos los Documentos</h2>
                <span style={{ fontSize: 12, color: 'var(--color-ink-muted)', background: 'var(--color-canvas)', border: '1px solid var(--color-edge)', borderRadius: 20, padding: '2px 10px' }}>
                  {files.length} {files.length === 1 ? 'archivo' : 'archivos'}
                </span>
              </div>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div style={{ display: 'inline-block', width: 20, height: 20, border: '3px solid var(--color-edge)', borderTopColor: 'var(--color-brand)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                </div>
              ) : files.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--color-ink-muted)', fontSize: 13 }}>
                  No hay archivos aún. Sube el primero.
                </div>
              ) : (
                files.map((f, i) => (
                  <div key={f.fileName || i} style={{
                    padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: i < files.length - 1 ? '1px solid var(--color-edge)' : 'none',
                  }}>
                    <FileIcon name={f.fileName} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginTop: 2 }}>{formatFileSize(f.size)}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(f.createdAtUtc).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>

      {/* ══ MODAL: Crear Curso ══ */}
      {showCreateCourse && (
        <Modal title="Crear Nuevo Curso" onClose={() => setShowCreateCourse(false)}>
          <form onSubmit={createCourse} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Nombre del Curso *</label>
              <input
                style={input}
                placeholder="Ej: Introducción a la Telemática"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 5 }}>Descripción (opcional)</label>
              <textarea
                style={{ ...input, height: 80, resize: 'vertical', fontFamily: 'inherit' }}
                placeholder="Breve descripción del contenido del curso..."
                value={courseDesc}
                onChange={e => setCourseDesc(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreateCourse(false)} style={btn('ghost')}>Cancelar</button>
              <button type="submit" disabled={saving} style={btn('primary')}>
                {saving ? 'Creando...' : 'Crear Curso'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ══ MODAL: Gestionar Estudiantes ══ */}
      {showStudents && (
        <Modal title={`Estudiantes — ${showStudents.name}`} onClose={() => { setShowStudents(null); setStudents([]); setNewEmail(''); }}>
          <form onSubmit={enrollStudent} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              style={{ ...input, flex: 1 }}
              type="email"
              placeholder="correo@estudiante.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={enrolling} style={btn('primary')}>
              {enrolling ? '...' : '+ Agregar'}
            </button>
          </form>

          {students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-ink-muted)', fontSize: 13 }}>
              No hay estudiantes inscritos aún.
            </div>
          ) : (
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {students.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'var(--color-canvas)', border: '1px solid var(--color-edge)',
                  borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: 'var(--color-brand-wash)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: 'var(--color-brand)',
                    }}>
                      {s.studentIdentifier?.[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13 }}>{s.studentIdentifier}</span>
                  </div>
                  <button
                    onClick={() => removeStudent(s.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 16, padding: '2px 4px' }}
                    title="Quitar estudiante"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ══ MODAL: Subir archivo a curso ══ */}
      {showUploadModal && (
        <Modal title="Subir Archivo al Curso" onClose={() => { setShowUploadModal(null); setFile(null); setUploadMsg(''); }}>
          <form onSubmit={uploadFile} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${file ? 'var(--color-brand)' : 'var(--color-edge)'}`,
                borderRadius: 10, padding: 24, textAlign: 'center', cursor: 'pointer',
                background: file ? 'var(--color-brand-wash)' : 'var(--color-canvas)',
              }}
            >
              <input ref={fileInputRef} type="file" onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
              {file ? (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{file.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-ink-muted)', marginTop: 2 }}>{formatFileSize(file.size)}</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>📂</div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--color-ink-muted)' }}>Haz clic para seleccionar un archivo</p>
                </>
              )}
            </div>
            {uploadMsg && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: 7, padding: '8px 12px', fontSize: 13 }}>
                {uploadMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setShowUploadModal(null); setFile(null); setUploadMsg(''); }} style={btn('ghost')}>
                Cancelar
              </button>
              <button type="submit" disabled={!file || uploading} style={btn('primary')}>
                {uploading ? 'Subiendo...' : 'Subir'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        button:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
