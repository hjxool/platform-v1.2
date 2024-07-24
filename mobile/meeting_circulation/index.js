new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		url: '',
	},
	async mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
		} else {
			this.get_token();
		}
		this.resize();
		this.url = `../../../dlc2/meetingTransfer/index.html?token=${this.token}`;
		window.onmessage = ({ data: res }) => {
			console.log('子页面消息', res);
			switch (res.jump) {
				case '我的会议列表':
					window.location.href = `../myMeeting/index.html?token=${this.token}`;
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
			window.location.href = `../meeting_platform/index.html?token=${this.token}`;
		},
	},
});
