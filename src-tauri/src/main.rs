// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Workaround for webkit2gtk 2.52.x crash on Linux:
    // disabling GPU compositing prevents renderer process SIGSEGV on
    // affected hardware/driver combinations.
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }

    media_organizer_lib::run()
}
