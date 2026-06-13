document.addEventListener('DOMContentLoaded', () => {
	const workspace = document.getElementById('single-project-workspace');
	if (!workspace) return; // 詳細ページではない場合はスキップ

	// URLから「?id=xxxxx」の値を解析して抽出する
	const urlParams = new URLSearchParams(window.location.search);
	const targetProjectId = urlParams.get('id');

	if (!targetProjectId) {
		workspace.innerHTML = '<p style="color:#ff0000;">エラー: プロジェクトIDが指定されていません。</p>';
		return;
	}

	// データの読み込み
	fetch('script/songs.json')
		.then(response => response.json())
		.then(songs => {
			const currentSong = songs.find(s => s.id === targetProjectId);
			
			if (!currentSong) {
				workspace.innerHTML = '<p style="color:#ff0000;">エラー: 指定されたプロジェクトが見つかりません。</p>';
				return;
			}

			document.title = `${currentSong.title} // Ungle Angle`;
			renderSingleProject(currentSong);
		})
		.catch(error => {
			console.error('詳細データの読み込みに失敗しました:', error);
			workspace.innerHTML = '<p>データの読み込みに失敗しました。</p>';
		});

	/**
	 * 特定の1プロジェクトのみを深く構築・レンダリングする関数
	 */
	function renderSingleProject(song) {
		workspace.innerHTML = '';

		const songItem = document.createElement('div');
		songItem.className = 'song-item-detail';

		const lastVerIndex = song.versions.length - 1;
		const defaultVer = song.versions[lastVerIndex];

		// 【組み込み箇所①】7日未満（1週間以内）の新曲かどうかの判定ロジック
		let isNewSong = false;
		if (song.date) {
			const songDate = new Date(song.date);
			const currentDate = new Date();
			
			const diffTime = currentDate - songDate;
			const diffDays = diffTime / (1000 * 60 * 60 * 24);
			
			if (diffDays >= 0 && diffDays < 7) {
				isNewSong = true;
			}
		}

		const projectComment = song.project_comment && song.project_comment.trim() !== "" 
			? song.project_comment : "No comment.";

		// バージョン選択プルダウンのHTML生成
		let verOptionsHTML = '';
		song.versions.forEach((v, index) => {
			const isSelected = (index === lastVerIndex) ? 'selected' : '';
			verOptionsHTML += `<option value="${index}" ${isSelected}>${v.ver}</option>`;
		});

		// ★単一バージョンの場合は、disabledにして形状を固定表示
		const verSelectDisabledAttr = song.versions.length <= 1 ? 'disabled="true"' : '';

		const statusClass = song.status ? song.status.toLowerCase() : 'progress';

		// 【組み込み箇所②】HTMLテンプレート内にNEWバッジを追加できるよう構造を調整
		let newBadgeHTML = '';
		if (isNewSong) {
			newBadgeHTML = `<span class="new-badge">NEW</span>`;
		}

		// ★ボタンがズレる・はみ出る問題を解消するため、内部テキストを完全に無くしたピュアな構造に再生成
		songItem.innerHTML = `
			<div class="song-header">
				<div class="song-title">
					<span class="status-badge ${statusClass}"></span>
					${newBadgeHTML}
					<span class="title-text" style="font-size:1.6rem; color:#00ff00;">${song.title}</span>
				</div>
				<span class="song-date">LAST UPDATED: ${song.date}</span>
			</div>
			
			<div class="project-comment-box">
				<p class="comment-label">[PROJECT MASTER COMMENT]</p>
				<p class="comment-text">${projectComment}</p>
			</div>

			<div class="song-meta">
				<select class="ver-select" ${verSelectDisabledAttr}>
					${verOptionsHTML}
				</select>
				<select class="type-select"></select>
				<span class="song-time-display">DURATION: <span class="time-val">00:00</span></span>
			</div>

			<div class="custom-audio-player">
				<div class="player-controls">
					<button class="play-btn" title="PLAY/PAUSE"></button>
					<button class="stop-btn" title="STOP">■</button>
				</div>
				
				<div class="waveform-visualizer">
					<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
					<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
					<div class="bar"></div><div class="bar"></div><div class="bar"></div><div class="bar"></div>
				</div>
				
				<div class="player-status-bar">
					<span class="player-status-text">READY</span>
				</div>
				
				<div class="timeline-container">
					<div class="progress-container-wrapper">
						<div class="progress-bar"></div>
					</div>
				</div>
				
				<div class="time-counter">
					<span class="current-time-val">00:00</span> / <span class="duration-time-val">00:00</span>
				</div>
			</div>

			<div class="share-container">
				<button id="share_this">SHARE PROJECT</button>
				<span class="share-notify">LINK COPIED</span>
			</div>

			<div class="ver-comment-box">
				<p class="comment-label">[SELECTED VERSION COMMENT]</p>
				<p class="ver-comment-text comment-text"></p>
			</div>

			<audio class="song-audio" preload="metadata"></audio>
		`;

		workspace.appendChild(songItem);

		const verSelectEl = songItem.querySelector('.ver-select');
		const typeSelectEl = songItem.querySelector('.type-select');
		const timeValEl = songItem.querySelector('.time-val');
		const verCommentTextEl = songItem.querySelector('.ver-comment-text');
		const audioEl = songItem.querySelector('.song-audio');

		const playBtnEl = songItem.querySelector('.play-btn');
		const stopBtnEl = songItem.querySelector('.stop-btn');
		const visualizerEl = songItem.querySelector('.waveform-visualizer');
		const statusEl = songItem.querySelector('.player-status-text');
		const progressContainerEl = songItem.querySelector('.progress-container-wrapper');
		const progressBarEl = songItem.querySelector('.progress-bar');
		const currentTimeValEl = songItem.querySelector('.current-time-val');
		const durationTimeValEl = songItem.querySelector('.duration-time-val');

		// 共有ボタンのDOM要素を取得
		const shareBtnEl = songItem.querySelector('#share_this');
		const shareNotifyEl = songItem.querySelector('.share-notify');

		/**
		 * タイプメニュー（Track種別）の更新関数
		 */
		function updateTypeMenu(versionObj) {
			typeSelectEl.innerHTML = '';
			
			if (!versionObj) return;

			versionObj.types.forEach((t, index) => {
				const opt = document.createElement('option');
				opt.value = index;
				opt.textContent = t.name;
				typeSelectEl.appendChild(opt);
			});

			// ★【仕様修正】タイプ（トラック種別）も単一の場合は、同じくdisabledにして固定表示化！
			if (versionObj.types.length <= 1) {
				typeSelectEl.setAttribute('disabled', 'true');
			} else {
				typeSelectEl.removeAttribute('disabled');
			}

			const verComment = versionObj.ver_comment && versionObj.ver_comment.trim() !== "" 
				? versionObj.ver_comment : "No comment.";
			verCommentTextEl.textContent = verComment;

			if (versionObj.types.length > 0) {
				const firstType = versionObj.types[0];
				timeValEl.textContent = firstType.time;
				durationTimeValEl.textContent = firstType.time;
				audioEl.src = firstType.file;
			}
			
			// プレイヤー状態初期化
			audioEl.pause();
			audioEl.currentTime = 0;
			if (progressBarEl) progressBarEl.style.width = '0%';
			currentTimeValEl.textContent = "00:00";
			playBtnEl.classList.remove('playing');
			visualizerEl.classList.remove('playing');
			statusEl.textContent = 'READY';
			statusEl.classList.remove('playing');
		}

		// 初期描画
		updateTypeMenu(defaultVer);

		// ダウンロードモジュールの接続
		if (typeof DownloadHandler !== 'undefined' && DownloadHandler.setup) {
			DownloadHandler.setup(songItem, song, verSelectEl, typeSelectEl);
		}

		// プレイヤーコントロールロジック
		playBtnEl.addEventListener('click', () => {
			if (audioEl.paused) {
				audioEl.play().then(() => {
					playBtnEl.classList.add('playing');
					visualizerEl.classList.add('playing');
					statusEl.textContent = 'PLAYING';
					statusEl.classList.add('playing');
				}).catch(err => console.error("再生に失敗しました:", err));
			} else {
				audioEl.pause();
				playBtnEl.classList.remove('playing');
				visualizerEl.classList.remove('playing');
				statusEl.textContent = 'PAUSED';
				statusEl.classList.remove('playing');
			}
		});

		stopBtnEl.addEventListener('click', () => {
			audioEl.pause();
			audioEl.currentTime = 0;
			if (progressBarEl) progressBarEl.style.width = '0%';
			currentTimeValEl.textContent = "00:00";
			playBtnEl.classList.remove('playing');
			visualizerEl.classList.remove('playing');
			statusEl.textContent = 'STOPPED';
			statusEl.classList.remove('playing');
		});

		audioEl.addEventListener('timeupdate', () => {
			const current = audioEl.currentTime;
			const duration = audioEl.duration || 0;
			
			if (duration > 0) {
				const pct = (current / duration) * 100;
				if (progressBarEl) progressBarEl.style.width = `${pct}%`;
			}

			const curMin = Math.floor(current / 60).toString().padStart(2, '0');
			const curSec = Math.floor(current % 60).toString().padStart(2, '0');
			currentTimeValEl.textContent = `${curMin}:${curSec}`;
		});

		// ★【機能修復】プログレスバーをクリック/タップした位置へ確実に再生ヘッドを移動させる
		progressContainerEl.addEventListener('click', (e) => {
			const containerWidth = progressContainerEl.clientWidth;
			// 要素の左端からの相対クリック位置を厳密に取得
			const clickX = e.offsetX;
			const duration = audioEl.duration;
			if (duration > 0 && containerWidth > 0) {
                const targetTime = (clickX / containerWidth) * duration;
                audioEl.currentTime = targetTime;
			}
		});

		audioEl.addEventListener('ended', () => {
			if (progressBarEl) progressBarEl.style.width = '0%';
			currentTimeValEl.textContent = "00:00";
			playBtnEl.classList.remove('playing');
			visualizerEl.classList.remove('playing');
			statusEl.textContent = 'FINISHED';
			statusEl.classList.remove('playing');
		});

		verSelectEl.addEventListener('change', (e) => {
			const selectedVer = song.versions[e.target.value];
			updateTypeMenu(selectedVer);
		});

		typeSelectEl.addEventListener('change', (e) => {
			const currentVer = song.versions[verSelectEl.value];
			const selectedType = currentVer.types[e.target.value];
			
			timeValEl.textContent = selectedType.time;
			audioEl.src = selectedType.file;

			audioEl.pause();
			audioEl.currentTime = 0;
			if (progressBarEl) progressBarEl.style.width = '0%';
			currentTimeValEl.textContent = "00:00";
			durationTimeValEl.textContent = selectedType.time;
			
			playBtnEl.classList.remove('playing');
			visualizerEl.classList.remove('playing');
			statusEl.textContent = 'READY';
			statusEl.classList.remove('playing');
		});

		// 【組み込み箇所④】共有ボタンのクリックイベントリスナー登録
		shareBtnEl.addEventListener('click', () => {
			const currentUrl = window.location.href;
			navigator.clipboard.writeText(currentUrl)
				.then(() => {
					shareNotifyEl.classList.add('show');
					setTimeout(() => {
						shareNotifyEl.classList.remove('show');
					}, 2000);
				})
				.catch(err => {
					console.error('URLのコピーに失敗しました:', err);
				});
		});
	}
});