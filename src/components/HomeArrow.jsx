/**
 * Phase 15: Home navigation arrow
 * Minimal component for returning to home screen
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import '../styles/HomeArrow.css';

function HomeArrow() {
  const navigate = useNavigate();
  const location = useLocation();
  const target = location.state?.from || '/';
  
  return (
    <button 
      className="home-arrow"
      onClick={() => navigate(target)}
      aria-label="Back to previous page"
      title="Back to previous page"
    >
      <FaArrowLeft />
    </button>
  );
}

export default HomeArrow;
