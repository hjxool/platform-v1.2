let url = `${我是接口地址}/`;
let limits_url = `${url}api-user/menus/current`; //获取菜单权限

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			page_select: -1, //选择进入哪个资源页面
			page_hover: -1, //悬浮切换图片
			pages: [
				{ dark: './img/icon2.png', light: './img/icon1.png', name: '公共素材' },
				{ dark: './img/icon4.png', light: './img/icon3.png', name: '个人素材' },
			],
			page_url: '', //iframe嵌入页
			page_title: '', //跳转页标题
		},
		config: {
			common_show: false,
			person_show: false,
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
			if (val.name === '资源中心') {
				limits = val.subMenus;
				break;
			}
		}
		this.config.common_show = this.is_element_show(limits, '公共素材');
		this.config.person_show = this.is_element_show(limits, '个人素材');
		if (!this.config.common_show) {
			this.html.pages.splice(0, 1);
		}
		if (!this.config.person_show) {
			this.html.pages.splice(1, 1);
		}

		this.resize();
		window.onresize = this.resize;
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
		// 点击跳转对应页面
		turn_to_page(index) {
			this.html.page_select = index;
			// let type;
			switch (this.html.pages[index].name) {
				case '公共素材':
					this.html.page_url = `${候工链接}?token=${this.token}&type=public_material&theme=dark&source=resource_center`;
					this.html.page_title = '公共素材';
					break;
				case '个人素材':
					this.html.page_url = `${候工链接}?token=${this.token}&type=personal_material&theme=dark`;
					this.html.page_title = '个人素材';
					break;
			}
		},
		// 返回上一级
		go_back() {
			this.html.page_select = -1;
		},
	},
});
