/*
  Little Clearing — Seeds Wallet  🌱
  A tiny shared points system. Include this on every page/game:
      <script src="seeds.js"></script>
  Then call Seeds.award(...) when a kid does well, and
  Seeds.mount(...) to show their balance anywhere.

  Points are stored in the browser (localStorage). They persist across
  visits and across all your games on this domain, but live on this one
  device/browser. When you later move to real accounts (Option B), only
  the two functions save()/load() below need to change — everything else
  keeps working.
*/
(function (global) {
  "use strict";

  var KEY = "littleClearing.seeds.v1";

  // ---- storage (the only part that changes when you add real accounts) ----
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return { total: 0, history: [] };
      var data = JSON.parse(raw);
      if (typeof data.total !== "number" || data.total < 0) data.total = 0;
      if (!Array.isArray(data.history)) data.history = [];
      return data;
    } catch (e) {
      return { total: 0, history: [] };
    }
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* storage full or blocked — fail quietly so games never break */
    }
  }

  // ---- public API ----
  var listeners = [];

  var Seeds = {
    // current balance
    get: function () {
      return load().total;
    },

    // add seeds. `reason` is a short label e.g. "Finished Money Quest"
    // returns the new total.
    award: function (amount, reason) {
      amount = Math.max(0, Math.round(amount || 0));
      if (amount === 0) return this.get();
      var data = load();
      data.total += amount;
      data.history.unshift({
        amount: amount,
        reason: reason || "Earned seeds",
        at: Date.now()
      });
      if (data.history.length > 50) data.history.length = 50; // keep it small
      save(data);
      notify(data.total, amount, reason);
      return data.total;
    },

    // spend seeds (for the future shop). returns true if they could afford it.
    spend: function (amount, reason) {
      amount = Math.max(0, Math.round(amount || 0));
      var data = load();
      if (data.total < amount) return false;
      data.total -= amount;
      data.history.unshift({
        amount: -amount,
        reason: reason || "Spent seeds",
        at: Date.now()
      });
      if (data.history.length > 50) data.history.length = 50;
      save(data);
      notify(data.total, -amount, reason);
      return true;
    },

    // last few earn/spend events
    history: function () {
      return load().history;
    },

    // wipe everything (handy for testing / a "reset" button)
    reset: function () {
      save({ total: 0, history: [] });
      notify(0, 0, "reset");
    },

    // run a function whenever the balance changes
    onChange: function (fn) {
      if (typeof fn === "function") listeners.push(fn);
    },

    // drop a live-updating balance badge into an element by id
    mount: function (elementId) {
      var el = document.getElementById(elementId);
      if (!el) return;
      function render() {
        el.innerHTML =
          '<span style="display:inline-flex;align-items:center;gap:7px;' +
          'font-family:\'Baloo 2\',\'Nunito\',sans-serif;font-weight:600;' +
          'background:#E4EFE3;color:#3C5A45;border:1px solid #CFE3D0;' +
          'padding:7px 15px;border-radius:999px;font-size:15px;">' +
          '🌱 <span>' + Seeds.get() + "</span> seeds</span>";
      }
      render();
      Seeds.onChange(render);
    }
  };

  function notify(total, delta, reason) {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](total, delta, reason);
      } catch (e) {}
    }
    // also let other open tabs on the same site update
    try {
      global.dispatchEvent(
        new CustomEvent("seeds:change", {
          detail: { total: total, delta: delta, reason: reason }
        })
      );
    } catch (e) {}
  }

  // keep multiple open tabs in sync
  try {
    global.addEventListener("storage", function (e) {
      if (e.key === KEY) notify(Seeds.get(), 0, "sync");
    });
  } catch (e) {}

  global.Seeds = Seeds;
})(window);
