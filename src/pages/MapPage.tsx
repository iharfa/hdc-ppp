import { useState } from "react";
import { records, getRecord } from "../services/dataService";
import { useRecordFilters } from "../hooks/useRecordFilters";
import { MapView } from "../components/MapView";
import { FiltersSidebar } from "../components/FiltersSidebar";
import { ParticipationList } from "../components/ParticipationList";
import { DetailPanel } from "../components/DetailPanel";

export function MapPage() {
  const { filters, setFilters, filtered } = useRecordFilters(records);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? getRecord(selectedId) : undefined;

  return (
    <div className="map-page">
      <div className="map-layout">
        <MapView records={filtered} selectedId={selectedId} onSelect={setSelectedId} />
        <aside className="map-side" aria-label="Participation records list and filters">
          <FiltersSidebar filters={filters} onChange={setFilters} resultCount={filtered.length} />
          <div className="side-scroll">
            {selected && <DetailPanel record={selected} onClose={() => setSelectedId(null)} />}
            <ParticipationList records={filtered} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </aside>
      </div>
    </div>
  );
}
