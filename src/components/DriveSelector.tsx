import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { DriveInfo } from "../App";

interface DriveSelectorProps {
  onDriveSelected: (drive: DriveInfo) => void;
}

function DriveSelector({ onDriveSelected }: DriveSelectorProps) {
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadDrives();
  }, []);

  const loadDrives = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<DriveInfo[]>("list_drives");
      setDrives(result);
    } catch (e: any) {
      setError(e.toString());
    }
    setLoading(false);
  };

  const getDriveIcon = (driveType: string) => {
    if (driveType === "external") {
      return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="1" />
        </svg>
      );
    }
    return (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <line x1="6" y1="10" x2="6" y2="14" />
        <line x1="18" y1="12" x2="18" y2="12" />
      </svg>
    );
  };

  return (
    <div className="drive-selector fade-in">
      <div className="section-header">
        <div className="section-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </div>
        <div>
          <h2>Selecione a Unidade de Origem</h2>
          <p className="section-description">
            Escolha o pendrive ou HD que contém os dados perdidos. O dispositivo será acessado em modo <strong>somente leitura</strong>.
          </p>
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Detectando dispositivos conectados...</p>
        </div>
      )}

      {error && (
        <div className="error-card">
          <p>⚠️ {error}</p>
          <button className="btn btn-outline" onClick={loadDrives}>
            Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && drives.length === 0 && (
        <div className="empty-state">
          <p>Nenhum disco físico detectado.</p>
          <button className="btn btn-outline" onClick={loadDrives}>
            🔄 Redetectar
          </button>
        </div>
      )}

      {!loading && drives.length > 0 && (
        <>
          <div className="drives-grid">
            {drives.map((drive, index) => (
              <div
                key={drive.path}
                className={`drive-card glass-card ${selectedIndex === index ? "selected" : ""}`}
                onClick={() => setSelectedIndex(index)}
              >
                <div className="drive-card-icon">
                  {getDriveIcon(drive.drive_type)}
                </div>
                <div className="drive-card-info">
                  <h3 className="drive-name">{drive.name}</h3>
                  <p className="drive-path">{drive.path}</p>
                  <div className="drive-meta">
                    <span className="badge badge-size">{drive.size}</span>
                    <span className="badge badge-fs">{drive.filesystem}</span>
                    <span className={`badge badge-type ${drive.drive_type}`}>
                      {drive.drive_type === "external" ? "USB/Externo" : "Interno"}
                    </span>
                  </div>
                </div>
                {selectedIndex === index && (
                  <div className="drive-check">✓</div>
                )}
              </div>
            ))}
          </div>

          <div className="action-bar">
            <button className="btn btn-outline" onClick={loadDrives}>
              🔄 Atualizar Lista
            </button>
            <button
              className="btn btn-primary btn-glow"
              disabled={selectedIndex === null}
              onClick={() => selectedIndex !== null && onDriveSelected(drives[selectedIndex])}
            >
              🔍 Iniciar Escaneamento
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default DriveSelector;
