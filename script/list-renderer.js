document.addEventListener('DOMContentLoaded', () => {
	const gridContainer = document.getElementById('project-grid-container');

	if (!gridContainer) return;

	// JSONデータの読み込み
	fetch('script/songs.json')
		.then(response => response.json())
		.then(songs => {
			renderProjectGrid(songs);
			
			// ★【新機能】データ描画完了後、保存されたスクロール位置があればミリ秒のラグを入れて確実に強制復元
			const savedScrollY = sessionStorage.getItem('dashboard_scroll_pos');
			if (savedScrollY) {
				setTimeout(() => {
					window.scrollTo(0, parseInt(savedScrollY, 10));
					sessionStorage.removeItem('dashboard_scroll_pos'); // 復元したらゴミ箱へ
				}, 50); // ブラウザのレンダリング確定を待つための安全なウェイト
			}
		})
		.catch(error => {
			console.error('一覧データの読み込みに失敗しました:', error);
			gridContainer.innerHTML = '<p>プロジェクト情報の読み込みに失敗しました。</p>';
		});

	/**
	 * プロジェクトをカード型の一覧としてグリッド描画する関数
	 */
	function renderProjectGrid(songs) {
		gridContainer.innerHTML = '';

		songs.forEach(song => {
			const card = document.createElement('a');
			card.className = 'project-card';
			card.href = `project.html?id=${encodeURIComponent(song.id)}`;

			// ★【新機能】リンクがクリックされた瞬間、その時のスクロールトップの数値をブラウザセッションに緊急退避
			card.addEventListener('click', () => {
				sessionStorage.setItem('dashboard_scroll_pos', window.scrollY);
			});

			const statusClass = song.status ? song.status.toLowerCase() : 'progress';
			const projectComment = song.project_comment && song.project_comment.trim() !== "" 
				? song.project_comment : "コメントなし";

			card.innerHTML = `
				<div class="card-header">
					<span class="status-badge ${statusClass}"></span>
					<h3 class="card-title">${song.title}</h3>
				</div>
				<div class="card-meta">
					<span class="card-date">DATE: ${song.date}</span>
					<span class="card-vers">VERSIONS: ${song.versions.length}</span>
				</div>
				<p class="card-comment-preview">${projectComment}</p>
				<div class="card-enter-label">ACCESS PROJECT >></div>
			`;

			gridContainer.appendChild(card);
		});
	}
});