import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';
import '../styles/SubPageLayout.css';

function SubPageLayout({ title, children }) {
  const navigate = useNavigate();

  return (
    <div className="subpage-container">
      <div className="subpage-content">
        <div className="subpage-header">
          <button 
            className="subpage-back-btn" 
            onClick={() => navigate('/')}
            aria-label="Back to home"
          >
            <FaArrowLeft />
          </button>
          <h1 className="subpage-title">{title}</h1>
        </div>
        
        <div className="subpage-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default SubPageLayout;
