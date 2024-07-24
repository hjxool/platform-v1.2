let url = `${我是接口地址}/`;
// let url = 'http://192.168.30.45:9201/';
let guest_url = `${url}api-portal/meeting/user/guest`; //来宾预约

// 引入vant
Vue.use(vant.Form);
Vue.use(vant.Field);

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		username: '', //用户名
		phone: '', //电话
		company: '', //单位
		rules: {
			username: [{ required: true, message: '请填写用户名' }],
			phone: [
				{ required: true, message: '请填写电话' },
				{ pattern: /^\d{11}$/, message: '请填写正确的号码' },
			],
			company: [{ required: true, message: '请填写单位' }],
		},
	},
	async mounted() {
		if (!location.search) {
			this.id = sessionStorage.id;
		} else {
			this.get_token();
		}
		this.resize();
	},
	methods: {
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 360) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以720分辨率下字体大小10px为基准
		},
		// 提交创建
		async submit() {
			let { data: res } = await axios.post(guest_url, { meetingId: this.id, guestName: this.username, guestPhone: this.phone, guestAgency: this.company });
			if (res.head.code !== 200) {
				vant.Notify({ type: 'warning', message: res.head.message });
			} else {
				vant.Notify({ type: 'success', message: res.head.message });
			}
		},
	},
});
