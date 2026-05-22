import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(username, email, password);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl font-bold text-brand tracking-tight">
            EduRAG
          </h1>
          <p className="text-ink-muted text-sm mt-1">
            Crea tu cuenta para comenzar
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-edge rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="tu_usuario"
                className="w-full bg-canvas border border-edge rounded-md px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                className="w-full bg-canvas border border-edge rounded-md px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-secondary mb-1.5">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-canvas border border-edge rounded-md px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
              />
            </div>

            {error && (
              <div className="bg-danger-wash border border-danger/20 text-danger text-sm px-3 py-2 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white py-2.5 rounded-md text-sm font-medium hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? 'Registrando...' : 'Crear Cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-5">
          Ya tienes cuenta?{' '}
          <Link to="/login" className="text-brand font-medium hover:text-brand-light transition-colors">
            Iniciar Sesion
          </Link>
        </p>
      </div>
    </div>
  );
}
