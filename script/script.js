document.addEventListener('DOMContentLoaded', () => {
	const musicListContainer = document.getElementById('music-list');

	// 1. JSONデータの読み込み
	fetch('script/songs.json')
		.then(response => response.json())
		.then(songs => { renderSongs(songs); })
		.catch(error => {
			console.error('データの読み込みに失敗しました:', error);
			musicListContainer.innerHTML = '<p>曲情報の読み込みに失敗しました。</p>';
		});

	// 2. 曲リストの描画関数
	function renderSongs(songs) {
		musicListContainer.innerHTML = ''; 

		songs.forEach(song => {
			const songItem = document.createElement('div');
			songItem.className = 'song-item';

			// デフォルトは「最後のバージョン（最新版）」
			const lastVerIndex = song.versions.length - 1;
			const defaultVer = song.versions[lastVerIndex];

			// プロジェクトコメントの判定
			const projectComment = song.project_comment && song.project_comment.trim() !== "" 
				? song.project_comment : "コメントなし";

			// ① バージョン選択プルダウンのHTML生成
			let verOptionsHTML = '';
			song.versions.forEach((v, index) => {
				const isSelected = (index === lastVerIndex) ? 'selected' : '';
				verOptionsHTML += `<option value="${index}" ${isSelected}>${v.ver}</option>`;
			});
			const verSelectStyle = song.versions.length <= 1 ? 'style="display:none;"' : '';

			// HTMLの骨組みを出力
			songItem.innerHTML = `
				<div class="song-header">
					<span class="song-title">♪ ${song.title}</span>
					<span class="song-date">Up: ${song.date}</span>
				</div>
				
				<div class="project-comment-box">
					<p class="comment-label">【Project Note】</p>
					<p class="comment-text">${projectComment}</p>
				</div>

				<div class="song-meta">
					<select class="ver-select" ${verSelectStyle}>${verOptionsHTML}</select>
					<select class="type-select"></select>
					<span class="song-time">Time: <span class="time-val"></span></span>
				</div>

				<div class="ver-comment-box">
					<p class="comment-label">【Version Note】</p>
					<p class="comment-text ver-comment-val"></p>
				</div>

				<div class="custom-audio-player">
					<div class="player-controls">
						<button class="play-btn">▶ PLAY</button>
						<button class="stop-btn">■ STOP</button>
					</div>
					
					<div class="progress-container">
						<div class="progress-bar"></div>
					</div>

					<div class="waveform-visualizer">
						<div class="bar"></div>
						<div class="bar"></div>
						<div class="bar"></div>
						<div class="bar"></div>
						<div class="bar"></div>
					</div>

					<div class="player-status">STOPPED</div>
				</div>
				<audio class="song-audio" src="" style="display:none;"></audio>
			`;

			// 要素のキャッシュ
			const verSelectEl = songItem.querySelector('.ver-select');
			const typeSelectEl = songItem.querySelector('.type-select');
			const timeValEl = songItem.querySelector('.time-val');
			const audioEl = songItem.querySelector('.song-audio');
			const verCommentValEl = songItem.querySelector('.ver-comment-val');
			const playBtnEl = songItem.querySelector('.play-btn');
			const statusEl = songItem.querySelector('.player-status');
			const stopBtnEl = songItem.querySelector('.stop-btn');
			const progressContainerEl = songItem.querySelector('.progress-container');
			const progressBarEl = songItem.querySelector('.progress-bar');
			const visualizerEl = songItem.querySelector('.waveform-visualizer');

			// ② タイプ（インスト等）の選択肢を動的に書き換える関数
			function updateTypeMenu(selectedVer) {
				const verComment = selectedVer.ver_comment && selectedVer.ver_comment.trim() !== "" 
					? selectedVer.ver_comment : "コメントなし";
				verCommentValEl.textContent = verComment;

				let typeOptionsHTML = '';
				selectedVer.types.forEach((t, index) => {
					typeOptionsHTML += `<option value="${index}">${t.name}</option>`;
				});
				typeSelectEl.innerHTML = typeOptionsHTML;

				// タイプが1つだけなら、セレクトボックスを選択不可（disabled）にして常に表示
				if (selectedVer.types.length <= 1) {
					typeSelectEl.disabled = true;
					typeSelectEl.style.opacity = "0.6";
				} else {
					typeSelectEl.disabled = false;
					typeSelectEl.style.opacity = "1.0";
				}
				typeSelectEl.style.display = 'inline-block';

				const defaultType = selectedVer.types[0];
				timeValEl.textContent = defaultType.time;
				audioEl.src = defaultType.file;

				// プルダウン初期化・変更時はプレイヤーの状態も綺麗にリセット
				audioEl.pause();
				audioEl.currentTime = 0;
				progressBarEl.style.width = '0%';
				playBtnEl.textContent = '▶ PLAY';
				playBtnEl.classList.remove('playing');
				visualizerEl.classList.remove('playing');
				statusEl.textContent = 'READY';
			}

			// 変数宣言がすべて終わった直後に初期表示を実行
			updateTypeMenu(defaultVer);

			// ③ 再生・一時停止の挙動をコントロールするイベント
			playBtnEl.addEventListener('click', () => {
				if (audioEl.paused) {
					audioEl.play();
					playBtnEl.textContent = '⏸ PAUSE';
					playBtnEl.classList.add('playing');
					visualizerEl.classList.add('playing'); // 波形アニメーション開始
					statusEl.textContent = 'PLAYING...';
					statusEl.classList.add('playing');
				} else {
					audioEl.pause();
					playBtnEl.textContent = '▶ PLAY';
					playBtnEl.classList.remove('playing');
					visualizerEl.classList.remove('playing'); // 波形アニメーション一時停止
					statusEl.textContent = 'PAUSED';
					statusEl.classList.remove('playing');
				}
			});

			// ④ ストップボタンのイベント（再生停止＋タイムリセット）
			stopBtnEl.addEventListener('click', () => {
				audioEl.pause();
				audioEl.currentTime = 0;
				progressBarEl.style.width = '0%';
				playBtnEl.textContent = '▶ PLAY';
				playBtnEl.classList.remove('playing');
				visualizerEl.classList.remove('playing');
				statusEl.textContent = 'STOPPED';
				statusEl.classList.remove('playing');
			});

			// ⑤ 再生位置の進捗に合わせてプログレスバーをリアルタイムに伸ばすイベント
			audioEl.addEventListener('timeupdate', () => {
				if (audioEl.duration) {
					const progressPercent = (audioEl.currentTime / audioEl.duration) * 100;
					progressBarEl.style.width = `${progressPercent}%`;
				}
			});

			// ⑥ プログレスバーのクリック位置にジャンプ（シーク）するイベント
			progressContainerEl.addEventListener('click', (e) => {
				const containerWidth = progressContainerEl.clientWidth;
				const clickX = e.offsetX;
				const duration = audioEl.duration;

				if (duration) {
					audioEl.currentTime = (clickX / containerWidth) * duration;
				}
			});

			// ⑦ 曲が最後まで再生し終わったら状態をリセットするイベント（統合）
			audioEl.addEventListener('ended', () => {
				progressBarEl.style.width = '0%';
				playBtnEl.textContent = '▶ PLAY';
				playBtnEl.classList.remove('playing');
				visualizerEl.classList.remove('playing');
				statusEl.textContent = 'FINISHED';
				statusEl.classList.remove('playing');
			});

			// ⑧ バージョン変更イベント
			verSelectEl.addEventListener('change', (e) => {
				const selectedVer = song.versions[e.target.value];
				updateTypeMenu(selectedVer);
			});

			// ⑨ タイプ変更イベント
			typeSelectEl.addEventListener('change', (e) => {
				const currentVer = song.versions[verSelectEl.value];
				const selectedType = currentVer.types[e.target.value];
				
				timeValEl.textContent = selectedType.time;
				audioEl.src = selectedType.file;

				// タイプ変更時もプレイヤーの状態をリセット
				audioEl.pause();
				audioEl.currentTime = 0;
				progressBarEl.style.width = '0%';
				playBtnEl.textContent = '▶ PLAY';
				playBtnEl.classList.remove('playing');
				visualizerEl.classList.remove('playing');
				statusEl.textContent = 'READY';
			});

			musicListContainer.appendChild(songItem);
		});
	}
});