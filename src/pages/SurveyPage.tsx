import { Link, useParams } from "react-router-dom";
import { getRecord } from "../services/dataService";
import { SurveyForm } from "../components/SurveyForm";
import { StatusBadge } from "../components/StatusBadge";

export function SurveyPage() {
  const { recordId } = useParams();
  const record = recordId ? getRecord(recordId) : undefined;

  if (!record) {
    return (
      <div className="page">
        <div className="empty-state">
          Record not found. <Link to="/records">Back to all records</Link>
        </div>
      </div>
    );
  }
  if (record.status !== "Ongoing" || record.surveyQuestions.length === 0) {
    return (
      <div className="page">
        <h1>{record.title}</h1>
        <div className="empty-state">
          This participation process is not currently accepting responses.
          <br />
          <Link to={`/records/${record.recordId}`}>Back to record</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="page">
      <StatusBadge status={record.status} />
      <h1>Respond: {record.title}</h1>
      <p className="muted">
        Proof of Concept. Sample participation data only — your response is saved in this browser's localStorage.
      </p>
      <SurveyForm record={record} />
    </div>
  );
}
