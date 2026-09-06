const DEMO_STATEMENTS = [
  { file: "phonepe_august.pdf", uploaded: "28 Aug 2026", txn: 42 },
  { file: "phonepe_july.pdf", uploaded: "2 Aug 2026", txn: 37 },
];

export default function History() {
  return (
    <div className="view">
      <div className="topbar">
        <div className="page-title">History</div>
      </div>
      <div className="stmt-body">
        <div className="panel">
          <div className="panel-title">Uploaded statements</div>
          <table>
            <thead>
              <tr>
                <th>File</th>
                <th>Uploaded</th>
                <th style={{ textAlign: "right" }}>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {DEMO_STATEMENTS.map((s) => (
                <tr key={s.file}>
                  <td>{s.file}</td>
                  <td>{s.uploaded}</td>
                  <td className="amt">{s.txn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}