new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		url: '',
		flag: '', // 页面标识 区分返回到哪
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		this.resize();
		this.url = `../../../移动h5/会议审核.html?token=${this.token}`;
		this.flag = '列表';
		window.onmessage = ({ data: res }) => {
			console.log('子页面消息', res);
			switch (res.jump) {
				case '会议审核详情':
					this.url = `../../../dlc2/auditAuth/index.html?type=300012&token=${this.token}&id=${res.data.id}`;
					this.flag = '详情';
					break;
				case '会议审核列表':
					this.url = `../../../移动h5/会议审核.html?token=${this.token}`;
					this.flag = '列表';
					break;
			}
		};
	},
	methods: {
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 360) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以720分辨率下字体大小10px为基准
		},
		// 返回上一页
		turn_back() {
			switch (this.flag) {
				case '列表':
					window.location.href = `../meeting_platform/index.html?token=${this.token}`;
					break;
				case '详情':
					this.url = `../../../移动h5/会议审核.html?token=${this.token}`;
					this.flag = '列表';
					break;
			}
		},
	},
});
