let url = `${我是接口地址}/`;
let roles_list_url = `${url}api-user/roles/users/assignable`; // 根据角色id查询可分配列表
let dep_list_url = `${url}api-user/department/users/assignable`; // 根据部门id查询可分配列表
let remove_dup_url = `${url}api-user/department/deptUsers/distinct`; //用户去重
let role_user_url = `${url}api-user/roles`; //管理给角色分配用户
let dep_user_url = `${url}api-user/department`; //管理给部门分配用户
let all_user_url = `${url}api-user/users/nickName`; //分页查询用户列表
let all_layer_url = `${url}api-user/department/getSubDeptAndCurrentDeptUser`; //获取层级列表

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		form: {
			search: '', // 搜索框
			list1: [], // 组织数组
			list2: [], // 人员数组
			stru_path: [], //组织结构路径 存储名字和索引id
			select_list: [], //勾选的组织及人员列表
			cur_path_id: '', //当前路径
			page_size: 20,
			total_person: 0,
			option_select: 0, //按xxx搜索
			cur_page: 1,
		},
		html: {
			page_loading: false,
		},
		theme: '',
	},
	mounted() {
		this.get_token();
		if (this.theme === 'light') {
			let dom = document.getElementsByTagName('link');
			dom[0].href = '../module/element-ui.css';
		}
		// 监听调用页面传入数据 用于回显
		window.onmessage = (data) => {
			console.log('父页面消息', data);
			this.form.option_select = 0;
			this.form.search = '';
			if (Array.isArray(data?.data)) {
				this.form.select_list = data.data;
			}
		};
	},
	methods: {
		// 获取组织列表
		get_person_data(index, params, params2) {
			this.html.page_loading = true;
			if (index == 1) {
				// 如果是从主页进来清空搜索栏
				if (!this.form.option_select) {
					this.form.search = '';
				}
				// 按人员
				let page;
				if (typeof params == 'number') {
					page = params;
				} else {
					page = 1;
				}
				let c;
				if (this.router === 'role_add_user') {
					// 角色分配入口
					url = `${roles_list_url}/list`;
					c = { targetRoleId: this.id };
				} else if (this.router === 'department_add_user') {
					// 部门分配入口
					url = `${dep_list_url}/list`;
					c = { targetDeptId: this.id };
				} else if (this.router === 'search_user') {
					// 没有this.id普通查询
					url = all_user_url;
					c = {};
				}
				this.form.cur_page = page;
				this.request('post', url, this.token, { pageNum: page, pageSize: this.form.page_size, condition: c, keyword: this.form.search }, (res) => {
					console.log('检索结果', res);
					this.html.page_loading = false;
					if (res.data.head.code != 200 || !Array.isArray(res.data.data.data)) {
						this.$message.error('请求异常');
						return;
					}
					this.form.option_select = index;
					let data = res.data.data;
					this.form.total_person = data.total;
					this.form.list2 = [];
					for (let val of data.data) {
						let t = {
							name: val.username,
							id: val.id,
							check: false,
							type: 'person', //不同类型显示样式不同
						};
						this.form.list2.push(t);
					}
					for (let val of this.form.list2) {
						for (let val2 of this.form.select_list) {
							if (val.id === val2.id) {
								val.check = true;
								break;
							}
						}
					}
				});
			} else {
				// 每次搜索清空搜索栏
				this.form.search = '';
				// 按组织架构
				let id;
				let page;
				if (typeof params == 'object') {
					// 点下级时
					id = params.id;
					page = 1;
				} else if (typeof params == 'number') {
					// 同一组织下 切页
					id = this.form.stru_path[this.form.stru_path.length - 1].id;
					page = params;
				} else {
					// 刚进入页面时
					id = 1;
					this.form.stru_path = [{ name: '总公司', id: 1 }];
					page = 1;
				}
				let c;
				if (this.router === 'role_add_user') {
					url = roles_list_url;
					c = { targetRoleId: this.id, currentDeptId: id };
				} else if (this.router === 'department_add_user') {
					url = dep_list_url;
					c = { targetDeptId: this.id, currentDeptId: id };
				} else if (this.router === 'search_user') {
					url = all_layer_url;
					c = { currentDeptId: id };
				}
				this.form.cur_page = page;
				this.request('post', url, this.token, { pageNum: page, pageSize: this.form.page_size, condition: c }, (res) => {
					console.log('检索结果', res);
					this.html.page_loading = false;
					if (res.data.head.code != 200) {
						return;
					}
					this.form.option_select = index;
					this.form.cur_path_id = id;
					let data = res.data.data;
					this.form.list1 = [];
					for (let val of data.sysDeptVOList) {
						let t = {
							name: val.deptName,
							id: val.deptId,
							check: false,
							type: 'stru',
						};
						this.form.list1.push(t);
					}
					this.form.list2 = [];
					if (data.userPageResult.data) {
						for (let val of data.userPageResult.data) {
							let t = {
								name: val.username,
								id: val.id,
								check: false,
								type: 'person',
							};
							this.form.list2.push(t);
						}
					}
					for (let val of this.form.select_list) {
						if (val.type === 'stru') {
							for (let val2 of this.form.list1) {
								if (val.id === val2.id) {
									val2.check = true;
									break;
								}
							}
						} else {
							for (let val2 of this.form.list2) {
								if (val.id === val2.id) {
									val2.check = true;
									break;
								}
							}
						}
					}
					// 判断是路径回退还是下级
					if (typeof params2 === 'number') {
						this.form.stru_path.splice(params2 + 1);
					} else {
						if (id !== 1 && typeof params !== 'number') {
							// 不是根节点 并且 不是切页时执行
							this.form.stru_path.push(params);
						}
					}
					this.form.total_person = data.userPageResult.total; // 只分人员的页
					// 备份 清空搜索栏时恢复数据 重新搜索时以备份数据检索
					this.dep_backup = [JSON.parse(JSON.stringify(this.form.list1)), JSON.parse(JSON.stringify(this.form.list2))];
				});
			}
		},
		// 路径回退
		path_back(obj, index) {
			// 如果是当前展示的组织 则不能再查
			if (this.form.cur_path_id !== obj.id) {
				this.get_person_data(2, obj, index);
			}
		},
		// 勾选或取消勾选人员和组织
		select_person(obj) {
			if (obj.check) {
				for (let index = 0; index < this.form.select_list.length; index++) {
					if (this.form.select_list[index].id === obj.id) {
						this.form.select_list.splice(index, 1);
						break;
					}
				}
			} else {
				this.form.select_list.push(obj);
			}
			obj.check = !obj.check;
		},
		// 删除勾选的组织或人员
		del_select(index) {
			if (this.form.option_select == 1) {
				for (let val of this.form.list2) {
					if (val.id === this.form.select_list[index].id) {
						val.check = false;
						break;
					}
				}
			} else if (this.form.option_select == 2) {
				let find = false;
				for (let val of this.form.list1) {
					if (val.id === this.form.select_list[index].id) {
						val.check = false;
						find = true;
						break;
					}
				}
				if (!find) {
					for (let val of this.form.list2) {
						if (val.id === this.form.select_list[index].id) {
							val.check = false;
							break;
						}
					}
				}
			}
			this.form.select_list.splice(index, 1);
		},
		// 向父页面发送消息关闭弹窗
		close_window(params) {
			window.parent.postMessage({ type: 'Close popup', msg: params ? params : '' });
		},
		// 参会人员提交
		add_person_sub() {
			// 张工的页面要去重返回结果 我的页面只返回原始数据
			if (this.router === 'search_user') {
				window.parent.postMessage(this.form.select_list);
				this.close_window();
				return;
			}
			this.html.page_loading = true;
			let dep = [];
			let user = [];
			for (let val of this.form.select_list) {
				if (val.type === 'person') {
					let t = {
						id: val.id,
						username: val.name,
					};
					user.push(t);
				} else {
					let t = {
						deptId: val.id,
						deptName: val.name,
					};
					dep.push(t);
				}
			}
			this.request('post', remove_dup_url, this.token, { sysDeptVOList: dep, sysUserVOList: user }, (res) => {
				console.log('去重结果', res);
				if (res.data.head.code != 200) {
					this.$message('去重失败');
					return;
				}
				let list = [];
				for (let val of res.data.data) {
					list.push(val.id);
				}
				let url;
				let jump;
				if (this.router === 'role_add_user') {
					url = role_user_url;
					jump = '角色管理';
				} else if (this.router === 'department_add_user') {
					url = dep_user_url;
					jump = '部门管理';
				}
				// else if (this.router === 'search_user') {
				// 	window.parent.postMessage(res.data.data);
				// 	this.close_window();
				// 	return;
				// }
				this.request('put', `${url}/${this.id}/users`, this.token, list, (res) => {
					this.html.page_loading = false;
					if (res.data.head.code != 200) {
						this.$message.error('绑定失败');
						return;
					}
					this.close_window('绑定成功');
					window.parent.postMessage({ type: 'jump', name: jump });
				});
			});
		},
		// 主题色
		theme_color(type) {
			switch (type) {
				case 'font':
					return {
						color: this.theme == 'light' ? '' : '#fff',
					};
				case 'icon_bg':
					return {
						background: this.theme == 'light' ? 'rgba(105,105,105,0.2)' : '',
					};
			}
		},
		// 根据当前打开的类型搜索
		type_search() {
			switch (this.form.option_select) {
				case 1:
					this.get_person_data(1);
					break;
				case 2:
					if (this.form.search) {
						// 按部门检索时只过滤当前层级下列表
						this.form.list1 = this.dep_backup[0].filter((val) => val.name.indexOf(this.form.search) !== -1);
						this.form.list2 = this.dep_backup[1].filter((val) => val.name.indexOf(this.form.search) !== -1);
					} else {
						this.form.list1 = this.dep_backup[0];
					}
					break;
			}
		},
	},
});
