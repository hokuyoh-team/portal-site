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
        listEl.innerHTML = latest.map(options.renderItem).join('');
      })
      .catch(function () {
        listEl.innerHTML = '';
        if (fallbackEl) fallbackEl.hidden = false;
      });
  }

  // 試合動画：動画リンク一覧スプレッドシート（日付｜試合｜対戦相手｜youtubeリンク）
  var matchVideos = {
    sheetId: '1TBYDvLzq03UqUlb8W3bAm4CMuBT7OX4D_l5q2GUWxJc',
    mapRow: function (cells, parseDate) {
      return {
        sortKey: parseDate(cells[0] && cells[0].v),
        date: cells[0] && cells[0].f,
        title: [cells[1] && cells[1].v, cells[2] && cells[2].v].filter(Boolean).join(' vs '),
        url: cells[3] && cells[3].v
      };
    },
    renderItem: function (item) {
      return (
        '<li class="video-item">' +
        '<span class="video-item__date">' + escapeHtml(item.date) + '</span>' +
        '<span class="video-item__title">' + escapeHtml(item.title) + '</span>' +
        '<a class="video-item__link" href="' + escapeAttr(item.url) + '" target="_blank" rel="noopener">▶ 見る</a>' +
        '</li>'
      );
    }
  };

  // 練習メニュー動画：投稿フォームの回答一覧（タイムスタンプ｜URL｜タイトル・おすすめポイント｜お名前）
  var practiceVideos = {
    sheetId: '1ega5Ifh2ofvAGzc5wyMstgb_cxGswxYnz0XauzWERcs',
    mapRow: function (cells, parseDate) {
      var sortKey = parseDate(cells[0] && cells[0].v);
      return {
        sortKey: sortKey,
        date: formatDate(sortKey),
        title: cells[2] && cells[2].v,
        name: cells[3] && cells[3].v,
        url: cells[1] && cells[1].v
      };
    },
    renderItem: function (item) {
      var title = item.title || '（タイトルなし）';
      if (item.name) title += '（' + item.name + 'さん）';
      return (
        '<li class="video-item">' +
        '<span class="video-item__date">' + escapeHtml(item.date) + '</span>' +
        '<span class="video-item__title">' + escapeHtml(title) + '</span>' +
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
      var isNew = (Date.now() - item.sortKey) <= 7 * 24 * 60 * 60 * 1000;
      var tag = isNew ? '<span class="info-list__tag">NEW</span>' : '';
      return (
        '<li><span class="info-list__date">' + escapeHtml(item.date) + '</span>' +
        tag + escapeHtml(item.content) + '</li>'
      );
    }
  };

  loadSheetList(Object.assign({}, announcements, {
    listId: 'news-list-items',
    fallbackId: 'news-list-fallback',
    maxItems: 5
  }));

  // ホーム画面（index.html）：最新10件だけ表示
  loadSheetList(Object.assign({}, matchVideos, {
    listId: 'video-list-items',
    fallbackId: 'video-list-fallback',
    maxItems: 10
  }));

  loadSheetList(Object.assign({}, practiceVideos, {
    listId: 'practice-list-items',
    fallbackId: 'practice-list-fallback',
    maxItems: 10
  }));

  // 全件一覧ページ（all-videos.html）：件数制限なし
  loadSheetList(Object.assign({}, matchVideos, {
    listId: 'video-list-items-all',
    fallbackId: 'video-list-fallback-all',
    maxItems: 1000
  }));

  loadSheetList(Object.assign({}, practiceVideos, {
    listId: 'practice-list-items-all',
    fallbackId: 'practice-list-fallback-all',
    maxItems: 1000
  }));
})();
