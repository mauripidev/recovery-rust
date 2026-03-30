import { FoundFile } from "../App";

interface ResultsViewProps {
  results: FoundFile[];
  driveName: string;
  onNewScan: () => void;
}

function ResultsView({ results, driveName, onNewScan }: ResultsViewProps) {
  // Agrupar por categoria
  const grouped: Record<string, FoundFile[]> = {};
  for (const file of results) {
    if (!grouped[file.category]) {
      grouped[file.category] = [];
    }
    grouped[file.category].push(file);
  }

  const categoryMeta: Record<string, { icon: string; color: string; label: string }> = {
    image: {
      icon: "🖼️",
      color: "var(--accent-teal)",
      label: "Imagens",
    },
    video: {
      icon: "🎬",
      color: "var(--accent-purple)",
      label: "Vídeos",
    },
    pdf: {
      icon: "📄",
      color: "var(--accent-red)",
      label: "PDFs",
    },
    doc: {
      icon: "📝",
      color: "var(--accent-blue)",
      label: "Documentos Office",
    },
  };

  return (
    <div className="results-view fade-in">
      <div className="section-header">
        <div className="section-icon success-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <div>
          <h2>Varredura Concluída</h2>
          <p className="section-description">
            {results.length} assinaturas de arquivos localizadas em <strong>{driveName}</strong>
          </p>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="empty-state glass-card">
          <p className="empty-icon">🔍</p>
          <h3>Nenhum vestígio encontrado</h3>
          <p>Não foram localizadas assinaturas reconhecidas. O disco pode estar totalmente limpo ou utilizar um sistema de arquivos não mapeado.</p>
        </div>
      ) : (
        <>
          {/* Cards de resumo por categoria */}
          <div className="category-grid">
            {Object.entries(grouped).map(([cat, files]) => {
              const meta = categoryMeta[cat] || {
                icon: "📁",
                color: "var(--text-muted)",
                label: cat,
              };
              return (
                <div key={cat} className="category-card glass-card" style={{ borderColor: meta.color }}>
                  <div className="category-header">
                    <span className="category-icon">{meta.icon}</span>
                    <span className="category-count" style={{ color: meta.color }}>
                      {files.length}
                    </span>
                  </div>
                  <h3 className="category-label">{meta.label}</h3>
                  <p className="category-detail">
                    {files.length} {files.length === 1 ? "assinatura" : "assinaturas"}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Tabela detalhada */}
          <div className="results-table-wrapper glass-card">
            <h3 className="table-title">📋 Detalhes Completos</h3>
            <div className="results-table-scroll">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tipo</th>
                    <th>Categoria</th>
                    <th>Setor Absoluto</th>
                    <th>Offset (bytes)</th>
                  </tr>
                </thead>
                <tbody>
                  {results.slice(0, 100).map((file, index) => (
                    <tr key={index} className="table-row-animate">
                      <td className="td-index">{index + 1}</td>
                      <td className="td-type">{file.label}</td>
                      <td>
                        <span className={`cat-badge cat-${file.category}`}>
                          {categoryMeta[file.category]?.icon || "📁"} {file.category}
                        </span>
                      </td>
                      <td className="td-mono">{file.sector.toLocaleString()}</td>
                      <td className="td-mono">{(file.sector * 512).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {results.length > 100 && (
                <p className="table-overflow">+ {results.length - 100} resultados adicionais não exibidos</p>
              )}
            </div>
          </div>
        </>
      )}

      <div className="action-bar">
        <button className="btn btn-primary btn-glow" onClick={onNewScan}>
          🔄 Nova Varredura
        </button>
      </div>
    </div>
  );
}

export default ResultsView;
