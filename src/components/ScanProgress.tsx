import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { DriveInfo, FoundFile, ScanProgressData } from "../App";

interface ScanProgressProps {
  drive: DriveInfo;
  onComplete: (files: FoundFile[]) => void;
  onCancel: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function ScanProgress({ drive, onComplete, onCancel }: ScanProgressProps) {
  const [progress, setProgress] = useState<ScanProgressData>({
    bytes_read: 0,
    total_bytes: 0,
    percent: 0,
    files_found: 0,
    current_sector: 0,
    errors_count: 0,
    status: "starting",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [startTime] = useState(Date.now());
  const [eta, setEta] = useState("Calculando...");

  useEffect(() => {
    let unlistenProgress: UnlistenFn | null = null;
    let unlistenError: UnlistenFn | null = null;

    const setup = async () => {
      unlistenProgress = await listen<ScanProgressData>("scan-progress", (event) => {
        setProgress(event.payload);

        // Calcular ETA
        const elapsed = (Date.now() - startTime) / 1000;
        const p = event.payload;
        if (p.percent > 0 && p.percent < 100 && elapsed > 2) {
          const totalEstimate = elapsed / (p.percent / 100);
          const remaining = totalEstimate - elapsed;
          if (remaining > 60) {
            setEta(`~${Math.ceil(remaining / 60)} min restantes`);
          } else {
            setEta(`~${Math.ceil(remaining)} seg restantes`);
          }
        }

        if (p.status === "done" || p.status === "cancelled") {
          // O scan terminou — resultado virá do invoke
        }
      });

      unlistenError = await listen<string>("scan-error", (event) => {
        setErrors((prev) => [...prev.slice(-19), event.payload]);
      });

      // Iniciar o scan
      try {
        const files = await invoke<FoundFile[]>("start_scan", {
          drivePath: drive.path,
        });
        onComplete(files);
      } catch (e: any) {
        console.error("Scan error:", e);
        // Se cancelou, volta pro início
        if (progress.status === "cancelled") {
          onCancel();
        }
      }
    };

    setup();

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenError) unlistenError();
    };
  }, []);

  const handleCancel = async () => {
    try {
      await invoke("cancel_scan");
    } catch (e) {
      console.error(e);
    }
    onCancel();
  };

  return (
    <div className="scan-progress fade-in">
      <div className="section-header">
        <div className="section-icon pulse-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div>
          <h2>Escaneando {drive.name}</h2>
          <p className="section-description">{drive.path} &middot; {drive.size}</p>
        </div>
      </div>

      {/* Barra de progresso principal */}
      <div className="progress-container glass-card">
        <div className="progress-header">
          <span className="progress-label">Progresso da Varredura</span>
          <span className="progress-percent">{progress.percent.toFixed(1)}%</span>
        </div>
        <div className="progress-bar-wrapper">
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(progress.percent, 100)}%` }}
            />
            <div className="progress-bar-glow" style={{ width: `${Math.min(progress.percent, 100)}%` }} />
          </div>
        </div>
        <div className="progress-stats">
          <div className="stat-item">
            <span className="stat-value">{formatBytes(progress.bytes_read)}</span>
            <span className="stat-label">Lidos</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{formatBytes(progress.total_bytes)}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{eta}</span>
            <span className="stat-label">Estimativa</span>
          </div>
        </div>
      </div>

      {/* Contadores em tempo real */}
      <div className="live-counters">
        <div className="counter-card glass-card">
          <div className="counter-value text-gradient">{progress.files_found}</div>
          <div className="counter-label">Arquivos Detectados</div>
        </div>
        <div className="counter-card glass-card">
          <div className="counter-value">{progress.current_sector.toLocaleString()}</div>
          <div className="counter-label">Setor Atual</div>
        </div>
        <div className="counter-card glass-card">
          <div className={`counter-value ${progress.errors_count > 0 ? "text-warning" : ""}`}>
            {progress.errors_count}
          </div>
          <div className="counter-label">Erros de Leitura</div>
        </div>
      </div>

      {/* Log de erros discreto */}
      {errors.length > 0 && (
        <div className="error-log glass-card">
          <h4>⚠️ Log de Avisos ({errors.length})</h4>
          <div className="error-log-list">
            {errors.map((err, i) => (
              <div key={i} className="error-log-item">{err}</div>
            ))}
          </div>
        </div>
      )}

      {/* Botão de cancelar */}
      <div className="action-bar">
        <button className="btn btn-danger" onClick={handleCancel}>
          ✕ Cancelar Varredura
        </button>
      </div>
    </div>
  );
}

export default ScanProgress;
