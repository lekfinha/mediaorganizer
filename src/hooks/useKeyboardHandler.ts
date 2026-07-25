import { useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { useConfigStore } from '../stores/useConfigStore';

export function useKeyboardHandler() {
  const mode = useAppStore((s) => s.mode);
  const currentDir = useAppStore((s) => s.currentDir);
  const advance = useAppStore((s) => s.advance);
  const deleteCurrentItem = useAppStore((s) => s.deleteCurrentItem);
  const moveCurrentItem = useAppStore((s) => s.moveCurrentItem);
  const undo = useAppStore((s) => s.undo);
  const isCollisionOverlayOpen = useAppStore((s) => s.isCollisionOverlayOpen);
  const isSettingsOpen = useAppStore((s) => s.isSettingsOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle keys when modals are open or editing a text field
      if (isCollisionOverlayOpen || isSettingsOpen) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      // Ctrl+Z = Undo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, currentDir, isCollisionOverlayOpen, isSettingsOpen, advance, deleteCurrentItem, moveCurrentItem, undo]);
}
