import { useState } from "react";
import { places, records } from "../services/dataService";
import { getHarmonizationLinks, saveHarmonizationLink } from "../services/storage";

/** Data harmonization admin view: canonical places, aliases, confidence, manual linking. */
export function HarmonizationTable() {
  const [links, setLinks] = useState(getHarmonizationLinks());
  const [linkRecord, setLinkRecord] = useState("");
  const [linkPlace, setLinkPlace] = useState("");

  const unresolved = places.flatMap((p) =>
    p.aliases.filter((a) => a.matchStatus !== "confirmed").map((a) => ({ place: p, alias: a })),
  );

  function addLink() {
    if (!linkRecord || !linkPlace) return;
    saveHarmonizationLink({ recordId: linkRecord, canonicalPlaceId: linkPlace, linkedAt: new Date().toISOString().slice(0, 10) });
    setLinks(getHarmonizationLinks());
    setLinkRecord("");
    setLinkPlace("");
  }

  return (
    <>
      <p className="muted">
        Canonical place IDs bridge Estate, Planning, GIS, and project records. Sample data below includes the same
        physical plot labelled differently by Estate ("10078") and Planning ("PLN/PH1/MU-78").
      </p>

      <h3>Canonical places and aliases</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Canonical place</th>
              <th scope="col">Type</th>
              <th scope="col">Aliases (source · system · confidence · status)</th>
            </tr>
          </thead>
          <tbody>
            {places.map((p) => (
              <tr key={p.canonicalPlaceId}>
                <td>
                  <span className="alias-tag">{p.canonicalPlaceId}</span>
                  <br />
                  {p.displayName}
                </td>
                <td>{p.placeType}</td>
                <td>
                  <ul className="alias-list">
                    {p.aliases.map((a) => (
                      <li key={`${a.aliasType}-${a.value}`}>
                        <span className="alias-tag">{a.value}</span> <span className="muted">({a.aliasType})</span> ·{" "}
                        {a.sourceDepartment} · {a.sourceSystem} · {(a.confidenceScore * 100).toFixed(0)}% ·{" "}
                        {a.matchStatus === "confirmed" && <span className="ok-text">confirmed</span>}
                        {a.matchStatus === "ambiguous" && <span className="warn-text">⚠ ambiguous</span>}
                        {a.matchStatus === "unresolved" && <span className="danger-text">unresolved</span>}
                        {a.notes && (
                          <>
                            <br />
                            <span className="muted">{a.notes}</span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Unresolved and ambiguous aliases</h3>
      {unresolved.length === 0 ? (
        <div className="empty-state">All aliases resolved.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Alias</th>
                <th scope="col">Candidate canonical place</th>
                <th scope="col">Confidence</th>
                <th scope="col">Status</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {unresolved.map(({ place, alias }) => (
                <tr key={`${place.canonicalPlaceId}-${alias.value}`}>
                  <td>
                    <span className="alias-tag">{alias.value}</span> ({alias.sourceDepartment})
                  </td>
                  <td>{place.displayName}</td>
                  <td>{(alias.confidenceScore * 100).toFixed(0)}%</td>
                  <td>
                    {alias.matchStatus === "ambiguous" ? (
                      <span className="warn-text">⚠ Ambiguous match — manual review recommended</span>
                    ) : (
                      <span className="danger-text">Unresolved</span>
                    )}
                  </td>
                  <td className="muted">{alias.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3>Manually link a participation record to a canonical place</h3>
      <div className="card">
        <div className="filter-row">
          <label>
            Participation record
            <select value={linkRecord} onChange={(e) => setLinkRecord(e.target.value)}>
              <option value="">Select a record...</option>
              {records.map((r) => (
                <option key={r.recordId} value={r.recordId}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Canonical place
            <select value={linkPlace} onChange={(e) => setLinkPlace(e.target.value)}>
              <option value="">Select a place...</option>
              {places.map((p) => (
                <option key={p.canonicalPlaceId} value={p.canonicalPlaceId}>
                  {p.canonicalPlaceId} — {p.displayName}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="panel-actions">
          <button type="button" className="btn btn-primary" onClick={addLink} disabled={!linkRecord || !linkPlace}>
            Save link (localStorage)
          </button>
        </div>
        {links.length > 0 && (
          <>
            <h4>Manual links saved in this browser</h4>
            <ul className="alias-list">
              {links.map((l) => (
                <li key={l.recordId}>
                  <span className="alias-tag">{l.recordId}</span> → <span className="alias-tag">{l.canonicalPlaceId}</span>{" "}
                  <span className="muted">({l.linkedAt})</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
