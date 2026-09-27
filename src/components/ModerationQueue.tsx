import { useState } from "react";
import { getEffectiveModeration, getRecord } from "../services/dataService";
import { saveModerationOverride } from "../services/storage";
import type { ModerationItem } from "../types";

export function ModerationQueue() {
  const [items, setItems] = useState(getEffectiveModeration());

  function decide(item: ModerationItem, status: "removed" | "kept") {
    const note = status === "removed" ? "Removed in POC admin preview." : "Kept after review in POC admin preview.";
    saveModerationOverride({ itemId: item.itemId, status, moderatorNote: note });
    setItems(getEffectiveModeration());
  }
  const pending = items.filter((i) => i.status === "pending").length;

  return (
    <>
      <p className="muted">
        {pending} item{pending === 1 ? "" : "s"} awaiting moderation. Decisions made here are saved to localStorage
        (POC). Raw responses must be preserved with a full audit trail in the backend phase.
      </p>
      {items.length === 0 ? (
        <div className="empty-state">No flagged items.</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Record</th>
                <th scope="col">Flagged excerpt</th>
                <th scope="col">Reason</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.itemId}>
                  <td>{item.itemId}</td>
                  <td>{getRecord(item.recordId)?.title ?? item.recordId}</td>
                  <td>{item.excerpt}</td>
                  <td>{item.flagReason}</td>
                  <td>
                    {item.status === "pending" && <span className="warn-text">Pending</span>}
                    {item.status === "removed" && <span className="danger-text">Removed</span>}
                    {item.status === "kept" && <span className="ok-text">Kept</span>}
                    {item.moderatorNote && (
                      <>
                        <br />
                        <span className="muted">{item.moderatorNote}</span>
                      </>
                    )}
                  </td>
                  <td>
                    {item.status === "pending" ? (
                      <span style={{ display: "flex", gap: "0.3rem" }}>
                        <button type="button" className="btn btn-sm" onClick={() => decide(item, "kept")}>
                          Keep
                        </button>
                        <button type="button" className="btn btn-sm" onClick={() => decide(item, "removed")}>
                          Remove
                        </button>
                      </span>
                    ) : (
                      <span className="muted">Decided</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
