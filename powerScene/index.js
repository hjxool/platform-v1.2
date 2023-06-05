let url = `${我是接口地址}/`;
let scene_list_url = `${url}api-portal/scene-rule/search`;
let place_device_url = `${url}api-portal/place/user/findPlaceDevice`;
let device_server_url = `${url}api-device/protocol/current/services/types`;
let update_scene_url = `${url}api-portal/scene-rule/saveOrUpdate`;
let open_scene_url = `${url}api-portal/scene-rule/start`;
let end_scene_url = `${url}api-portal/scene-rule/stop`;
let ex_scene_url = `${url}api-portal/scene-rule/execute`;
let del_scene_url = `${url}api-portal/scene-rule/delete`;

Vue.config.productionTip = false;
new Vue({
	el: '#index',
	mixins: [common_functions],
	components: {
		selector,
		selector2,
		order_control_relay,
	},
	data: {
		html: {
			select: 1, //显示内容选择
			// options: ['推荐', '自定义'],
			edit_scene_display: false, //新建/编辑场景弹窗
			set_config_display: false, //配置按钮弹窗
			week: [
				{ label: '周一', value: 2 },
				{ label: '周二', value: 3 },
				{ label: '周三', value: 4 },
				{ label: '周四', value: 5 },
				{ label: '周五', value: 6 },
				{ label: '周六', value: 7 },
				{ label: '周天', value: 1 },
			],
			page_loading: false, //页面加载
			popup_loading: false, //弹窗加载
			page_size: 10, //一页最多显示条数显示
			scene_type: ['手动场景', '自动场景', '条件场景'],
			scene_type_select: 0, //0自动 1手动 2条件
		},
		edit_scene_form: {
			name: '', //场景名
			method: 1, // 执行方式
			condition: 0, //选择的条件类型
			start_time: '', //开始日期
			end_time: '', //结束日期
			ex_time: '', //执行时间
			cycle_time: [], //执行周期
			isIndeterminate: false, //全选样式控制
			checkAll: false, //全选
			search: '', //搜索设备
			place_id: '', //展开的场所
			device_list: [], //场所设备列表
			time_unit: 12, //10小时 12分钟 13秒 14毫秒
			pre_after_time: 0, //开始前多长时间
		},
		edit_scene_rule: {
			name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
			start_time: [{ type: 'date', required: true, message: '请选择时间', trigger: 'change' }],
			end_time: [{ type: 'date', required: true, message: '请选择时间', trigger: 'change' }],
			ex_time: [{ type: 'date', required: true, message: '请选择时间', trigger: 'change' }],
			cycle_time: [{ required: true, message: '请选择执行周期', trigger: 'change' }],
			devices_selected: { show: false, message: '至少勾选一台设备' },
		},
		edit_server_form: {
			order: '', //设备执行顺序
			list: [], //深拷贝设备服务列表 用于表单操作并不影响原数据
			isIndeterminate: false,
			checkAll: false,
		},
		edit_server_rule: {
			order: [{ required: true, message: '请输入执行顺序', trigger: 'blur' }],
			list: { show: false, message: '至少选择一个服务' },
		},
		scene_list: [], //场景列表
		place_id: -1, // 场所id
		total_size: 0, //总条数
	},
	mounted() {
		if (!location.search) {
			this.token = window.sessionStorage.token;
		} else {
			this.get_token();
		}
		this.switch_options(1);
	},
	methods: {
		// 切换显示推荐、自定义
		switch_options(index) {
			this.html.select = index;
			if (index == 1) {
				this.change_scene_type(0);
			}
		},
		// 切换场景列表类型
		change_scene_type(index) {
			this.html.scene_type_select = index;
			this.get_scene_list(1);
		},
		// 获取场景列表
		get_scene_list(current_page) {
			this.html.page_loading = true;
			this.request('post', scene_list_url, this.token, { condition: { sceneType: this.html.scene_type_select + 1 }, pageNum: current_page, pageSize: this.html.page_size }, (res) => {
				console.log('场景列表', res);
				this.html.page_loading = false;
				let data = res.data.data.data;
				if (data == null || data.length == 0) {
					this.$message('无场景数据');
					return;
				}
				this.total_size = res.data.data.total;
				this.scene_list = data;
			});
		},
		// 获取用户可见所有场所及设备
		get_place_device(input) {
			let data = {};
			if (typeof input == 'string') {
				data.keyword = input;
			}
			this.html.popup_loading = true;
			this.request('post', place_device_url, this.token, data, (res) => {
				console.log('场所及设备', res);
				this.html.popup_loading = false;
				let data = res.data.data;
				if (data == null || data.length == 0) {
					return;
				}
				this.place_device_list_length = 0; // 记录下设备数量
				for (let val of data) {
					val.isIndeterminate = false; // 添加check属性
					val.checkAll = false; // 添加check属性
					for (let val2 of val.devices) {
						this.place_device_list_length++;
						val2.check = false; // 添加check属性
						val2.server_config = []; // 添加配置属性
						val2.ex_order = ''; // 添加执行顺序属性
					}
				}
				// 初始化设备列表
				this.edit_scene_form.device_list = data; // 因为每次点击编辑场景都会重新请求回来数据 所以不影响原数据 无需深拷贝
				if (this.add_edit == 'edit') {
					// 拷贝一份原数据后检索场景携带的设备 勾选拷贝的设备列表
					let count = 0;
					// 如果是全部设备列表则正常计数 如果是筛选列表 则比对上的设备才计数
					if (!input) {
						// 遍历勾选设备列表
						for (let device of this.scene_devices) {
							count++;
							for (let val of this.edit_scene_form.device_list) {
								let find = false;
								for (let val2 of val.devices) {
									// 找到对应设备id后取值进行下一次循环
									if (device.deviceId == val2.id) {
										find = true;
										val2.check = true;
										if (device.serviceInputParamList) {
											for (let val of device.serviceInputParamList) {
												let t = { identifier: val.serviceIdentifier, input: JSON.stringify(val.serviceInputParam), check: true };
												val2.server_config.push(t);
											}
										}
										val2.ex_order = device.executeOrder;
										break;
									}
								}
								if (find) {
									// 找到对应设备才跳出循环
									break;
								}
							}
						}
					} else {
						for (let device of this.scene_devices) {
							for (let val of this.edit_scene_form.device_list) {
								let find = false;
								for (let val2 of val.devices) {
									// 找到对应设备id后取值进行下一次循环
									if (device.deviceId == val2.id) {
										count++;
										find = true;
										val2.check = true;
										if (device.serviceInputParamList) {
											for (let val of device.serviceInputParamList) {
												let t = { identifier: val.serviceIdentifier, input: JSON.stringify(val.serviceInputParam), check: true };
												val2.server_config.push(t);
											}
										}
										val2.ex_order = device.executeOrder;
										break;
									}
								}
								if (find) {
									// 找到对应设备才跳出循环
									break;
								}
							}
						}
					}
					this.edit_scene_form.checkAll = count == this.place_device_list_length;
					this.edit_scene_form.isIndeterminate = count > 0 && count < this.place_device_list_length;
					// 回显设备都勾选上后 再遍历计算每个场所下设备勾选数
					for (let val of this.edit_scene_form.device_list) {
						let count2 = 0; //勾选设备数
						let count3 = 0; //场所设备总数
						for (let val2 of val.devices) {
							count3++;
							if (val2.check) {
								count2++;
							}
						}
						// 当前场所统计完后计算全选状态
						if (count3) {
							val.checkAll = count2 == count3;
							val.isIndeterminate = count2 > 0 && count2 < count3;
						} else {
							val.checkAll = val.isIndeterminate = false;
						}
					}
				}
			});
		},
		// 初始化场景表单参数
		add_scene() {
			this.add_edit = 'add';
			// 初始化表单
			for (let key in this.edit_scene_form) {
				if (typeof this.edit_scene_form[key] == 'string') {
					this.edit_scene_form[key] = '';
				} else if (typeof this.edit_scene_form[key] == 'number') {
					this.edit_scene_form[key] = 1;
				} else if (typeof this.edit_scene_form[key] == 'boolean') {
					this.edit_scene_form[key] = false;
				} else {
					if (this.edit_scene_form[key].constructor == Date) {
						this.edit_scene_form[key] = '';
					} else if (this.edit_scene_form[key].constructor == Array) {
						this.edit_scene_form[key] = [];
					}
				}
			}
			this.edit_scene_form.time_unit = 12;
			this.edit_scene_form.condition = 0;
			this.html.edit_scene_display = true;
			this.get_place_device();
		},
		// 编辑场景赋值参数
		edit_scene(scene_obj) {
			this.add_edit = 'edit';
			this.edit_scene_form.rule_id = scene_obj.id;
			this.edit_scene_form.name = scene_obj.sceneName;
			this.edit_scene_form.method = scene_obj.sceneType;
			if (scene_obj.sceneType == 2) {
				this.edit_scene_form.start_time = new Date(scene_obj.planDatetimeStart);
				this.edit_scene_form.end_time = new Date(scene_obj.planDatetimeEnd);
				this.edit_scene_form.ex_time = new Date(`2020-1-1 ${scene_obj.executeTime}`);
				this.edit_scene_form.cycle_time = JSON.parse(scene_obj.executePeriodDays || '[]');
			} else if (scene_obj.sceneType == 3) {
				this.edit_scene_form.time_unit = scene_obj.sceneConditionParamVOS[0].triggerEvenTimeUnit;
				if (scene_obj.sceneConditionParamVOS[0].preTriggerEventTime) {
					this.edit_scene_form.condition = 0;
					this.edit_scene_form.pre_after_time = scene_obj.sceneConditionParamVOS[0].preTriggerEventTime;
				} else {
					this.edit_scene_form.condition = 1;
					this.edit_scene_form.pre_after_time = scene_obj.sceneConditionParamVOS[0].afterTriggerEventTime;
				}
			}
			this.edit_scene_form.search = '';
			this.edit_scene_form.place_id = '';
			this.edit_scene_form.device_list = [];
			this.scene_devices = scene_obj.sceneDevicesVOList; // 记录所编辑的场景携带的设备
			this.get_place_device();
			this.html.edit_scene_display = true;
		},
		// 点击全选按钮
		scene_form_check_all(value) {
			this.edit_scene_form.isIndeterminate = false;
			for (let val of this.edit_scene_form.device_list) {
				val.checkAll = value;
				val.isIndeterminate = false;
				for (let val2 of val.devices) {
					val2.check = value;
				}
			}
		},
		// 勾选/取消全部场所下设备
		place_device_check_all(value, place_obj) {
			place_obj.isIndeterminate = false;
			if (place_obj.devices.length == 0) {
				place_obj.checkAll = false;
				return;
			}
			for (let val of place_obj.devices) {
				val.check = value;
			}
			this.scene_form_check(); //传空只会进行统计
		},
		// 点击单个设备
		scene_form_check(device_obj, place_obj) {
			if (device_obj) {
				device_obj.check = !device_obj.check;
			}
			// 统计总数
			let count = 0;
			for (let val of this.edit_scene_form.device_list) {
				for (let val2 of val.devices) {
					if (val2.check) {
						count++;
					}
				}
			}
			this.edit_scene_form.checkAll = count == this.place_device_list_length;
			this.edit_scene_form.isIndeterminate = count > 0 && count < this.place_device_list_length;
			// 单选时才统计场所设备
			if (place_obj) {
				let count2 = 0,
					count3 = 0;
				for (let val of place_obj.devices) {
					count3++;
					if (val.check) {
						count2++;
					}
				}
				place_obj.checkAll = count2 == count3;
				place_obj.isIndeterminate = count2 > 0 && count2 < count3;
			}
		},
		server_form_check_all(value) {
			this.edit_server_form.isIndeterminate = false;
			if (value) {
				for (let val of this.edit_server_form.list) {
					val.check = true;
				}
			} else {
				for (let val of this.edit_server_form.list) {
					val.check = false;
				}
			}
		},
		server_form_check(server_obj) {
			server_obj.check = !server_obj.check;
			let count = 0;
			for (let val of this.edit_server_form.list) {
				if (val.check) {
					count++;
				}
			}
			this.edit_server_form.checkAll = count == this.server_list_length;
			this.edit_server_form.isIndeterminate = count > 0 && count < this.server_list_length;
		},
		// 点击场所 展开和折叠
		click_place(place_obj) {
			if (this.place_id == place_obj.id) {
				this.place_id = -1;
			} else {
				this.place_id = place_obj.id;
			}
		},
		// 显示配置弹窗 添加响应式数据
		set_config(device_obj) {
			this.edit_server_form.order = device_obj.ex_order;
			this.html.set_config_display = false;
			this.request('post', `${device_server_url}/${device_obj.productId}/${device_obj.id}`, this.token, [3], (res) => {
				console.log('设备服务列表', res);
				if (res.data.head.code !== 200 || res.data.data == null || res.data.data.length == 0) {
					this.$message('设备下无服务可选');
					return;
				}
				this.html.set_config_display = true;
				this.edit_server_form.product_id = device_obj.productId; // 记录下所选设备属于哪个产品 从而条件渲染
				this.handle_device = device_obj; // 记录下正在操作的设备 修改其下的对象地址
				// 对残缺的数组元素进行构造 并且因为要编辑数组元素 所以为了取消时不影响 要深拷贝一份来编辑
				this.server_list_length = res.data.data.length; // 记录下服务列表总长 用于单选服务时判断全选渲染
				for (let val of res.data.data) {
					let find = false;
					for (let val2 of device_obj.server_config) {
						// 这里只能说明自身属性上已有的服务 并不能说明是勾选了
						if (val.identifier == val2.identifier) {
							find = true;
							if (this.add_edit == 'edit' && val2.name == undefined) {
								this.$set(val2, 'name', val.name);
							}
						}
					}
					if (!find) {
						// 编辑过一次以后，只有不匹配的才新建
						let t = { name: val.name, identifier: val.identifier, input: JSON.stringify(''), check: false }; //用于组件的input只能是JSON字符串 哪怕是空的
						device_obj.server_config.push(t);
					}
				}
				let count = 0;
				for (let val of device_obj.server_config) {
					if (val.check) {
						count++;
					}
				}
				this.edit_server_form.checkAll = count == this.server_list_length;
				this.edit_server_form.isIndeterminate = count > 0 && count < this.server_list_length;
				this.edit_server_form.list = JSON.parse(JSON.stringify(device_obj.server_config));
			});
		},
		// 服务配置弹窗保存
		server_config_sub() {
			this.$refs.server_form.validate((result) => {
				let result2 = false;
				for (let val of this.edit_server_form.list) {
					if (val.check) {
						// JSON字符串最小长度为2
						result2 = true;
						break;
					}
				}
				this.edit_server_rule.list.show = !result2;
				if (result && result2) {
					this.handle_device.server_config = this.edit_server_form.list; //在这里是将正在编辑的数组地址值赋给了深拷贝的设备列表中的设备对象的属性
					this.handle_device.ex_order = this.edit_server_form.order;
					this.html.set_config_display = false;
				}
			});
		},
		// 场景保存提交
		scene_sub() {
			this.$refs.scene_form.validate((result) => {
				let result2 = false;
				for (let val of this.edit_scene_form.device_list) {
					for (let val2 of val.devices) {
						if (val2.check) {
							result2 = true;
							if (val2.ex_order.length == 0) {
								// 执行顺序为空就说明未点进去配置
								this.edit_scene_rule.devices_selected.show = true;
								this.edit_scene_rule.devices_selected.message = '所选设备必须配置参数';
								return;
							}
						}
					}
				}
				if (!result2) {
					this.edit_scene_rule.devices_selected.show = true;
					this.edit_scene_rule.devices_selected.message = '至少勾选一台设备';
					return;
				}
				this.edit_scene_rule.devices_selected.show = false;
				if (result && result2) {
					let data = {
						sceneName: this.edit_scene_form.name,
						sceneType: this.edit_scene_form.method,
						sceneDevicesDTOS: [],
					};
					if (this.edit_scene_form.method == 2) {
						let s_t = this.edit_scene_form.start_time;
						data.planDatetimeStart = `${s_t.getFullYear()}-${s_t.getMonth() + 1 < 10 ? '0' + (s_t.getMonth() + 1) : s_t.getMonth() + 1}-${
							s_t.getDate() < 10 ? '0' + s_t.getDate() : s_t.getDate()
						} 00:00:00`;
						let e_t = this.edit_scene_form.end_time;
						data.planDatetimeEnd = `${e_t.getFullYear()}-${e_t.getMonth() + 1 < 10 ? '0' + (e_t.getMonth() + 1) : e_t.getMonth() + 1}-${
							e_t.getDate() < 10 ? '0' + e_t.getDate() : e_t.getDate()
						} 23:59:59`;
						data.executeTime = this.edit_scene_form.ex_time.toString().split(' ')[4];
						data.executePeriodDays = JSON.stringify(this.edit_scene_form.cycle_time);
					} else if (this.edit_scene_form.method == 3) {
						switch (this.edit_scene_form.condition) {
							case 0:
								data.sceneConditionParamDTOS = [{ preTriggerEventTime: this.edit_scene_form.pre_after_time, triggerEvenTimeUnit: this.edit_scene_form.time_unit }];
								break;
							case 1:
								data.sceneConditionParamDTOS = [{ afterTriggerEventTime: this.edit_scene_form.pre_after_time, triggerEvenTimeUnit: this.edit_scene_form.time_unit }];
								break;
						}
					}
					for (let val of this.edit_scene_form.device_list) {
						for (let val2 of val.devices) {
							if (val2.check) {
								let t = {
									deviceId: val2.id,
									deviceName: val2.deviceName,
									executeOrder: val2.ex_order,
									serviceInputParamList: [],
								};
								for (let val3 of val2.server_config) {
									if (val3.check) {
										let t2 = {
											serviceIdentifier: val3.identifier,
											serviceInputParam: JSON.parse(val3.input) || null,
										};
										t.serviceInputParamList.push(t2);
									}
								}
								data.sceneDevicesDTOS.push(t);
							}
						}
					}
					this.html.popup_loading = true;
					if (this.add_edit == 'edit') {
						data.id = this.edit_scene_form.rule_id;
					}
					this.request('post', update_scene_url, this.token, data, (res) => {
						if (res.data.head.code == 200) {
							this.html.edit_scene_display = false;
							this.get_scene_list(1);
						}
						this.html.popup_loading = false;
					});
				}
			});
		},
		// 切换自动场景开关
		switch_scene(scene_obj) {
			if (scene_obj.status == 0) {
				this.request('post', open_scene_url, this.token, [scene_obj.id], (res) => {
					if (res.data.head.code == 200) {
						scene_obj.status = 1;
						this.$message.success('指令下发成功');
					} else {
						this.$message.error('指令下发失败');
						scene_obj.status = 0;
					}
				});
			} else if (scene_obj.status == 1) {
				this.request('post', end_scene_url, this.token, [scene_obj.id], (res) => {
					if (res.data.head.code == 200) {
						scene_obj.status = 0;
						this.$message.success('指令下发成功');
					} else {
						this.$message.error('指令下发失败');
						scene_obj.status = 1;
					}
				});
			}
		},
		// 手动场景执行
		ex_scene(scene_obj) {
			this.request('post', `${ex_scene_url}/${scene_obj.id}`, this.token, (res) => {
				if (res.data.head.code == 200) {
					this.$message.success('执行成功');
				} else {
					this.$message.error('执行失败');
				}
			});
		},
		// 删除场景
		del_scene(scene_obj) {
			this.$confirm(`确认删除场景？`, '提示', {
				confirmButtonText: '确定',
				cancelButtonText: '取消',
				type: 'info',
				center: true,
			}).then(() => {
				this.request('post', del_scene_url, this.token, [scene_obj.id], (res) => {
					if (res.data.head.code == 200) {
						this.$message.success('删除成功');
						this.get_scene_list(1);
					} else {
						this.$message.error('删除失败');
					}
				});
			});
		},
		// 显示场景中勾选的场所下设备
		place_device_text(scene_obj) {
			let list = [];
			for (let i = 0; i < scene_obj.sceneDevicesVOList.length; i++) {
				let t = scene_obj.sceneDevicesVOList[i];
				if (i == 0) {
					let t2 = {
						name: t.placeName,
						devices: [{ name: t.deviceName }],
					};
					list.push(t2);
				} else {
					let find = false;
					for (let val of list) {
						if (t.placeName == val.name) {
							find = true;
							val.devices.push({ name: t.deviceName });
							break;
						}
					}
					if (!find) {
						let t3 = {
							name: t.placeName,
							devices: [{ name: t.deviceName }],
						};
						list.push(t3);
					}
				}
			}
			let text = '';
			let index = 0;
			for (let val of list) {
				if (index == 0) {
					text = `${val.name}:`;
				} else {
					text = `${text} ${val.name}:`;
				}
				let index2 = 1;
				for (let val2 of val.devices) {
					if (index2 == val.devices.length) {
						text = `${text} ${val2.name}`;
					} else {
						text = `${text} ${val2.name},`;
					}
					index2++;
				}
				index++;
			}
			return text;
		},
		// 组件显示与否
		components_show(identifier) {
			switch (this.edit_server_form.product_id) {
				case '1564171104871739392':
					let reg = /(^SEQ\d+SRV$)|(^SEQ[A-Z]SRV$)/;
					if (reg.test(identifier)) {
						return true;
					}
					break;
			}
			return false;
		},
	},
});
