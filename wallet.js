(() => {
  const WALLET_KEY = "eBuyWalletBalances";
  const PAYMENT_METHODS = ["Visa", "Mastercard", "American Express"];
  const currentUser = () => localStorage.getItem("currentuser");

  function readBalances() {
    try {
      const balances = JSON.parse(localStorage.getItem(WALLET_KEY) || "{}");
      return balances && typeof balances === "object" && !Array.isArray(balances)
        ? balances
        : {};
    } catch {
      return {};
    }
  }

  function getBalance() {
    const user = currentUser();
    if (!user) return 0;
    const balance = Number(readBalances()[user]);
    return Number.isFinite(balance) && balance > 0 ? balance : 0;
  }

  function renderBalance() {
    const formattedBalance = `$${getBalance().toFixed(2)}`;
    document.querySelectorAll("[data-wallet-balance]").forEach((element) => {
      element.textContent = formattedBalance;
    });
    const modalBalance = document.getElementById("walletModalBalance");
    if (modalBalance) modalBalance.textContent = formattedBalance;
  }

  function storeBalance(balance) {
    const user = currentUser();
    if (!user) return false;
    const balances = readBalances();
    balances[user] = Math.round(balance) / 100;
    localStorage.setItem(WALLET_KEY, JSON.stringify(balances));
    renderBalance();
    return true;
  }

  function charge(amount) {
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return false;
    const balanceCents = Math.round(getBalance() * 100);
    if (balanceCents < cents) return false;
    return storeBalance(balanceCents - cents);
  }

  function buildTopUpModal() {
    if (document.getElementById("walletTopUpModal")) return;
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "walletTopUpModal";
    modal.tabIndex = -1;
    modal.setAttribute("aria-labelledby", "walletTopUpTitle");
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <form id="walletTopUpForm">
            <div class="modal-header">
              <h2 class="modal-title fs-5" id="walletTopUpTitle">Top up wallet</h2>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p class="mb-3">Current balance: <strong id="walletModalBalance">$0.00</strong></p>
              <div class="mb-3">
                <label class="form-label" for="walletTopUpAmount">Amount (USD)</label>
                <input class="form-control" id="walletTopUpAmount" type="number" min="1" max="10000" step="0.01" value="50" required>
              </div>
              <div class="mb-3">
                <label class="form-label" for="walletPaymentMethod">Payment method</label>
                <select class="form-select" id="walletPaymentMethod" required>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="American Express">American Express</option>
                </select>
              </div>
              <div id="walletTopUpMessage" class="small mt-3" role="status" aria-live="polite"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="submit" class="btn btn-primary">Add funds</button>
            </div>
          </form>
        </div>
      </div>`;
    document.body.appendChild(modal);

    document.querySelectorAll("[data-wallet-open]").forEach((button) => {
      button.addEventListener("click", openTopUp);
    });
    document
      .getElementById("walletTopUpForm")
      .addEventListener("submit", (event) => {
        event.preventDefault();
        const amount = Number(
          document.getElementById("walletTopUpAmount").value,
        );
        const method = document.getElementById("walletPaymentMethod").value;
        const message = document.getElementById("walletTopUpMessage");
        if (
          !Number.isFinite(amount) ||
          amount < 1 ||
          amount > 10000 ||
          !PAYMENT_METHODS.includes(method)
        ) {
          message.className = "small mt-3 text-danger";
          message.textContent = "Enter a valid amount and payment method.";
          return;
        }
        const balanceCents = Math.round(getBalance() * 100);
        if (!storeBalance(balanceCents + Math.round(amount * 100))) {
          message.className = "small mt-3 text-danger";
          message.textContent = "Sign in before adding funds.";
          return;
        }
        message.className = "small mt-3 text-success";
        message.textContent = `Added $${amount.toFixed(2)} using ${method}.`;
      });
  }

  function openTopUp(notice = "") {
    if (!currentUser()) {
      window.location.href = "index.html";
      return;
    }
    buildTopUpModal();
    renderBalance();
    const message = document.getElementById("walletTopUpMessage");
    message.className = notice ? "small mt-3 text-danger" : "small mt-3";
    message.textContent = notice;
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById("walletTopUpModal"),
    ).show();
  }

  window.ebuyWallet = { getBalance, charge, openTopUp };
  renderBalance();
  buildTopUpModal();
  window.addEventListener("storage", renderBalance);
})();
