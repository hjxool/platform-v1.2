let url = `${我是接口地址}/`;
let get_play_list_url = `${url}api-portal/video/search/playList`;
let del_play_list_url = `${url}api-portal/video/delete/playList`;
let limits_url = `${url}api-user/menus/current`; //获取菜单权限

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			search: '', // 搜索框
			page_loading: true, // 页面加载
			total: 0, // 总条数
			page_size: 20, // 单页显示数量
			cur_page: 1, // 当前页
		},
		popup: {
			show: false, // 弹窗显示
			loading: false, // 加载遮罩
			type: '', // 弹窗类型
		},
		playlist: [], // 播放列表
		config: {
			edit_show: false, //相关按钮显示
			del_show: false,
			instant_show: false,
			timing_show: false,
			add_show: false,
		},
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
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
			if (val.name === '智慧信息发布') {
				for (let val2 of val.subMenus) {
					if (val2.name === '内容管理') {
						for (let val3 of val2.subMenus) {
							if (val3.name === '播放列表') {
								limits = val3.subMenus;
								break;
							}
						}
						break;
					}
				}
				break;
			}
		}
		this.config.timing_show = this.is_element_show(limits, '定时发布');
		this.config.instant_show = this.is_element_show(limits, '即时发布');
		this.config.add_show = this.is_element_show(limits, '新增播放列表');
		this.config.del_show = this.is_element_show(limits, '删除');
		this.config.edit_show = this.is_element_show(limits, '编辑');

		this.get_data(1);
		this.resize();
		window.onresize = () => {
			this.resize();
		};
		window.onmessage = this.message;
	},
	methods: {
		// 解析权限树
		is_element_show(source, key) {
			for (let val of source) {
				if (val.name === key) {
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
		},
		// 获取页面数据
		get_data(page) {
			this.html.page_loading = true;
			this.request('post', get_play_list_url, this.token, { pageNum: page, pageSize: this.html.page_size, condition: {}, keyword: this.html.search }, (res) => {
				console.log('播放列表', res);
				this.html.page_loading = false;
				if (res.data.head.code !== 200) {
					return;
				}
				let data = res.data.data;
				this.html.total = data.total;
				this.html.cur_page = page;
				this.playlist = data.data;
			});
		},
		// 卡片操作
		operation(type, obj) {
			this.popup.type = type;
			switch (type) {
				case 'instant':
				case 'timing':
					this.popup.show = true;
					this.html.page_loading = true;
					this.popup.url = `${候工链接.replace(/dlc/i, 'dlc2')}?token=${this.token}&type=release&ReleaseType=${type}&id=${obj.id}&sourceType=5`;
					return;
				case 'material':
					this.show_play_list(obj.id);
					return;
				case 'delete':
					this.del_playlist(obj);
					return;
			}
		},
		// 删除播放列表
		del_playlist(obj) {
			this.$confirm(`确认删除 ${obj.playListName} 播放列表?`, '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'warning',
				center: true,
			}).then(() => {
				this.request('delete', `${del_play_list_url}/${obj.id}`, this.token, (res) => {
					if (res.data.head.code !== 200) {
						return;
					}
					this.html.search = '';
					this.get_data(1);
				});
			});
		},
		// 弹窗尺寸
		popup_size() {
			let w, mw;
			switch (this.popup.type) {
				case 'instant':
				case 'timing':
					return {
						width: '96%',
						minWidth: '800px',
						margin: 'auto',
					};
				case 'material':
					return {
						width: '96%',
						minWidth: '800px',
					};
			}
		},
		// 显示播放列表弹窗
		show_play_list(id) {
			this.popup.type = 'material';
			this.popup.show = true;
			this.popup.url = `../index.html?token=${this.token}&type=playlist_edit&id=${id || ''}`;
		},
		// 监听页面消息
		message(data) {
			console.log('子页面消息', data);
			switch (data.data.type) {
				case 'close':
					this.popup.show = false;
					break;
				case 'close and refresh':
					this.popup.show = false;
					this.html.search = '';
					this.get_data(1);
					break;
				case 'Loading off':
					this.html.page_loading = false;
					break;
				case 'Loading on':
					this.html.page_loading = true;
					break;
				case 'Close popup':
					this.popup.show = false;
					this.$message.success(data.data.msg || '');
					break;
			}
		},
	},
});
