import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/HomeArrow.css';

function HomeArrow() {
  const navigate = useNavigate();
  const location = useLocation();
  const target = location.state?.from || '/';
  
  return (
    <button
      className="home-arrow"
      onClick={() => navigate(target)}
      aria-label="Go home"
      title="Go home"
    >
      <span className="navo-dot" />
      <span className="home-arrow-text">Navo</span>
    </button>
  );
}

export default HomeArrow;
