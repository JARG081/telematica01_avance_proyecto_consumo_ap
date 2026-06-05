import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link to="/dashboard" className="text-lg font-bold text-blue-600 hover:text-blue-800 transition-colors">
          EduRAG
        </Link>
        <nav className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">
            Dashboard
          </Link>
          <Link to="/chat" className="text-sm font-medium flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
              <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.44 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
            </svg>
            Chat con IA
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600 hidden sm:inline">
          {user?.username} <span className="text-xs bg-gray-100 px-2 py-1 rounded-full ml-1">({user?.role || 'usuario'})</span>
        </span>
        <button
          onClick={logout}
          className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}
