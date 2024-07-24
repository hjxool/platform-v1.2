let url = `${我是接口地址}/`;
// let url = 'http://192.168.30.45:9201/';
let all_user_url = `${url}api-user/users/nickName`; //分页查询用户列表
let all_layer_url = `${url}api-user/department/getSubDeptAndCurrentDeptUser`; //获取层级列表
let get_job_user_url = `${url}api-user/sysPost/users/assigned/list`; // 根据岗位id查询已分配的用户列表
let get_dep_list_url = `${url}api-user/department/getLevelDept`; // 获取处级部门列表
let get_job_list_url = `${url}api-user/sysPost/search`; // 岗位查询

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
		type: 1, //按xxx搜索
		types: [
			{ text: '按人员选', value: 0 },
			{ text: '按架构选', value: 1 },
			{ text: '按部门选', value: 2 },
			{ text: '按分组选', value: 3 },
		],
		type_ban: false, // 是否可选类型
		stru_path: [], //组织结构路径 存储名字和索引id
		page_num: 1, //查询页数
		page_size: 20, //一次查多少条
		total_person: 0,
		select_show: false, //已选弹窗
	},
	created() {
		// 监听调用页面传入数据 用于回显
		window.onmessage = ({ data }) => {
			console.log('父页面消息', data);
			this.search = '';
			if (Array.isArray(data)) {
				this.select_list = data;
				this.prePage_show();
				this.get_data(); //重查一次 重置列表中勾选
			}
		};
	},
	async mounted() {
		this.get_token();
		this.theme = decodeURIComponent(this.theme);
		this.resize();
		try {
			this.prePage_show();
			this.get_data();
		} catch (error) {}
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
			let id;
			switch (this.type) {
				case 0:
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
					let { data: data1 } = await this.request('post', all_user_url, this.token, body);
					this.loading = false;
					this.list1 = [];
					this.list2 = [];
					if (data1.head.code !== 200) {
						return;
					}
					this.total_person = data1.data.total;
					for (let val of data1.data.data) {
						let t = {
							name: val.nickname,
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
					break;
				case 1:
					// 按架构
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
						// 特殊情况 只显示用户所处架构
						switch (this.prePage) {
							case 'myDep':
								id = this.id;
								this.stru_path = [{ name: this.theme || '重庆理工大学', id }];
								break;
							default:
								id = 1;
								this.stru_path = [{ name: '重庆理工大学', id: 1 }];
								break;
						}
						this.page_num = 1;
					}
					body.condition.currentDeptId = id;
					body.pageNum = this.page_num;
					this.loading = true;
					let { data: data2 } = await this.request('post', all_layer_url, this.token, body);
					this.loading = false;
					this.list1 = [];
					this.list2 = [];
					if (data2.head.code !== 200) {
						return;
					}
					for (let val of data2.data.sysDeptVOList) {
						let t = {
							name: val.deptName,
							id: val.deptId,
							check: false,
							type: 'stru',
						};
						this.list1.push(t);
					}
					if (data2.data.userPageResult.data) {
						for (let val of data2.data.userPageResult.data) {
							let t = {
								name: val.nickname,
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
						} else if (val.type === 'person') {
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
					} else if (id !== this.stru_path[0].id && typeof params1 !== 'number') {
						// 点击下级
						// 除了根节点和分页 将后续节点入栈
						this.stru_path.push(params1);
					}
					this.total_person = data2.data.userPageResult.total; // 只分人员的页
					break;
				case 2:
					// 按部门查
					this.request('get', get_dep_list_url, this.token, ({ data: res }) => {
						this.list1 = [];
						this.list2 = [];
						if (res.head.code !== 200 || !res.data) {
							return;
						}
						for (let val of res.data) {
							let t = {
								name: val.deptName,
								id: val.deptId,
								check: false,
								type: 'dep', // 部门的不需要去重 单独标识
							};
							this.list2.push(t);
						}
						for (let val of this.list2) {
							for (let val2 of this.select_list) {
								if (val.id === val2.id) {
									val.check = true;
									break;
								}
							}
						}
					});
					break;
				case 3:
					// 按岗位查
					// 查询岗位和查询岗位下的人 是不同接口因此要保存当前层级的类别
					let url;
					if (typeof params1 == 'object') {
						// 点下级时
						id = params1.id;
						this.page_num = 1;
						this.stru_path.push({ name: params1.name, id });
						url = get_job_user_url;
					} else if (typeof params1 == 'number') {
						// 切页 如果是根节点 就没有id
						if (this.stru_path[this.form.stru_path.length - 1].id) {
							id = this.stru_path[this.stru_path.length - 1].id;
							url = get_job_user_url;
						} else {
							url = get_job_list_url;
						}
						this.page_num = params1;
					} else {
						// 根节点时
						// 只有根节点和 其下的子岗位
						this.stru_path = [{ name: '重庆理工大学' }];
						this.page_num = 1;
						url = get_job_list_url;
					}
					if (id) {
						body.condition = { targePostId: id };
					}
					if (this.search) {
						body.keyword = this.search;
					}
					body.pageNum = this.page_num;
					this.request('post', url, this.token, body, ({ data: res }) => {
						this.list1 = [];
						this.list2 = [];
						if (res.head.code !== 200 || !res.data.total) {
							return;
						}
						// 分两个接口查询 结果也要装入不同的数组(样式)
						// 有id说明装入的是人员 没有id说明是岗位列表
						if (id) {
							this.total_person = res.data.total;
							for (let val of res.data.data) {
								let t = {
									name: val.nickname,
									id: val.id,
									check: false,
									type: 'person',
								};
								this.list2.push(t);
							}
							for (let val of this.select_list) {
								if (val.type === 'person') {
									for (let val2 of this.list2) {
										if (val.id === val2.id) {
											val2.check = true;
											break;
										}
									}
								}
							}
						} else {
							this.total_person = res.data.total;
							for (let val of res.data.data) {
								let t = {
									name: val.postName,
									id: val.id,
									check: false,
									type: 'job',
								};
								this.list1.push(t);
							}
							for (let val of this.select_list) {
								if (val.type === 'job') {
									for (let val2 of this.list1) {
										if (val.id === val2.id) {
											val2.check = true;
											break;
										}
									}
								}
							}
							// 查询根节点的只有两种情况 初次进入和路径回退
							// 只有一级 所以长度为2即路径回退
							if (this.stru_path.length == 2) {
								// 删除末尾路径
								this.stru_path.splice(1);
							}
						}
					});
					break;
				case 4:
					// 按校领导查
					if (typeof params == 'number') {
						this.page_num = params1;
					} else {
						this.page_num = 1;
					}
					body.pageNum = this.page_num;
					body.condition.targePostId = '1760866129790783490';
					if (this.search) {
						body.keyword = this.search;
					}
					this.request('post', get_job_user_url, this.token, body, ({ data: res }) => {
						this.list1 = [];
						this.list2 = [];
						if (res.head.code !== 200 || !res.data.data) {
							return;
						}
						this.total_person = res.data.total;
						for (let val of res.data.data) {
							let t = {
								name: val.nickname,
								id: val.id,
								check: false,
								type: 'person', //不同类型显示样式不同
							};
							this.list2.push(t);
						}
						for (let val of this.list2) {
							for (let val2 of this.select_list) {
								if (val.id === val2.id) {
									val.check = true;
									break;
								}
							}
						}
					});
					break;
			}
		},
		// 路径回退
		path_back(obj, index) {
			// 如果是当前展示的组织 则不能再查
			if (index != this.stru_path.length - 1) {
				switch (this.type) {
					case 1:
						// 按架构查
						this.get_data(obj, index);
						break;
					case 3:
						// 按岗位查
						this.get_data();
						break;
				}
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
		// 根据父页面显示不同内容
		prePage_show() {
			this.type_ban = false;
			switch (this.prePage) {
				case 'leader':
					// 如果是校领导则只显示列表
					this.type = 4;
					// this.get_data();
					break;
				case 'myDep':
					this.type = 1;
					this.type_ban = true;
					break;
				default:
					this.type = 1;
					break;
			}
		},
	},
});
