let url = `${我是接口地址}/`;
let place_device_url = `${url}api-portal/place/user/findPlaceDevice`; //场所设备树
let device_server_url = `${url}api-device/protocol/current/services/types`; //根据设备ID和服务类型查询服务列表
let save_scene_url = `${url}api-portal/scene-rule/saveOrUpdate`; // 新增/更新场景

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
			loading: false,
			type_options: [
				{ name: '自动执行', val: 2 },
				{ name: '手动执行', val: 1 },
				{ name: '条件执行', val: 3 },
			],
			weeks: [
				{ name: '周一', val: 1 },
				{ name: '周二', val: 2 },
				{ name: '周三', val: 3 },
				{ name: '周四', val: 4 },
				{ name: '周五', val: 5 },
				{ name: '周六', val: 6 },
				{ name: '周日', val: 7 },
			],
			button_light: [
				{ ban: './img/icon1.png', enable: './img/icon2.png' },
				{ ban: './img/icon3.png', enable: './img/icon4.png' },
				{ ban: './img/icon5.png', enable: './img/icon6.png' },
				{ ban: './img/icon7.png', enable: './img/icon8.png' },
				{ ban: './img/icon9.png', enable: './img/icon10.png' },
			],
			button_dark: [
				{ ban: './img/icon11.png', enable: './img/icon12.png' },
				{ ban: './img/icon13.png', enable: './img/icon14.png' },
				{ ban: './img/icon15.png', enable: './img/icon16.png' },
				{ ban: './img/icon17.png', enable: './img/icon18.png' },
				{ ban: './img/icon19.png', enable: './img/icon20.png' },
			],
			titles: ['服务名称', '设备名称', '场所名称', '参数值', '延迟(秒)'],
			publish_show: false, // 发布任务弹窗
			page_url: '', // 跳转地址
		},
		form: {
			name: '', //场景名
			type: 2, //执行方式 1手动 2自动
			start_time: '', //自动 开始时间
			end_time: '', //自动 结束时间
			ex_time: '', //自动 执行时间
			ex_cycle: [], //自动 执行周期
			servers: [], // 服务列表
			condition_type: 0, //条件类型
			pre_after_time: 0, //开始前后的时间
			time_unit: 13, //时间单位
		},
		rules: {
			name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
			start_time: [{ required: true, message: '请选择日期', trigger: 'change' }],
			end_time: [{ required: true, message: '请选择日期', trigger: 'change' }],
			ex_time: [{ required: true, message: '请选择时间', trigger: 'change' }],
			ex_cycle: [{ type: 'array', required: true, message: '至少选一个', trigger: 'change' }],
			condition_type: [{ required: true, message: '', trigger: 'change' }],
			time_unit: [{ required: true, message: '', trigger: 'change' }],
		},
		theme: '', //主题配色
		devices: {
			show: false, // 弹窗显示
			loading: false, // 加载
			search: '',
			// isIndeterminate: false,
			// checkAll: false,
			list: [], // 场所设备列表
			place_id: '',
		},
		servers: {
			show: false, //弹窗显示
			isIndeterminate: false,
			checkAll: false,
			list: [], // 当前设备所有服务列表
		},
		is_edit: false, // 区分编辑还是新增 控制显示
		delay: {
			show: false,
			list: [], //数组中每个元素表示服务对象 里面有输入和延迟
		},
	},
	beforeMount() {
		window.onmessage = (e) => {
			console.log('页面消息', e);
			if (e?.data?.type === '素材轮播编辑完成') {
				this.html.publish_show = false;
				let d = JSON.parse(window.sessionStorage.play_list_json);
				// 往服务对象身上添加新属性 存json数据
				let d2 = {
					planName: this.form.name,
					pullDeviceIds: [this.server_configing.deviceId],
					publishRuleFiles: [],
				};
				for (let val of d.list) {
					let find = false;
					for (let val2 of d2.publishRuleFiles) {
						if (val.fileId === val2.fileId) {
							find = true; // 只要找到重复的就跳出查下一个
							break;
						}
					}
					if (!find) {
						d2.publishRuleFiles.push(val);
					}
				}
				this.server_configing.serviceInputParam['taskData'] = JSON.stringify(d2);
				window.sessionStorage.removeItem('play_list_json');
			} else {
				let data = JSON.parse(e.data);
				this.is_edit = true;
				this.id = data.id;
				this.form.name = data.sceneName;
				this.form.type = data.sceneType;
				if (this.form.type === 2) {
					this.form.start_time = new Date(data.planDatetimeStart);
					this.form.end_time = new Date(data.planDatetimeEnd);
					// let year = this.form.end_time.split(' ')[0].replace(/-/gi, '/');
					let year = data.planDatetimeEnd.split(' ')[0];
					this.form.ex_time = new Date(`${year} ${data.executeTime}`);
					this.form.ex_cycle = JSON.parse(data.executePeriodDays);
				} else if (this.form.type === 3) {
					let t = data.sceneConditionParamVOS[0];
					this.form.condition_type = t.preTriggerEventTime ? 0 : 1;
					this.form.pre_after_time = t.preTriggerEventTime || t.afterTriggerEventTime;
					this.form.time_unit = t.triggerEvenTimeUnit;
				}
				if (data.deviceCommandVOS) {
					for (let val of data.deviceCommandVOS) {
						val.check = false; //添加勾选属性
					}
					this.form.servers = data.deviceCommandVOS;
				}
			}
		};
	},
	mounted() {
		if (!location.search) {
			this.token = sessionStorage.token;
			this.theme = sessionStorage.theme;
		} else {
			this.get_token();
		}
		if (this.theme) {
			let dom = document.getElementsByTagName('link');
			dom[0].href = `../../css/eleme-dark.css`;
		}
	},
	methods: {
		// 边框配色
		theme_border() {
			return {
				borderColor: this.theme ? '#fff' : '#bcccda',
			};
		},
		// 字体颜色
		theme_font() {
			return {
				color: this.theme ? '#fff' : '#05050B',
			};
		},
		// 背景及边框颜色
		theme_bg_border() {
			return {
				background: this.theme ? '#242632' : '#fff',
				borderColor: this.theme ? '#fff' : '#454C59',
			};
		},
		// 弹窗头部背景色
		theme_pophead() {
			return {
				background: this.theme ? '#53B0FF' : '#53B0FF',
				color: this.theme ? '#fff' : '#05050B',
			};
		},
		// 按钮颜色切换
		button_img(img, index) {
			if (!index) {
				// 第一个按钮 加号 始终保持点亮的状态
				return img.enable;
			}
			for (let val of this.form.servers) {
				if (val.check) {
					return img.enable;
				}
			}
			return img.ban;
		},
		// 按钮点击样式
		button_style(index) {
			if (!index) {
				return { cursor: 'pointer' };
			}
			for (let val of this.form.servers) {
				if (val.check) {
					return { cursor: 'pointer' };
				}
			}
			return { cursor: 'not-allowed' };
		},
		// 总服务列表 选中服务项
		select_server(obj) {
			obj.check = !obj.check;
		},
		// 单个设备 勾选服务
		select_server2(obj) {
			if (obj) {
				obj.check = !obj.check;
			}
			let scount = 0;
			let scheck = 0;
			for (let val of this.servers.list) {
				scount++;
				if (val.check) {
					scheck++;
				}
			}
			this.servers.checkAll = scount == scheck;
			this.servers.isIndeterminate = scheck > 0 && scheck < scount;
		},
		// 工具栏
		tool(index) {
			switch (index) {
				case 0:
					this.devices.show = true;
					// this.server_selected = []; //总勾选服务列表 回显设备服务
					// this.device_selected = []; //总勾选设备列表 查询设备时回显
					// this.devices.isIndeterminate = false;
					// this.devices.checkAll = false;
					this.get_place_device();
					break;
				case 1:
					let index = 0;
					for (let val of this.form.servers) {
						// 第一项不能往前移 前一项是勾选不能往前移
						if (index && !this.form.servers[index - 1].check && val.check) {
							this.form.servers.splice(index, 1);
							this.form.servers.splice(index - 1, 0, val);
						}
						index++;
					}
					break;
				case 2:
					for (let index = this.form.servers.length - 1; index >= 0; index--) {
						// 最后一项不能下移 后一项勾选不能下移
						if (index < this.form.servers.length - 1 && !this.form.servers[index + 1].check && this.form.servers[index].check) {
							let t = this.form.servers[index];
							this.form.servers.splice(index, 1);
							this.form.servers.splice(index + 1, 0, t);
						}
					}
					break;
				case 3:
					this.delay.show = true;
					this.delay_list = [];
					for (let val of this.form.servers) {
						if (val.check) {
							// 浅拷贝一份服务列表 用于记录勾选项和保持顺序 这样就不需要给服务添加id
							// 重要的是保持顺序！
							this.delay_list.push(val);
						}
					}
					// 再深拷贝一份用于编辑的列表
					this.delay.list = JSON.parse(JSON.stringify(this.delay_list));
					break;
				case 4:
					for (let index = 0; index < this.form.servers.length; index++) {
						// 如果是勾选项 删除当前项 并回退一格
						if (this.form.servers[index].check) {
							this.form.servers.splice(index, 1);
							index--;
						}
					}
					break;
			}
		},
		// 关闭场景弹窗
		close() {
			window.parent.postMessage('close_pop');
		},
		// 提交
		submit() {
			this.$refs.form.validate((result) => {
				if (!this.form.servers.length) {
					this.$message.error('必须添加服务');
					return;
				}
				// 总延迟不能超过300秒
				let total_delay = 0;
				for (let val of this.form.servers) {
					total_delay += Number(val.delayExecuteSeconds || 0);
				}
				if (total_delay > 300) {
					this.$message.error('总延迟不能超过300秒！');
					return;
				}
				if (result) {
					let data = {
						sceneName: this.form.name,
						sceneType: this.form.type,
						deviceCommandDTOS: [],
					};
					for (let val of this.form.servers) {
						let t = {
							delayExecuteSeconds: val.delayExecuteSeconds,
							deviceId: val.deviceId,
							inputParamDesc: val.inputParamDesc || null,
							placeId: val.placeId,
							serviceIdentifier: val.serviceIdentifier,
							serviceInputParam: val.serviceInputParam || null,
							serviceName: val.serviceName,
						};
						data.deviceCommandDTOS.push(t);
					}
					if (this.form.type === 2) {
						data.executePeriodDays = JSON.stringify(this.form.ex_cycle);
						data.executeTime = this.form.ex_time.toString().split(' ')[4];
						let t = this.form.end_time;
						data.planDatetimeEnd = `${t.getFullYear()}-${t.getMonth() + 1 < 10 ? '0' + (t.getMonth() + 1) : t.getMonth() + 1}-${t.getDate() > 10 ? t.getDate() : '0' + t.getDate()} 23:59:59`;
						let t2 = this.form.start_time;
						data.planDatetimeStart = `${t2.getFullYear()}-${t2.getMonth() + 1 < 10 ? '0' + (t2.getMonth() + 1) : t2.getMonth() + 1}-${t2.getDate() > 10 ? t2.getDate() : '0' + t2.getDate()} 00:00:00`;
						if (new Date(data.planDatetimeStart).getTime() > new Date(data.planDatetimeEnd).getTime()) {
							this.$message.error('开始日期不能大于结束日期');
							return;
						}
					} else if (this.form.type === 3) {
						data.sceneConditionParamDTOS = [{ triggerType: 1, triggerEvenTimeUnit: this.form.time_unit }];
						switch (this.form.condition_type) {
							case 0:
								data.sceneConditionParamDTOS[0].preTriggerEventTime = this.form.pre_after_time;
								break;
							case 1:
								data.sceneConditionParamDTOS[0].afterTriggerEventTime = this.form.pre_after_time;
								break;
						}
					}
					if (this.id) {
						data.id = this.id;
					}
					this.html.loading = true;
					this.request('post', save_scene_url, this.token, data, (res) => {
						this.html.loading = false;
						if (res.data.head.code !== 200) {
							return;
						}
						window.parent.postMessage('success');
						this.close();
					});
				}
			});
		},
		// 场所设备弹窗提交 只将勾选了设备的服务添加到外层列表展示
		//#region
		// device_submit() {
		// 	let add = [];
		// 	for (let val of this.server_selected) {
		// 		for (let val2 of this.device_selected) {
		// 			if (val.deviceId === val2.id) {
		// 				val.check = false; //清除服务勾选 避免影响外层显示
		// 				add.push(val);
		// 				break;
		// 			}
		// 		}
		// 	}
		// 	if (!add.length) {
		// 		this.$message.error('必须勾选设备和服务！');
		// 		return;
		// 	}
		// 	this.form.servers.push(...add);
		// 	this.devices.show = false;
		// },
		//#endregion
		// 服务列表提交 将勾选项添加到总勾选服务列表
		server_submit() {
			let result = false;
			for (let val of this.servers.list) {
				if (val.check) {
					result = true;
					break;
				}
			}
			if (!result) {
				this.$message.error('至少勾选一个服务！');
				return;
			}
			//#region
			// for (let val of this.servers.list) {
			// 	if (val.check) {
			// 		let find = false;
			// 		for (let val2 of this.server_selected) {
			// 			// 设备想同 标识符相同就认为是同一个
			// 			if (val.deviceId === val2.deviceId && val.serviceIdentifier === val2.serviceIdentifier) {
			// 				find = true;
			// 				break;
			// 			}
			// 		}
			// 		if (!find) {
			// 			this.server_selected.push(val);
			// 		}
			// 	} else {
			// 		let index = 0;
			// 		for (let val2 of this.server_selected) {
			// 			if (val.deviceId === val2.deviceId && val.serviceIdentifier === val2.serviceIdentifier) {
			// 				this.server_selected.splice(index, 1);
			// 				break;
			// 			}
			// 			index++;
			// 		}
			// 	}
			// }
			//#endregion
			for (let val of this.servers.list) {
				if (val.check) {
					val.check = false;
					this.form.servers.push(val);
				}
			}
			this.servers.show = false;
		},
		// 延迟及服务设置保存
		delay_submit() {
			for (let val of this.delay.list) {
				if (isNaN(Number(val.delayExecuteSeconds))) {
					this.$message.error('延迟只能输入数字！');
					return;
				}
				if (Number(val.delayExecuteSeconds) > 30) {
					this.$message.error('延迟最多30！');
					return;
				}
			}
			for (let i = 0; i < this.delay_list.length; i++) {
				// 根据顺序对应取值 不能直接替换对象 因为浅拷贝列表还保留着地址索引
				// 直接替换对象无法修改总列表中的值
				for (let val of Object.entries(this.delay.list[i])) {
					// 第一项是key 第二项是value
					this.delay_list[i][val[0]] = val[1];
				}
			}
			this.delay.show = false;
		},
		// 全选设备
		// device_checkall(value) {
		// 	this.devices.isIndeterminate = false;
		// 	for (let val of this.devices.list) {
		// 		val.checkAll = value;
		// 		val.isIndeterminate = false;
		// 		for (let val2 of val.devices) {
		// 			val2.check = value;
		// 		}
		// 	}
		// },
		// 全选服务
		server_checkall(value) {
			this.servers.isIndeterminate = false;
			for (let val of this.servers.list) {
				val.check = value;
			}
		},
		// 查询场所设备
		get_place_device() {
			this.devices.loading = true;
			this.request('post', place_device_url, this.token, { keyword: this.devices.search }, (res) => {
				this.devices.loading = false;
				console.log('场所设备', res.data);
				if (res.data.head.code !== 200) {
					return;
				}
				let data = res.data.data;
				//#region
				// this.device_total = 0; // 记录下设备数量
				// for (let val of data) {
				// 	val.isIndeterminate = false; // 添加属性
				// 	val.checkAll = false; // 添加属性
				// 	for (let val2 of val.devices) {
				// 		this.device_total++;
				// 		val2.check = false; // 添加属性
				// 		// val2.server_config = []; // 用于保存设备所有服务编辑状态 但如果只记录勾选服务则每次查询设备服务未勾选的数据会重置
				// 	}
				// }
				// 只需要二次点开设备配置时回显之前的输入
				// for (let val of this.server_selected) {
				// 	for (let val2 of data) {
				// 		if (val.placeId === val2.id) {
				// 			// 找到对应场所再找对应设备
				// 			for (let val3 of val2.devices) {
				// 				if (val.deviceId === val3.id) {
				// 					// 找到对应设备修改配置属性
				// 					// 每次查询数据都置空的 可以把服务对象添加进来
				// 					val3.server_config.push(val);
				// 					break;
				// 				}
				// 			}
				// 			break;
				// 		}
				// 	}
				// }
				// if (this.device_selected.length) {
				// 	// 回显设备勾选
				// 	for (let val of this.device_selected) {
				// 		for (let val2 of data) {
				// 			for (let val3 of val2.devices) {
				// 				if (val.id === val3.id) {
				// 					val3.check = true;
				// 					break;
				// 				}
				// 			}
				// 		}
				// 	}
				// 	// 统计
				// 	let dt = 0;
				// 	for (let val of data) {
				// 		let p = 0;
				// 		let d = 0;
				// 		for (let val2 of val.devices) {
				// 			p++;
				// 			if (val2.check) {
				// 				d++;
				// 				dt++;
				// 			}
				// 		}
				// 		// 可能会有场所为空
				// 		if (p) {
				// 			val.checkAll = p === d;
				// 		}
				// 		val.isIndeterminate = d > 0 && d < p;
				// 	}
				// 	this.devices.checkAll = this.device_total === dt;
				// 	this.devices.isIndeterminate = dt > 0 && dt < this.device_total;
				// }
				//#endregion
				this.devices.list = data;
			});
		},
		// 勾选场所下全部设备
		//#region
		// place_check_all(place) {
		// 	place.isIndeterminate = false;
		// 	if (!place.devices.length) {
		// 		place.checkAll = false;
		// 		return;
		// 	}
		// 	for (let val of place.devices) {
		// 		val.check = place.checkAll;
		// 	}
		// 	if (place.checkAll) {
		// 		// 如果全选场所设备
		// 		for (let val of place.devices) {
		// 			let find = false;
		// 			for (let val2 of this.device_selected) {
		// 				if (val.id === val2.id) {
		// 					find = true;
		// 					break;
		// 				}
		// 			}
		// 			if (!find) {
		// 				this.device_selected.push(val);
		// 			}
		// 		}
		// 	}
		// 	// 全选场所设备时不需要统计场所
		// 	this.select_device();
		// },
		//#endregion
		// 勾选单个设备 并统计
		//#region
		// select_device(device, place, type) {
		// 	if (device && !type) {
		// 		device.check = !device.check;
		// 	}
		// 	// device可能是null、undefined、对象
		// 	if (device.check) {
		// 		this.device_selected.push(device);
		// 	} else {
		// 		let index = 0;
		// 		for (let val of this.device_selected) {
		// 			if (val.id === device.id) {
		// 				this.device_selected.splice(index, 1);
		// 				break;
		// 			}
		// 			index++;
		// 		}
		// 	}
		// 	// 统计 场所是否全选
		// 	if (place) {
		// 		let dtotal = 0;
		// 		let dcheck = 0;
		// 		for (let val of place.devices) {
		// 			dtotal++;
		// 			if (val.check) {
		// 				dcheck++;
		// 			}
		// 		}
		// 		place.checkAll = dtotal === dcheck;
		// 		place.isIndeterminate = dcheck > 0 && dcheck < dtotal;
		// 	}
		// 	// 统计 设备是否全选
		// 	let dcheck = 0;
		// 	for (let val of this.devices.list) {
		// 		for (let val2 of val.devices) {
		// 			if (val2.check) {
		// 				dcheck++;
		// 			}
		// 		}
		// 	}
		// 	this.devices.checkAll = dcheck === this.device_total;
		// 	this.devices.isIndeterminate = dcheck > 0 && dcheck < this.device_total;
		// },
		//#endregion
		// 配置按钮
		set_config(device, place) {
			this.devices.loading = true;
			this.servers.checkAll = false;
			this.servers.isIndeterminate = false;
			this.request('post', `${device_server_url}/${device.productId}/${device.id}`, this.token, [3], (res) => {
				this.devices.loading = false;
				console.log('服务列表', res.data);
				if (res.data.head.code !== 200) {
					return;
				}
				if (!res.data.data.length) {
					this.$message('设备无服务');
					return;
				}
				this.servers.show = true;
				for (let val of res.data.data) {
					val.check = false;
					val.delayExecuteSeconds = 0; //默认延迟0
					val.serviceInputParam = ''; //设备打开服务配置回显值
					val.inputParamDesc = ''; //外层显示
					val.deviceName = device.deviceName; //外层显示用
					val.deviceId = device.id; //条件筛选
					val.productId = device.productId; //渲染组件
					val.placeId = place.id; //条件筛选
					val.placeName = place.placeName; //外层显示
					val.serviceIdentifier = val.identifier; //渲染组件
					val.serviceName = val.name; //外层显示
				}
				this.servers.list = res.data.data;
				// 回显 统计
				//#region
				// let scount = 0;
				// for (let val of this.server_selected) {
				// 	for (let val2 of this.servers.list) {
				// 		// 场所设备id相同只能说明勾选服务属于设备总服务列表
				// 		// 还需要唯一标识才能确定修改哪一个的值
				// 		if (val.placeId === val2.placeId && val.deviceId === val2.deviceId && val.serviceIdentifier === val2.serviceIdentifier) {
				// 			scount++;
				// 			val2.serviceInputParam = val.serviceInputParam;
				// 			val2.check = true;
				// 			break;
				// 		}
				// 	}
				// }
				// this.servers.checkAll = this.servers.list.length === scount;
				// this.servers.isIndeterminate = scount > 0 && scount < this.servers.list.length;
				//#endregion
			});
		},
		// 点击展开折叠场所
		select_place(place) {
			this.devices.place_id = this.devices.place_id == place.id ? -1 : place.id;
		},
		// 条件渲染组件
		components_show(identifier, pid, cname) {
			switch (cname) {
				case 'selector':
					if (identifier === 'Relay_Set_State_Service' && pid === '1574321115531005952') {
						return true;
					}
					break;
				case 'order_control_relay':
					if (identifier === 'Accord_Order_TO_Control_Relay_Service' && pid === '1574321115531005952') {
						return true;
					}
					break;
				case 'selector2':
					if (pid === '1564171104871739392') {
						let reg = /(^SEQ\d+SRV$)|(^SEQ[A-Z]SRV$)/;
						if (reg.test(identifier)) {
							return true;
						}
					}
					break;
				case 'config_button':
					if (identifier === 'publishTask' && pid === '1559733901001211904') {
						return true;
					}
					break;
			}
			return false;
		},
		// 跳转其他页面
		turn_to_page(page, ...params) {
			switch (page) {
				case 'publish':
					this.html.publish_show = true;
					this.html.page_url = `../index.html?token=${this.token}&type=playlist_edit&source=all&prePage=scene`;
					let data = {
						name: this.form.name || '默认名称',
						list: [], // 每次点开设备服务都是新的，不回显，因此不需要存值
					};
					window.sessionStorage.play_list_json = JSON.stringify(data);
					// 保留配置的服务对象索引 在配置完后添加属性到对应服务对象上
					this.server_configing = params[0];
					return;
			}
		},
	},
});
