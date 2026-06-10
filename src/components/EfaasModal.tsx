import { useState } from "react";

interface Props {
  onVerified(mockIdentity: string): void;
  onCancel(): void;
}

/**
 * Mock eFaas verification journey. POC only. Real eFaas integration pending.
 * Steps: Continue with eFaas -> redirect placeholder -> verified identity returned.
 */
export function EfaasModal({ onVerified, onCancel }: Props) {
  const [step, setStep] = useState<0 | 1 | 2>(0);

  function startRedirect() {
    setStep(1);
    // Simulated redirect round-trip to the eFaas identity provider.
    setTimeout(() => setStep(2), 1400);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="eFaas verification (mock)">
      <div className="modal">
        <h3>eFaas Verification</h3>
        <p className="muted">POC only. Real eFaas integration pending.</p>
        {step === 0 && (
          <>
            <p>
              This participation process uses eFaas identity verification. You will be redirected to eFaas to verify
              your identity, then returned here to submit your response.
            </p>
            <div className="panel-actions">
              <button type="button" className="btn btn-primary" onClick={startRedirect}>
                Continue with eFaas
              </button>
              <button type="button" className="btn" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </>
        )}
        {step === 1 && (
          <div className="loading-screen" style={{ minHeight: 120 }}>
            <div className="spinner" aria-hidden="true" />
            <p>Redirecting to eFaas... (placeholder)</p>
          </div>
        )}
        {step === 2 && (
          <>
            <p className="ok-text">✓ Verified identity returned (mock)</p>
            <p>
              Mock identity: <strong>Sample Citizen (A***1234)</strong>
              <br />
              <span className="muted">No real identity data is used in this proof of concept.</span>
            </p>
            <div className="panel-actions">
              <button type="button" className="btn btn-primary" onClick={() => onVerified("mock-efaas-A1234")}>
                Submit response as verified
              </button>
              <button type="button" className="btn" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
