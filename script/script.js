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

				<audio class="song-audio" src="" controls></audio>
			`;

			// 要素のキャッシュ
			const verSelectEl = songItem.querySelector('.ver-select');
			const typeSelectEl = songItem.querySelector('.type-select');
			const timeValEl = songItem.querySelector('.time-val');
			const audioEl = songItem.querySelector('.song-audio');
			const verCommentValEl = songItem.querySelector('.ver-comment-val');

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

				// ★【修正点】タイプが1つだけなら、セレクトボックスを選択不可（disabled）にして常に表示
				if (selectedVer.types.length <= 1) {
					typeSelectEl.disabled = true;
					typeSelectEl.style.opacity = "0.6"; // 選択できないことを示すために少し暗く（お好みで）
				} else {
					typeSelectEl.disabled = false;
					typeSelectEl.style.opacity = "1.0";
				}
				typeSelectEl.style.display = 'inline-block'; // 常に表示を維持

				const defaultType = selectedVer.types[0];
				timeValEl.textContent = defaultType.time;
				audioEl.src = defaultType.file;
			}

			// 初期表示
			updateTypeMenu(defaultVer);

			// ③ バージョン変更イベント
			verSelectEl.addEventListener('change', (e) => {
				const selectedVer = song.versions[e.target.value];
				updateTypeMenu(selectedVer);
			});

			// ④ タイプ変更イベント
			typeSelectEl.addEventListener('change', (e) => {
				const currentVer = song.versions[verSelectEl.value];
				const selectedType = currentVer.types[e.target.value];
				
				timeValEl.textContent = selectedType.time;
				audioEl.src = selectedType.file;
			});

			musicListContainer.appendChild(songItem);
		});
	}
});