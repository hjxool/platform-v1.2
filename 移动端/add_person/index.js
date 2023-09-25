// let url = `${我是接口地址}/`;
// let search_meeting_url = `${url}api-portal/meeting/list`; //查询会议列表
let url = 'http://192.168.30.45:9201';
let remove_dup_url = `${url}api-user/department/deptUsers/distinct`; //用户去重
let all_user_url = `${url}api-user/users/nickName`; //分页查询用户列表
let all_layer_url = `${url}api-user/department/getSubDeptAndCurrentDeptUser`; //获取层级列表

// 引入vant
Vue.use(vant.DropdownMenu);
Vue.use(vant.DropdownItem);
Vue.use(vant.Search);

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		loading: false, //加载弹窗
		search: '', // 搜索框
		list: [], // 列表
		select_list: [], //勾选的组织及人员列表
		page_size: 20,
		type: 0, //按xxx搜索
		types: [
			{ text: '按人员选', value: 0 },
			{ text: '按架构选', value: 1 },
		],
		cur_path: '', //展开行
	},
	async mounted() {
		this.get_token();
		this.resize();
		try {
			this.loading = true;
			this.list = [
				{ title: '成都分公司', check: true, row: 1, path: '1', type: 'organization' },
				{ title: '广州分公司', check: false, row: 1, path: '2', type: 'organization' },
				{ title: '技术中心', check: false, row: 2, path: '2-1', type: 'organization' },
				{ title: 'xxx5', check: false, row: 3, path: '2-1-1', type: 'person' },
				{ title: '部门1', check: false, row: 3, path: '2-1-2', type: 'organization' },
				{ title: '综合集成事业部', check: false, row: 2, path: '2-2', type: 'organization' },
				{ title: 'xxx1', check: false, row: 3, path: '2-2-1', type: 'person' },
				{ title: 'xxx2', check: false, row: 3, path: '2-2-2', type: 'person' },
				{ title: 'xxx3', check: false, row: 3, path: '2-2-3', type: 'person' },
				{ title: 'xxx4', check: false, row: 2, path: '2-3', type: 'person' },
			];
			this.loading = false;
		} catch (error) {}
		// 监听调用页面传入数据 用于回显
		window.onmessage = (data) => {
			console.log('父页面消息', data);
			this.type = 0;
			this.search = '';
			if (Array.isArray(data?.data)) {
				this.select_list = data.data;
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
		// 根据当前行索引判断是否展开
		unfold_row(obj) {
			// 人员没有展开图标
			if (obj.type === 'person') {
				return false;
			}
			// 挨个对比路径 是否吻合 路径过程中的要全部展开
			let l1 = this.cur_path.split('-');
			let l2 = obj.path.split('-');
			// 必须以当前节点为参照 不然如果当前节点比选的路径长且前面都重合则会错误的显示展开
			for (let i = 0; i < l2.length; i++) {
				if (!l1[i] || l2[i] !== l1[i]) {
					return false;
				}
			}
			return true;
		},
		// 是否显示
		is_show(obj) {
			// 第一层的都展示
			if (obj.row === 1) {
				return true;
			}
			// 后面几层只有小于等于所选路径长度+1的层可以显示
			let l1 = this.cur_path.split('-');
			let l2 = obj.path.split('-');
			if (l2.length <= l1.length + 1) {
				// 对比的是当前节点的前一层 是否可见取决于每层的父节点是否相同
				for (let i = 0; i < l2.length - 1; i++) {
					if (l2[i] !== l1[i]) {
						return false;
					}
				}
				return true;
			} else {
				return false;
			}
		},
		// 不同项展开 同项折叠 即往前退一层
		unfold(path) {
			let l1 = path.split('-');
			let l2 = this.cur_path.split('-');
			for (let i = 0; i < l1.length; i++) {
				if (l1[i] !== l2[i]) {
					// 不同路径轨迹和大于所选所选路径的 直接修改
					this.cur_path = path;
					return;
				}
			}
			// 轨迹重合
			// 且当前路径长度小于等于所选路径
			// splice索引从0开始 且包含起始位置的都删除
			l2.splice(l2.length - 1 - (l2.length - l1.length));
			this.cur_path = l2.join('-');
		},
	},
});
