import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { eduragApi } from '../services/api';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const isProfesor = user?.role === 'profesor';

  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [error, setError] = useState('');

  // Create collection form
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');

  // Add document form
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('PDF');
  const [newDocDesc, setNewDocDesc] = useState('');

  // File upload
  const [file, setFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const res = await eduragApi.get('/collections');
      setCollections(res.data);
    } catch {
      setError('Error al cargar colecciones');
    }
  };

  const selectCollection = async (col) => {
    try {
      const res = await eduragApi.get(`/collections/${col.id}`);
      setSelectedCollection(res.data);
    } catch {
      setError('Error al cargar coleccion');
    }
  };

  const createCollection = async (e) => {
    e.preventDefault();
    try {
      await eduragApi.post('/collections', { name: newColName, description: newColDesc });
      setNewColName('');
      setNewColDesc('');
      loadCollections();
    } catch {
      setError('Error al crear coleccion');
    }
  };

  const addDocument = async (e) => {
    e.preventDefault();
    if (!selectedCollection) return;
    try {
      await eduragApi.post(`/collections/${selectedCollection.id}/documents`, {
        title: newDocTitle,
        type: newDocType,
        description: newDocDesc,
      });
      setNewDocTitle('');
      setNewDocDesc('');
      selectCollection(selectedCollection);
    } catch {
      setError('Error al agregar documento');
    }
  };

  const uploadFile = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploadMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await eduragApi.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadMsg(`Archivo subido: ${res.data.originalFileName}`);
      setFile(null);
    } catch {
      setError('Error al subir archivo');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">EduRAG</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">
            {user?.username} ({user?.role || 'usuario'})
          </span>
          <button
            onClick={logout}
            className="text-red-600 hover:underline"
          >
            Cerrar Sesion
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-2 rounded text-sm">
            {error}
            <button onClick={() => setError('')} className="ml-2 font-bold">x</button>
          </div>
        )}

        {/* Upload file */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-base font-semibold mb-3">Subir Archivo</h2>
          <form onSubmit={uploadFile} className="flex items-center gap-3">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="text-sm"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
            >
              Subir
            </button>
          </form>
          {uploadMsg && <p className="text-green-600 text-sm mt-2">{uploadMsg}</p>}
        </section>

        {/* Create collection (profesor only) */}
        {isProfesor && (
          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-base font-semibold mb-3">Crear Coleccion</h2>
            <form onSubmit={createCollection} className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder="Nombre"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                required
                className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[150px]"
              />
              <input
                type="text"
                placeholder="Descripcion (opcional)"
                value={newColDesc}
                onChange={(e) => setNewColDesc(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[150px]"
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700"
              >
                Crear
              </button>
            </form>
          </section>
        )}

        {/* Collections list */}
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="text-base font-semibold mb-3">Colecciones</h2>
          {collections.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay colecciones</p>
          ) : (
            <ul className="space-y-1">
              {collections.map((col) => (
                <li key={col.id}>
                  <button
                    onClick={() => selectCollection(col)}
                    className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-100 ${
                      selectedCollection?.id === col.id ? 'bg-blue-50 font-medium' : ''
                    }`}
                  >
                    {col.name}
                    {col.description && (
                      <span className="text-gray-400 ml-2">- {col.description}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Selected collection documents */}
        {selectedCollection && (
          <section className="bg-white rounded-lg shadow p-4">
            <h2 className="text-base font-semibold mb-3">
              Documentos de: {selectedCollection.name}
            </h2>

            {/* Add document form (profesor only) */}
            {isProfesor && (
              <form onSubmit={addDocument} className="flex flex-wrap gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Titulo"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  required
                  className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[120px]"
                />
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="border rounded px-3 py-1.5 text-sm"
                >
                  <option>PDF</option>
                  <option>PPTX</option>
                  <option>DOCX</option>
                </select>
                <input
                  type="text"
                  placeholder="Descripcion (opcional)"
                  value={newDocDesc}
                  onChange={(e) => setNewDocDesc(e.target.value)}
                  className="border rounded px-3 py-1.5 text-sm flex-1 min-w-[120px]"
                />
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700"
                >
                  Agregar
                </button>
              </form>
            )}

            {(!selectedCollection.documents || selectedCollection.documents.length === 0) ? (
              <p className="text-gray-500 text-sm">No hay documentos en esta coleccion</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="py-2">Titulo</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Descripcion</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCollection.documents.map((doc) => (
                    <tr key={doc.id} className="border-b">
                      <td className="py-2">{doc.title}</td>
                      <td className="py-2">{doc.type}</td>
                      <td className="py-2 text-gray-500">{doc.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
