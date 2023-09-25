// let url = `${我是接口地址}/`;
// let search_meeting_url = `${url}api-portal/meeting/list`; //查询会议列表

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		html: {
			loading: false, //页面加载
		},
	},
	mounted() {
		this.resize();
	},
	methods: {
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 720) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以1920分辨率下字体大小20px为基准
		},
	},
});
