import { permissions, roles } from "../services/dataService";

export function RoleMatrix() {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="muted" style={{ textAlign: "left", paddingBottom: "0.5rem" }}>
          Role access matrix (POC). Server-side enforcement arrives with the backend phase.
        </caption>
        <thead>
          <tr>
            <th scope="col">Permission</th>
            {roles.map((r) => (
              <th scope="col" key={r.roleId} title={r.description}>
                {r.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p.key}>
              <th scope="row">{p.label}</th>
              {roles.map((r) => (
                <td key={r.roleId} style={{ textAlign: "center" }}>
                  {r.permissions.includes(p.key) ? <span className="ok-text" aria-label="allowed">✓</span> : <span className="muted" aria-label="not allowed">—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
