import React, { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux';
import useSocket from './hooks/useSocket';
import { ToastContainer } from 'react-toastify';
import Header from './components/Header';
import Login from './pages/Login';
import Register from './pages/Register';
import PrivateRoute from './components/PrivateRoute';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import Profile from './pages/Profile';
import InterviewRunner from './pages/InterviewRunner';
import SessionReview from './pages/SessionReview';
import NotFound from './pages/NotFound';
import QuizSetup from './pages/QuizSetup';
import QuizRunner from './pages/QuizRunner';
import QuizResult from './pages/QuizResult';
import SimulationSetup from './pages/SimulationSetup';
import InterviewLobby from './pages/InterviewLobby';
import ZegoInterviewRoom from './pages/ZegoInterviewRoom';
import SimulationResult from './pages/SimulationResult';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  useSocket();
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();

  const hideHeaderPaths = [
    '/simulation/setup',
    '/simulation/lobby',
    '/simulation/room/',
    '/quiz/setup',
    '/quiz/run/',
    '/interview/'
  ];
  const shouldHideHeader = hideHeaderPaths.some(path => location.pathname.startsWith(path));

  useEffect(() => {
    const handleMouseMove = (e) => {
      const cards = document.querySelectorAll('.spotlight-card');
      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className='min-h-screen bg-[#E9EFED] text-[#111827] relative z-10 overflow-x-hidden font-sans selection:bg-[#1B6C42]/20 selection:text-[#111827]'>
      <div className="ambient-glow" id="ambient-glow"></div>
      {!shouldHideHeader && <Header />}
      <main className='relative z-10'>
        <Routes>
          <Route path='/' element={user ? <Dashboard /> : <Landing />} />
          <Route path='/login' element={<Landing autoOpen="signin" />} />
          <Route path='/register' element={<Landing autoOpen="signup" />} />
          <Route path='/' element={<PrivateRoute />}>
            <Route path='/profile' element={<Profile />} />
            <Route path='/interview/:sessionId' element={<InterviewRunner />} />
            <Route path="/review/:sessionId" element={<SessionReview />} />
            <Route path="/quiz/setup" element={<QuizSetup />} />
            <Route path="/quiz/run/:quizId" element={<QuizRunner />} />
            <Route path="/quiz/result/:quizId" element={<QuizResult />} />
            <Route path="/simulation/setup" element={<SimulationSetup />} />
            <Route path="/simulation/lobby" element={<InterviewLobby />} />
            <Route path="/simulation/room/:sessionId" element={<ZegoInterviewRoom />} />
            <Route path="/simulation/result/:sessionId" element={<SimulationResult />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <ToastContainer position='top-right' autoClose={3000}/>
    </div>
  )
}

export default App
