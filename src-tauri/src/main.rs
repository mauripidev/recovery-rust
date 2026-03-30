// Apoucado wrapper. O lib.rs contém toda a lógica.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    recovery_rust_lib::run();
}
