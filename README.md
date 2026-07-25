# 🎬 MediaOrganizer

An ultra-fast, Tinder-style desktop application built with **Tauri 2**, **Rust**, and **React + TypeScript** for organizing, sorting, and cleaning up local multimedia directories.

Designed for efficiency, this tool lets you review high-volume folders (like phone backups, Instaloader dumps, or download directories) in seconds.

---

## 🎨 Features

- **⚡ Tinder-style Binary Mode**: Use `ArrowLeft` (←) to trash/delete and `ArrowRight` (→) to keep and advance.
- **📂 Classify Mode**: Map custom keys (e.g. `A`, `S`, `D`) to destination folders. Pressing the key instantly moves the file.
- **🛠️ Dynamic Shortcut Manager**: Add/remove folder shortcuts inline from the sidebar. Includes a native OS folder picker that opens relative to the active directory.
- **↩️ Multi-layered Undo Stack**: Hit `Ctrl + Z` to instantly undo any action (deletes or moves). State recovers safely and automatically.
- **📦 Instaloader / Double-Extension Support**: Groups files with identical base-names (like `2025-01-29_UTC.jpg`, `.mp4`, `.txt`, `.json.xz`) together as a single item, keeping non-viewable files bundled.
- **🎬 Blob URL Video Playback**: Bypasses Linux WebKit2GTK GStreamer limitations with custom local asset streams (using memory Blobs) so local videos play smoothly with audio and custom playback controls.
- **🟣 Deep Purple Aesthetic**: Beautiful, glassmorphic dark theme based on a customized purple color palette (`#10002b` to `#e0aaff`), ready for theme customization.

---

## 🚀 Getting Started

### 1. Install System Dependencies

Before compiling the app, you need the GTK/GStreamer toolchain.

Refer to [requirements.txt](file:///home/miauuu/Codigo/MediaOrganizer/requirements.txt) for detailed packages. On **Arch Linux**:

```bash
sudo pacman -Syu webkit2gtk-4.1 gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugins-ugly gst-libav
```

*Note: Restart your user session/desktop environment after installing GStreamer plugins so WebKit loads the new codecs.*

### 2. Run in Development Mode

Install Node dependencies and start the Tauri compiler:

```bash
# Install NPM dependencies
npm install

# Run Tauri in dev mode
npm run tauri dev
```

### 3. Build Production Bundle

To compile a highly optimized release binary:

```bash
npm run tauri build
```

---

## 🛠️ Tech Stack & Architecture

- **Backend (Core)**: 
  - **Rust / Tauri 2**: Handles high-performance file operations, native dialogues, and OS integration.
  - **`trash` crate**: Safely integrates with the system OS trash bin.
- **Frontend (UI)**:
  - **React 19 & TypeScript**: Clean component design.
  - **Zustand 5**: Reactive state management with stores for configuration, queue prefetching, and actions.
  - **CSS custom properties**: Easy palette modification via design system variables.
