import React, { useEffect } from 'react';
import '../styles/MeaningBubble.css';

/**
 * MeaningBubble - Phase 11 Comprehension Layer
 * Chapter 4 Phase 1 Correction: Added "Change" button for editing
 * 
 * Displays simple word meanings in a lightweight popup.
 * Dismisses on: timeout (3s), tap another word, sentence change, navigation
 */
function MeaningBubble({ word, meaning, position, onDismiss, onChangeClick, wordIndex }) {
  useEffect(() => {
    // Auto-dismiss after 3 seconds (extended for "Change" button visibility)
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onDismiss]);
  
  const handleChangeClick = (e) => {
    e.stopPropagation(); // Prevent dismissing
    onDismiss(); // Close bubble first
    if (onChangeClick) {
      onChangeClick(word, wordIndex);
    }
  };
  
  return (
    <div 
      className="meaning-bubble"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-50%)'
      }}
      onClick={onDismiss}
    >
      <div className="meaning-text">
        {meaning || "meaning unavailable"}
      </div>
      {onChangeClick && (
        <button 
          className="change-button"
          onClick={handleChangeClick}
        >
          Change
        </button>
      )}
    </div>
  );
}

export default MeaningBubble;
