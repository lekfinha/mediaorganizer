import { useEffect } from 'react';
import { useConfigStore } from './stores/useConfigStore';
import { useAppStore } from './stores/useAppStore';
import { useKeyboardHandler } from './hooks/useKeyboardHandler';
import { DirectoryPicker } from './components/DirectoryPicker/DirectoryPicker';
import { MediaViewer } from './components/MediaViewer/MediaViewer';
import { ShortcutPanel } from './components/ShortcutPanel/ShortcutPanel';
import { ProgressBar } from './components/ProgressBar/ProgressBar';
import { FileNameEditor } from './components/FileNameEditor/FileNameEditor';
import { ModeSelector } from './components/ModeSelector/ModeSelector';
import { CollisionOverlay } from './components/CollisionOverlay/CollisionOverlay';
import { SettingsOverlay } from './components/SettingsOverlay/SettingsOverlay';

function App() {
  const loadConfig = useConfigStore(s => s.loadConfig);
  const isLoaded = useConfigStore(s => s.isLoaded);
  const currentDir = useAppStore(s => s.currentDir);
  const error = useAppStore(s => s.error);
  const dismissError = useAppStore(s => s.dismissError);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useKeyboardHandler();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(dismissError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dismissError]);

  if (!isLoaded) return <div className="p-8 text-center">Loading configuration...</div>;

  if (!currentDir) {
    return <DirectoryPicker />;
  }

  return (
    <>
      <div className="app-layout">
        <header className="app-layout-header">
          <ModeSelector />
          <FileNameEditor />
          <div style={{ width: '120px' }}>{/* Placeholder for balance */}</div>
        </header>

        <MediaViewer />
        <ShortcutPanel />
        <ProgressBar />
      </div>

      <CollisionOverlay />
      <SettingsOverlay />

      {error && (
        <div className="fixed bottom-4 right-4 bg-danger text-white px-4 py-2 rounded shadow-lg z-50">
          {error}
        </div>
      )}
    </>
  );
}

export default App;
