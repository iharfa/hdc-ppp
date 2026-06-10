import { Logo } from "../components/Logo";
import { APP_ITEM_2D, APP_ITEM_3D } from "../services/arcgis";

export function AboutPage() {
  return (
    <div className="page">
      <Logo dark showName />
      <h1>About this portal</h1>
      <div className="card">
        <p>
          The <strong>Public Participation Portal</strong> is a map-based civic participation platform for Hulhumalé
          and HDC-managed areas. It helps the public view planned developments, respond to active participation
          processes, and review completed decisions with supporting data.
        </p>
        <p>
          Every participation record is linked to a GIS location — plots, buildings, roads, parks, public spaces,
          waterfronts, and planned development areas — through a <strong>canonical place ID</strong> that bridges
          Estate, Planning, GIS, and project records.
        </p>
        <p className="warn-text">Proof of Concept. Sample participation data only. Nothing here is a real HDC decision.</p>
      </div>
      <h2>How it works</h2>
      <div className="card">
        <ul>
          <li><strong>Map:</strong> browse ongoing, completed, and planned participation areas on the GIS map.</li>
          <li><strong>Respond:</strong> answer surveys anonymously or with eFaas verification (mocked in this POC).</li>
          <li><strong>Results:</strong> after moderation and SPES review, decisions, charts, and cleaned datasets are published.</li>
          <li><strong>Admin preview:</strong> demonstrates the staff workflow from draft to archive.</li>
        </ul>
      </div>
      <h2>GIS sources</h2>
      <div className="card">
        <p>
          The map attempts to load the public HDC ArcGIS Online web map and web scene behind these published
          applications (item IDs <span className="alias-tag">{APP_ITEM_2D}</span> and{" "}
          <span className="alias-tag">{APP_ITEM_3D}</span>) using public sharing REST metadata — no login, no private
          data. If they cannot be loaded, the portal falls back to a basemap centered on Hulhumalé with sample
          overlays.
        </p>
      </div>
      <h2>Responsible section</h2>
      <div className="card">
        <p>
          Participation processes are run by the <strong>Socio-Environmental Planning Section</strong> of the Housing
          Development Corporation, working with related departments such as Planning, Estate, GIS, Infrastructure, and
          Projects.
        </p>
      </div>
    </div>
  );
}
