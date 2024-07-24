let url = `${我是接口地址}/`;
// let url = 'http://192.168.30.45:9201/';
let get_goods_list_url = `${url}api-portal/things/search`; // 查询物品列表

// 引入vant
Vue.use(vant.Stepper);
Vue.use(vant.Search);
Vue.use(vant.Pagination);
Vue.use(vant.Icon);
Vue.use(vant.Popup);

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		loading: false, //加载弹窗
		search: '', // 搜索框
		list: [], // 组织数组
		select_list: [], //勾选的组织及人员列表
		page_num: 1, //查询页数
		page_size: 20, //一次查多少条
		total: 0,
		select_show: false, //已选弹窗
	},
	async mounted() {
		this.get_token();
		this.resize();
		try {
			this.get_data();
		} catch (error) {}
		// 监听调用页面传入数据 用于回显
		window.onmessage = ({ data }) => {
			console.log('父页面消息', data);
			this.search = '';
			if (Array.isArray(data)) {
				this.select_list = data;
				this.get_data(); //重查一次 重置列表中勾选
			}
		};
	},
	methods: {
		// 浏览器大小改变后执行方法
		resize() {
			let dom = document.documentElement;
			let width = dom.clientWidth;
			let ratio = Math.round((width / 720) * 100) / 100; // 取小数点后两位
			dom.style.fontSize = ratio * 10 + 'px'; //以720分辨率下字体大小10px为基准
		},
		// 查询物品
		async get_data(page) {
			this.loading = true;
			this.page_num = page || 1;
			let { data: res } = await this.request('post', get_goods_list_url, this.token, {
				condition: {},
				pageNum: this.page_num,
				pageSize: this.page_size,
				keyword: this.search,
			});
			this.loading = false;
			if (res.head.code !== 200 || !res.data.data) {
				return;
			}
			this.total = res.data.total;
			this.list = [];
			for (let val of res.data.data) {
				let t = {
					name: val.name,
					id: val.id,
					num: 1, // 物品数量由用户选择要几个
					remark: val.remark,
					unit: val.unit,
					check: false, // 勾选
				};
				this.list.push(t);
			}
			// 回显输入数量
			for (let val of this.list) {
				for (let val2 of this.select_list) {
					if (val.id === val2.id) {
						val.num = val2.num;
						val.check = true;
						break;
					}
				}
			}
		},
		// 勾选物品
		select(obj) {
			if (obj.check) {
				for (let index = 0; index < this.select_list.length; index++) {
					if (this.select_list[index].id === obj.id) {
						this.select_list.splice(index, 1);
						break;
					}
				}
			} else {
				this.select_list.push(obj);
			}
			obj.check = !obj.check;
		},
		// 删除勾选的组织或人员
		del_select(index) {
			let obj = this.select_list[index];
			for (let val of this.list) {
				if (val.id === obj.id) {
					val.check = false;
					break;
				}
			}
			this.select_list.splice(index, 1);
		},
		// 参会人员提交
		async submit() {
			// 只传递原始数据 交由外面处理
			window.parent.postMessage({ type: 'close_pop', data: this.select_list });
		},
	},
});
