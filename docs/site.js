// サイト全体で使う小さな補助処理です。
(function () {
  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.getFullYear() + '/' + pad2(date.getMonth() + 1) + '/' + pad2(date.getDate());
  }

  function formatMonthDayWithWeekday(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    var weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    return pad2(date.getMonth() + 1) + '/' + pad2(date.getDate()) + '(' + weekdays[date.getDay()] + ')';
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

  function showMonthlyDutyDeadline() {
    var items = document.querySelectorAll('[data-monthly-duty-deadline]');
    if (!items.length) return;

    var now = new Date();
    var today = startOfDay(now);
    var msPerDay = 24 * 60 * 60 * 1000;

    items.forEach(function (item) {
      var deadlineDay = Number(item.getAttribute('data-monthly-duty-deadline'));
      var showFromDays = Number(item.getAttribute('data-show-from-days') || 7);
      var urgentFromDays = Number(item.getAttribute('data-urgent-from-days') || 3);
      var badge = item.querySelector('[data-deadline-badge]');
      var dateNode = item.querySelector('[data-deadline-date]');
      if (!deadlineDay || !badge || !dateNode) return;

      var deadline = new Date(now.getFullYear(), now.getMonth(), deadlineDay);
      if (today > startOfDay(deadline)) {
        deadline = new Date(now.getFullYear(), now.getMonth() + 1, deadlineDay);
      }

      var diffDays = Math.ceil((startOfDay(deadline) - today) / msPerDay);
      if (diffDays > showFromDays) {
        item.hidden = true;
        return;
      }

      item.hidden = false;
      item.classList.remove('is-deadline-closed');
      badge.classList.remove('deadline-badge--due', 'deadline-badge--closed');
      dateNode.textContent = formatMonthDayWithWeekday(deadline);

      if (diffDays === 0) {
        badge.textContent = '本日締切';
        badge.classList.add('deadline-badge--due');
      } else {
        badge.textContent = 'あと' + diffDays + '日';
        if (diffDays <= urgentFromDays) {
          badge.classList.add('deadline-badge--due');
        }
      }
    });
  }

  function setupVideoModePage() {
    var sections = document.querySelectorAll('[data-video-section]');
    if (!sections.length) return;

    var params = new URLSearchParams(window.location.search);
    var mode = params.get('type');
    if (mode !== 'game' && mode !== 'practice') mode = 'game';

    sections.forEach(function (section) {
      section.hidden = section.getAttribute('data-video-section') !== mode;
    });

    document.querySelectorAll('[data-video-mode-link]').forEach(function (link) {
      if (link.getAttribute('data-video-mode-link') === mode) {
        link.classList.add('is-active');
      } else {
        link.classList.remove('is-active');
      }
    });
  }

  showLastModified();
  showDeadlineBadges();
  showMonthlyDutyDeadline();
  setupVideoModePage();
})();
