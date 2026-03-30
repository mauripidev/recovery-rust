import { useState } from "react";
import DriveSelector from "./components/DriveSelector";
import ScanProgress from "./components/ScanProgress";
import ResultsView from "./components/ResultsView";

// Tipos TypeScript espelhando o Rust
export interface DriveInfo {
  path: string;
  name: string;
  size: string;
  filesystem: string;
  drive_type: string;
}

export interface FoundFile {
  sector: number;
  file_type: object;
  category: string;
  label: string;
}

export interface ScanProgressData {
  bytes_read: number;
  total_bytes: number;
  percent: number;
  files_found: number;
  current_sector: number;
  errors_count: number;
  status: string;
}

type AppStep = "select" | "scanning" | "results";

function App() {
  const [step, setStep] = useState<AppStep>("select");
  const [selectedDrive, setSelectedDrive] = useState<DriveInfo | null>(null);
  const [results, setResults] = useState<FoundFile[]>([]);

  const handleDriveSelected = (drive: DriveInfo) => {
    setSelectedDrive(drive);
    setStep("scanning");
  };

  const handleScanComplete = (files: FoundFile[]) => {
    setResults(files);
    setStep("results");
  };

  const handleScanCancelled = () => {
    setStep("select");
  };

  const handleNewScan = () => {
    setResults([]);
    setSelectedDrive(null);
    setStep("select");
  };

  return (
    <div className="app-container">
      {/* Header fixo */}
      <header className="app-header">
        <div className="header-glow" />
        <div className="header-content">
          <div className="logo-group">
            <div className="logo-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div>
              <h1 className="logo-title">Recovery Rust</h1>
              <p className="logo-subtitle">Recuperação de Dados</p>
            </div>
          </div>

          {/* Stepper visual */}
          <div className="stepper">
            <div className={`step-dot ${step === "select" ? "active" : step !== "select" ? "done" : ""}`}>
              <span>1</span>
            </div>
            <div className={`step-line ${step !== "select" ? "done" : ""}`} />
            <div className={`step-dot ${step === "scanning" ? "active" : step === "results" ? "done" : ""}`}>
              <span>2</span>
            </div>
            <div className={`step-line ${step === "results" ? "done" : ""}`} />
            <div className={`step-dot ${step === "results" ? "active" : ""}`}>
              <span>3</span>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="app-main">
        {step === "select" && (
          <DriveSelector onDriveSelected={handleDriveSelected} />
        )}
        {step === "scanning" && selectedDrive && (
          <ScanProgress
            drive={selectedDrive}
            onComplete={handleScanComplete}
            onCancel={handleScanCancelled}
          />
        )}
        {step === "results" && (
          <ResultsView
            results={results}
            driveName={selectedDrive?.name || ""}
            onNewScan={handleNewScan}
          />
        )}
      </main>
    </div>
  );
}

export default App;
