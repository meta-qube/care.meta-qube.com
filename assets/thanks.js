(() => {
  const copy = JSON.parse(document.getElementById('thanks-copy').textContent);
  const saved = document.getElementById('thanks-saved');
  const direct = document.getElementById('thanks-direct');
  let receipt = null;
  try {
    receipt = JSON.parse(
      sessionStorage.getItem('care-request-receipt') || 'null',
    );
  } catch (error) {
    receipt = null;
  }
  const fresh = Boolean(
    receipt
    && receipt.id
    && Date.now() - receipt.at < 30 * 60 * 1000,
  );
  if (!fresh) {
    direct.hidden = false;
    return;
  }
  document.getElementById('thanks-ref').textContent = copy.reference
    .replace('{id}', receipt.id);
  saved.hidden = false;
})();
