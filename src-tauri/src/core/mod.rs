use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::AppHandle;
use tauri::Emitter;

use crate::file_types::{identify_file_type, FileType};

/// Tamanho do buffer para leitura física (4MB para performance balanceada em HDs/SSDs)
const CHUNK_SIZE: usize = 4 * 1024 * 1024;
/// Tamanho do setor tradicional de HDs (512 bytes)
const SECTOR_SIZE: usize = 512;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FoundFile {
    pub offset: u64,
    pub file_type: FileType,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DriveInfo {
    pub device_identifier: String, // ex: /dev/rdisk2, \\.\PhysicalDrive1, /dev/sdb
    pub volume_name: String,
    pub size: u64,
    pub file_system_type: String,
    pub is_internal: bool,
}

#[derive(Serialize, Clone)]
struct ProgressPayload {
    percentage: f32,
    files_found: usize,
    total_scanned: u64,
    current_offset: u64,
    error: Option<String>,
}

// --- Estruturas Auxiliares para Parsing Multiplataforma ---

#[cfg(target_os = "windows")]
#[derive(Deserialize, Debug)]
#[allow(non_snake_case)]
struct WinDisk {
    DeviceId: serde_json::Value, // Pode ser String ou Number vindo do PowerShell
    FriendlyName: String,
    Size: u64,
    MediaType: Option<String>,
}

#[cfg(target_os = "linux")]
#[derive(Deserialize, Debug)]
struct LsblkOutput {
    blockdevices: Vec<LsblkDevice>,
}

#[cfg(target_os = "linux")]
#[derive(Deserialize, Debug)]
struct LsblkDevice {
    name: String,
    path: Option<String>,
    size: Option<u64>,
    fstype: Option<String>,
    model: Option<String>,
    vendor: Option<String>,
    #[serde(rename = "rm")]
    removable: Option<bool>,
    #[serde(rename = "type")]
    dev_type: String,
}

// --- Motor de Varredura ---

/// Varre a unidade de disco e emite eventos para o frontend.
pub fn scan_drive_with_events(
    app: &AppHandle,
    drive_path: &str,
    cancel_flag: Arc<AtomicBool>,
) -> Result<Vec<FoundFile>, String> {
    let mut file = File::open(drive_path).map_err(|e| format!("Falha ao abrir disco: {}", e))?;
    
    // Tenta obter o tamanho total para cálculo de porcentagem (pode falhar em discos brutos em alguns OS)
    let total_size = file.metadata().map(|m| m.len()).unwrap_or(0);

    let mut found_files = Vec::new();
    let mut buffer = vec![0u8; CHUNK_SIZE];
    let mut current_offset = 0u64;

    while !cancel_flag.load(Ordering::Relaxed) {
        match file.read(&mut buffer) {
            Ok(0) => break, // Fim do disco
            Ok(bytes_read) => {
                for sector_start in (0..bytes_read).step_by(SECTOR_SIZE) {
                    let sector_end = std::cmp::min(sector_start + SECTOR_SIZE, bytes_read);
                    let sector_data = &buffer[sector_start..sector_end];

                    let ftype = identify_file_type(sector_data);
                    if ftype != FileType::Unknown {
                        found_files.push(FoundFile {
                            offset: current_offset + sector_start as u64,
                            file_type: ftype,
                        });
                    }
                }

                current_offset += bytes_read as u64;

                let percentage = if total_size > 0 {
                    (current_offset as f32 / total_size as f32) * 100.0
                } else {
                    0.0
                };

                let _ = app.emit(
                    "scan-progress",
                    ProgressPayload {
                        percentage: if percentage > 100.0 { 100.0 } else { percentage },
                        files_found: found_files.len(),
                        total_scanned: current_offset,
                        current_offset,
                        error: None,
                    },
                );
            }
            Err(e) => {
                let error_msg = format!("Erro de leitura no offset {}: {}", current_offset, e);
                let _ = app.emit(
                    "scan-progress",
                    ProgressPayload {
                        percentage: 0.0,
                        files_found: found_files.len(),
                        total_scanned: current_offset,
                        current_offset,
                        error: Some(error_msg),
                    },
                );
                current_offset += SECTOR_SIZE as u64;
                let _ = file.seek(SeekFrom::Start(current_offset));
            }
        }
    }

    Ok(found_files)
}

// --- Listagem de Unidades ---

pub fn list_drives_parsed() -> Result<Vec<DriveInfo>, String> {
    #[cfg(target_os = "macos")]
    {
        list_drives_macos()
    }
    #[cfg(target_os = "windows")]
    {
        list_drives_windows()
    }
    #[cfg(target_os = "linux")]
    {
        list_drives_linux()
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err("Sistema operacional não suportado.".to_string())
    }
}

#[cfg(target_os = "macos")]
fn list_drives_macos() -> Result<Vec<DriveInfo>, String> {
    let output = Command::new("diskutil")
        .arg("list")
        .arg("-plist")
        .arg("physical")
        .output()
        .map_err(|e| format!("diskutil erro: {}", e))?;

    let drives_plist: plist::Value = plist::from_bytes(&output.stdout)
        .map_err(|e| format!("Falha no parse do plist: {}", e))?;

    let mut drives = Vec::new();

    if let Some(whole_disks) = drives_plist
        .as_dictionary()
        .and_then(|d| d.get("WholeDisks"))
        .and_then(|v| v.as_array())
    {
        for disk_id in whole_disks {
            if let Some(id_str) = disk_id.as_string() {
                let info_out = Command::new("diskutil")
                    .arg("info")
                    .arg("-plist")
                    .arg(id_str)
                    .output();

                if let Ok(io) = info_out {
                    if let Ok(info_plist) = plist::from_bytes::<plist::Value>(&io.stdout) {
                        if let Some(dict) = info_plist.as_dictionary() {
                            drives.push(DriveInfo {
                                device_identifier: format!("/dev/r{}", id_str),
                                volume_name: dict.get("MediaName").and_then(|v| v.as_string()).unwrap_or("Disco").to_string(),
                                size: dict.get("TotalSize").and_then(|v| v.as_unsigned_integer()).unwrap_or(0),
                                file_system_type: "Physical".to_string(),
                                is_internal: dict.get("Internal").and_then(|v| v.as_boolean()).unwrap_or(false),
                            });
                        }
                    }
                }
            }
        }
    }
    Ok(drives)
}

#[cfg(target_os = "windows")]
fn list_drives_windows() -> Result<Vec<DriveInfo>, String> {
    let output = Command::new("powershell")
        .arg("-Command")
        .arg("Get-PhysicalDisk | Select-Object DeviceId, FriendlyName, Size, MediaType | ConvertTo-Json")
        .output()
        .map_err(|e| format!("PowerShell erro: {}", e))?;

    let json_str = String::from_utf8_lossy(&output.stdout);
    if json_str.trim().is_empty() { return Ok(Vec::new()); }

    let raw_disks: Vec<WinDisk> = if json_str.trim().starts_with('[') {
        serde_json::from_str(&json_str).map_err(|e| e.to_string())?
    } else {
        match serde_json::from_str::<WinDisk>(&json_str) {
            Ok(d) => vec![d],
            Err(_) => Vec::new()
        }
    };

    Ok(raw_disks.into_iter().map(|d| {
        let id = match d.DeviceId {
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::String(s) => s,
            _ => "0".to_string()
        };
        DriveInfo {
            device_identifier: format!(r"\\.\PhysicalDrive{}", id),
            volume_name: d.FriendlyName,
            size: d.Size,
            file_system_type: d.MediaType.unwrap_or_else(|| "Disk".to_string()),
            is_internal: true,
        }
    }).collect())
}

#[cfg(target_os = "linux")]
fn list_drives_linux() -> Result<Vec<DriveInfo>, String> {
    let output = Command::new("lsblk")
        .arg("-bJ")
        .arg("-o")
        .arg("NAME,PATH,SIZE,FSTYPE,TYPE,MODEL,VENDOR,RM")
        .output()
        .map_err(|e| e.to_string())?;

    let parsed: LsblkOutput = serde_json::from_slice(&output.stdout).map_err(|e| e.to_string())?;

    Ok(parsed.blockdevices.into_iter()
        .filter(|d| d.dev_type == "disk")
        .map(|d| DriveInfo {
            device_identifier: d.path.unwrap_or_else(|| format!("/dev/{}", d.name)),
            volume_name: format!("{} {}", d.vendor.unwrap_or_default(), d.model.unwrap_or_default()).trim().to_string(),
            size: d.size.unwrap_or(0),
            file_system_type: d.fstype.unwrap_or_else(|| "Physical".to_string()),
            is_internal: !d.removable.unwrap_or(false),
        }).collect())
}
