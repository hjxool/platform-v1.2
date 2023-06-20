let url = `${我是接口地址}/`;
let material_search_url = `${url}api-file/doc/catalogue/shareMaterial/search`; // 素材列表
let upload_file_url = `${url}api-file/doc/file/chunk/create`;
let del_material_url = `${url}api-file/doc/file/delete`;
let get_file_url = `${url}api-file/doc/showFileUrl`;
let upload_error_url = `${url}api-file/files`;
let limits_url = `${url}api-user/menus/current`; //获取菜单权限

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			search: '', // 搜索框
			page_loading: true, // 页面加载
			load_text: '', // 加载提示文字
			download_list: [], // 下载列表
			download_fold: false, // 下载列表折叠按钮
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
		config: {
			api_params: -1, // 配置项 默认接口传参-1
			show_button: false, // 配置项 默认不显示发布按钮
			filter: [], // 配置项 默认不筛选素材
			upload_params: 'file-center-storage', // 配置项 上传文件默认字段
			timing_show: false, //相关按钮权限显示
			instant_show: false,
			add_show: false,
			del_show: false,
			download_show: false,
		},
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
			this.theme = sessionStorage.theme;
			this.source = sessionStorage.source;
		} else {
			this.get_token();
		}
		if (!sessionStorage.hushanwebmenuTree) {
			await new Promise((success) => {
				this.request('get', limits_url, this.token, (res) => {
					success();
					if (res.data.head.code !== 200) {
						return;
					}
					sessionStorage.hushanwebmenuTree = JSON.stringify(res.data.data.menuTree);
				});
			});
		}
		// 解析权限树
		let limits;
		for (let val of JSON.parse(sessionStorage.hushanwebmenuTree)) {
			if (val.path === '智慧信息发布' && this.source === 'info_publish') {
				for (let val2 of val.subMenus) {
					if (val2.path === '智慧信息发布_内容管理') {
						for (let val3 of val2.subMenus) {
							if (val3.path === '智慧信息发布_内容管理_素材管理') {
								limits = val3.subMenus;
								break;
							}
						}
						break;
					}
				}
				break;
			} else if (val.path === '开发者中心' && this.source === 'developer') {
				for (let val2 of val.subMenus) {
					if (val2.path === '开发者中心_素材管理') {
						limits = val2.subMenus;
						break;
					}
				}
				break;
			} else if (val.path === '资源中心' && this.source === 'resource_center') {
				for (let val2 of val.subMenus) {
					if (val2.path === '资源中心_公共素材') {
						limits = val2.subMenus;
						break;
					}
				}
				break;
			} else if (val.path === '智慧音视频广播' && this.source === 'broadcast') {
				for (let val2 of val.subMenus) {
					if (val2.path === '智慧音视频广播_媒体库') {
						limits = val2.subMenus;
						break;
					}
				}
				break;
			}
		}
		this.config.timing_show = this.is_element_show(limits, '定时发布');
		this.config.instant_show = this.is_element_show(limits, '即时发布');
		this.config.add_show = this.is_element_show(limits, '新增素材');
		this.config.del_show = this.is_element_show(limits, '删除');
		this.config.download_show = this.is_element_show(limits, '下载');

		switch (this.source) {
			case 'developer':
				this.config.api_params = -2;
				this.config.upload_params = 'sys-file-resource';
				break;
			case 'info_publish':
				this.config.show_button = true;
				break;
			case 'broadcast':
				this.config.filter = [2, 3];
				break;
		}
		if (this.theme === 'dark') {
			let dom = document.getElementsByTagName('link');
			dom[0].href = `../../css/eleme-dark.css`;
		}
		this.get_data(1);
		this.resize();
		window.onresize = () => {
			this.resize();
		};
		window.onmessage = (e) => {
			console.log('子iframe消息', e);
			switch (e.data.type) {
				case 'Close popup':
					this.form.show = false;
					this.get_data(1);
					this.$message.success(e.data.msg);
					break;
				case 'Loading on':
					this.html.page_loading = true;
					this.html.load_text = '';
					break;
				case 'Loading off':
					this.html.page_loading = false;
					this.html.load_text = '';
					break;
			}
		};
	},
	methods: {
		// 解析权限树
		is_element_show(source, key) {
			for (let val of source) {
				let t = val.path.split('_');
				if (t[t.length - 1] === key) {
					return true;
				}
			}
			return false;
		},
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
				{ pageNum: page, pageSize: this.table.page_size, keyword: this.html.search, condition: { catalogueId: this.config.api_params, fileTypeList: this.config.filter } },
				(res) => {
					console.log('素材', res);
					this.html.page_loading = false;
					if (res.data.head.code != 200) {
						this.table.total = 0;
						return;
					}
					let data = res.data.data;
					for (let val of data.data) {
						val.ban_download = false; // 添加禁止下载标识
					}
					this.table.data = data.data;
					this.table.total = data.total;
					this.table.cur_page = page;
				}
			);
		},
		select_file() {
			select_file.click();
		},
		// 根据文件类型分类调用方法
		async classify_upload() {
			let file = document.querySelector('#select_file').files[0];
			let suffix = file.name.split('.').pop();
			if (suffix === 'mp4') {
				let t = await this.canvas_video(file);
				this.upload_file(t);
			} else {
				switch (suffix) {
					case 'ppt':
					case 'doc':
					case 'docx':
					case 'pdf':
					case 'pptx':
					case 'txt':
						let mb = Math.floor(file.size / Math.pow(1024, 2));
						if (mb >= 100) {
							this.$message.error('不支持过大的文件类型！');
							return;
						}
						break;
				}
				this.upload_file();
			}
		},
		// 生成视频缩略图
		canvas_video(file) {
			let url = URL.createObjectURL(file); // 生成文件的url
			let video = document.createElement('video'); // 创建video对象
			video.src = url; // 添加video对象属性
			video.currentTime = 2; // 设置视频播放位置，秒为单位
			return new Promise((success, fail) => {
				video.addEventListener('loadeddata', () => {
					let canvas = document.createElement('canvas');
					canvas.width = video.videoWidth;
					canvas.height = video.videoHeight;
					let ctx = canvas.getContext('2d');
					ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
					let base64 = canvas.toDataURL(); // 将canvas图转成base64
					let arr = base64.split(','); // ，号前是数据类型 后是base-64编码的字符串
					let option = { type: arr[0].match(/:(.*?);/)[1] };
					let str = atob(arr[1]); // atob是window方法 用于解码base64编码字符串 返回解码字符串
					let n = str.length;
					let u8arr = new Uint8Array(n); // 生成长度n的空数组
					while (n--) {
						u8arr[n] = str.charCodeAt(n);
					}
					success(new File([u8arr], file.name.split('.')[0] + '.png', option));
				});
			}).then((res) => res);
		},
		// 上传方法
		upload_file(params) {
			Upload({
				id: 'select_file',
				// small_file_slice_size: 5,
				// large_file_slice_size: 50,
				upload_url: `${upload_file_url}/${this.config.api_params}`,
				token: this.token,
				fail_count: 3,
				cus_header: this.config.upload_params,
				uploadStart: () => {
					this.html.page_loading = true;
					this.html.load_text = '读取完成，准备开始上传';
					document.getElementById('select_file').value = null;
				},
				uploadFail: (index, md5, name) => {
					this.html.load_text = `重试第${index}次`;
					if (index == 3) {
						this.html.page_loading = false;
						this.request('delete', `${upload_error_url}/${md5}?fileName=${name}`, this.token);
					}
				},
				uploadProgress: (cur, total, form_obj) => {
					this.html.load_text = `正在上传：${cur} / ${total}`;
					if (cur === total && params) {
						// 传最后一片时生成缩略图上传
						form_obj.append('thumbnailImage', params);
					}
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
			this.html.download_list.push({ name: row_obj.fileName, per: 0, id: row_obj.id });
			// 做个闭包将对象的引用地址传入异步方法
			let obj = this.html.download_list[this.html.download_list.length - 1];
			// 下载中的文件不能再点下载
			row_obj.ban_download = true;
			this.request('get', `${get_file_url}/${row_obj.id}`, this.token, (res) => {
				console.log('文件url', res);
				if (res.data.head.code !== 200) {
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
					// 下载进度事件
					onDownloadProgress: (progress) => {
						let per = Math.floor((progress.loaded / progress.total) * 1000 + 0.5) / 10;
						obj.per = per; // 修改引用地址下的属性值
						if (per == 100) {
							// 进度满了后恢复下载和移除下载列表中的元素
							row_obj.ban_download = false;
							for (let index = 0; index < this.html.download_list.length; index++) {
								let t = this.html.download_list[index];
								if (t.id === obj.id) {
									this.html.download_list.splice(index, 1);
									break;
								}
							}
						}
					},
				}).then((res) => {
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
			this.form.url = `${候工链接.replace(/dlc/i, 'dlc2')}?token=${this.token}&type=release&ReleaseType=${type}&id=${row_obj.id}&sourceType=5`;
			window.sessionStorage.single_material = JSON.stringify(row_obj);
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
