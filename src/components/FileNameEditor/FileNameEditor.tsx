import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/useAppStore';
import './FileNameEditor.css';

export const FileNameEditor: React.FC = () => {
  const currentItem = useAppStore(s => s.getCurrentItem());
  const renameCurrentItem = useAppStore(s => s.renameCurrentItem);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentItem && !isEditing) {
      setValue(currentItem.base_name);
    }
  }, [currentItem, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!currentItem) return null;

  const handleSubmit = () => {
    if (value.trim() && value !== currentItem.base_name) {
      renameCurrentItem(value.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setValue(currentItem.base_name);
      setIsEditing(false);
    }
  };

  return (
    <div className="filename-editor-container">
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          className="filename-input"
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <div 
          className="filename-display" 
          onClick={() => setIsEditing(true)}
          title="Click to rename"
        >
          {currentItem.base_name}
        </div>
      )}
    </div>
  );
};
