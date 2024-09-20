let url = `${我是接口地址}/`;
let 查询场景列表 = `${url}api-portal/scene-rule/search`;
let 查询场所及设备 = `${url}api-portal/place/user/findPlaceDevice`;
let 编辑场景规则 = `${url}api-portal/scene-rule/saveOrUpdate`;
let 删除场景规则 = `${url}api-portal/scene-rule/delete`;
let 执行场景规则 = `${url}api-portal/scene-rule/execute`;
let 停止场景规则 = `${url}api-portal/scene-rule/stop`;
let 开启场景规则 = `${url}api-portal/scene-rule/start`;
let 分类查询场景配置 = `${url}api-portal/scene/product/config`;

new Vue({
	el: '#index',
	mixins: [common_functions],
	data: {
		// 搜索栏
		search: {
			status: 'all', // 启停状态
			status_ban: true, // 手动场景 禁用状态搜索
			status_options: [
				{ label: '全部', value: 'all' },
				{ label: '启用中', value: 1 },
				{ label: '已停用', value: 0 },
			],
			time_range: [], // 检索范围
			keyword: '', // 搜索
			type: 1, // 场景类型
			type_options: [
				{ label: '手动场景', value: 1 },
				{ label: '自动场景', value: 2 },
				{ label: '条件场景', value: 3 },
			],
			page: {
				cur: 1, // 当前页
				size: 20, // 单页显示数量
				total: 0, // 总页数
			},
		},
		// 列表
		table: {
			h: 0, // 表格最大高度
			data: null, // 表格数据
		},
		loading: false,
		form: {
			show: false, // 表单显示
			loading: false,
			ban: false, // 是否禁用一些组件
			data: {
				name: '', // 场景名
				method: 2, // 执行方式
				date_range: '', // 时间范围
				start_time: '', // 执行时间
				cycle: [], // 执行周期
				condition_type: '', // 条件类型
				condition_time: 0, // 条件时间
				condition_unit: 13, // 条件单位
				threshold: [], // 阈值列表
				servers: [], // 服务列表
			},
			// 执行方式选项
			methods: [
				{ name: '自动执行', val: 2 },
				{ name: '手动执行', val: 1 },
				{ name: '条件执行', val: 3 },
				{ name: '传感器', val: 4 },
			],
			// 执行周期选项
			weeks: [
				{ name: '周一', val: 2 },
				{ name: '周二', val: 3 },
				{ name: '周三', val: 4 },
				{ name: '周四', val: 5 },
				{ name: '周五', val: 6 },
				{ name: '周六', val: 7 },
				{ name: '周日', val: 1 },
			],
			// 条件时间单位
			units: [
				{ name: '秒', val: 13 },
				{ name: '分钟', val: 12 },
				{ name: '小时', val: 10 },
				{ name: '毫秒', val: 14 },
			],
			// 阈值 条件
			operators: [
				{ label: '大于', value: '>' },
				{ label: '小于', value: '<' },
				{ label: '等于', value: '==' },
				{ label: '大于等于', value: '>=' },
				{ label: '小于等于', value: '<=' },
			],
			// 服务列表标题
			titles: ['配置名称', '设备名称', '场所名称'],
			// 传感器列表标题
			threshold_titles: ['设备id', '设备名称', '关联方式'],
			// 服务按钮
			button_light: [
				{ ban: './img/icon1.png', enable: './img/icon2.png' },
				{ ban: './img/icon3.png', enable: './img/icon4.png' },
				{ ban: './img/icon5.png', enable: './img/icon6.png' },
				// { ban: './img/icon7.png', enable: './img/icon8.png' },
				{ ban: './img/icon9.png', enable: './img/icon10.png' },
			],
		},
		devices: {
			show: false,
			list: [],
			loading: false,
			place_id: '', //选中的场所
			event_type: '', // 正在操作的是阈值还是服务
		},
		servers: {
			show: false,
			isIndeterminate: false,
			checkAll: false,
			list: [], // 当前设备所有服务列表
		},
		delay: {
			show: false,
			list: [],
		},
		threshold: {
			show: false,
			select_list: [], // 设置条件可选服务
			list: [], // 条件列表
			is_and: false, // 设备条件全部与/或
		},
	},
	created() {
		this.get_token();
		this.get_scene_list();
	},
	mounted() {
		this.resize();
		window.onresize = () => {
			this.resize();
		};
	},
	methods: {
		// 窗口大小变化
		resize() {
			let dom = document.querySelector('.body');
			this.table.h = dom.clientHeight;
		},
		// 查询场景数据
		async get_scene_list() {
			let body = {
				pageNum: this.search.page.cur,
				pageSize: this.search.page.size,
				condition: {
					sceneType: this.search.type,
				},
			};
			// 选择了时间范围则添加
			if (Array.isArray(this.search.time_range) && this.search.time_range.length) {
				let t1 = this.search.time_range[0];
				body.condition.createdStartTime = `${t1.getFullYear()}-${t1.getMonth() + 1}-${t1.getDate()} 00:00:00`;
				let t2 = this.search.time_range[1];
				body.condition.createdStartTime = `${t1.getFullYear()}-${t1.getMonth() + 1}-${t1.getDate()} 23:59:59`;
			}
			// 选择了状态则添加
			if (this.search.status !== 'all') {
				body.condition.status = this.search.status;
			}
			// 输入了场景名则添加
			if (this.search.keyword) {
				body.condition.sceneName = this.search.keyword;
			}
			this.loading = true;
			// 添加常驻查询参数
			let { data: res } = await this.request('post', 查询场景列表, this.token, body);
			this.loading = false;
			if (res.head.code !== 200) {
				return;
			}
			this.search.page.total = res.data.total;
			if (res.data.data?.length) {
				for (let val of res.data.data) {
					val.excu_list = JSON.parse(val.executePeriodDays);
				}
				this.table.data = res.data.data;
			}
		},
		// 执行周期文字
		excu_text(d) {
			switch (d) {
				case 2:
					return '周一';
				case 3:
					return '周二';
				case 4:
					return '周三';
				case 5:
					return '周四';
				case 6:
					return '周五';
				case 7:
					return '周六';
				case 1:
					return '周日';
			}
		},
		// 条件场景类型文字
		conditiom_text(data) {
			if (!data) {
				return '';
			}
			let pre = '';
			let time = '';
			let unit = '';
			if (data[0].preTriggerEventTime) {
				pre = '场所活动开始前';
				time = data[0].preTriggerEventTime;
			} else if (data[0].afterTriggerEventTime) {
				pre = '场所活动结束后';
				time = data[0].afterTriggerEventTime;
			}
			switch (data[0].triggerEvenTimeUnit) {
				case 10:
					unit = '小时';
					break;
				case 12:
					unit = '分钟';
					break;
				case 13:
					unit = '秒';
					break;
				case 14:
					unit = '毫秒';
					break;
			}
			return `${pre} ${time} ${unit}`;
		},
		// 分页功能
		page_change(page) {
			this.search.page.cur = page;
			this.get_scene_list();
		},
		// 总服务列表 选中服务项
		select_server(obj) {
			obj.check = obj.check ? false : true;
		},
		// 阈值 工具栏
		threshold_tool(type) {
			switch (type) {
				case 0:
					this.devices.show = true;
					this.devices.place_id = '';
					this.devices.event_type = '传感器';
					this.get_place_device();
					break;
				case 1:
					for (let index = 0; index < this.form.data.threshold.length; index++) {
						// 如果是勾选项 删除当前项 并回退一格
						if (this.form.data.threshold[index].check) {
							this.form.data.threshold.splice(index, 1);
							index--;
						}
					}
					break;
			}
		},
		// 阈值按钮样式
		threshold_button_img(type) {
			switch (type) {
				case '添加':
					return './img/icon2.png';
				case '删除':
					for (let val of this.form.data.threshold) {
						if (val.check) {
							return './img/icon10.png';
						}
					}
					return './img/icon9.png';
			}
		},
		// 阈值按钮样式
		threshold_button_style() {
			for (let val of this.form.data.threshold) {
				if (val.check) {
					return { cursor: 'pointer' };
				}
			}
			return { cursor: 'not-allowed' };
		},
		// 按钮颜色切换
		button_img(img, index) {
			if (!index) {
				// 第一个按钮 加号 始终保持点亮的状态
				return img.enable;
			}
			for (let val of this.form.data.servers) {
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
			for (let val of this.form.data.servers) {
				if (val.check) {
					return { cursor: 'pointer' };
				}
			}
			return { cursor: 'not-allowed' };
		},
		// 查询场所设备
		async get_place_device() {
			this.devices.loading = true;
			let { data: res } = await this.request('post', 查询场所及设备, this.token, {});
			this.devices.loading = false;
			if (res.data) {
				this.devices.list = res.data;
			}
		},
		// 工具栏
		server_tool(index) {
			switch (index) {
				case 0:
					this.devices.show = true;
					this.devices.place_id = '';
					this.devices.event_type = '服务';
					this.get_place_device();
					break;
				case 1:
					let index = 0;
					for (let val of this.form.data.servers) {
						// 第一项不能往前移 前一项是勾选不能往前移
						if (index && !this.form.data.servers[index - 1].check && val.check) {
							this.form.data.servers.splice(index, 1);
							this.form.data.servers.splice(index - 1, 0, val);
						}
						index++;
					}
					break;
				case 2:
					for (let index = this.form.data.servers.length - 1; index >= 0; index--) {
						// 最后一项不能下移 后一项勾选不能下移
						if (index < this.form.data.servers.length - 1 && !this.form.data.servers[index + 1].check && this.form.data.servers[index].check) {
							let t = this.form.data.servers[index];
							this.form.data.servers.splice(index, 1);
							this.form.data.servers.splice(index + 1, 0, t);
						}
					}
					break;
				// case 3:
				// 	this.delay.show = true;
				// 	this.delay.list = [];
				// 	for (let val of this.form.data.servers) {
				// 		if (val.check) {
				// 			this.delay.list.push(JSON.parse(JSON.stringify(val)));
				// 		}
				// 	}
				// 	break;
				// case 4:
				case 3:
					for (let index = 0; index < this.form.data.servers.length; index++) {
						// 如果是勾选项 删除当前项 并回退一格
						if (this.form.data.servers[index].check) {
							this.form.data.servers.splice(index, 1);
							index--;
						}
					}
					break;
			}
		},
		// 保存场景规则
		async save_scene() {
			if (!this.form.data.name) {
				this.$message.error('场景名称不能为空');
				return;
			}
			// 根据执行方式分类验证
			switch (this.form.data.method) {
				case 2:
					// 自动执行
					if (!this.form.data.date_range) {
						this.$message.error('执行日期不能为空');
						return;
					}
					if (!this.form.data.start_time) {
						this.$message.error('执行时间不能为空');
						return;
					}
					if (!this.form.data.cycle.length) {
						this.$message.error('执行周期不能为空');
						return;
					}
					break;
				case 3:
					// 条件执行
					if (typeof this.form.data.condition_type == 'string') {
						this.$message.error('条件类型不能为空');
						return;
					}
					break;
				case 4:
					// 传感器
					if (!this.form.data.threshold.length) {
						this.$message.error('阈值不能为空');
						return;
					}
					// 列表中可重新设置值 所以也要验证
					for (let val of this.form.data.threshold) {
						for (let val2 of val.condition) {
							if (!val2.value) {
								this.$message.error('设备条件值不能为空');
								return;
							}
						}
					}
					break;
			}
			// 所有都要验证服务列表
			if (!this.form.data.servers.length) {
				this.$message.error('执行配置不能为空');
				return;
			}
			// 总延迟不能超过300秒
			let total_delay = 0;
			for (let val of this.form.data.servers) {
				total_delay += Number(val.delay || 0);
			}
			if (total_delay > 300) {
				this.$message.error('总延迟不能超过300秒');
				return;
			}
			// 发送数据请求
			let data = {
				sceneName: this.form.data.name,
				sceneType: this.form.data.method,
				deviceCommandBos: this.form.data.servers.map((e) => ({
					// delayExecuteMillis: e.delay * 1000,
					deviceId: e.deviceId,
					placeId: e.placeId,
					sceneProductConfigId: e.id,
				})),
			};
			if (this.form.data.method == 2) {
				let st = this.form.data.date_range[0];
				let et = this.form.data.date_range[1];
				data.planDatetimeStart = `${st.getFullYear()}-${st.getMonth() + 1}-${st.getDate()} 00:00:00`;
				data.planDatetimeEnd = `${et.getFullYear()}-${et.getMonth() + 1}-${et.getDate()} 23:59:59`;
				data.executeTime = this.form.data.start_time.toString().split(' ')[4];
				data.executePeriodDays = JSON.stringify(this.form.data.cycle);
			} else if (this.form.data.method == 3) {
				data.sceneConditionParamBos = [
					{
						triggerEvenTimeUnit: this.form.data.condition_unit,
					},
				];
				switch (this.form.data.condition_type) {
					case 0:
						data.sceneConditionParamBos[0].preTriggerEventTime = this.form.data.condition_time;
						break;
					case 1:
						data.sceneConditionParamBos[0].afterTriggerEventTime = this.form.data.condition_time;
						break;
				}
			} else if (this.form.data.method == 4) {
				data.scenePropertyDeviceBOs = this.form.data.threshold.map((e) => ({
					deviceId: e.id,
					andTriggerTag: e.type,
					scenePropertyParam: e.condition.map((e2) => ({
						sceneProductConfigId: e2.id,
						triggerOperator: e2.ct,
						triggerValue: e2.value,
					})),
				}));
			}
			if (this.form.rule_id) {
				data.id = this.form.rule_id;
			}
			this.form.loading = true;
			await this.request('post', 编辑场景规则, this.token, data);
			this.form.loading = false;
			this.$message.success('保存场景成功');
			this.form.show = false;
			this.get_scene_list();
		},
		// 新增、编辑、删除场景
		async edit_scene(tag, data) {
			switch (tag) {
				case 'del':
					this.loading = true;
					let { data: res } = await this.request('post', 删除场景规则, this.token, [data.id]);
					this.loading = false;
					if (res.head.code === 200) {
						this.$message.success('删除成功');
						this.get_scene_list();
					}
					break;
				case 'add':
					this.form.show = true;
					// 重置数据
					this.form.data.name = '';
					this.form.data.method = 2;
					this.form.data.date_range = '';
					this.form.data.start_time = '';
					this.form.data.cycle = [];
					this.form.data.condition_type = '';
					this.form.data.condition_time = 0;
					this.form.data.condition_unit = 13;
					this.form.data.threshold = [];
					this.form.data.servers = [];
					this.form.rule_id = '';
					break;
				case 'edit':
					this.form.show = true;
					this.form.rule_id = data.id;
					this.form.data.name = data.sceneName;
					this.form.data.method = data.sceneType;
					// 分类别取值
					switch (data.sceneType) {
						case 2:
							this.form.data.date_range = [new Date(data.planDatetimeStart), new Date(data.planDatetimeEnd)];
							this.form.data.start_time = new Date(`2024/10/10 ${data.executeTime}`);
							this.form.data.cycle = JSON.parse(data.executePeriodDays);
							break;
						case 3:
							this.form.data.condition_type = data.sceneConditionParamVOS[0].preTriggerEventTime === null ? 1 : 0;
							this.form.data.condition_time = this.form.data.condition_type ? data.sceneConditionParamVOS[0].afterTriggerEventTime : data.sceneConditionParamVOS[0].preTriggerEventTime;
							this.form.data.condition_unit = data.sceneConditionParamVOS[0].triggerEvenTimeUnit;
							break;
						case 4:
							this.form.data.threshold = data.scenePropertyDeviceVos.map((e) => ({
								id: e.deviceId,
								type: e.andTriggerTag,
								condition: e.scenePropertyParam.map((e2) => ({
									id: e2.sceneProductConfigId,
									name: e2.sceneProductConfigVo.configName,
									ct: e2.triggerOperator,
									value: e2.triggerValue,
								})),
								name: e.deviceName,
							}));
							break;
					}
					this.form.data.servers = data.deviceCommandVOS.map((e) => ({
						deviceId: e.deviceId,
						placeId: e.placeId,
						id: e.sceneProductConfigId,
						delay: e.delayExecuteMillis,
						configName: e.sceneProductConfigVo.configName,
						deviceName: e.deviceName,
						placeName: e.placeName || '',
					}));
					break;
			}
		},
		// 执行手动场景
		async excu_scene(row) {
			loading.value = true;
			await this.request('post', `${执行场景规则}/${row.id}`, this.token);
			loading.value = false;
			this.$message.success('执行成功');
			this.get_scene_list();
		},
		// 启停场景
		async start_stop(row) {
			this.loading = true;
			if (row.status) {
				// 当前状态开启 则执行停止操作
				await this.request('post', 停止场景规则, this.token, [row.id]);
			} else {
				await this.request('post', 开启场景规则, this.token, [row.id]);
			}
			this.loading = false;
			this.$message.success('执行成功');
			this.get_scene_list();
		},
		// 点击展开折叠场所
		select_place(place) {
			this.devices.place_id = this.devices.place_id == place.id ? -1 : place.id;
		},
		// 配置按钮
		async set_config(device, place) {
			this.devices.loading = true;
			// 共用场所设备弹窗 区分是 服务 还是 传感器
			if (this.devices.event_type == '服务') {
				this.servers.checkAll = false;
				this.servers.isIndeterminate = false;
				let {
					data: { data: res },
				} = await this.request('get', `${分类查询场景配置}/${device.id}?topicType=1`, this.token);
				this.devices.loading = false;
				if (!res.length) {
					this.$message.error('设备无服务');
					return;
				}
				this.servers.show = true;
				for (let val of res) {
					val.check = false;
					val.delay = '';
					val.deviceName = device.deviceName; //外层显示用
					val.deviceId = device.id; // 保存时用
					val.placeName = place.placeName; //外层显示
					val.placeId = place.id; // 保存时用
				}
				this.servers.list = res;
			} else if (this.devices.event_type == '传感器') {
				this.devices.id = device.id;
				this.devices.name = device.deviceName;
				let {
					data: { data: res },
				} = await this.request('get', `${分类查询场景配置}/${device.id}?topicType=2`, this.token);
				this.devices.loading = false;
				if (!res.length) {
					this.$message.error('无可选项');
					return;
				}
				this.threshold.show = true;
				// 查询可选值
				this.threshold.select_list = res;
				this.threshold.list = [];
			}
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
				this.$message.error('至少勾选一个服务');
				return;
			}
			// for (let val of this.servers.list) {
			// 	if (val.check && (!Number(val.delay) || isNaN(Number(val.delay)))) {
			// 		result = false;
			// 		break;
			// 	}
			// }
			// if (!result) {
			// 	消息('延迟时间必须为数字', 'error');
			// 	return;
			// }
			for (let val of this.servers.list) {
				if (val.check) {
					val.check = false;
					this.form.data.servers.push(val);
				}
			}
			this.servers.show = false;
		},
		// 延迟及服务设置保存
		delay_submit() {
			for (let val of this.delay.list) {
				if (isNaN(Number(val.delay))) {
					this.$message.error('延迟只能输入数字');
					return;
				}
				if (Number(val.delay) > 30) {
					this.$message.error('延迟最多30!');
					return;
				}
			}
			for (let val of this.delay.list) {
				for (let val2 of this.form.data.servers) {
					if (val2.id == val.id) {
						val2.delay = val.delay;
						break;
					}
				}
			}
			this.delay.show = false;
		},
		// 添加条件
		add_condition() {
			this.threshold.list.push({
				config_id: '', // 绑定的配置id
				operator: '',
				value: '',
			});
		},
		// 删除设备条件
		del_device_condition(index) {
			this.threshold.list.splice(index, 1);
		},
		// 阈值提交
		threshold_submit() {
			// 不能为空
			if (!this.threshold.list.length) {
				this.$message.error('条件不能为空');
				return;
			}
			for (let val of this.threshold.list) {
				if (!val.config_id || !val.operator || !val.value) {
					this.$message.error('必须填写条件');
					return;
				}
			}
			let list = [];
			for (let val of this.threshold.list) {
				for (let val2 of this.threshold.select_list) {
					if (val.config_id == val2.id) {
						let t = {
							name: val2.configName,
							id: val2.id,
							ct: val.operator,
							value: val.value,
						};
						list.push(t);
						break;
					}
				}
			}
			// 添加到外层列表中
			this.form.data.threshold.push({
				id: this.devices.id,
				name: this.devices.name,
				type: this.threshold.is_and,
				condition: list,
				check: false,
			});
			this.threshold.show = false;
		},
		// 切换场景类型
		async change_scene_type(value) {
			this.search.status_ban = value === 1;
			// 重新从第一页查
			this.search.page.cur = 1;
			this.get_scene_list();
		},
	},
});
