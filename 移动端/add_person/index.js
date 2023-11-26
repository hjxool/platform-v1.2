// let url = `${我是接口地址}/`;
// let search_meeting_url = `${url}api-portal/meeting/list`; //查询会议列表
let url = 'http://192.168.30.45:9201';
let all_user_url = `${url}/api-user/users/nickName`; //分页查询用户列表
let all_layer_url = `${url}/api-user/department/getSubDeptAndCurrentDeptUser`; //获取层级列表

// 引入vant
Vue.use(vant.DropdownMenu);
Vue.use(vant.DropdownItem);
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
		list1: [], // 组织数组
		list2: [], // 人员数组
		select_list: [], //勾选的组织及人员列表
		type: 0, //按xxx搜索
		types: [
			{ text: '按人员选', value: 0 },
			{ text: '按部门选', value: 1 },
		],
		stru_path: [], //组织结构路径 存储名字和索引id
		page_num: 1, //查询页数
		page_size: 20, //一次查多少条
		cur_path_id: '', //当前路径
		total_person: 0,
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
			this.type = 0;
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
		// 根据类别获取人员列表获取
		async get_data(params1, params2) {
			let body = {
				condition: {},
				pageSize: this.page_size,
			};
			if (this.type) {
				// 按架构
				let id;
				if (typeof params1 == 'object') {
					// 点下级 或路径回退 时
					if (params2 === true) {
						// 点下级时判断能否点击
						return;
					}
					id = params1.id;
					this.page_num = 1;
				} else if (typeof params1 == 'number') {
					// 同一组织下 切页
					id = this.stru_path[this.stru_path.length - 1].id;
					this.page_num = params1;
				} else {
					// 刚进入页面时
					id = 1;
					this.stru_path = [{ name: '总公司', id: 1 }];
					this.page_num = 1;
				}
				body.condition.currentDeptId = id;
				this.loading = true;
				let { data } = await this.request('post', all_layer_url, this.token, body);
				this.loading = false;
				if (data.head.code !== 200) {
					return;
				}
				this.cur_path_id = id;
				this.list1 = [];
				for (let val of data.data.sysDeptVOList) {
					let t = {
						name: val.deptName,
						id: val.deptId,
						check: false,
						type: 'stru',
					};
					this.list1.push(t);
				}
				this.list2 = [];
				if (data.data.userPageResult.data) {
					for (let val of data.data.userPageResult.data) {
						let t = {
							name: val.username,
							id: val.id,
							check: false,
							type: 'person',
						};
						this.list2.push(t);
					}
				}
				// 回显勾选
				for (let val of this.select_list) {
					if (val.type === 'stru') {
						for (let val2 of this.list1) {
							if (val.id === val2.id) {
								val2.check = true;
								break;
							}
						}
					} else {
						for (let val2 of this.list2) {
							if (val.id === val2.id) {
								val2.check = true;
								break;
							}
						}
					}
				}
				if (typeof params2 === 'number') {
					// 路径回退 删除后面的层级
					this.stru_path.splice(params2 + 1);
				} else if (id !== 1 && typeof params1 !== 'number') {
					// 点击下级
					// 除了根节点和分页 将后续节点入栈
					this.stru_path.push(params1);
				}
				this.total_person = data.data.userPageResult.total; // 只分人员的页
			} else {
				// 按人员
				this.type = 0;
				if (this.search) {
					body.keyword = this.search;
				}
				if (typeof params1 == 'number') {
					this.page_num = params1;
				} else {
					this.page_num = 1;
				}
				body.pageNum = this.page_num;
				this.loading = true;
				let { data } = await this.request('post', all_user_url, this.token, body);
				this.loading = false;
				if (data.head.code !== 200) {
					return;
				}
				this.total_person = data.data.total;
				this.list2 = [];
				for (let val of data.data.data) {
					let t = {
						name: val.username,
						id: val.id,
						check: false,
						type: 'person', //不同类型显示样式不同
					};
					this.list2.push(t);
				}
				// 回显勾选
				for (let val of this.list2) {
					for (let val2 of this.select_list) {
						if (val.id === val2.id) {
							val.check = true;
							break;
						}
					}
				}
			}
		},
		// 路径回退
		path_back(obj, index) {
			// 如果是当前展示的组织 则不能再查
			if (this.cur_path_id !== obj.id) {
				this.get_data(obj, index);
			}
		},
		// 勾选或取消勾选人员和组织
		select_person(obj) {
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
			if (!this.type) {
				for (let val of this.list2) {
					if (val.id === obj.id) {
						val.check = false;
						break;
					}
				}
			} else {
				if (obj.type === 'stru') {
					for (let val of this.list1) {
						if (val.id === obj.id) {
							val.check = false;
							break;
						}
					}
				} else {
					for (let val of this.list2) {
						if (val.id === obj.id) {
							val.check = false;
							break;
						}
					}
				}
			}
			this.select_list.splice(index, 1);
		},
		// 向父页面发送消息关闭弹窗
		close_window(params) {
			window.parent.postMessage({ type: 'close_pop', data: params });
		},
		// 参会人员提交
		async submit() {
			// 只传递原始数据 交由外面处理
			this.close_window(this.select_list);
		},
	},
});
