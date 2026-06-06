/**
 * ダウンロード機能専門の拡張ハンドラー・モジュール
 */
const DownloadHandler = {
	/**
	 * 各曲のダウンロードメニュー（セレクトボックスと実行ボタン）を生成・制御する
	 */
	setup: (songItem, song, verSelectEl, typeSelectEl) => {
		// DL選択プルダウンと実行ボタンのHTMLを組み立て
		const dlContainer = document.createElement('div');
		dlContainer.className = 'download-menu-container';
		dlContainer.innerHTML = `
			<select class="dl-select" style="flex-grow: 1; min-width: 0; padding: 4px; box-sizing: border-box;">
				<option value="single">選択中のトラックをDL (.m4a/.mp3)</option>
				<option value="ver-all">選択中のVerすべてのトラックをDL (ZIP)</option>
				<option value="proj-all">プロジェクトすべての音源をDL (ZIP)</option>
			</select>
			<button class="dl-btn" style="flex-shrink: 0;">DL</button>
		`;
		// 既存のメタ情報エリア（プルダウンがある列）の末尾に目立たないように追加
		const songMeta = songItem.querySelector('.song-meta');
		if (songMeta) {
			songMeta.appendChild(dlContainer);
		}

		const dlSelectEl = dlContainer.querySelector('.dl-select');
		const dlBtnEl = dlContainer.querySelector('.dl-btn');

		/**
		 * 現在の選択状態に応じて「VerすべてのトラックをDL」「プロジェクトすべての音源をDL」の有効・無効を切り替える内製関数
		 */
		const updateDlMenuStatus = () => {
			const currentVer = song.versions[verSelectEl.value];
			
			// ① 選択中バージョンのトラック（タイプ）数が1つ以下の場合は、Ver一括DLを無効化
			if (currentVer && currentVer.types.length <= 1) {
				if (dlSelectEl.value === 'ver-all') {
					dlSelectEl.value = 'single';
				}
				dlSelectEl.options[1].disabled = true;
			} else {
				dlSelectEl.options[1].disabled = false;
			}

			// ② プロジェクト全体のバージョン数が1つ以下の場合は、プロジェクト一括DLも無効化
			if (song.versions.length <= 1) {
				if (dlSelectEl.value === 'proj-all') {
					dlSelectEl.value = 'single';
				}
				dlSelectEl.options[2].disabled = true;
			} else {
				dlSelectEl.options[2].disabled = false;
			}
		};

		// 親側のバージョン変更イベントに連動させるため、要素にカスタムイベントを仕込む
		verSelectEl.addEventListener('change', updateDlMenuStatus);
		updateDlMenuStatus();

		// ダウンロードボタンクリック時のメイン挙動
		dlBtnEl.addEventListener('click', async () => {
			const mode = dlSelectEl.value;
			const currentVer = song.versions[verSelectEl.value];
			const currentType = currentVer.types[typeSelectEl.value];

			// ボタンを一時的にロックしてローディング表示
			const originalText = dlBtnEl.textContent;
			dlBtnEl.disabled = true;
			dlBtnEl.textContent = '...';

			try {
				if (mode === 'single') {
					// 1. 単一ファイルのダウンロード（★ファイル名を「Ver名_タイプ名」に変更、スペースを置換）
					const rawName = `${currentVer.ver}_${currentType.name}`;
					const cleanedName = DownloadHandler.sanitizeFilename(rawName);
					await DownloadHandler.downloadFile(currentType.file, cleanedName);
				} else if (mode === 'ver-all') {
					// 2. 選択中バージョンの全タイプをZIP圧縮
					await DownloadHandler.downloadVerAsZip(song.title, currentVer);
				} else if (mode === 'proj-all') {
					// 3. プロジェクト全体の全バージョン・全タイプをZIP圧縮
					await DownloadHandler.downloadProjectAsZip(song.title, song.versions);
				}
			} catch (error) {
				console.error('ダウンロード処理に失敗しました:', error);
				alert('ファイルの取得または圧縮に失敗しました。パスが正しいか確認してください。');
			} finally {
				dlBtnEl.disabled = false;
				dlBtnEl.textContent = originalText;
			}
		});
	},

	/**
	 * ★【新規追加】ファイル名から半角・全角スペースを除去し「_」に置換するサニタイズ関数
	 */
	sanitizeFilename: (name) => {
		// 全角スペースと半角スペースをすべて「_」に置換
		return name.replace(/[\s\u3000]+/g, '_');
	},

	/**
	 * 単一ファイルをブラウザのaタグエミュレートで直接落とす
	 */
	downloadFile: async (url, downloadName) => {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		const blob = await response.blob();
		
		const ext = url.split('.').pop().split(/[?#]/)[0] || 'm4a';
		
		const blobUrl = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = `${downloadName}.${ext}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(blobUrl);
	},

	/**
	 * 特定のバージョン内の全タイプをZIP化（★内部ファイル名も連動してVer_Typeに最適化）
	 */
	downloadVerAsZip: async (songTitle, versionObj) => {
		const zip = new JSZip();
		// フォルダ名は「曲名_Ver名」のスペース置換
		const folderName = DownloadHandler.sanitizeFilename(`${songTitle}_${versionObj.ver}`);
		const folder = zip.folder(folderName);

		for (const type of versionObj.types) {
			const response = await fetch(type.file);
			if (response.ok) {
				const blob = await response.blob();
				const ext = type.file.split('.').pop().split(/[?#]/)[0] || 'm4a';
				
				// 中身のファイル名も「Ver名_タイプ名」に統一
				const rawFileName = `${versionObj.ver}_${type.name}`;
				const cleanedFileName = DownloadHandler.sanitizeFilename(rawFileName);
				
				folder.file(`${cleanedFileName}.${ext}`, blob);
			}
		}

		const content = await zip.generateAsync({ type: 'blob' });
		const blobUrl = window.URL.createObjectURL(content);
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = `${folderName}.zip`;
		a.click();
		window.URL.revokeObjectURL(blobUrl);
	},

	/**
	 * プロジェクト全体の全バージョン・全タイプを階層化してZIP化
	 */
	downloadProjectAsZip: async (songTitle, versionsArray) => {
		const zip = new JSZip();
		const rootFolderName = DownloadHandler.sanitizeFilename(`${songTitle}_All_Archives`);
		const rootFolder = zip.folder(rootFolderName);

		for (const verObj of versionsArray) {
			// バージョンごとのサブフォルダ
			const verFolderName = DownloadHandler.sanitizeFilename(verObj.ver);
			const verFolder = rootFolder.folder(verFolderName);
			
			for (const type of verObj.types) {
				const response = await fetch(type.file);
				if (response.ok) {
					const blob = await response.blob();
					const ext = type.file.split('.').pop().split(/[?#]/)[0] || 'm4a';
					
					// フォルダ分けされているので、ファイル名は単純にタイプ名（スペース置換）に
					const cleanedFileName = DownloadHandler.sanitizeFilename(type.name);
					verFolder.file(`${cleanedFileName}.${ext}`, blob);
				}
			}
		}

		const zipFileName = DownloadHandler.sanitizeFilename(`${songTitle}_All_Versions`);
		const content = await zip.generateAsync({ type: 'blob' });
		const blobUrl = window.URL.createObjectURL(content);
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = `${zipFileName}.zip`;
		a.click();
		window.URL.revokeObjectURL(blobUrl);
	}
};