"use client";

import { useEffect, useState } from "react";
import { isTutorialSeen, markTutorialSeen } from "@/lib/chainlink/store";

export default function TutorialModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!isTutorialSeen());
  }, []);

  const handleDismiss = () => {
    markTutorialSeen();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cl-modal-scrim" role="dialog" aria-modal="true" aria-label="How to play">
      <div className="cl-modal anim-fade-slide-up">
        <h2>How to play</h2>

        <div className="cl-demo" aria-hidden="true">
          <span>Apple</span>
          <i />
          <span>Juice</span>
          <i className="is-next" />
          <span className="is-open">B__</span>
        </div>

        <ol className="cl-steps">
          <li>
            <span className="cl-step-n">1</span>
            <div>
              <b>Build the chain</b>
              <p>
                Each word pairs with the one before it to form a common phrase, like{" "}
                <strong>apple juice</strong>, then <strong>juice box</strong>.
              </p>
            </div>
          </li>
          <li>
            <span className="cl-step-n">2</span>
            <div>
              <b>Start with the first word</b>
              <p>
                The first word is given to you. Guess each next word one at a time. You only see the
                first letter until you solve it.
              </p>
            </div>
          </li>
          <li>
            <span className="cl-step-n">3</span>
            <div>
              <b>Stuck? Wrong guesses help</b>
              <p>
                Each wrong guess reveals one letter of the current word. You can be wrong three
                times. Wrong a fourth time and you lose.
              </p>
            </div>
          </li>
        </ol>

        <button type="button" className="cl-cta" onClick={handleDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
