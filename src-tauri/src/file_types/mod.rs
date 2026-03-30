use serde::{Deserialize, Serialize};
use std::fmt;

/// Enum dos tipos de arquivo detectáveis via Magic Bytes.
/// Serializa para JSON automaticamente para envio ao frontend Tauri.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum FileType {
    Video(String),
    Image(String),
    Pdf,
    Doc(String),
    Unknown,
}

impl fmt::Display for FileType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            FileType::Video(ext) => write!(f, "Vídeo ({})", ext),
            FileType::Image(ext) => write!(f, "Imagem ({})", ext),
            FileType::Pdf => write!(f, "Documento PDF"),
            FileType::Doc(ext) => write!(f, "Documento Office ({})", ext),
            FileType::Unknown => write!(f, "Desconhecido"),
        }
    }
}

/// Retorna uma string de categoria curta para agrupamento no frontend.
impl FileType {
    pub fn category(&self) -> &str {
        match self {
            FileType::Video(_) => "video",
            FileType::Image(_) => "image",
            FileType::Pdf => "pdf",
            FileType::Doc(_) => "doc",
            FileType::Unknown => "unknown",
        }
    }
    
    pub fn label(&self) -> String {
        match self {
            FileType::Video(ext) => format!("Vídeo .{}", ext),
            FileType::Image(ext) => format!("Imagem .{}", ext),
            FileType::Pdf => "Documento PDF".to_string(),
            FileType::Doc(ext) => format!("Office .{}", ext),
            FileType::Unknown => "Desconhecido".to_string(),
        }
    }
}

/// Identifica o tipo do arquivo através dos "Magic Bytes"
/// Recebe um buffer de bytes brutos (idealmente o setor de 512 bytes)
pub fn identify_file_type(buffer: &[u8]) -> FileType {
    // 1. Tenta usar a crate `infer` primeiro
    if let Some(kind) = infer::get(buffer) {
        let ext = kind.extension();
        return match ext {
            "mp4" | "mkv" | "avi" => FileType::Video(ext.to_string()),
            "jpg" | "jpeg" | "png" | "gif" => FileType::Image(ext.to_string()),
            "pdf" => FileType::Pdf,
            "doc" | "docx" | "xls" | "xlsx" => FileType::Doc(ext.to_string()),
            _ => FileType::Unknown,
        };
    }

    // 2. Fallback manual (assinaturas customizadas)
    if buffer.len() >= 8 {
        if buffer.starts_with(b"%PDF-") {
            return FileType::Pdf;
        }
        // Microsoft Office Antigo (.doc, .xls)
        if buffer.starts_with(&[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]) {
            return FileType::Doc("doc/xls".to_string());
        }
        // Office Moderno / Zip (.docx, .xlsx)
        if buffer.starts_with(&[0x50, 0x4B, 0x03, 0x04]) {
            return FileType::Doc("docx/xlsx".to_string());
        }
    }

    FileType::Unknown
}
