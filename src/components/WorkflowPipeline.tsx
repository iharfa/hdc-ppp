import { workflowSteps } from "../services/dataService";

interface Props {
  currentStepId?: string;
}

export function WorkflowPipeline({ currentStepId }: Props) {
  const currentOrder = workflowSteps.find((s) => s.stepId === currentStepId)?.order ?? 0;
  return (
    <ol className="pipeline" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {workflowSteps.map((s) => {
        const state = currentOrder === 0 ? "" : s.order < currentOrder ? "done" : s.order === currentOrder ? "current" : "";
        return (
          <li key={s.stepId} className={`pipeline-step ${state}`}>
            <span className="ps-marker" aria-hidden="true">
              {state === "done" ? "✓" : s.order}
            </span>
            <span className="ps-body">
              <strong>{s.name}</strong> {state === "current" && <span className="status-badge status-Ongoing">current stage</span>}
              <br />
              <span className="ps-actor">Actor: {s.actor}</span>
              <br />
              <span className="ps-desc">{s.description}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
