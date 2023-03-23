let url = `${我是接口地址}/`;
let roles_list_url = `${url}api-user/roles/users/assignable`;
let dep_list_url = `${url}api-user/department/users/assignable`;
let remove_dup_url = `${url}api-portal/user/distinct`;
let role_user_url = `${url}api-user/roles`;
let dep_user_url = `${url}api-user/department`;

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		form: {
			search: '', // 搜索框
			list1: [], // 组织数组
			list2: [], // 人员数组
			list3: [], //纯人员列表
			stru_path: [], //组织结构路径 存储名字和索引id
			select_list: [], //勾选的组织及人员列表
			cur_path_id: '', //当前路径
			page_size: 20,
			total_person: 0,
			option_select: 0, //按xxx搜索
		},
		html: {
			page_loading: false,
		},
	},
	mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
			this.id = sessionStorage.id; //角色id
			this.router = sessionStorage.router;
		} else {
			this.get_token();
		}
		// this.get_person_data();
	},
	methods: {
		// 获取组织列表
		get_person_data(index, params) {
			this.html.page_loading = true;
			if (index == 1) {
				let page;
				if (typeof params == 'number') {
					page = params;
				} else {
					page = 1;
				}
				let c;
				if (this.router === 'role_add_user') {
					url = `${roles_list_url}/list`;
					c = { targetRoleId: this.id };
				} else if (this.router === 'department_add_user') {
					url = `${dep_list_url}/list`;
					c = { targetDeptId: this.id };
				}
				this.request('post', url, this.token, { pageNum: page, pageSize: this.form.page_size, condition: c, keyword: this.form.search }, (res) => {
					console.log('检索结果', res);
					this.html.page_loading = false;
					if (res.data.head.code != 200) {
						return;
					}
					this.form.option_select = index;
					let data = res.data.data;
					this.form.total_person = data.total;
					this.form.list3 = [];
					for (let val of data.data) {
						let t = {
							name: val.username,
							id: val.id,
							check: false,
							type: 'person', //不同类型显示样式不同
						};
						this.form.list3.push(t);
					}
					for (let val of this.form.list3) {
						for (let val2 of this.form.select_list) {
							if (val.id === val2.id) {
								val.check = true;
								break;
							}
						}
					}
				});
			} else {
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
				}
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
						let find = false;
						// 勾选列表是公用的 如果在部门列表中找到了 就break 否则去人员列表查
						for (let val2 of this.form.list1) {
							if (val.id === val2.id) {
								find = true;
								val.check = true;
								break;
							}
						}
						if (!find) {
							for (let val2 of this.form.list2) {
								if (val.id === val2.id) {
									find = true;
									val.check = true;
									break;
								}
							}
						}
					}
					if (id !== 1 && typeof params !== 'number') {
						// 不是根节点 并且 不是切页时执行
						this.form.stru_path.push(params);
					}
					this.form.total_person = data.userPageResult.total; // 只分人员的页
				});
			}
		},
		// 路径回退
		path_back(obj, index) {
			// 如果是当前展示的组织 则不能再查
			if (this.form.cur_path_id !== obj.id) {
				this.html.page_loading = true;
				let c;
				if (this.router === 'role_add_user') {
					url = roles_list_url;
					c = { targetRoleId: this.id, currentDeptId: obj.id };
				} else if (this.router === 'department_add_user') {
					url = dep_list_url;
					c = { targetDeptId: this.id, currentDeptId: obj.id };
				}
				this.request('post', url, this.token, { pageNum: 1, pageSize: this.form.page_size, condition: c }, (res) => {
					console.log('检索结果', res);
					this.html.page_loading = false;
					if (res.data.head.code != 200) {
						return;
					}
					this.form.stru_path.splice(index + 1);
					this.form.cur_path_id = obj.id;
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
						let find = false;
						// 勾选列表是公用的 如果在部门列表中找到了 就break 否则去人员列表查
						for (let val2 of this.form.list1) {
							if (val.id === val2.id) {
								find = true;
								val.check = true;
								break;
							}
						}
						if (!find) {
							for (let val2 of this.form.list2) {
								if (val.id === val2.id) {
									find = true;
									val.check = true;
									break;
								}
							}
						}
					}
					this.form.total_person = data.userPageResult.total; // 只分人员的页
				});
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
			for (let val of this.form.select_list) {
				let find = false;
				// 勾选列表是公用的 如果在部门列表中找到了 就break 否则去人员列表查
				for (let val2 of this.form.list1) {
					if (val.id === val2.id) {
						find = true;
						val.check = false;
						break;
					}
				}
				if (!find) {
					for (let val2 of this.form.list2) {
						if (val.id === val2.id) {
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
	},
});
