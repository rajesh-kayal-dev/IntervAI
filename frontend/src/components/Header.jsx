import { useState, useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import { logout, reset } from "../features/auth/authSlice"
const Header = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const onLogout = () => {
    dispatch(logout());
    dispatch(reset());
    navigate("/login");
  }

  const isActive = (path) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300 px-4 pt-4">
      <div className={`max-w-7xl mx-auto w-full backdrop-blur-xl px-6 sm:px-8 py-3 flex flex-col justify-center rounded-3xl border transition-all duration-300 ${isScrolled ? 'bg-white/85 shadow-md border-gray-200/60' : 'bg-[#E9EFED]/75 border-transparent'}`}>
        <div className="flex items-center justify-between w-full">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <img src="/intervai_app_logo.png" alt="IntervAI Logo" className="h-7 w-auto object-contain group-hover:rotate-6 transition-transform duration-300 animate-pulse-slow" />
            <span className="font-sans text-xl font-bold tracking-tight text-[#1B6C42] group-hover:opacity-90 transition-opacity">Interv<span className="text-[#64B08F]">AI</span></span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            {user ? (
              <>
                <Link to="/" className={`text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${isActive('/') ? 'text-[#1B6C42] border-b border-[#1B6C42]' : 'text-gray-500 hover:text-gray-900 border-b border-transparent'}`}>Dashboard</Link>
                <Link to="/profile" className={`text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${isActive('/profile') ? 'text-[#1B6C42] border-b border-[#1B6C42]' : 'text-gray-500 hover:text-gray-900 border-b border-transparent'}`}>Profile</Link>
                <div className="flex items-center space-x-2 bg-white/80 border border-gray-205 px-3.5 py-1.5 rounded-full shadow-sm">
                  <div className="w-1.5 h-1.5 bg-[#1B6C42] rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-gray-600 font-mono">{user.name.split(' ')[0]}</span>
                </div>
                <button onClick={onLogout} className="border border-rose-200 hover:border-rose-500 bg-rose-50/20 hover:bg-rose-50 text-rose-600 text-xs font-semibold tracking-wider uppercase px-5 py-2 rounded-full hover:scale-[1.03] active:scale-[0.97] transition-all duration-300">
                  Logout
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-6">
                <Link to="/login" className={`text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${isActive('/login') ? 'text-[#1B6C42]' : 'text-gray-500 hover:text-gray-900'}`}>Sign In</Link>
                <Link to="/register" className="relative overflow-hidden group bg-[#1B6C42] text-white px-5 py-2 rounded-full font-semibold text-xs tracking-wider shadow-sm hover:shadow-md transition-all duration-400 hover:scale-[1.04] active:scale-[0.97] btn-shimmer">
                  Get Started
                </Link>
              </div>
            )}
          </nav>

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-[#1B6C42] hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white/95 border border-gray-100 mt-3 rounded-2xl shadow-xl animate-in fade-in-20 duration-300 w-full">
            <div className="px-6 py-6 space-y-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-3 mb-4 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="w-2 h-2 bg-[#1B6C42] rounded-full animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{user.name}</span>
                  </div>
                  <Link to="/" onClick={() => setIsMenuOpen(false)} className={`block py-3 text-sm font-semibold uppercase tracking-wider border-b border-gray-50 ${isActive('/') ? 'text-[#1B6C42]' : 'text-gray-500'}`}>Dashboard</Link>
                  <Link to="/profile" onClick={() => setIsMenuOpen(false)} className={`block py-3 text-sm font-semibold uppercase tracking-wider border-b border-gray-50 ${isActive('/profile') ? 'text-[#1B6C42]' : 'text-gray-500'}`}>Profile</Link>
                  <button onClick={onLogout} className="w-full mt-4 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-md active:scale-95 transition-all">Logout</button>
                </>
              ) : (
                <div className="flex flex-col space-y-3">
                  <Link to="/login" onClick={() => setIsMenuOpen(false)} className={`block py-3 text-sm font-semibold uppercase tracking-wider border-b border-gray-50 ${isActive('/login') ? 'text-[#1B6C42]' : 'text-gray-500'}`}>Sign In</Link>
                  <Link to="/register" onClick={() => setIsMenuOpen(false)} className="w-full text-center bg-[#1B6C42] text-white py-3 rounded-xl text-xs font-semibold uppercase tracking-wider shadow-sm hover:bg-[#155A35] transition-all">Get Started</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header
