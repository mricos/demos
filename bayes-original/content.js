PopupManager.createPopup(
  'popup-likelihood',
  `Likelihood: How well evidence matches 
the hypothesis.`,
  { fill: '#ffe6d5', stroke: '#cc3300', fontSize: '0.8em', textColor: '#cc3300' }
);

PopupManager.createPopup(
  'popup-prior',
  `Prior: Initial beliefs before 
evidence is introduced.`,
  { fill: '#e6ffe6', stroke: '#006600', fontSize: '0.8em', textColor: '#006600' }
);

PopupManager.createPopup(
  'popup-evidence',
  `Evidence: Normalizes probabilities.
Example:
- Hypotheses: H1, H2, H3
- Likelihoods:
  P(E|H1) = 0.5
  P(E|H2) = 0.3
  P(E|H3) = 0.2
- Total: P(E) = 1
Normalization ensures
posteriors sum to 1.
Complex evidence often
needs MCMC to estimate.`,
  { fill: '#fff0b3', stroke: '#b38f00', fontSize: '0.8em', textColor: '#b38f00' }
);

