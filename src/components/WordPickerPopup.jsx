/**
 * Chapter 4, Phase 1: Word Picker Popup
 * Chapter 4 Phase 2: Added chunk selection (contiguous word selection)
 * Chapter 4 Phase 1 Correction: Added Apply button, improved clarity
 */

import React, { useState, useEffect, useRef } from 'react';
import '../styles/WordPickerPopup.css';

function WordPickerPopup({ 
  selectedWord, 
  quickOptions, 
  onSelect, 
  onClose,
  chunkSelection,
  onChunkExpand,
  totalWords,
  chunkWords
}) {
  const [customInput, setCustomInput] = useState('');
  const [mode, setMode] = useState('replace');
  const inputRef = useRef(null);
  const popupRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle ENTER key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && customInput.trim()) {
      e.preventDefault();
      onSelect(customInput.trim(), mode);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleApply = () => {
    if (customInput.trim()) {
      onSelect(customInput.trim(), mode);
    }
  };

  const canExpandLeft = chunkSelection && chunkSelection.startIndex > 0;
  const canExpandRight = chunkSelection && chunkSelection.endIndex < totalWords - 1;

  // Get the display text for the chunk
  const getChunkDisplayText = () => {
    if (chunkWords && chunkWords.length > 0) {
      return chunkWords.join(' ');
    }
    return selectedWord;
  };

  return (
    <div className="word-picker-overlay">
      <div className="word-picker-popup" ref={popupRef}>
        <div className="mode-toggle">
          <button
            className={mode === 'replace' ? 'active' : ''}
            onClick={() => setMode('replace')}
          >
            Replace
          </button>
          <button
            className={mode === 'before' ? 'active' : ''}
            onClick={() => setMode('before')}
          >
            Add before
          </button>
          <button
            className={mode === 'after' ? 'active' : ''}
            onClick={() => setMode('after')}
          >
            Add after
          </button>
        </div>

        <div className="popup-header">
          {mode === 'replace' && `Change "${getChunkDisplayText()}"`}
          {mode === 'before' && `Add before "${getChunkDisplayText()}"`}
          {mode === 'after' && `Add after "${getChunkDisplayText()}"`}
        </div>

        {/* Chapter 4 Phase 2: Chunk expansion buttons */}
        {chunkSelection && (chunkSelection.startIndex !== undefined || chunkSelection.endIndex !== undefined) && (
          <div className="chunk-expansion-controls">
            <button 
              className="expand-button expand-left"
              onClick={() => onChunkExpand('left')}
              disabled={!canExpandLeft}
              title="Expand selection to the left"
            >
              ← Expand
            </button>
            <button 
              className="expand-button expand-right"
              onClick={() => onChunkExpand('right')}
              disabled={!canExpandRight}
              title="Expand selection to the right"
            >
              Expand →
            </button>
          </div>
        )}

        {quickOptions.length === 0 && (
          <div className="no-options-text">No quick options available</div>
        )}

        {quickOptions.length > 0 && (
          <div className="quick-options">
            {quickOptions.map((option, index) => (
              <button
                key={index}
                className="quick-option-btn"
                onClick={() => onSelect(option, mode)}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        {/* Custom input - always visible */}
        <div className="custom-input-section">
          <input
            ref={inputRef}
            type="text"
            className="custom-input"
            placeholder="Type a word or phrase..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className="apply-button"
            onClick={handleApply}
            disabled={!customInput.trim()}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export default WordPickerPopup;
