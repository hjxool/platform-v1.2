let url = `${我是接口地址}/`;
let material_search_url = `${url}api-file/doc/catalogue/shareMaterial/search`;
let upload_file_url = `${url}api-file/doc/file/chunk/create`;
let del_material_url = `${url}api-file/doc/file/delete`;
let get_file_url = `${url}api-file/doc/showFileUrl`;
let upload_error_url = `${url}api-file/files`;

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			search: '', // 搜索框
			page_loading: false, // 页面加载
			load_text: '', // 加载提示文字
		},
		table: {
			h: 0,
			data: [], //表格数据
			total: 0, // 数据总数
			page_size: 10, //单页显示数量
			cur_page: 1, //当前页
		},
		form: {
			show: false, //发布表单显示
			loading: false, //表单加载
			url: '', // iframe页面地址
		},
		theme: '', //页面主题颜色
		source: '', // 页面来源
	},
	mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
			this.theme = sessionStorage.theme;
			this.source = sessionStorage.source;
		} else {
			this.get_token();
		}
		if (this.theme === 'dark') {
			let dom = document.getElementsByTagName('link');
			dom[0].href = `http://${我是ip地址}/css/eleme-dark.css`;
		}
		this.get_data(1);
		this.resize();
		window.onresize = () => {
			this.resize();
		};
		window.onmessage = (e) => {
			console.log('子iframe消息', e);
			if (e.data.type === 'Close popup') {
				this.form.show = false;
				this.get_data(1);
			}
		};
	},
	methods: {
		resize() {
			// 计算根节点子体大小
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.floor((width / 1920) * 100 + 0.5) / 100;
			dom.style.fontSize = ratio * 20 + 'px';
			this.$nextTick(() => {
				this.table.h = document.querySelector('.body').clientHeight;
			});
		},
		get_data(page) {
			this.html.page_loading = true;
			this.request(
				'post',
				material_search_url,
				this.token,
				{ pageNum: page, pageSize: this.table.page_size, keyword: this.html.search, condition: { catalogueId: this.source === 'developer' ? -2 : -1 } },
				(res) => {
					console.log('素材', res);
					this.html.page_loading = false;
					if (res.data.head.code != 200) {
						this.table.total = 0;
						return;
					}
					let data = res.data.data;
					this.table.total = data.total;
					this.table.data = data.data;
					this.table.cur_page = page;
				}
			);
		},
		select_file() {
			select_file.click();
		},
		upload_file() {
			Upload({
				id: 'select_file',
				// small_file_slice_size: 5,
				// large_file_slice_size: 50,
				upload_url: `${upload_file_url}/${this.source == 'developer' ? '-2' : '-1'}`,
				token: this.token,
				fail_count: 3,
				page_source: this.source,
				uploadStart: () => {
					this.html.page_loading = true;
					this.html.load_text = '读取完成，准备开始上传';
				},
				uploadFail: (index, md5, name) => {
					this.html.load_text = `重试第${index}次`;
					if (index == 3) {
						this.html.page_loading = false;
						this.request('delete', `${upload_error_url}/${md5}?fileName=${name}`, this.token);
					}
				},
				uploadProgress: (cur, total) => {
					let per = Math.floor((cur / total) * 1000 + 0.5) / 10;
					this.html.load_text = `上传进度：${per}%`;
				},
				uploadSuccess: () => {
					this.html.load_text = `上传成功`;
					setTimeout(() => {
						this.get_data(1);
					}, 1000);
				},
				readStart: () => {
					this.html.page_loading = true;
					this.html.load_text = '当前文件较大，读取中请耐心等待...';
				},
				readProgress: (cur, total) => {
					this.html.load_text = `读取进度：${cur}/${total}`;
				},
			});
		},
		// 删除素材
		del_material(row_obj) {
			this.$confirm('此操作将永久删除该文件, 是否继续?', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
				center: true,
			}).then(() => {
				this.request('post', del_material_url, this.token, [row_obj.id], (res) => {
					this.get_data(1);
				});
			});
		},
		// 下载素材
		download_material(row_obj) {
			this.html.page_loading = true;
			this.html.load_text = '正在下载，请耐心等待';
			this.request('get', `${get_file_url}/${row_obj.id}`, this.token, (res) => {
				console.log('文件url', res);
				if (res.data.head.code !== 200) {
					this.html.page_loading = false;
					return;
				}
				axios({
					method: 'get',
					url: res.data.data,
					responseType: 'blob',
					header: {
						Authorization: `Bearer ${this.token}`,
						'Content-Type': 'application/x-download',
					},
				}).then((res) => {
					this.html.page_loading = false;
					// let b = new Blob([res.data]);
					let a = document.createElement('a');
					let href = URL.createObjectURL(res.data);
					a.download = row_obj.fileName;
					a.href = href;
					a.target = '_blank';
					document.body.appendChild(a);
					a.click();
					document.body.removeChild(a);
					URL.revokeObjectURL(href);
				});
			});
		},
		// 发布素材
		publish_show(row_obj, type) {
			this.form.show = true;
			// this.form.loading = true;
			this.form.url = `${候工链接.replace(/dlc/i, 'dlc2')}?token=${this.token}&type=release&ReleaseType=${type}&id=${row_obj.id}&sourceType=2`;
		},
		// 主题颜色
		theme_bg() {
			return {
				background: this?.theme == 'dark' ? '#242632' : '',
			};
		},
		theme_font() {
			return {
				color: this?.theme == 'dark' ? '#fff' : '',
			};
		},
		// 发布按钮是否禁用
		can_publish(type) {
			switch (type) {
				case '文档':
				case '图片':
				case '视频':
				case '音频':
					return false;
				default:
					return true;
			}
		},
	},
});
