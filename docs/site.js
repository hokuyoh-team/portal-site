// サイト全体で使う小さな補助処理です。
(function () {
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.getFullYear() + '/' + pad2(date.getMonth() + 1) + '/' + pad2(date.getDate());
  }

  function showLastModified() {
    var nodes = document.querySelectorAll('[data-last-modified]');
    if (!nodes.length) return;

    var date = new Date(document.lastModified);
    var text = formatDate(date);
    if (!text) return;

    nodes.forEach(function (node) {
      node.textContent = '最終更新：' + text;
    });
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  }

  function showDeadlineBadges() {
    var items = document.querySelectorAll('[data-deadline]');
    if (!items.length) return;

    var today = startOfDay(new Date());
    items.forEach(function (item) {
      var badge = item.querySelector('[data-deadline-badge]');
      if (!badge) return;

      var deadline = new Date(item.getAttribute('data-deadline') + 'T00:00:00');
      if (Number.isNaN(deadline.getTime())) return;

      var diffDays = Math.ceil((startOfDay(deadline) - today) / (24 * 60 * 60 * 1000));
      badge.classList.remove('deadline-badge--due', 'deadline-badge--closed');

      if (diffDays > 0) {
        badge.textContent = 'あと' + diffDays + '日';
        badge.classList.add('deadline-badge--due');
      } else if (diffDays === 0) {
        badge.textContent = '本日締切';
        badge.classList.add('deadline-badge--due');
      } else {
        badge.textContent = '締切済み';
        badge.classList.add('deadline-badge--closed');
        item.classList.add('is-deadline-closed');
      }
    });
  }

  showLastModified();
  showDeadlineBadges();
})();
