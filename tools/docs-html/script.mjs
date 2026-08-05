/**
 * 出力する HTML に埋め込むスクリプト。
 *
 * 外部から何も読まない。すべてこの文字列で完結する。
 * ここで日時や乱数に触ってはいけない(決定性が壊れる)。
 *
 * 入れてある機能は 5 つ。どれも「HTML で読むからこそ効くもの」に絞る。
 *   1. サイドメニューの絞り込み
 *   2. 目次のスクロール追従(いま読んでいる節を目次で光らせる)
 *   3. コードブロックのコピー
 *   4. テーマの手動切替(既定は端末の設定に従う)
 *   5. 画面より高い表の見出し行を固定する
 */
export const PAGE_SCRIPT = `
(function () {
  var doc = document;

  // 1. サイドメニューの絞り込み
  var filter = doc.getElementById("nav-filter");
  if (filter) {
    filter.addEventListener("input", function () {
      var needle = filter.value.trim().toLowerCase();
      doc.querySelectorAll(".nav-group").forEach(function (group) {
        var hit = 0;
        group.querySelectorAll("li").forEach(function (item) {
          var match = item.textContent.toLowerCase().indexOf(needle) !== -1;
          item.hidden = !match;
          if (match) hit += 1;
        });
        group.hidden = hit === 0;
      });
    });
  }

  // 2. 目次のスクロール追従
  var links = Array.prototype.slice.call(doc.querySelectorAll(".toc a"));
  if (links.length > 0 && "IntersectionObserver" in window) {
    var byId = {};
    links.forEach(function (link) {
      byId[link.getAttribute("href").slice(1)] = link;
    });
    var visible = new Set();
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });
        var current = links.filter(function (link) {
          return visible.has(link.getAttribute("href").slice(1));
        })[0];
        links.forEach(function (link) {
          link.classList.toggle("is-current", link === current);
        });
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    Object.keys(byId).forEach(function (id) {
      var target = doc.getElementById(id);
      if (target) observer.observe(target);
    });
  }

  // 3. コードブロックのコピー
  doc.querySelectorAll("pre > code").forEach(function (code) {
    var button = doc.createElement("button");
    button.type = "button";
    button.className = "copy";
    button.textContent = "コピー";
    button.addEventListener("click", function () {
      navigator.clipboard.writeText(code.textContent).then(function () {
        button.textContent = "コピーした";
        setTimeout(function () {
          button.textContent = "コピー";
        }, 1200);
      });
    });
    code.parentNode.appendChild(button);
  });

  // 4. テーマの手動切替(既定は端末の設定に従う)
  var toggle = doc.getElementById("theme-toggle");
  if (toggle) {
    var saved = null;
    try {
      saved = localStorage.getItem("docs-theme");
    } catch (e) {
      saved = null;
    }
    if (saved) doc.documentElement.dataset.theme = saved;
    toggle.addEventListener("click", function () {
      var dark =
        doc.documentElement.dataset.theme === "dark" ||
        (!doc.documentElement.dataset.theme &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      var next = dark ? "light" : "dark";
      doc.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("docs-theme", next);
      } catch (e) {
        /* 保存できなくても表示は切り替わる */
      }
      // 図は mermaid が色を焼き込んで描くので、テーマを変えたら描き直す
      if (typeof window.docsDrawDiagrams === "function") window.docsDrawDiagrams();
    });
  }

  // 5. 画面より高い表だけ、器の高さを止めて見出し行を固定する。
  //    ⚠️ 短い表まで器へ閉じ込めない。ページのスクロールが二重になって読みにくい。
  //    ⚠️ この挙動は自動では見張っていない。vitest は DOM を持たないため、
  //    変えたら実ブラウザで長い表(guides/handover.html)を開いて確かめること。
  function markTallTables() {
    // 画面の高さが取れない環境では何もしない(全部を器へ閉じ込めてしまうため)
    var viewport = doc.documentElement.clientHeight || window.innerHeight || 0;
    if (viewport < 200) return;

    doc.querySelectorAll(".table-scroll").forEach(function (box) {
      var table = box.querySelector("table");
      if (!table) return;
      box.classList.remove("is-tall");
      if (table.getBoundingClientRect().height > viewport * 0.85) {
        box.classList.add("is-tall");
      }
    });
  }
  markTallTables();
  window.addEventListener("resize", markTallTables);
})();
`;
