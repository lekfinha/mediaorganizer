import { useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useConfigStore } from '../stores/useConfigStore';

export function useKeyboardHandler() {
  const mode = useAppStore((s) => s.mode);
  const currentDir = useAppStore((s) => s.currentDir);
  const advance = useAppStore((s) => s.advance);
  const goBack = useAppStore((s) => s.goBack);
  const deleteCurrentItem = useAppStore((s) => s.deleteCurrentItem);
  const moveCurrentItem = useAppStore((s) => s.moveCurrentItem);
  const undo = useAppStore((s) => s.undo);
  const carouselNext = useAppStore((s) => s.carouselNext);
  const carouselPrev = useAppStore((s) => s.carouselPrev);
  const isCollisionOverlayOpen = useAppStore((s) => s.isCollisionOverlayOpen);
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys when modals are open or editing a text field
      if (isCollisionOverlayOpen || isSettingsOpen) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Ctrl+Z = Undo (not in browse mode)
      if (e.ctrlKey && e.key === 'z') {
        if (mode !== 'browse') {
          e.preventDefault();
          undo();
        }
        return;
      }

      if (mode === 'binary') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          deleteCurrentItem();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          advance();
        }
      } else if (mode === 'classify') {
        if (e.key === 'Delete') {
          e.preventDefault();
          deleteCurrentItem();
          return;
        }

        // Check shortcuts
        const shortcuts = useConfigStore.getState().getActiveShortcuts(currentDir);
        const destination = shortcuts[e.key];
        if (destination) {
          e.preventDefault();
          moveCurrentItem(destination);
        }
      } else if (mode === 'browse') {
        // ↑ / ↓  →  post anterior / siguiente
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          goBack();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          advance();
        // ← / →  →  imagen anterior / siguiente dentro del carrusel
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          carouselPrev();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          carouselNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentDir, isCollisionOverlayOpen, isSettingsOpen,
      advance, goBack, deleteCurrentItem, moveCurrentItem, undo,
      carouselNext, carouselPrev]);
}
