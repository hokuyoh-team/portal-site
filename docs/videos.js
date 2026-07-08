// 試合動画・練習メニュー動画の一覧を、それぞれのスプレッドシートから読み込んで表示します。
// スプレッドシートを変える場合は、下の sheetId だけ書き換えてください。
// シートの共有設定は「リンクを知っている全員（閲覧者）」にしておく必要があります。
(function () {
  function parseGvizDate(v) {
    if (typeof v !== 'string') return null;
    var m = v.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
    if (!m) return null;
    return new Date(
      Number(m[1]), Number(m[2]), Number(m[3]),
      Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0)
    ).getTime();
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function escapeAttr(str) {
    return escapeHtml(str);
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatDate(ms) {
    if (ms == null) return '';
    var d = new Date(ms);
    return d.getFullYear() + '/' + pad2(d.getMonth() + 1) + '/' + pad2(d.getDate());
  }

  function formatMonth(ms) {
    if (ms == null) return '';
    var d = new Date(ms);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
  }

  function formatYearLabel(ms) {
    if (ms == null) return '';
    return new Date(ms).getFullYear() + '年度';
  }

  function isRecent(sortKey) {
    return sortKey != null && (Date.now() - sortKey) <= 7 * 24 * 60 * 60 * 1000;
  }

  function renderNewTag(item) {
    return isRecent(item.sortKey) ? '<span class="info-list__tag">NEW</span>' : '';
  }

  function categoryClass(value, fallback) {
    var label = String(value || fallback || '').trim();
    if (label.indexOf('練習試合') !== -1) return 'date-label--scrimmage';
    if (label.indexOf('リーグ') !== -1) return 'date-label--league';
    if (label.indexOf('練習') !== -1) return 'date-label--practice';
    if (label.indexOf('試合') !== -1 || label.indexOf('大会') !== -1) return 'date-label--game';
    return 'date-label--other';
  }

  function renderGroupedList(rows, options) {
    var groups = [];
    rows.forEach(function (item) {
      var label = options.groupLabel(item);
      var latest = groups[groups.length - 1];
      if (!latest || latest.label !== label) {
        latest = { label: label, items: [] };
        groups.push(latest);
      }
      latest.items.push(item);
    });

    return groups.map(function (group) {
      return (
        '<li class="video-group">' +
        '<h3 class="video-group__title jp-heading">' + escapeHtml(group.label) + '</h3>' +
        '<ul class="video-list video-list--grouped">' +
        group.items.map(options.renderItem).join('') +
        '</ul>' +
        '</li>'
      );
    }).join('');
  }

  var practiceCategories = [
    'ドリブル',
    'シュート',
    'パス',
    'デフェンス練習',
    'オフェンス練習',
    '基礎練習'
  ];

  function normalizePracticeCategory(value) {
    var label = String(value || '').trim();
    if (label === 'デフェンス' || label === 'ディフェンス' || label === 'ディフェンス練習') {
      return 'デフェンス練習';
    }
    if (label === 'オフェンス') {
      return 'オフェンス練習';
    }
    return practiceCategories.indexOf(label) !== -1 ? label : '基礎練習';
  }

  function isPracticeCategory(value) {
    return normalizePracticeCategory(value) !== '基礎練習' || String(value || '').trim() === '基礎練習';
  }

  function renderFilterablePracticeList(rows, options) {
    var filterEl = document.getElementById(options.filterId);
    var listEl = document.getElementById(options.listId);
    if (!filterEl || !listEl) return false;

    var activeCategory = 'すべて';
    var categories = ['すべて'].concat(practiceCategories);

    function renderButtons() {
      filterEl.innerHTML = categories.map(function (category) {
        var activeClass = category === activeCategory ? ' is-active' : '';
        return '<button class="video-filter__button jk' + activeClass + '" type="button" data-practice-category="' + escapeAttr(category) + '">' + escapeHtml(category) + '</button>';
      }).join('');
    }

    function renderList() {
      var filteredRows = activeCategory === 'すべて'
        ? rows
        : rows.filter(function (item) { return item.category === activeCategory; });

      listEl.innerHTML = filteredRows.length
        ? filteredRows.map(options.renderItem).join('')
        : '<li class="video-list__loading">このカテゴリの動画はまだありません。</li>';
    }

    filterEl.addEventListener('click', function (event) {
      var button = event.target.closest('[data-practice-category]');
      if (!button) return;
      activeCategory = button.getAttribute('data-practice-category') || 'すべて';
      renderButtons();
      renderList();
    });

    renderButtons();
    renderList();
    return true;
  }

  function renderFilterableMatchArchive(rows, options) {
    var yearFilterEl = document.getElementById(options.matchYearFilterId);
    var filterEl = document.getElementById(options.matchMonthFilterId);
    var listEl = document.getElementById(options.listId);
    if (!yearFilterEl || !filterEl || !listEl) return false;

    var years = [];
    rows.forEach(function (item) {
      var year = formatYearLabel(item.sortKey);
      if (year && years.indexOf(year) === -1) years.push(year);
    });

    var activeYear = years[0] || '';
    var activeMonth = '';

    function getMonthsForActiveYear() {
      var months = [];
      rows.forEach(function (item) {
        if (formatYearLabel(item.sortKey) !== activeYear) return;
        var month = formatMonth(item.sortKey);
        if (month && months.indexOf(month) === -1) months.push(month);
      });
      return months;
    }

    var months = getMonthsForActiveYear();
    activeMonth = months[0] || '';

    function renderYearButtons() {
      yearFilterEl.innerHTML = years.map(function (year) {
        var activeClass = year === activeYear ? ' is-active' : '';
        return '<button class="video-filter__button jk' + activeClass + '" type="button" data-match-year="' + escapeAttr(year) + '">' + escapeHtml(year) + '</button>';
      }).join('');
    }

    function renderMonthButtons() {
      months = getMonthsForActiveYear();
      if (months.indexOf(activeMonth) === -1) activeMonth = months[0] || '';
      filterEl.innerHTML = months.map(function (month) {
        var activeClass = month === activeMonth ? ' is-active' : '';
        return '<button class="video-filter__button jk' + activeClass + '" type="button" data-match-month="' + escapeAttr(month) + '">' + escapeHtml(month) + '</button>';
      }).join('');
    }

    function renderList() {
      var monthRows = rows.filter(function (item) {
        return formatYearLabel(item.sortKey) === activeYear && formatMonth(item.sortKey) === activeMonth;
      });
      var tournamentGroups = [];

      monthRows.forEach(function (item) {
        var label = item.tournament || '大会名なし';
        var group = tournamentGroups.find(function (candidate) {
          return candidate.label === label;
        });
        if (!group) {
          group = { label: label, items: [] };
          tournamentGroups.push(group);
        }
        group.items.push(item);
      });

      listEl.innerHTML = tournamentGroups.length
        ? tournamentGroups.map(function (group, index) {
          return (
            '<li class="video-tournament">' +
            '<details' + (index === 0 ? ' open' : '') + '>' +
            '<summary><span class="video-tournament__title jp-heading">' + escapeHtml(group.label) + '</span><span class="video-tournament__count jk">' + group.items.length + '本</span></summary>' +
            '<ul class="video-list video-list--grouped">' +
            group.items.map(options.renderItem).join('') +
            '</ul>' +
            '</details>' +
            '</li>'
          );
        }).join('')
        : '<li class="video-list__loading">この月の動画はまだありません。</li>';
    }

    filterEl.addEventListener('click', function (event) {
      var button = event.target.closest('[data-match-month]');
      if (!button) return;
      activeMonth = button.getAttribute('data-match-month') || activeMonth;
      renderMonthButtons();
      renderList();
    });

    yearFilterEl.addEventListener('click', function (event) {
      var button = event.target.closest('[data-match-year]');
      if (!button) return;
      activeYear = button.getAttribute('data-match-year') || activeYear;
      activeMonth = '';
      renderYearButtons();
      renderMonthButtons();
      renderList();
    });

    renderYearButtons();
    renderMonthButtons();
    renderList();
    return true;
  }

  // ページ内に対象の要素がなければ何もしない（index.html / all-videos.html の両方から
  // このファイルを読み込むが、一致する要素がある分だけ表示される）
  function loadSheetList(options) {
    var listEl = document.getElementById(options.listId);
    var fallbackEl = document.getElementById(options.fallbackId);
    if (!listEl) return;

    var feedUrl = 'https://docs.google.com/spreadsheets/d/' + options.sheetId + '/gviz/tq?tqx=out:json';

    fetch(feedUrl)
      .then(function (res) { return res.text(); })
      .then(function (text) {
        var match = text.match(/setResponse\(([\s\S]*)\);?\s*$/);
        if (!match) throw new Error('unexpected response format');

        var data = JSON.parse(match[1]);
        var isValid = options.isValid || function (item) {
          return item.url && /^https?:\/\//i.test(item.url);
        };
        var rows = (data.table.rows || [])
          .map(function (row) { return options.mapRow(row.c || [], parseGvizDate); })
          .filter(function (item) { return item && item.sortKey != null && isValid(item); });

        if (rows.length === 0) throw new Error('no rows');

        rows.sort(function (a, b) { return b.sortKey - a.sortKey; });
        var latest = rows.slice(0, options.maxItems || 10);
        if (options.matchMonthFilterId && renderFilterableMatchArchive(latest, options)) return;
        if (options.filterId && renderFilterablePracticeList(latest, options)) return;

        listEl.innerHTML = options.groupLabel
          ? renderGroupedList(latest, options)
          : latest.map(options.renderItem).join('');
      })
      .catch(function () {
        listEl.innerHTML = '';
        if (fallbackEl) fallbackEl.hidden = false;
      });
  }

  // 試合動画：動画リンク一覧スプレッドシート（日付｜大会名｜対戦相手｜youtubeリンク）
  var matchVideos = {
    sheetId: '1TBYDvLzq03UqUlb8W3bAm4CMuBT7OX4D_l5q2GUWxJc',
    mapRow: function (cells, parseDate) {
      var tournament = cells[1] && cells[1].v;
      var opponent = cells[2] && cells[2].v;
      return {
        sortKey: parseDate(cells[0] && cells[0].v),
        date: cells[0] && cells[0].f,
        tournament: tournament,
        opponent: opponent,
        title: [tournament, opponent].filter(Boolean).join(' vs '),
        url: cells[3] && cells[3].v,
        category: tournament
      };
    },
    renderItem: function (item) {
      return (
        '<li class="video-item">' +
        '<span class="video-item__date ' + categoryClass(item.category, '試合・大会') + '">' + escapeHtml(item.date) + '</span>' +
        '<span class="video-item__title">' + renderNewTag(item) + escapeHtml(item.title) + '</span>' +
        '<a class="video-item__link" href="' + escapeAttr(item.url) + '" target="_blank" rel="noopener">▶ 見る</a>' +
        '</li>'
      );
    }
  };

  var todayMatchVideos = Object.assign({}, matchVideos, {
    renderItem: function (item) {
      return (
        '<li>' +
        '<span class="today-video-list__date ' + categoryClass(item.category, '試合・大会') + '">' + escapeHtml(item.date) + '</span>' +
        '<a href="' + escapeAttr(item.url) + '" target="_blank" rel="noopener">' + renderNewTag(item) + escapeHtml(item.title) + '</a>' +
        '</li>'
      );
    }
  });

  // 練習メニュー動画：投稿フォームの回答一覧（タイムスタンプ｜URL｜タイトル・おすすめポイント｜カテゴリ｜お名前）
  var practiceVideos = {
    sheetId: '1ega5Ifh2ofvAGzc5wyMstgb_cxGswxYnz0XauzWERcs',
    mapRow: function (cells, parseDate) {
      var sortKey = parseDate(cells[0] && cells[0].v);
      var fourth = cells[3] && cells[3].v;
      var fifth = cells[4] && cells[4].v;
      var category = isPracticeCategory(fourth) ? fourth : fifth;
      var name = isPracticeCategory(fourth) ? fifth : fourth;
      return {
        sortKey: sortKey,
        date: formatDate(sortKey),
        title: cells[2] && cells[2].v,
        category: normalizePracticeCategory(category),
        name: name,
        url: cells[1] && cells[1].v
      };
    },
    renderItem: function (item) {
      var title = item.title || '（タイトルなし）';
      if (item.name) title += '（' + item.name + 'さん）';
      return (
        '<li class="video-item">' +
        '<span class="video-item__date ' + categoryClass(null, '練習') + '">' + escapeHtml(item.date) + '</span>' +
        '<span class="video-item__title">' + renderNewTag(item) + '<span class="video-item__category">' + escapeHtml(item.category) + '</span>' + escapeHtml(title) + '</span>' +
        '<a class="video-item__link" href="' + escapeAttr(item.url) + '" target="_blank" rel="noopener">▶ 見る</a>' +
        '</li>'
      );
    }
  };

  // お知らせ：管理者が直接編集するスプレッドシート（日付｜内容）
  var announcements = {
    sheetId: '1JIbBC5dvNMUyz2NIgtVdV8S7LgwngiCIgELJ6XBKC8Y',
    isValid: function () { return true; },
    mapRow: function (cells, parseDate) {
      var sortKey = parseDate(cells[0] && cells[0].v);
      return {
        sortKey: sortKey,
        date: cells[0] && cells[0].f,
        content: cells[1] && cells[1].v
      };
    },
    renderItem: function (item) {
      return (
        '<li><span class="info-list__date">' + escapeHtml(item.date) + '</span>' +
        renderNewTag(item) + escapeHtml(item.content) + '</li>'
      );
    }
  };

  var todayAnnouncement = Object.assign({}, announcements, {
    renderItem: function (item) {
      return (
        '<li>' +
        '<span class="today-video-list__date">' + escapeHtml(item.date) + '</span>' +
        '<span>' + renderNewTag(item) + escapeHtml(item.content) + '</span>' +
        '</li>'
      );
    }
  });

  loadSheetList(Object.assign({}, todayAnnouncement, {
    listId: 'today-news-list-items',
    maxItems: 1
  }));

  loadSheetList(Object.assign({}, announcements, {
    listId: 'news-list-items',
    fallbackId: 'news-list-fallback',
    maxItems: 5
  }));

  // ホーム画面（index.html）：一覧が長くなりすぎないよう最新分だけ表示
  loadSheetList(Object.assign({}, todayMatchVideos, {
    listId: 'today-video-list-items',
    maxItems: 3
  }));

  loadSheetList(Object.assign({}, matchVideos, {
    listId: 'video-list-items',
    fallbackId: 'video-list-fallback',
    maxItems: 5
  }));

  loadSheetList(Object.assign({}, practiceVideos, {
    listId: 'practice-list-items',
    fallbackId: 'practice-list-fallback',
    maxItems: 5
  }));

  // 全件一覧ページ（all-videos.html）：件数制限なし
  loadSheetList(Object.assign({}, matchVideos, {
    listId: 'video-list-items-all',
    fallbackId: 'video-list-fallback-all',
    maxItems: 1000,
    matchYearFilterId: 'match-year-filter',
    matchMonthFilterId: 'match-month-filter',
    renderItem: function (item) {
      var title = item.opponent || item.title || '（対戦相手なし）';
      return (
        '<li class="video-item">' +
        '<span class="video-item__date ' + categoryClass(item.category, '試合・大会') + '">' + escapeHtml(item.date) + '</span>' +
        '<span class="video-item__title">' + renderNewTag(item) + escapeHtml(title) + '</span>' +
        '<a class="video-item__link" href="' + escapeAttr(item.url) + '" target="_blank" rel="noopener">▶ 見る</a>' +
        '</li>'
      );
    }
  }));

  loadSheetList(Object.assign({}, practiceVideos, {
    listId: 'practice-list-items-all',
    fallbackId: 'practice-list-fallback-all',
    maxItems: 1000,
    filterId: 'practice-category-filter'
  }));
})();
