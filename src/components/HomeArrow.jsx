/**
 * Phase 15: Home navigation arrow
 * Minimal component for returning to home screen
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import '../styles/HomeArrow.css';

function HomeArrow() {
  const navigate = useNavigate();
  
  return (
    <button 
      className="home-arrow"
      onClick={() => navigate('/')}
      aria-label="Back to home"
      title="Back to home"
    >
      <FaArrowLeft />
    </button>
  );
}

export default HomeArrow;
