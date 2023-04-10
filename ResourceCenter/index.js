new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			page_select: -1, //选择进入哪个资源页面
			page_hover: -1, //悬浮切换图片
			pages: [
				{ dark: './img/icon2.png', light: './img/icon1.png' },
				{ dark: './img/icon4.png', light: './img/icon3.png' },
			],
			page_url: '', //iframe嵌入页
			page_title: '', //跳转页标题
		},
	},
	mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		this.resize();
		window.onresize = this.resize;
	},
	methods: {
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
			let type;
			switch (index) {
				case 0:
					type = 'public_material';
					this.html.page_title = '公共素材';
					break;
				case 1:
					type = 'personal_material';
					this.html.page_title = '个人素材';
					break;
			}
			this.html.page_url = `${候工链接}?token=${this.token}&type=${type}&theme=dark`;
		},
		// 返回上一级
		go_back() {
			this.html.page_select = -1;
		},
	},
});
