/**
 * confusion-matrix.js
 * Confusion matrix rendering for classification evaluation
 */

import { argmax } from '../core/math-utils.js';

/**
 * Compute confusion matrix
 * @param {Array} data - Dataset
 * @param {Function} forwardFn - Function that takes features and returns {probs}
 * @param {boolean} useModel - If false, uses random predictions
 * @param {number} numClasses - Number of classes
 * @returns {number[][]} Confusion matrix
 */
export function computeConfusion(data, forwardFn, useModel = true, numClasses = 3) {
  const M = Array(numClasses).fill(0).map(() => Array(numClasses).fill(0));

  if (!data || data.length === 0) return M;

  for (const s of data) {
    let pred;
    if (useModel) {
      const { probs } = forwardFn(s.x || s.features);
      pred = argmax(probs);
    } else {
      pred = Math.floor(Math.random() * numClasses);
    }
    const trueClass = s.y !== undefined ? s.y : s.class;
    M[trueClass][pred] += 1;
  }

  return M;
}

/**
 * Render confusion matrix as HTML table
 * @param {number[][]} M - Confusion matrix
 * @param {string} elementId - Target element ID
 * @param {Array<string>} classLabels - Class names
 */
export function renderConfusionTable(M, elementId, classLabels = ['0', '1', '2']) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const numClasses = M.length;
  const total = M.flat().reduce((a, b) => a + b, 0) || 1;
  let correct = 0;
  for (let i = 0; i < numClasses; i++) {
    correct += M[i][i];
  }
  const acc = correct / total;

  let html = '<tr><th>True \\ Pred</th>';
  for (let p = 0; p < numClasses; p++) {
    html += '<th>' + p + '</th>';
  }
  html += '</tr>';

  for (let t = 0; t < numClasses; t++) {
    html += '<tr><th>' + classLabels[t] + '</th>';
    for (let p = 0; p < numClasses; p++) {
      const cls = t === p ? 'diag' : (M[t][p] ? 'off' : '');
      html += '<td class="' + cls + '">' + M[t][p] + '</td>';
    }
    html += '</tr>';
  }

  html += '<tr><th colspan="' + (numClasses + 1) + '">Accuracy: ' +
    acc.toFixed(3) + '</th></tr>';

  el.innerHTML = html;
}
