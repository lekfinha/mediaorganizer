import React, { useRef, useState, useEffect } from 'react';
import './MediaViewer.css';

interface ImageViewerProps {
  src: string;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset on src change
  useEffect(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, [src]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    const delta = e.deltaY > 0 ? -1 : 1;
    let newScale = scale * (1 + delta * zoomFactor);
    newScale = Math.max(0.5, Math.min(newScale, 10));
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPos({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleDoubleClick = () => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  };

  return (
    <div 
      className="image-viewer"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <img 
        src={src} 
        alt="Media" 
        style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        draggable={false}
      />
      <div className={`zoom-indicator ${scale !== 1 ? 'visible' : ''}`}>
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
};
