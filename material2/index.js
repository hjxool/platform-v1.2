let url = `${我是接口地址}/`;
let material_search_url = `${url}api-file/doc/catalogue/shareMaterial/search`; // 素材列表
let upload_file_url = `${url}api-file/doc/file/chunk/create`;
let del_material_url = `${url}api-file/doc/file/delete`;
// let get_file_url = `${url}api-file/doc/showFileUrl`; // 下载文件
let get_file_url = `${url}api-file/doc/catalogue/shareMaterial`; // 下载文件
let upload_error_url = `${url}api-file/files`;
let limits_url = `${url}api-user/menus/current`; //获取菜单权限
let get_place_devices_url = `${url}api-portal/video/search/liveDevice`; // 按场所分组获取直播设备
let 资源下发至设备url = `${url}api-portal/video/device/download/createTask`;
let 查询下发历史url = `${url}api-portal/video/device/download/record`;
let 重新下载url = `${url}api-portal/video/device/download/retry`;
let 取消下载url = `${url}api-portal/video/device/download/cancel`;
let 删除下载记录url = `${url}api-portal/video/device/download/delete`;
let 上传大小限制url = `${url}api-portal/system/config/configKey`;

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
		issue: {
			show: false, // 资源下发弹窗
			list: [], // 设备列表
			select: [], // 勾选项
			select_ban: false, // 下发至全部设备时 禁用下拉列表
		},
		下发历史: {
			show: false,
			pageNum: 1,
			pageSize: 10,
			total: 0,
			search: '',
			素材类型: 0,
			类型列表: [
				{ label: '全部', value: 0 },
				{ label: '文档', value: 1 },
				{ label: '视频', value: 2 },
				{ label: '音频', value: 3 },
				{ label: '图片', value: 4 },
			],
			素材列表: [],
			表格高度: 0,
			状态: '',
			状态列表: [
				{ label: '无', value: '' },
				{ label: '等待下载', value: '0' },
				{ label: '下载中', value: '1' },
				{ label: '下载成功', value: '2' },
				{ label: '下载超时', value: '3' },
				{ label: '取消下载', value: '4' },
				{ label: '下载失败', value: '5' },
			],
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
		// 获取上传文件大小限制
		this.request('get', `${上传大小限制url}/upload_files_limit`, this.token, ({ data }) => {
			if (data.head.code == 200 && !isNaN(Number(data.data))) {
				this.图片等限制 = Number(data.data) * Math.pow(1024, 2);
			} else {
				this.图片等限制 = 200 * Math.pow(1024, 2);
			}
		});
		this.request('get', `${上传大小限制url}/upload_video_limit`, this.token, ({ data }) => {
			if (data.head.code == 200 && !isNaN(Number(data.data))) {
				this.视频限制 = Number(data.data) * Math.pow(1024, 2);
			} else {
				this.视频限制 = 2 * Math.pow(1024, 3);
			}
		});
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
				if (this.下发历史.show) {
					this.下发历史.表格高度 = document.querySelector('#history_table').clientHeight;
				}
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
				if (file.size > this.视频限制) {
					this.$message.error(`只能上传 ${this.视频限制 / Math.pow(1024, 3)}G 以内的视频`);
					return;
				}
				let t = await this.canvas_video(file);
				this.upload_file(t);
			} else {
				if (file.size > this.图片等限制) {
					this.$message.error(`只能上传 ${this.图片等限制 / Math.pow(1024, 2)}M 以内的文件`);
					return;
				}
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
				if (res.data.head.code !== 200) {
					return;
				}
				axios({
					method: 'get',
					url: res.data.data,
					responseType: 'blob',
					header: {
						Authorization: `Bearer ${this.token}`,
						// 'Content-Type': 'application/x-download',
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
		// 勾选素材
		select_material(selects) {
			this.selected_material = selects;
		},
		async 显示资源下发弹窗() {
			// 未勾选资源 不继续执行
			if (!this.selected_material?.length) {
				this.$message('请勾选资源再试');
				return;
			}
			// 查询发布设备列表
			this.issue.select = []; // 重置勾选设备
			this.issue.select_ban = false; // 重置禁用按钮

			if (this.issue.list.length) {
				this.issue.show = true;
			} else {
				let { data: res } = await this.request('get', get_place_devices_url, this.token);
				if (res.head.code !== 200 || !res.data?.length) {
					this.$message('未查询到设备');
					return;
				}
				this.issue.show = true;
				this.issue.list = res.data.map((e) => ({
					label: e.nodeName,
					value: e.id,
					children: e.children.map((e2) => ({
						label: e2.deviceName,
						value: e2.deviceId,
					})),
				}));
			}
		},
		async 下发至设备() {
			if (!this.issue.select.length && !this.issue.select_ban) {
				// 未勾选设备 且 未选全部设备下发
				this.$message('未勾选设备');
				return;
			}
			// 全部设备下发时给个提示
			if (this.issue.select_ban) {
				let r = await this.$confirm('确定下载到所有设备?', '提示', {
					confirmButtonText: '确定',
					cancelButtonText: '取消',
					type: 'warning',
					center: true,
				})
					.then(() => true)
					.catch(() => false);
				if (!r) {
					return;
				}
			}
			this.issue.show = false;
			let body = {
				fileIds: this.selected_material.map((e) => e.id),
			};
			if (this.issue.select_ban) {
				let t = this.issue.list.map((e) => {
					return e.children.map((e2) => e2.value);
				});
				body.deviceIds = t.reduce((pre, cur) => pre.concat(cur), []);
			} else {
				body.deviceIds = this.issue.select.map((e) => e[e.length - 1]);
			}
			let { data: res } = await this.request('post', 资源下发至设备url, this.token, body);
			if (res.head.code !== 200) {
				this.$message.error('下发失败');
			} else {
				this.$message.success('下发成功');
			}
		},
		async 显示下发历史弹窗() {
			// 重置表单数据
			this.下发历史.search = '';
			this.下发历史.素材类型 = 0;
			this.下发历史.状态 = '';
			let res = await this.查询下发历史();
			if (res) {
				this.下发历史.show = true;
				this.$nextTick(() => {
					this.下发历史.表格高度 = document.querySelector('#history_table').clientHeight;
				});
			} else {
				this.$message('无历史记录');
			}
		},
		async 查询下发历史(pageNum) {
			if (pageNum) {
				this.下发历史.pageNum = pageNum;
			} else {
				this.下发历史.pageNum = 1;
			}
			let body = {
				pageNum: this.下发历史.pageNum,
				pageSize: this.下发历史.pageSize,
				condition: {},
			};
			if (this.下发历史.search) {
				body.keyword = this.下发历史.search;
			}
			if (this.下发历史.素材类型) {
				body.condition.fileType = this.下发历史.素材类型;
			}
			if (this.下发历史.状态) {
				body.condition.downloadStatus = this.下发历史.状态;
			}
			let { data: res } = await this.request('post', 查询下发历史url, this.token, body);
			if (res.head.code == 200) {
				this.下发历史.total = res.data.total || 0;
				this.下发历史.素材列表 = res.data.data || [];
				return true;
			} else {
				return false;
			}
		},
		素材类型名称(type) {
			switch (type) {
				case 1:
					return '文档';
				case 2:
					return '视频';
				case 3:
					return '音频';
				case 4:
					return '图片';
			}
		},
		下载状态(type) {
			switch (type) {
				case '0':
					return '等待下载';
				case '1':
					return '下载中';
				case '2':
					return '下载成功';
				case '3':
					return '下载超时';
				case '4':
					return '取消下载';
				case '5':
					return '下载失败';
			}
		},
		重试下载任务(obj) {
			// 下载中 或 等待下载 不能重新下载
			if (obj.downloadStatus == '0' || obj.downloadStatus == '1') {
				this.$message('任务正在下载中');
				return;
			}
			this.$confirm('确定要设备重新下载?', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
				center: true,
			}).then(() => {
				this.request('put', `${重新下载url}/${obj.id}`, this.token, ({ data: res }) => {
					if (res.head.code === 200) {
						obj.downloadStatus = '0';
					} else {
						this.$message('重新下载失败');
					}
				});
			});
		},
		取消下载任务(obj) {
			// 下载中 或 等待下载 才能取消下载
			if (obj.downloadStatus != '0' && obj.downloadStatus != '1') {
				this.$message('任务已经结束不能取消');
				return;
			}
			this.$confirm('确定取消设备下载任务?', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
				center: true,
			}).then(() => {
				this.request('put', `${取消下载url}/${obj.id}`, this.token, ({ data: res }) => {
					if (res.head.code === 200) {
						obj.downloadStatus = '4';
					} else {
						this.$message('取消下载失败');
					}
				});
			});
		},
		删除下载记录(obj) {
			// 下载中 或 等待下载 不能删除记录
			if (obj.downloadStatus == '0' || obj.downloadStatus == '1') {
				this.$message('下载中请勿删除');
				return;
			}
			this.$confirm('确定删除设备下载记录?', '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
				center: true,
			}).then(() => {
				this.request('delete', `${删除下载记录url}/${obj.id}`, this.token, ({ data: res }) => {
					if (res.head.code === 200) {
						this.$message.success(`删除记录 ${obj.fileName}`);
						this.查询下发历史(this.下发历史.pageNum);
					} else {
						this.$message('删除记录失败');
					}
				});
			});
		},
		下载到设备(obj) {
			this.$refs.table.clearSelection();
			this.$refs.table.toggleRowSelection(obj);
			this.selected_material = [obj];
			this.显示资源下发弹窗();
		},
	},
});
